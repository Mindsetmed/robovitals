import { Injectable } from '@angular/core';
import { MindsetPatientRegistration } from './mindset-vitals.service';

export interface VitalsCaptureSession {
  patientId: string;
  registration: MindsetPatientRegistration | null;
  mindsetPatientAlreadyRegistered: boolean;
}

@Injectable({ providedIn: 'root' })
export class CaptureSessionService {
  private activeSession: VitalsCaptureSession | null = null;
  private persistedHomeSession: VitalsCaptureSession | null = null;

  setSession(session: VitalsCaptureSession): void {
    this.activeSession = session;
    this.persistedHomeSession = session;
  }

  hasActiveSession(): boolean {
    return !!this.activeSession?.patientId;
  }

  getSession(): VitalsCaptureSession {
    if (!this.activeSession?.patientId) {
      throw new Error('No active vitals capture session.');
    }
    return this.activeSession;
  }

  getPersistedHomeSession(): VitalsCaptureSession | null {
    return this.persistedHomeSession;
  }

  clearActiveSession(): void {
    this.activeSession = null;
  }

  clearSession(): void {
    this.clearActiveSession();
  }

  clearAll(): void {
    this.activeSession = null;
    this.persistedHomeSession = null;
  }
}
