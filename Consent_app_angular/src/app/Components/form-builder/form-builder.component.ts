import { Component, OnInit, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
  rows?: Array<Array<{ content: string }>>;
  shape?: string;
  initialContentSet?: boolean;
}

interface FormPage {
  id: string;
  elements: FormElement[];
}

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './form-builder.component.html',
  styleUrl: './form-builder.component.css'
})
export class FormBuilderComponent implements OnInit {
  // Text formatting state
  textFormatting = {
    bold: false,
    italic: false,
    underline: false
  };
  
  // Font settings
  availableFonts = ['Arial', 'Times New Roman', 'Calibri', 'Poppins', 'Roboto', 'Helvetica'];
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
  
  // Drag and drop state
  isDragging = false;
  isResizing = false;
  currentElement: FormElement | null = null;
  offsetX = 0;
  offsetY = 0;
  initialWidth = 0;
  initialHeight = 0;
  
  // Counter for generating unique IDs
  private idCounter = 1;

  constructor() { }

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
  }

  // Select font
  selectFont(font: string): void {
    this.selectedFont = font;
    document.execCommand('fontName', false, font);
  }

  // Select font size
  selectFontSize(size: string): void {
    this.selectedFontSize = size;
    document.execCommand('fontSize', false, size);
  }

  // Set text alignment
  setAlignment(alignment: 'left' | 'center' | 'right' | 'justify'): void {
    this.textAlignment = alignment;
    document.execCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`, false);
  }

  // Apply text color
  applyTextColor(): void {
    document.execCommand('foreColor', false, this.textColor);
  }

  // Apply highlight color
  applyHighlightColor(): void {
    document.execCommand('hiliteColor', false, this.highlightColor);
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
          initialContentSet: false
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
          rows: [
            [{ content: 'Header 1' }, { content: 'Header 2' }, { content: 'Header 3' }],
            [{ content: 'Cell 1' }, { content: 'Cell 2' }, { content: 'Cell 3' }],
            [{ content: 'Cell 4' }, { content: 'Cell 5' }, { content: 'Cell 6' }]
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
          shape: 'rectangle' // Default shape
        };
        break;
        
      case 'horizontalLine':
        element = {
          id: this.generateId('horizontalLine'),
          type: 'horizontalLine',
          x,
          y,
          width: 300,
          height: 2
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
    
    // Calculate offset for smooth dragging
    const elementDOM = (event.target as HTMLElement).closest('.form-element');
    if (elementDOM) {
      const rect = elementDOM.getBoundingClientRect();
      this.offsetX = event.clientX - rect.left;
      this.offsetY = event.clientY - rect.top;
      
      // Add selected class
      elementDOM.classList.add('selected');
    }
  }

  // Start resizing an element
  startResize(event: MouseEvent, element: FormElement): void {
    event.stopPropagation();
    this.isResizing = true;
    this.currentElement = element;
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
    if (this.isDragging || this.isResizing) {
      // Remove selected class from all elements
      document.querySelectorAll('.form-element.selected').forEach(el => {
        el.classList.remove('selected');
      });
    }
    
    this.isDragging = false;
    this.isResizing = false;
    this.currentElement = null;
  }

  // Delete an element
  deleteElement(pageIndex: number, element: FormElement): void {
    const elementIndex = this.pages[pageIndex].elements.findIndex(e => e.id === element.id);
    if (elementIndex !== -1) {
      this.pages[pageIndex].elements.splice(elementIndex, 1);
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
            }
          }
          
          // For table elements, update cell content
          else if (element.type === 'table' && element.rows) {
            const tableCells = elementDOM.querySelectorAll('td');
            let cellIndex = 0;
            
            for (let i = 0; i < element.rows.length; i++) {
              for (let j = 0; j < element.rows[i].length; j++) {
                if (cellIndex < tableCells.length) {
                  element.rows[i][j].content = tableCells[cellIndex].innerHTML;
                  cellIndex++;
                }
              }
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
  }
  
  // Handle blur event for text element
  onTextBlur(event: FocusEvent, pageIndex: number, element: FormElement): void {
    if (event.target) {
      const content = (event.target as HTMLElement).innerHTML;
      element.content = content;
      console.log(`Saved text content on blur: ${content}`);
    }
  }
  
  // Handle table cell focus
  onTableCellFocus(event: FocusEvent, pageIndex: number, element: FormElement, rowIndex: number, cellIndex: number): void {
    if (event.target && element.rows && element.rows[rowIndex] && element.rows[rowIndex][cellIndex]) {
      const cell = event.target as HTMLElement;
      const content = element.rows[rowIndex][cellIndex].content;
      
      // Set the content only on focus - this allows normal editing
      cell.innerHTML = content || '';
    }
  }
  
  // Handle table cell blur
  onTableCellBlur(event: FocusEvent, pageIndex: number, element: FormElement, rowIndex: number, cellIndex: number): void {
    if (event.target && element.rows && element.rows[rowIndex] && element.rows[rowIndex][cellIndex]) {
      const content = (event.target as HTMLElement).innerHTML;
      element.rows[rowIndex][cellIndex].content = content;
      console.log(`Saved table cell content on blur: ${content}`);
    }
  }
  
  // Update table cell content on input event - deprecated but kept for reference
  onTableCellInput(event: Event, pageIndex: number, element: FormElement, rowIndex: number, cellIndex: number): void {
    if (event.target && element.rows && element.rows[rowIndex] && element.rows[rowIndex][cellIndex]) {
      // Just update the model without modifying the DOM
      const content = (event.target as HTMLElement).innerHTML;
      element.rows[rowIndex][cellIndex].content = content;
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
              textDiv.style.fontFamily = 'Arial, sans-serif';
              
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
                for (const row of element.rows) {
                  const tr = document.createElement('tr');
                  for (const cell of row) {
                    const td = document.createElement('td');
                    td.style.border = '1px solid #ddd';
                    td.style.padding = '8px';
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
              
              shape.style.backgroundColor = 'rgba(200, 200, 200, 0.2)';
              shape.style.border = '1px solid #ccc';
              elementDiv.appendChild(shape);
              break;
              
            case 'horizontalLine':
              const line = document.createElement('div');
              line.style.width = '100%';
              line.style.height = '2px';
              line.style.backgroundColor = '#333';
              elementDiv.appendChild(line);
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
      pdf.save('form-document.pdf');
      
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
              console.log(`Updated text content before PDF export:`, element.content);
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
                  element.rows[i][j].content = tableCells[cellIndex].innerHTML;
                  cellIndex++;
                }
              }
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

  // Save the form state
  saveForm(): void {
    // First update content from DOM
    this.updateElementsContentFromDOM();
    
    const formData = {
      pages: this.pages,
      lastUpdated: new Date().toISOString()
    };
    
    // This would typically save to a backend API
    // For now, we'll save to localStorage as an example
    localStorage.setItem('savedFormData', JSON.stringify(formData));
    
    alert('Form saved successfully!');
  }

  // Load a saved form (example implementation)
  loadSavedForm(): void {
    const savedForm = localStorage.getItem('savedFormData');
    if (savedForm) {
      const formData = JSON.parse(savedForm);
      this.pages = formData.pages;
      this.currentPage = 0;
      alert('Form loaded successfully!');
    } else {
      alert('No saved form found.');
    }
  }
}