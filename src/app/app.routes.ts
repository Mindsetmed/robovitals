import { Routes } from '@angular/router';
import { captureSessionGuard } from './mindset/capture-session.guard';
import { HomeComponent } from './pages/home/home.component';
import { InstructionsRedirectComponent } from './pages/instructions/instructions-redirect.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'instructions', pathMatch: 'full', component: InstructionsRedirectComponent },
  {
    path: 'capture',
    loadComponent: () => import('./pages/capture/vitals-capture.component').then((m) => m.VitalsCaptureComponent),
    canActivate: [captureSessionGuard],
  },
  { path: '**', redirectTo: '' },
];
