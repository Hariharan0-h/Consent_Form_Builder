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
          content: 'Click to edit text'
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
          x: 0,
          y,
          width: 672 // Width of page content (816px - 72px*2 margins)
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
  
  // Update text content on blur event
  updateTextContent(event: FocusEvent, pageIndex: number, element: FormElement): void {
    if (event.target) {
      const content = (event.target as HTMLElement).innerHTML;
      element.content = content;
    }
  }
  
  // Update table cell content on blur event
  updateTableCell(event: FocusEvent, pageIndex: number, element: FormElement, rowIndex: number, cellIndex: number): void {
    if (event.target && element.rows && element.rows[rowIndex] && element.rows[rowIndex][cellIndex]) {
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
    
    // Instead of trying to update the model and then re-render to a temp container,
    // directly use the actual DOM elements for PDF generation
    const pages = document.querySelectorAll('.document-page');
    if (!pages.length) {
      alert('No pages found to export.');
      return;
    }
    
    try {
      // Process each page directly from DOM
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // We need to make a clone of the page to avoid modifying the actual DOM
        const clonedPage = page.cloneNode(true) as HTMLElement;
        
        // Apply styling to ensure proper rendering
        clonedPage.style.width = '816px'; // Letter width in pixels
        clonedPage.style.height = '1056px'; // Letter height in pixels
        clonedPage.style.position = 'absolute';
        clonedPage.style.left = '-9999px';
        clonedPage.style.top = '-9999px';
        clonedPage.style.backgroundColor = 'white';
        
        // Remove any unnecessary elements that shouldn't appear in PDF
        const controlsToRemove = clonedPage.querySelectorAll('.element-controls');
        controlsToRemove.forEach(control => control.remove());
        
        // Ensure text elements maintain their content
        const textElements = clonedPage.querySelectorAll('.text-element');
        textElements.forEach(textEl => {
          // Make sure contenteditable is off for export
          (textEl as HTMLElement).setAttribute('contenteditable', 'false');
        });
        
        // Ensure table cells maintain their content
        const tableCells = clonedPage.querySelectorAll('td[contenteditable="true"]');
        tableCells.forEach(cell => {
          // Turn off contenteditable for export
          (cell as HTMLElement).setAttribute('contenteditable', 'false');
        });
        
        // Add to body temporarily for rendering
        document.body.appendChild(clonedPage);
        
        // Generate canvas from the actual DOM page
        const canvas = await html2canvas(clonedPage, {
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
        
        // Remove the cloned page from DOM
        document.body.removeChild(clonedPage);
      }
      
      // Save the PDF
      pdf.save('form-document.pdf');
      
      // After exporting, sync the DOM content back to our model for saving
      this.updateElementsContentFromDOM();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    }
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