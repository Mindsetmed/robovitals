import { Injectable } from '@angular/core';
import { MindsetPatientRegistration } from './mindset-vitals.service';

export interface VitalsCaptureSession {
  patientId: string;
  registration: MindsetPatientRegistration | null;
  mindsetPatientAlreadyRegistered: boolean;
}

@Injectable({ providedIn: 'root' })
export class CaptureSessionService {
  private session: VitalsCaptureSession | null = null;

  setSession(session: VitalsCaptureSession): void {
    this.session = session;
  }

  hasActiveSession(): boolean {
    return !!this.session?.patientId;
  }

  getSession(): VitalsCaptureSession {
    if (!this.session?.patientId) {
      throw new Error('No active vitals capture session.');
    }
    return this.session;
  }

  clearSession(): void {
    this.session = null;
  }
}
