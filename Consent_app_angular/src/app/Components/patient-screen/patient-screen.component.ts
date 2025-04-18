import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Patient {
  name: string;
  age: number;
  address: string;
  surgery: string;
  date: Date;
}

@Component({
  selector: 'app-patient-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-screen.component.html',
  styleUrl: './patient-screen.component.css'
})
export class PatientScreenComponent {
  patients: Patient[] = [
    {
      name: 'John Smith',
      age: 45,
      address: '123 Main St, New York, NY',
      surgery: 'Knee Replacement',
      date: new Date(2025, 3, 25)
    },
    {
      name: 'Sarah Johnson',
      age: 32,
      address: '456 Park Ave, Boston, MA',
      surgery: 'Appendectomy',
      date: new Date(2025, 3, 28)
    },
    {
      name: 'Michael Brown',
      age: 58,
      address: '789 Oak Dr, Chicago, IL',
      surgery: 'Hip Replacement',
      date: new Date(2025, 4, 3)
    },
    {
      name: 'Emma Wilson',
      age: 29,
      address: '234 Elm St, San Francisco, CA',
      surgery: 'Tonsillectomy',
      date: new Date(2025, 4, 10)
    },
    {
      name: 'Robert Garcia',
      age: 51,
      address: '567 Pine Rd, Miami, FL',
      surgery: 'Cataract Surgery',
      date: new Date(2025, 4, 15)
    }
  ];
}