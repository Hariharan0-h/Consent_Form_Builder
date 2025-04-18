import { Routes } from '@angular/router';
import { FormBuilderComponent } from './Components/form-builder/form-builder.component';
import { PatientScreenComponent } from './Components/patient-screen/patient-screen.component';
import { FilemanagerComponent } from './Components/filemanager/filemanager.component';

export const routes: Routes = [
    {path:'', component: FormBuilderComponent},
    {path:'patients', component: PatientScreenComponent},
    {path:'files', component: FilemanagerComponent}
];
