import { Component, OnInit, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { HttpClientModule } from '@angular/common/http';
import { FormModel, FormService } from '../../form.service';

interface FormElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  src?: string;
  alt?: string;
  rows?: Array<Array<{ 
    content: string;
    fontFamily?: string;
    fontSize?: string;
    color?: string;
    backgroundColor?: string;
    textAlign?: string;
  }>>;
  shape?: string;
  initialContentSet?: boolean;
  // New properties for text styling
  fontFamily?: string;
  fontSize?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: string;
  // For checkbox element
  checked?: boolean;
  label?: string;
  // For dropdown element
  options?: string[];
}

interface FormPage {
  id: string;
  elements: FormElement[];
}

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './form-builder.component.html',
  styleUrl: './form-builder.component.css',
  providers: [FormService]
})
export class FormBuilderComponent implements OnInit {
  // Text formatting state
  textFormatting = {
    bold: false,
    italic: false,
    underline: false
  };
  
  // Font settings
  availableFonts = ['Arial', 'Times New Roman', 'Calibri', 'Roboto', 'Helvetica'];
  selectedFont = 'Arial';
  fontSizes = ['8', '10', '12', '14', '16', '18', '20', '24', '28', '32', '36'];
  selectedFontSize = '12';
  
  // Text alignment
  textAlignment = 'left';
  
  // Colors
  textColor = '#000000';
  highlightColor = '#ffffff';
  
  // Document pages
  pages: FormPage[] = [];
  currentPage = 0;
  
  // Form name
  formName = 'Untitled Document';

  // Saving state
  isSaving = false;
  
  // Drag and drop state
  isDragging = false;
  isResizing = false;
  currentElement: FormElement | null = null;
  selectedElement: FormElement | null = null;
  offsetX = 0;
  offsetY = 0;
  initialWidth = 0;
  initialHeight = 0;
  
  // Zoom level
  zoomLevel = 100;
  
  // Counter for generating unique IDs
  private idCounter = 1;

  constructor(private formService: FormService) { }

  ngOnInit(): void {
    // Initialize with one empty page
    this.addNewPage();
    
    // Set up an interval to periodically synchronize content from DOM to model
    setInterval(() => {
      this.updateElementsContentFromDOM();
    }, 5000); // Update every 5 seconds
  }

  // Generate a unique element ID
  private generateId(prefix: string): string {
    return `${prefix}-${this.idCounter++}`;
  }

  // Toggle text formatting buttons
  toggleFormat(format: 'bold' | 'italic' | 'underline'): void {
    this.textFormatting[format] = !this.textFormatting[format];
    
    // Apply formatting to selected text in document
    document.execCommand(format, false);
    
    // Apply formatting to selected element if it's a text element
    if (this.selectedElement && this.selectedElement.type === 'text') {
      // Store formatting in the element for persistence
      this.updateSelectedElementStyling();
    }
  }

  // Select font
  selectFont(font: string): void {
    this.selectedFont = font;
    document.execCommand('fontName', false, font);
    
    // Apply to selected element
    if (this.selectedElement) {
      this.selectedElement.fontFamily = font;
      this.updateSelectedElementStyling();
    }
  }

  // Select font size
  selectFontSize(size: string): void {
    this.selectedFontSize = size;
    document.execCommand('fontSize', false, size);
    
    // Apply to selected element
    if (this.selectedElement) {
      this.selectedElement.fontSize = size;
      this.updateSelectedElementStyling();
    }
  }

