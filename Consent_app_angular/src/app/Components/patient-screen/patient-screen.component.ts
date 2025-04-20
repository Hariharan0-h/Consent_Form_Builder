import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface Patient {
  name: string;
  age: number;
  address: string;
  surgery: string;
  date: Date;
  eye?: string;
  diagnosis?: string;
  uin?: string;
  gender?: string;
}

@Component({
  selector: 'app-patient-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './patient-screen.component.html',
  styleUrl: './patient-screen.component.css'
})
export class PatientScreenComponent implements AfterViewInit {
  @ViewChild('modalContainer') modalContainer!: ElementRef;
  
  patients: Patient[] = [
    {
      name: 'John Cena',
      age: 45,
      address: 'Madurai 28, Aarapalayam',
      surgery: 'RE Lens Replacement',
      date: new Date(2025, 3, 25),
      gender: 'Male'
    },
    {
      name: 'Ajith Kumar',
      age: 32,
      address: 'Maatuthavani, Main Road, 45',
      surgery: 'Appendectomy',
      date: new Date(2025, 3, 28),
      gender: 'Male'
    },
    {
      name: 'Michael Jackson',
      age: 58,
      address: 'New Delhi',
      surgery: 'Lens Replacement BE',
      date: new Date(2025, 4, 3),
      gender: 'Male'
    },
    {
      name: 'Anushka',
      age: 29,
      address: 'Pallavaram, Chennai',
      surgery: 'Retinopathy',
      date: new Date(2025, 4, 10),
      gender: 'Female'
    },
    {
      name: 'MS Dhoni',
      age: 51,
      address: 'Chepauk, Madras',
      surgery: 'Cataract Surgery',
      date: new Date(2025, 4, 15),
      uin: 'AEH2025105',
      eye: 'Right',
      diagnosis: 'Cataract - Right Eye',
      gender: 'Male'
    }
  ];

  selectedPatient: Patient | null = null;
  showModal: boolean = false;
  formPatient: Patient | null = null;
  modalHtml: SafeHtml | null = null;
  isLoading: boolean = false;
  apiError: boolean = false;

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  ngAfterViewInit() {
    // Initialize any needed DOM manipulations here
  }

  selectPatient(patient: Patient): void {
    this.selectedPatient = patient;
    this.formPatient = {...patient}; // Create a copy to avoid modifying the original directly
    this.loadModalTemplate(patient);
  }

  loadModalTemplate(patient: Patient): void {
    this.isLoading = true;
    this.apiError = false;
    this.showModal = true;
    
    // Use the specific API endpoint provided
    const endpoint = 'https://localhost:7073/api/models/6';
    
    this.http.get(endpoint, { responseType: 'text' }).subscribe({
      next: (htmlContent) => {
        // Process the HTML content to replace placeholders with patient data
        const processedHtml = this.processHtmlTemplate(htmlContent, patient);
        // Sanitize the HTML to prevent XSS attacks
        this.modalHtml = this.sanitizer.bypassSecurityTrustHtml(processedHtml);
        this.isLoading = false;
        
        // After HTML is loaded and rendered, we need to initialize form values
        setTimeout(() => {
          this.initializeFormValues();
        }, 100);
      },
      error: (err) => {
        console.error('Error fetching form template:', err);
        this.isLoading = false;
        this.apiError = true;
      }
    });
  }

  processHtmlTemplate(html: string, patient: Patient): string {
    // Replace placeholders in the HTML with patient data
    let processedHtml = html;
    
    // Replace all the placeholders with actual values
    Object.entries(patient).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      
      // Format date properly if it's a Date object
      if (value instanceof Date) {
        processedHtml = processedHtml.replace(placeholder, value.toLocaleDateString());
      } else {
        processedHtml = processedHtml.replace(placeholder, String(value));
      }
    });
    
    return processedHtml;
  }

  initializeFormValues(): void {
    // After the HTML is loaded, we need to find form elements and set values
    if (!this.modalContainer) return;
    
    const formElement = this.modalContainer.nativeElement.querySelector('form');
    if (!formElement || !this.formPatient) return;
    
    // Find all input elements and set their values based on formPatient
    const inputs = formElement.querySelectorAll('input, select, textarea');
    inputs.forEach((input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
      const fieldName = input.getAttribute('name');
      if (fieldName && fieldName in this.formPatient!) {
        const value = (this.formPatient as any)[fieldName];
        
        // Handle date inputs specially
        if (input.type === 'date' && value instanceof Date) {
          // Format as YYYY-MM-DD for date inputs
          const formattedDate = value.toISOString().split('T')[0];
          input.value = formattedDate;
        } else {
          input.value = value;
        }
      }
    });
    
    // Add event listeners to form fields to update formPatient
    inputs.forEach((input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
      input.addEventListener('input', (event) => this.updateFormPatient(event));
    });
    
    // Add event listener to form submission
    formElement.addEventListener('submit', (event: Event) => {
      event.preventDefault();
      this.savePatientData();
    });

    // Add event listeners to buttons inside the form
    const saveButton = formElement.querySelector('.save-btn, button[type="submit"]');
    if (saveButton) {
      saveButton.addEventListener('click', (event: Event) => {
        event.preventDefault();
        this.savePatientData();
      });
    }

    const cancelButton = formElement.querySelector('.cancel-btn');
    if (cancelButton) {
      cancelButton.addEventListener('click', (event: Event) => {
        event.preventDefault();
        this.closeModal();
      });
    }
  }

  updateFormPatient(event: Event): void {
    if (!this.formPatient) return;
    
    const input = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const fieldName = input.getAttribute('name');
    
    if (fieldName && fieldName in this.formPatient) {
      // Handle different input types
      if (input.type === 'number') {
        (this.formPatient as any)[fieldName] = parseFloat(input.value);
      } else if (input.type === 'date') {
        (this.formPatient as any)[fieldName] = new Date(input.value);
      } else {
        (this.formPatient as any)[fieldName] = input.value;
      }
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.modalHtml = null;
    this.selectedPatient = null;
    this.formPatient = null;
  }

  savePatientData(): void {
    if (this.formPatient && this.selectedPatient) {
      // Find the index of the selected patient in the array
      const index = this.patients.findIndex(p => p === this.selectedPatient);
      if (index !== -1) {
        // Update the patient data in the array
        this.patients[index] = {...this.formPatient};
        
        // Here you would typically call an API to persist the changes
        // this.http.put(`/api/patients/${this.formPatient.id}`, this.formPatient).subscribe(...);
      }
    }
    this.closeModal();
  }
}