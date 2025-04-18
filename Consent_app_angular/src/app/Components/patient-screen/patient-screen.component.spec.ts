import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientScreenComponent } from './patient-screen.component';

describe('PatientScreenComponent', () => {
  let component: PatientScreenComponent;
  let fixture: ComponentFixture<PatientScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
