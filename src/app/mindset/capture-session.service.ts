import { Injectable } from '@angular/core';
import { MindsetPatientRegistration } from './mindset-vitals.service';

export interface VitalsCaptureSession {
  patientId: string;
  registration: MindsetPatientRegistration | null;
  mindsetPatientAlreadyRegistered: boolean;
}

interface DoneRestartSnapshot {
  patientId: string;
  registration: MindsetPatientRegistration | null;
  mindsetPatientAlreadyRegistered: boolean;
  expiresAt: number;
}

const DONE_RESTART_STORAGE_KEY = 'hg-vitals-done-restart';
const DONE_RESTART_TTL_MS = 60_000;

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
    this.clearDoneRestartSnapshot();
  }

  saveDoneRestartSnapshot(
    session: VitalsCaptureSession,
    ttlMs: number = DONE_RESTART_TTL_MS,
  ): void {
    if (typeof window === 'undefined' || !session.patientId.trim()) {
      return;
    }

    const snapshot: DoneRestartSnapshot = {
      patientId: session.patientId.trim(),
      registration: session.registration,
      mindsetPatientAlreadyRegistered: session.mindsetPatientAlreadyRegistered,
      expiresAt: Date.now() + ttlMs,
    };

    try {
      window.localStorage.setItem(DONE_RESTART_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
    }
  }

  consumeDoneRestartSnapshot(): VitalsCaptureSession | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(DONE_RESTART_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      window.localStorage.removeItem(DONE_RESTART_STORAGE_KEY);
      const parsed = JSON.parse(raw) as Partial<DoneRestartSnapshot>;
      const patientId = typeof parsed.patientId === 'string' ? parsed.patientId.trim() : '';
      const expiresAt = typeof parsed.expiresAt === 'number' ? parsed.expiresAt : 0;

      if (!patientId || expiresAt <= Date.now()) {
        return null;
      }

      return {
        patientId,
        registration:
          parsed.registration && typeof parsed.registration === 'object'
            ? (parsed.registration as MindsetPatientRegistration)
            : null,
        mindsetPatientAlreadyRegistered: !!parsed.mindsetPatientAlreadyRegistered,
      };
    } catch {
      this.clearDoneRestartSnapshot();
      return null;
    }
  }

  clearDoneRestartSnapshot(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.removeItem(DONE_RESTART_STORAGE_KEY);
    } catch {
    }
  }
}