  // Set text alignment
  setAlignment(alignment: 'left' | 'center' | 'right' | 'justify'): void {
    this.textAlignment = alignment;
    document.execCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`, false);
    
    // Apply to selected element
    if (this.selectedElement) {
      this.selectedElement.textAlign = alignment;
      this.updateSelectedElementStyling();
    }
  }

  // Apply text color
  applyTextColor(): void {
    document.execCommand('foreColor', false, this.textColor);
    
    // Apply to selected element
    if (this.selectedElement) {
      this.selectedElement.color = this.textColor;
      this.updateSelectedElementStyling();
    }
  }

  // Apply highlight color
  applyHighlightColor(): void {
    document.execCommand('hiliteColor', false, this.highlightColor);
    
    // Apply to selected element
    if (this.selectedElement) {
      this.selectedElement.backgroundColor = this.highlightColor;
      this.updateSelectedElementStyling();
    }
  }
  
  // New methods for paragraph formatting
  increaseIndent(): void {
    document.execCommand('indent', false);
  }
  
  decreaseIndent(): void {
    document.execCommand('outdent', false);
  }
  
  toggleBulletList(): void {
    document.execCommand('insertUnorderedList', false);
  }
  
  toggleNumberedList(): void {
    document.execCommand('insertOrderedList', false);
  }
  
  // Update the styling of selected element
  updateSelectedElementStyling(): void {
    // This method will update the selected element's style properties
    // based on the current toolbar state
    if (!this.selectedElement) return;
    
    const element = this.selectedElement;
    
    // Find the element in the DOM to apply styles
    const pageElement = document.querySelector(`[data-page="${this.currentPage + 1}"]`);
    if (!pageElement) return;
    
    const elementDOM = pageElement.querySelector(`.form-element[data-id="${element.id}"]`);
    if (!elementDOM) return;
    
    // Apply styling based on element type
    if (element.type === 'text') {
      const textElement = elementDOM.querySelector('.text-element') as HTMLElement;
      if (textElement) {
        textElement.style.fontFamily = element.fontFamily || this.selectedFont;
        textElement.style.fontSize = `${element.fontSize || this.selectedFontSize}px`;
        textElement.style.color = element.color || this.textColor;
        textElement.style.backgroundColor = element.backgroundColor || 'transparent';
        textElement.style.textAlign = element.textAlign || this.textAlignment;
      }
    } else if (element.type === 'table' && element.rows) {
      const tableCells = elementDOM.querySelectorAll('td');
      // Apply base table styling
      tableCells.forEach((cell, index) => {
        const cellElement = cell as HTMLElement;
        if (cellElement) {
          cellElement.style.fontFamily = element.fontFamily || this.selectedFont;
          cellElement.style.fontSize = `${element.fontSize || this.selectedFontSize}px`;
          cellElement.style.color = element.color || this.textColor;
          cellElement.style.backgroundColor = element.backgroundColor || 'transparent';
          cellElement.style.textAlign = element.textAlign || this.textAlignment;
        }
      });
    }
  }

  // Select an element to edit
  selectElement(element: FormElement): void {
    // Deselect previous element if any
    if (this.selectedElement) {
      const prevElement = document.querySelector(`.form-element[data-id="${this.selectedElement.id}"]`);
      if (prevElement) {
        prevElement.classList.remove('selected');
      }
    }
    
    this.selectedElement = element;
    
    // Update toolbar state based on element's properties
    if (element.fontFamily) this.selectedFont = element.fontFamily;
    if (element.fontSize) this.selectedFontSize = element.fontSize;
    if (element.color) this.textColor = element.color;
    if (element.backgroundColor) this.highlightColor = element.backgroundColor;
    if (element.textAlign) this.textAlignment = element.textAlign;
    
    // Mark element as selected in the DOM
    const elementDOM = document.querySelector(`.form-element[data-id="${element.id}"]`);
    if (elementDOM) {
      elementDOM.classList.add('selected');
    }
  }

  // Handle drag start from sidebar
  onDragStart(event: DragEvent, elementType: string): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('elementType', elementType);
      // Set drag image to improve UX
      const ghostElement = document.createElement('div');
      ghostElement.innerText = elementType;
      ghostElement.style.padding = '10px';
      ghostElement.style.backgroundColor = '#f0f0f0';
      ghostElement.style.border = '1px solid #ddd';
      ghostElement.style.borderRadius = '4px';
      document.body.appendChild(ghostElement);
      event.dataTransfer.setDragImage(ghostElement, 0, 0);
      setTimeout(() => {
        document.body.removeChild(ghostElement);
      }, 0);
    }
  }

  // Allow drop on document area
  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  // Handle drop on document area
  onDrop(event: DragEvent, pageIndex: number): void {
    event.preventDefault();
    if (!event.dataTransfer) return;
    
    const elementType = event.dataTransfer.getData('elementType');
    if (!elementType) return;
    
    // Get position relative to page content
    const pageContent = (event.target as HTMLElement).closest('.page-content');
    if (!pageContent) return;
    
    const rect = pageContent.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Create a new element based on type
    const newElement = this.createNewElement(elementType, x, y);
    if (newElement) {
      this.pages[pageIndex].elements.push(newElement);
      
      // Give Angular time to render the new element
      setTimeout(() => {
        // Find the newly added element in the DOM
        const pageElement = document.querySelector(`[data-page="${pageIndex + 1}"]`);
        if (pageElement) {
          const newElementDOM = pageElement.querySelector(`.form-element:last-child`);
          if (newElementDOM) {
            // Add data-id attribute to the element for easier identification
            newElementDOM.setAttribute('data-id', newElement.id);
            
            // Select the newly added element
            this.selectElement(newElement);
          }
        }
      }, 0);
    }
  }

  // Create a new element based on type
  createNewElement(type: string, x: number, y: number): FormElement {
    let element: FormElement;
    
    switch (type) {
      case 'text':
        element = {
          id: this.generateId('text'),
          type: 'text',
          x,
          y,
          width: 200,
          height: 100,
          content: 'Click to edit text',
          initialContentSet: false,
          fontFamily: this.selectedFont,
          fontSize: this.selectedFontSize,
          color: this.textColor,
          backgroundColor: 'transparent',
          textAlign: this.textAlignment
        };
        break;
        
      case 'image':
        element = {
          id: this.generateId('image'),
          type: 'image',
          x,
          y,
          width: 200,
          height: 150,
          src: 'assets/placeholder-image.png', // Replace with your placeholder image
          alt: 'Placeholder Image'
        };
        break;
        
      case 'table':
        element = {
          id: this.generateId('table'),
          type: 'table',
          x,
          y,
          width: 300,
          height: 200,
          fontFamily: this.selectedFont,
          fontSize: this.selectedFontSize,
          color: this.textColor,
          backgroundColor: 'transparent',
          textAlign: 'left',
          rows: [
            [
              { content: 'Header 1', fontFamily: this.selectedFont, fontSize: this.selectedFontSize, color: this.textColor },
              { content: 'Header 2', fontFamily: this.selectedFont, fontSize: this.selectedFontSize, color: this.textColor },
              { content: 'Header 3', fontFamily: this.selectedFont, fontSize: this.selectedFontSize, color: this.textColor }
            ],
            [
              { content: 'Cell 1', fontFamily: this.selectedFont, fontSize: this.selectedFontSize, color: this.textColor },
              { content: 'Cell 2', fontFamily: this.selectedFont, fontSize: this.selectedFontSize, color: this.textColor },
              { content: 'Cell 3', fontFamily: this.selectedFont, fontSize: this.selectedFontSize, color: this.textColor }
            ],
            [
              { content: 'Cell 4', fontFamily: this.selectedFont, fontSize: this.selectedFontSize, color: this.textColor },
              { content: 'Cell 5', fontFamily: this.selectedFont, fontSize: this.selectedFontSize, color: this.textColor },
              { content: 'Cell 6', fontFamily: this.selectedFont, fontSize: this.selectedFontSize, color: this.textColor }
            ]
          ]
        };
        break;
        
      case 'shape':
        element = {
          id: this.generateId('shape'),
          type: 'shape',
          x,
          y,
          width: 100,
          height: 100,
          shape: 'rectangle', // Default shape
          color: '#cccccc'
        };
        break;
        
      case 'horizontalLine':
        element = {
          id: this.generateId('horizontalLine'),
          type: 'horizontalLine',
          x,
          y,
          width: 300,
          height: 2,
          color: '#333333'
        };
        break;
        
      case 'pageBreak':
        element = {
          id: this.generateId('pageBreak'),
          type: 'pageBreak',
          x: 72, // Offset from left margin
          y,
          width: 672 - 144 // Width of page content (816px - 72px*2 margins)
        };
        break;
        
      case 'checkbox':
        element = {
          id: this.generateId('checkbox'),
          type: 'checkbox',
          x,
          y,
          width: 200,
          height: 30,
          checked: false,
          label: 'Checkbox label',
          fontFamily: this.selectedFont,
          fontSize: this.selectedFontSize,
          color: this.textColor
        };
        break;
        
      case 'dropdown':
        element = {
          id: this.generateId('dropdown'),
          type: 'dropdown',
          x,
          y,
          width: 200,
          height: 30,
          options: ['Option 1', 'Option 2', 'Option 3'],
          fontFamily: this.selectedFont,
          fontSize: this.selectedFontSize,
          color: this.textColor
        };
        break;
        
      default:
        // Create generic element for missing types
        element = {
          id: this.generateId('element'),
          type,
          x,
          y,
          width: 100,
          height: 100
        };
    }
    
    return element;
  }

  // Toggle checkbox state
  toggleCheckbox(pageIndex: number, element: FormElement): void {
    if (element.type === 'checkbox') {
      element.checked = !element.checked;
    }
  }

  // Start dragging an element
  startDrag(event: MouseEvent, element: FormElement): void {
    // Don't start drag if clicking on controls or if contenteditable is active
    const target = event.target as HTMLElement;
    if (target.closest('.element-controls') || 
        target.getAttribute('contenteditable') === 'true') {
      return;
    }
    
    this.isDragging = true;
    this.currentElement = element;
    this.selectElement(element);
    
    // Calculate offset for smooth dragging
    const elementDOM = (event.target as HTMLElement).closest('.form-element');
    if (elementDOM) {
      const rect = elementDOM.getBoundingClientRect();
      this.offsetX = event.clientX - rect.left;
      this.offsetY = event.clientY - rect.top;
    }
  }

  // Start resizing an element
  startResize(event: MouseEvent, element: FormElement): void {
    event.stopPropagation();
    this.isResizing = true;
    this.currentElement = element;
    this.selectElement(element);
    this.initialWidth = element.width || 100;
    this.initialHeight = element.height || 100;
    
    // Calculate offset
    const resizeHandle = event.target as HTMLElement;
    const rect = resizeHandle.getBoundingClientRect();
    this.offsetX = event.clientX - rect.left;
    this.offsetY = event.clientY - rect.top;
  }

  // Handle mouse move for drag and resize
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.currentElement) return;
    
    if (this.isDragging) {
      // Get the page content element
      const pageContent = (event.target as HTMLElement).closest('.page-content');
      if (!pageContent) return;
      
      const rect = pageContent.getBoundingClientRect();
      
      // Update element position
      this.currentElement.x = event.clientX - rect.left - this.offsetX;
      this.currentElement.y = event.clientY - rect.top - this.offsetY;
      
      // Keep element within page boundaries
      this.currentElement.x = Math.max(0, this.currentElement.x);
      this.currentElement.y = Math.max(0, this.currentElement.y);
      this.currentElement.x = Math.min(rect.width - (this.currentElement.width || 50), this.currentElement.x);
      this.currentElement.y = Math.min(rect.height - (this.currentElement.height || 50), this.currentElement.y);
    } 
    else if (this.isResizing) {
      // Get the page content element
      const pageContent = (event.target as HTMLElement).closest('.page-content');
      if (!pageContent) return;
      
      const rect = pageContent.getBoundingClientRect();
      
      // Calculate new dimensions
      const newWidth = this.initialWidth + (event.clientX - rect.left - this.currentElement.x - this.offsetX);
      const newHeight = this.initialHeight + (event.clientY - rect.top - this.currentElement.y - this.offsetY);
      
      // Update element size with minimum constraints
      this.currentElement.width = Math.max(50, newWidth);
      this.currentElement.height = Math.max(30, newHeight);
    }
  }

  // Handle mouse up to stop dragging/resizing
  @HostListener('mouseup')
  onMouseUp(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.currentElement = null;
  }

  // Delete an element
  deleteElement(pageIndex: number, element: FormElement): void {
    const elementIndex = this.pages[pageIndex].elements.findIndex(e => e.id === element.id);
    if (elementIndex !== -1) {
      this.pages[pageIndex].elements.splice(elementIndex, 1);
      
      // If this was the selected element, clear selection
      if (this.selectedElement && this.selectedElement.id === element.id) {
        this.selectedElement = null;
      }
    }
  }

  // Add a new page
  addNewPage(): void {
    const newPage: FormPage = {
      id: this.generateId('page'),
      elements: []
    };
    
    this.pages.push(newPage);
    // Switch to the new page
    this.goToPage(this.pages.length - 1);
  }

  // Go to specific page
  goToPage(pageIndex: number): void {
    if (pageIndex >= 0 && pageIndex < this.pages.length) {
      this.currentPage = pageIndex;
      // Scroll to the page
      setTimeout(() => {
        const pageElement = document.querySelector(`[data-page="${pageIndex + 1}"]`);
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 0);
    }
  }
  
  // Zoom control methods
  zoomIn(): void {
    if (this.zoomLevel < 200) {
      this.zoomLevel += 10;
      this.applyZoom();
    }
  }
  
  zoomOut(): void {
    if (this.zoomLevel > 50) {
      this.zoomLevel -= 10;
      this.applyZoom();
    }
  }
  
  resetZoom(): void {
    this.zoomLevel = 100;
    this.applyZoom();
  }
  
  applyZoom(): void {
    const documentPages = document.querySelectorAll('.document-page');
    documentPages.forEach(page => {
      (page as HTMLElement).style.transform = `scale(${this.zoomLevel / 100})`;
      (page as HTMLElement).style.transformOrigin = 'center top';
    });
  }

  // Update element content from DOM to model
  private updateElementsContentFromDOM(): void {
    this.pages.forEach((page, pageIndex) => {
      const pageElement = document.querySelector(`[data-page="${pageIndex + 1}"]`);
      if (!pageElement) return;

      page.elements.forEach(element => {
        // Find the element by ID - this is much more reliable
        const elementDOM = pageElement.querySelector(`.form-element[data-id="${element.id}"]`);
        
        if (elementDOM) {
          // For text elements, update content from DOM
          if (element.type === 'text') {
            const textElement = elementDOM.querySelector('.text-element');
            if (textElement) {
              element.content = textElement.innerHTML;
              
              // Store computed styles
              const computedStyle = window.getComputedStyle(textElement);
              element.fontFamily = computedStyle.fontFamily;
              element.fontSize = computedStyle.fontSize;
              element.color = computedStyle.color;
              element.backgroundColor = computedStyle.backgroundColor;
              element.textAlign = computedStyle.textAlign;
            }
          }
          
          // For table elements, update cell content
          else if (element.type === 'table' && element.rows) {
            const tableCells = elementDOM.querySelectorAll('td');
            let cellIndex = 0;
            
            for (let i = 0; i < element.rows.length; i++) {
              for (let j = 0; j < element.rows[i].length; j++) {
                if (cellIndex < tableCells.length) {
                  // Store cell content
                  element.rows[i][j].content = tableCells[cellIndex].innerHTML;
                  
                  // Store computed styles
                  const computedStyle = window.getComputedStyle(tableCells[cellIndex]);
                  element.rows[i][j].fontFamily = computedStyle.fontFamily;
                  element.rows[i][j].fontSize = computedStyle.fontSize;
                  element.rows[i][j].color = computedStyle.color;
                  element.rows[i][j].backgroundColor = computedStyle.backgroundColor;
                  element.rows[i][j].textAlign = computedStyle.textAlign;
                  
                  cellIndex++;
                }
              }
            }
          }
          
          // For checkbox elements, update label
          else if (element.type === 'checkbox') {
            const labelElement = elementDOM.querySelector('.checkbox-label');
            if (labelElement) {
              element.label = labelElement.textContent || 'Checkbox label';
              
              // Store computed styles
              const computedStyle = window.getComputedStyle(labelElement);
              element.fontFamily = computedStyle.fontFamily;
              element.fontSize = computedStyle.fontSize;
              element.color = computedStyle.color;
            }
          }
        }
      });
    });
  }
  
  // Handle initial focus on text element
  onTextFocus(event: FocusEvent, pageIndex: number, element: FormElement): void {
    const textElement = event.target as HTMLElement;
    
    // Only set content first time user focuses on the element
    if (!element.initialContentSet) {
      textElement.innerHTML = element.content || '';
      element.initialContentSet = true;
      
      // If it's the default text, select all on first focus to make it easy to replace
      if (element.content === 'Click to edit text') {
        // Use setTimeout to ensure the selection happens after the focus is complete
        setTimeout(() => {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(textElement);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }, 0);
      }
    }
    
    // Update toolbar state based on element's properties
    this.selectElement(element);
  }
  
  // Handle blur event for text element
  onTextBlur(event: FocusEvent, pageIndex: number, element: FormElement): void {
    if (event.target) {
      const content = (event.target as HTMLElement).innerHTML;
      element.content = content;
      
      // Store the current styling
      const textElement = event.target as HTMLElement;
      const computedStyle = window.getComputedStyle(textElement);
      
      element.fontFamily = computedStyle.fontFamily;
      element.fontSize = computedStyle.fontSize.replace('px', '');
      element.color = computedStyle.color;
      element.backgroundColor = computedStyle.backgroundColor;
      element.textAlign = computedStyle.textAlign;
    }
  }
  
  // Handle table cell focus
  onTableCellFocus(event: FocusEvent, pageIndex: number, element: FormElement, rowIndex: number, cellIndex: number): void {
    if (event.target && element.rows && element.rows[rowIndex] && element.rows[rowIndex][cellIndex]) {
      const cell = event.target as HTMLElement;
      const content = element.rows[rowIndex][cellIndex].content;
      
      // Set the content only on focus - this allows normal editing
      cell.innerHTML = content || '';
      
      // Apply stored styles if available
      const cellData = element.rows[rowIndex][cellIndex];
      if (cellData.fontFamily) cell.style.fontFamily = cellData.fontFamily;
      if (cellData.fontSize) cell.style.fontSize = `${cellData.fontSize}px`;
      if (cellData.color) cell.style.color = cellData.color;
      if (cellData.backgroundColor) cell.style.backgroundColor = cellData.backgroundColor;
      if (cellData.textAlign) cell.style.textAlign = cellData.textAlign;
      
      // Update toolbar state
      this.selectElement(element);
      
      if (cellData.fontFamily) this.selectedFont = cellData.fontFamily;
      if (cellData.fontSize) this.selectedFontSize = cellData.fontSize;
      if (cellData.color) this.textColor = cellData.color;
      if (cellData.backgroundColor) this.highlightColor = cellData.backgroundColor;
      if (cellData.textAlign) this.textAlignment = cellData.textAlign as 'left' | 'center' | 'right' | 'justify';
    }
  }
  
  // Handle table cell blur
  onTableCellBlur(event: FocusEvent, pageIndex: number, element: FormElement, rowIndex: number, cellIndex: number): void {
    if (event.target && element.rows && element.rows[rowIndex] && element.rows[rowIndex][cellIndex]) {
      const cell = event.target as HTMLElement;
      const content = cell.innerHTML;
      
      // Store the content
      element.rows[rowIndex][cellIndex].content = content;
      
      // Store the cell styling
      const computedStyle = window.getComputedStyle(cell);
      element.rows[rowIndex][cellIndex].fontFamily = computedStyle.fontFamily;
      element.rows[rowIndex][cellIndex].fontSize = computedStyle.fontSize.replace('px', '');
      element.rows[rowIndex][cellIndex].color = computedStyle.color;
      element.rows[rowIndex][cellIndex].backgroundColor = computedStyle.backgroundColor;
      element.rows[rowIndex][cellIndex].textAlign = computedStyle.textAlign;
    }
  }
  
  // Export the form to PDF
  async exportToPdf(): Promise<void> {
    // Create a new PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter' // 8.5x11 inches
    });
    
    // Process page breaks to create the structure we need for PDF generation
    const processedPages = this.processPageBreaks();
    
    try {
      // Create a temporary container for all our pages
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);
      
      // Process each page
      for (let i = 0; i < processedPages.length; i++) {
        const page = processedPages[i];
        
        // Create a temporary page for rendering
        const tempPage = document.createElement('div');
        tempPage.className = 'document-page temp-page';
        tempPage.style.width = '816px'; // Letter width in pixels
        tempPage.style.height = '1056px'; // Letter height in pixels
        tempPage.style.position = 'relative';
        tempPage.style.backgroundColor = 'white';
        tempPage.style.overflow = 'hidden';
        
        // Create page content container
        const pageContent = document.createElement('div');
        pageContent.className = 'page-content';
        pageContent.style.padding = '72px';
        pageContent.style.position = 'relative';
        pageContent.style.height = 'calc(100% - 144px)';
        
        // Render each element in the page
        for (const element of page.elements) {
          // Get the latest content from DOM before exporting if possible
          this.updateSingleElementContent(element);
          
          const elementDiv = document.createElement('div');
          elementDiv.className = 'form-element';
          elementDiv.style.position = 'absolute';
          elementDiv.style.left = `${element.x}px`;
          elementDiv.style.top = `${element.y}px`;
          elementDiv.style.width = element.width ? `${element.width}px` : 'auto';
          elementDiv.style.height = element.height ? `${element.height}px` : 'auto';
          
          // Create content based on element type
          switch (element.type) {
            case 'text':
              const textDiv = document.createElement('div');
              textDiv.className = 'text-element';
              textDiv.style.width = '100%';
              textDiv.style.height = '100%';
              textDiv.style.padding = '5px';
              textDiv.style.boxSizing = 'border-box';
              textDiv.style.overflow = 'hidden';
              textDiv.style.wordWrap = 'break-word';
              
              // Apply styling
              textDiv.style.fontFamily = element.fontFamily || this.selectedFont;
              textDiv.style.fontSize = `${element.fontSize || this.selectedFontSize}px`;
              textDiv.style.color = element.color || this.textColor;
              textDiv.style.backgroundColor = element.backgroundColor || 'transparent';
              textDiv.style.textAlign = element.textAlign || this.textAlignment;
              
              // Make sure we use the latest content from the model
              textDiv.innerHTML = element.content || '';
              
              elementDiv.appendChild(textDiv);
              break;
              
            case 'image':
              const img = document.createElement('img');
              img.src = element.src || '';
              img.alt = element.alt || 'Image';
              img.style.maxWidth = '100%';
              img.style.maxHeight = '100%';
              elementDiv.appendChild(img);
              break;
              
            case 'table':
              const table = document.createElement('table');
              table.style.width = '100%';
              table.style.borderCollapse = 'collapse';
              
              if (element.rows) {
                for (let r = 0; r < element.rows.length; r++) {
                  const tr = document.createElement('tr');
                  for (let c = 0; c < element.rows[r].length; c++) {
                    const cell = element.rows[r][c];
                    const td = document.createElement('td');
                    
                    // Apply styling to each cell
                    td.style.border = '1px solid #ddd';
                    td.style.padding = '8px';
                    td.style.fontFamily = cell.fontFamily || element.fontFamily || this.selectedFont;
                    td.style.fontSize = `${cell.fontSize || element.fontSize || this.selectedFontSize}px`;
                    td.style.color = cell.color || element.color || this.textColor;
                    td.style.backgroundColor = cell.backgroundColor || element.backgroundColor || 'transparent';
                    td.style.textAlign = cell.textAlign || element.textAlign || 'left';
                    
                    td.innerHTML = cell.content || '';
                    tr.appendChild(td);
                  }
                  table.appendChild(tr);
                }
              }
              elementDiv.appendChild(table);
              break;
              
            case 'shape':
              const shape = document.createElement('div');
              shape.style.width = '100%';
              shape.style.height = '100%';
              
              if (element.shape === 'circle') {
                shape.style.borderRadius = '50%';
              }
              
              shape.style.backgroundColor = element.color || 'rgba(200, 200, 200, 0.2)';
              shape.style.border = '1px solid #ccc';
              elementDiv.appendChild(shape);
              break;
              
            case 'horizontalLine':
              const line = document.createElement('div');
              line.style.width = '100%';
              line.style.height = '2px';
              line.style.backgroundColor = element.color || '#333';
              elementDiv.appendChild(line);
              break;
              
            case 'checkbox':
              const checkboxContainer = document.createElement('div');
              checkboxContainer.style.display = 'flex';
              checkboxContainer.style.alignItems = 'center';
              checkboxContainer.style.gap = '8px';
              
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.checked = element.checked || false;
              
              const label = document.createElement('span');
              label.style.fontFamily = element.fontFamily || this.selectedFont;
              label.style.fontSize = `${element.fontSize || this.selectedFontSize}px`;
              label.style.color = element.color || this.textColor;
              label.textContent = element.label || 'Checkbox label';
              
              checkboxContainer.appendChild(checkbox);
              checkboxContainer.appendChild(label);
              elementDiv.appendChild(checkboxContainer);
              break;
              
            case 'dropdown':
              const select = document.createElement('select');
              select.style.width = '100%';
              select.style.fontFamily = element.fontFamily || this.selectedFont;
              select.style.fontSize = `${element.fontSize || this.selectedFontSize}px`;
              select.style.color = element.color || this.textColor;
              
              if (element.options) {
                element.options.forEach(option => {
                  const optionEl = document.createElement('option');
                  optionEl.textContent = option;
                  select.appendChild(optionEl);
                });
              }
              
              elementDiv.appendChild(select);
              break;
          }
          
          pageContent.appendChild(elementDiv);
        }
        
        tempPage.appendChild(pageContent);
        tempContainer.appendChild(tempPage);
        
        // Wait a little bit to ensure content is fully rendered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Generate canvas from page
        const canvas = await html2canvas(tempPage, {
          scale: 2, // Higher quality
          useCORS: true,
          logging: false,
          allowTaint: true
        });
        
        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');
        
        if (i > 0) {
          pdf.addPage();
        }
        
        // Add the image to fill the page
        pdf.addImage(imgData, 'PNG', 0, 0, 612, 792); // Letter size in points (72dpi)
        
        // Clean up this page
        tempContainer.removeChild(tempPage);
      }
      
      // Clean up the container
      document.body.removeChild(tempContainer);
      
      // Save the PDF
      pdf.save(`${this.formName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    }
  }
  
  // Update a single element's content from the DOM
  private updateSingleElementContent(element: FormElement): void {
    try {
      const allPages = document.querySelectorAll('.document-page');
      
      // Find the element in the DOM
      for (let i = 0; i < allPages.length; i++) {
        const pageElement = allPages[i] as HTMLElement;
        const elementDOM = pageElement.querySelector(`.form-element[data-id="${element.id}"]`);
        
        if (elementDOM) {
          // For text elements, update content from DOM
          if (element.type === 'text') {
            const textElement = elementDOM.querySelector('.text-element');
            if (textElement && textElement.innerHTML) {
              element.content = textElement.innerHTML;
              
              // Update styling information
              const computedStyle = window.getComputedStyle(textElement);
              element.fontFamily = computedStyle.fontFamily;
              element.fontSize = computedStyle.fontSize.replace('px', '');
              element.color = computedStyle.color;
              element.backgroundColor = computedStyle.backgroundColor;
              element.textAlign = computedStyle.textAlign;
              
              return;
            }
          }
          
          // For table elements, update cell content
          else if (element.type === 'table' && element.rows) {
            const tableCells = elementDOM.querySelectorAll('td');
            let cellIndex = 0;
            
            for (let i = 0; i < element.rows.length; i++) {
              for (let j = 0; j < element.rows[i].length; j++) {
                if (cellIndex < tableCells.length && tableCells[cellIndex].innerHTML) {
                  // Update cell content
                  element.rows[i][j].content = tableCells[cellIndex].innerHTML;
                  
                  // Update styling information
                  const computedStyle = window.getComputedStyle(tableCells[cellIndex]);
                  element.rows[i][j].fontFamily = computedStyle.fontFamily;
                  element.rows[i][j].fontSize = computedStyle.fontSize.replace('px', '');
                  element.rows[i][j].color = computedStyle.color;
                  element.rows[i][j].backgroundColor = computedStyle.backgroundColor;
                  element.rows[i][j].textAlign = computedStyle.textAlign;
                  
                  cellIndex++;
                }
              }
            }
            return;
          }
          
          // For checkbox elements, update state and label
          else if (element.type === 'checkbox') {
            const checkbox = elementDOM.querySelector('input[type="checkbox"]') as HTMLInputElement;
            const label = elementDOM.querySelector('.checkbox-label');
            
            if (checkbox) {
              element.checked = checkbox.checked;
            }
            
            if (label) {
              element.label = label.textContent || 'Checkbox label';
              
              const computedStyle = window.getComputedStyle(label);
              element.fontFamily = computedStyle.fontFamily;
              element.fontSize = computedStyle.fontSize.replace('px', '');
              element.color = computedStyle.color;
            }
            
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error updating element content:', error);
    }
  }
  
  // Process page breaks to create separate pages
  private processPageBreaks(): FormPage[] {
    // Create a working copy of pages to avoid modifying the original structure
    const workingPages = JSON.parse(JSON.stringify(this.pages));
    let processedPages: FormPage[] = [];
    
    // Process each page individually
    for (let i = 0; i < workingPages.length; i++) {
      const page = workingPages[i];
      
      // Find all page breaks in this page, sorted by Y position
      const pageBreaks = page.elements
        .filter((el: FormElement) => el.type === 'pageBreak')
        .sort((a: FormElement, b: FormElement) => a.y - b.y);
      
      if (pageBreaks.length === 0) {
        // No page breaks, include page as is
        processedPages.push(page);
        continue;
      }
      
      // First section (before first page break)
      const firstPageElements = page.elements.filter((el: FormElement) => 
        el.type !== 'pageBreak' && el.y < pageBreaks[0].y
      );
      
      if (firstPageElements.length > 0) {
        processedPages.push({
          id: this.generateId('processed-page'),
          elements: firstPageElements
        });
      }
      
      // Middle sections (between page breaks)
      for (let j = 0; j < pageBreaks.length - 1; j++) {
        const currentBreak = pageBreaks[j];
        const nextBreak = pageBreaks[j + 1];
        
        const sectionElements = page.elements.filter((el: FormElement) =>
          el.type !== 'pageBreak' && 
          el.y >= currentBreak.y && 
          el.y < nextBreak.y
        ).map((el: FormElement) => ({
          ...el,
          y: el.y - currentBreak.y // Adjust Y position for new page
        }));
        
        if (sectionElements.length > 0) {
          processedPages.push({
            id: this.generateId('processed-page'),
            elements: sectionElements
          });
        }
      }
      
      // Last section (after last page break)
      const lastBreak = pageBreaks[pageBreaks.length - 1];
      const lastSectionElements = page.elements.filter((el: FormElement) =>
        el.type !== 'pageBreak' && el.y >= lastBreak.y
      ).map((el: FormElement) => ({
        ...el,
        y: el.y - lastBreak.y // Adjust Y position for new page
      }));
      
      if (lastSectionElements.length > 0) {
        processedPages.push({
          id: this.generateId('processed-page'),
          elements: lastSectionElements
        });
      }
    }
    
    return processedPages;
  }

  // Save the form state to the API
  saveForm(): void {
    // First update content from DOM
    this.updateElementsContentFromDOM();
    
    // Set saving flag
    this.isSaving = true;
    
    // Generate HTML template from the form
    const template = this.generateFormTemplate();
    
    const formData: FormModel = {
      id: 0, // API will assign an ID
      name: this.formName,
      template: template
    };
    
    // Call the API service to save the form
    this.formService.saveForm(formData).subscribe({
      next: (response) => {
        console.log('Form saved successfully', response);
        this.isSaving = false;
        alert('Document saved successfully!');
      },
      error: (error) => {
        console.error('Error saving form', error);
        this.isSaving = false;
        alert('Error saving document. Please try again.');
      }
    });
  }
  
  // Generate HTML template from the form
  private generateFormTemplate(): string {
    // Create a document fragment to build the template
    const tempContainer = document.createElement('div');
    
    // Process page breaks to handle multi-page forms
    const processedPages = this.processPageBreaks();
    
    // Add each page to the template
    processedPages.forEach((page, pageIndex) => {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'form-page';
      pageDiv.setAttribute('data-page', (pageIndex + 1).toString());
      
      // Create page content container
      const pageContent = document.createElement('div');
      pageContent.className = 'page-content';
      
      // Add each element to the page
      page.elements.forEach(element => {
        const elementDiv = document.createElement('div');
        elementDiv.className = 'form-element';
        elementDiv.setAttribute('data-type', element.type);
        elementDiv.setAttribute('data-id', element.id);
        elementDiv.style.position = 'absolute';
        elementDiv.style.left = `${element.x}px`;
        elementDiv.style.top = `${element.y}px`;
        
        if (element.width) {
          elementDiv.style.width = `${element.width}px`;
        }
        
        if (element.height) {
          elementDiv.style.height = `${element.height}px`;
        }
        
        // Create content based on element type
        switch (element.type) {
          case 'text':
            const textDiv = document.createElement('div');
            textDiv.className = 'text-element';
            
            // Apply styling
            if (element.fontFamily) textDiv.style.fontFamily = element.fontFamily;
            if (element.fontSize) textDiv.style.fontSize = `${element.fontSize}px`;
            if (element.color) textDiv.style.color = element.color;
            if (element.backgroundColor) textDiv.style.backgroundColor = element.backgroundColor;
            if (element.textAlign) textDiv.style.textAlign = element.textAlign;
            
            textDiv.innerHTML = element.content || '';
            elementDiv.appendChild(textDiv);
            break;
            
          case 'image':
            const img = document.createElement('img');
            img.src = element.src || '';
            img.alt = element.alt || 'Image';
            img.className = 'image-element';
            elementDiv.appendChild(img);
            break;
            
          case 'table':
            const table = document.createElement('table');
            table.className = 'table-element';
            
            // Apply base table styling
            if (element.fontFamily) table.style.fontFamily = element.fontFamily;
            if (element.fontSize) table.style.fontSize = `${element.fontSize}px`;
            if (element.color) table.style.color = element.color;
            if (element.backgroundColor) table.style.backgroundColor = element.backgroundColor;
            if (element.textAlign) table.style.textAlign = element.textAlign;
            
            if (element.rows) {
              element.rows.forEach(row => {
                const tr = document.createElement('tr');
                row.forEach(cell => {
                  const td = document.createElement('td');
                  
                  // Apply cell-specific styling if available
                  if (cell.fontFamily) td.style.fontFamily = cell.fontFamily;
                  if (cell.fontSize) td.style.fontSize = `${cell.fontSize}px`;
                  if (cell.color) td.style.color = cell.color;
                  if (cell.backgroundColor) td.style.backgroundColor = cell.backgroundColor;
                  if (cell.textAlign) td.style.textAlign = cell.textAlign;
                  
                  td.innerHTML = cell.content || '';
                  tr.appendChild(td);
                });
                table.appendChild(tr);
              });
            }
            elementDiv.appendChild(table);
            break;
            
          case 'shape':
            const shape = document.createElement('div');
            shape.className = `shape-element ${element.shape || 'rectangle'}`;
            
            // Apply shape styling
            if (element.color) shape.style.backgroundColor = element.color;
            
            elementDiv.appendChild(shape);
            break;
            
          case 'horizontalLine':
            const line = document.createElement('div');
            line.className = 'horizontal-line-element';
            
            // Apply line color if specified
            if (element.color) line.style.backgroundColor = element.color;
            
            elementDiv.appendChild(line);
            break;
            
          case 'checkbox':
            const checkboxContainer = document.createElement('div');
            checkboxContainer.className = 'checkbox-element';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = element.checked || false;
            
            const label = document.createElement('span');
            label.className = 'checkbox-label';
            
            // Apply styling
            if (element.fontFamily) label.style.fontFamily = element.fontFamily;
            if (element.fontSize) label.style.fontSize = `${element.fontSize}px`;
            if (element.color) label.style.color = element.color;
            
            label.textContent = element.label || 'Checkbox label';
            
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            elementDiv.appendChild(checkboxContainer);
            break;
            
          case 'dropdown':
            const dropdownContainer = document.createElement('div');
            dropdownContainer.className = 'dropdown-element';
            
            const select = document.createElement('select');
            
            // Apply styling
            if (element.fontFamily) select.style.fontFamily = element.fontFamily;
            if (element.fontSize) select.style.fontSize = `${element.fontSize}px`;
            if (element.color) select.style.color = element.color;
            
            if (element.options) {
              element.options.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.textContent = option;
                select.appendChild(optionEl);
              });
            }
            
            dropdownContainer.appendChild(select);
            elementDiv.appendChild(dropdownContainer);
            break;
        }
        
        pageContent.appendChild(elementDiv);
      });
      
      pageDiv.appendChild(pageContent);
      tempContainer.appendChild(pageDiv);
    });
    
    return tempContainer.innerHTML;
  }
  
  // Load a saved form from the API
  loadForm(formId: number): void {
    this.formService.getFormById(formId).subscribe({
      next: (formData) => {
        // Parse the template HTML to recreate the form
        this.parseFormTemplate(formData.template);
        this.formName = formData.name;
      },
      error: (error) => {
        console.error('Error loading form', error);
        alert('Error loading document. Please try again.');
      }
    });
  }
  
  // Parse a form template HTML to recreate the form
  private parseFormTemplate(template: string): void {
    // Create a temporary container to parse the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = template;
    
    // Clear existing pages
    this.pages = [];
    
    // Find all pages in the template
    const pageElements = tempContainer.querySelectorAll('.form-page');
    
    pageElements.forEach((pageElement, pageIndex) => {
      // Create a new page
      const newPage: FormPage = {
        id: this.generateId('page'),
        elements: []
      };
      
      // Find all elements in the page
      const elementElements = pageElement.querySelectorAll('.form-element');
      
      elementElements.forEach(elementElement => {
        const type = elementElement.getAttribute('data-type') || '';
        const id = elementElement.getAttribute('data-id') || this.generateId(type);
        
        // Get position and size
        const style = (elementElement as HTMLElement).style;
        const x = parseInt(style.left) || 0;
        const y = parseInt(style.top) || 0;
        const width = parseInt(style.width) || undefined;
        const height = parseInt(style.height) || undefined;
        
        // Create element based on type
        let element: FormElement;
        
        switch (type) {
          case 'text':
            const textElement = elementElement.querySelector('.text-element') as HTMLElement;
            
            // Extract styling
            const textFontFamily = textElement?.style.fontFamily || this.selectedFont;
            const textFontSize = textElement?.style.fontSize.replace('px', '') || this.selectedFontSize;
            const textColor = textElement?.style.color || this.textColor;
            const textBgColor = textElement?.style.backgroundColor || 'transparent';
            const textAlign = textElement?.style.textAlign || this.textAlignment;
            
            element = {
              id,
              type,
              x,
              y,
              width,
              height,
              content: textElement ? textElement.innerHTML : '',
              initialContentSet: true,
              fontFamily: textFontFamily,
              fontSize: textFontSize,
              color: textColor,
              backgroundColor: textBgColor,
              textAlign: textAlign
            };
            break;
            
          case 'image':
            const imgElement = elementElement.querySelector('img');
            element = {
              id,
              type,
              x,
              y,
              width,
              height,
              src: imgElement ? imgElement.src : '',
              alt: imgElement ? imgElement.alt : 'Image'
            };
            break;
            
          case 'table':
            const tableElement = elementElement.querySelector('table') as HTMLElement;
            const rows: Array<Array<{ 
              content: string,
              fontFamily?: string,
              fontSize?: string,
              color?: string,
              backgroundColor?: string,
              textAlign?: string
            }>> = [];
            
            // Extract base table styling
            const tableFontFamily = tableElement?.style.fontFamily || this.selectedFont;
            const tableFontSize = tableElement?.style.fontSize.replace('px', '') || this.selectedFontSize;
            const tableColor = tableElement?.style.color || this.textColor;
            const tableBgColor = tableElement?.style.backgroundColor || 'transparent';
            const tableAlign = tableElement?.style.textAlign || 'left';
            
            if (tableElement) {
              const trElements = tableElement.querySelectorAll('tr');
              trElements.forEach(tr => {
                const rowCells: Array<{ 
                  content: string,
                  fontFamily?: string,
                  fontSize?: string,
                  color?: string,
                  backgroundColor?: string,
                  textAlign?: string
                }> = [];
                
                const tdElements = tr.querySelectorAll('td');
                tdElements.forEach(td => {
                  const tdElement = td as HTMLElement;
                  
                  // Extract cell-specific styling
                  const cellFontFamily = tdElement.style.fontFamily || tableFontFamily;
                  const cellFontSize = tdElement.style.fontSize.replace('px', '') || tableFontSize;
                  const cellColor = tdElement.style.color || tableColor;
                  const cellBgColor = tdElement.style.backgroundColor || tableBgColor;
                  const cellAlign = tdElement.style.textAlign || tableAlign;
                  
                  rowCells.push({ 
                    content: tdElement.innerHTML,
                    fontFamily: cellFontFamily,
                    fontSize: cellFontSize,
                    color: cellColor,
                    backgroundColor: cellBgColor,
                    textAlign: cellAlign
                  });
                });
                rows.push(rowCells);
              });
            }
            
            element = {
              id,
              type,
              x,
              y,
              width,
              height,
              fontFamily: tableFontFamily,
              fontSize: tableFontSize,
              color: tableColor,
              backgroundColor: tableBgColor,
              textAlign: tableAlign,
              rows
            };
            break;
            
          case 'shape':
            const shapeElement = elementElement.querySelector('.shape-element') as HTMLElement;
            const shape = shapeElement ? 
              (shapeElement.classList.contains('circle') ? 'circle' : 'rectangle') : 
              'rectangle';
            
            // Extract shape color
            const shapeColor = shapeElement?.style.backgroundColor || 'rgba(200, 200, 200, 0.2)';
            
            element = {
              id,
              type,
              x,
              y,
              width,
              height,
              shape,
              color: shapeColor
            };
            break;
            
          case 'horizontalLine':
            const lineElement = elementElement.querySelector('.horizontal-line-element') as HTMLElement;
            const lineColor = lineElement?.style.backgroundColor || '#333';
            
            element = {
              id,
              type,
              x,
              y,
              width,
              height: 2,
              color: lineColor
            };
            break;
            
          case 'checkbox':
            const checkboxInput = elementElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
            const checkboxLabel = elementElement.querySelector('.checkbox-label') as HTMLElement;
            
            // Extract styling and state
            const isChecked = checkboxInput ? checkboxInput.checked : false;
            const labelText = checkboxLabel ? checkboxLabel.textContent : 'Checkbox label';
            const labelFont = checkboxLabel?.style.fontFamily || this.selectedFont;
            const labelSize = checkboxLabel?.style.fontSize.replace('px', '') || this.selectedFontSize;
            const labelColor = checkboxLabel?.style.color || this.textColor;
            
            element = {
              id,
              type,
              x,
              y,
              width,
              height,
              checked: isChecked,
              label: labelText || 'Checkbox label',
              fontFamily: labelFont,
              fontSize: labelSize,
              color: labelColor
            };
            break;
            
          case 'dropdown':
            const selectElement = elementElement.querySelector('select') as HTMLSelectElement;
            const options: string[] = [];
            
            // Extract options
            if (selectElement) {
              Array.from(selectElement.options).forEach(option => {
                options.push(option.text);
              });
            }
            
            // Extract styling
            const selectFont = selectElement?.style.fontFamily || this.selectedFont;
            const selectSize = selectElement?.style.fontSize.replace('px', '') || this.selectedFontSize;
            const selectColor = selectElement?.style.color || this.textColor;
            
            element = {
              id,
              type,
              x,
              y,
              width,
              height,
              options: options.length > 0 ? options : ['Option 1', 'Option 2', 'Option 3'],
              fontFamily: selectFont,
              fontSize: selectSize,
              color: selectColor
            };
            break;
            
          default:
            element = {
              id,
              type,
              x,
              y,
              width,
              height
            };
        }
        
        newPage.elements.push(element);
      });
      
      this.pages.push(newPage);
    });
    
    // If no pages were created, add a default empty page
    if (this.pages.length === 0) {
      this.addNewPage();
    }
    
    // Set current page to the first page
    this.currentPage = 0;
  }
  
  // Change zoom level by percentage
  changeZoom(zoomLevel: number): void {
    if (zoomLevel >= 50 && zoomLevel <= 200) {
      this.zoomLevel = zoomLevel;
      this.applyZoom();
    }
  }
  
  // Add a keyboard shortcut for copy/paste and common operations
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    // Check if Control/Command key is pressed
    const ctrlKey = event.ctrlKey || event.metaKey;
    
    if (ctrlKey) {
      switch (event.key.toLowerCase()) {
        case 's': // Save
          event.preventDefault();
          this.saveForm();
          break;
          
        case 'b': // Bold
          event.preventDefault();
          this.toggleFormat('bold');
          break;
          
        case 'i': // Italic
          event.preventDefault();
          this.toggleFormat('italic');
          break;
          
        case 'u': // Underline
          event.preventDefault();
          this.toggleFormat('underline');
          break;
          
        case '+':
        case '=': // Zoom in
          event.preventDefault();
          this.zoomIn();
          break;
          
        case '-': // Zoom out
          event.preventDefault();
          this.zoomOut();
          break;
          
        case '0': // Reset zoom
          event.preventDefault();
          this.resetZoom();
          break;
          
        case 'delete':
        case 'backspace':
          // Delete selected element if one is selected and not editing text
          if (this.selectedElement && !document.activeElement?.hasAttribute('contenteditable')) {
            event.preventDefault();
            const pageIndex = this.currentPage;
            this.deleteElement(pageIndex, this.selectedElement);
          }
          break;
      }
    }
  }
}