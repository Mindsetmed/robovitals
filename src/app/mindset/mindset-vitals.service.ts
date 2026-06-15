import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MindsetVitalsCaptureRequest {
  pulseRate?: number;
  breathingRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenSaturation?: number;
  rawSdkResponse?: string;
  vitals?: unknown;
  sdkVitalsPayload?: unknown;
}

export interface MindsetPatientRegistration {
  memberId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  temperature?: number | null;
}

export interface MindsetVitalsPatientStatus {
  found: boolean;
  message?: string;
}

export interface MindsetVitalsCaptureResponse {
  success: boolean;
  message: string;
  pulseRate?: number;
  breathingRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenSaturation?: number;
  submittedAt: string;
}

export interface RoboVitalVitalsSaveRequestDTO {
  vitals: Array<{
    requestUuId: string;
    patientId: string;
    pulse?: number;
    systolicBloodPressure?: number;
    diastolicBloodPressure?: number;
    oxygenSaturationAtRestValue?: number;
    respirationRate?: number;
    temperature?: number;
    height?: number;
    weight?: number;
    createdDate?: string;
  }>;
}

export interface RoboVitalSaveResultDTO {
  responseCode?: string;
  statusMessage?: string;
  results?: Array<{
    requestUuId?: string;
    status?: string;
    syncedRecordId?: string;
    syncErrorReason?: string;
  }>;
}

export interface RoboVitalRegisterPatientRequestDTO {
  patientId: string;
  temperature?: number;
  height?: number;
  weight?: number;
}

export interface RoboVitalRegisterPatientResultDTO {
  success?: boolean;
  message?: string;
  patientId?: string;
  localPatientRecordId?: string;
}

@Injectable({ providedIn: 'root' })
export class MindsetVitalsService {
  private readonly apiUrl = this.normalizeBase(environment.apiBaseUrl) + 'api/mindset-vitals/patients';
  private readonly roboVitalSandboxSaveUrl =
    this.normalizeBase(environment.apiBaseUrl) + 'api/v1/clinical/sandbox/patients/save';
  private readonly roboVitalSandboxRegisterUrl =
    this.normalizeBase(environment.apiBaseUrl) + 'api/v1/clinical/sandbox/patients/register';
  private readonly roboVitalSandboxApiKey = environment.roboVitalSandboxApiKey;
  private readonly roboVitalSandboxApiSecret = environment.roboVitalSandboxApiSecret;

  constructor(private http: HttpClient) {}

  private normalizeBase(base: string): string {
    const trimmed = (base || '/').trim();
    return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
  }

  private roboVitalHeaders(): HttpHeaders {
    return new HttpHeaders()
      .set('X-Api-Key', this.roboVitalSandboxApiKey)
      .set('X-Api-Secret', this.roboVitalSandboxApiSecret);
  }

  lookupPatient(patientId: string): Observable<MindsetVitalsPatientStatus> {
    return this.http.post<MindsetVitalsPatientStatus>(
      `${this.apiUrl}/${encodeURIComponent(patientId)}`,
      {},
      { params: { checkOnly: 'true' } },
    );
  }

  createPatient(
    patientId: string,
    request?: MindsetPatientRegistration,
  ): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.apiUrl}/${encodeURIComponent(patientId)}`,
      request ?? {},
    );
  }

  authorizeVitals(
    patientId: string,
    runToken: unknown,
  ): Observable<{
    success: boolean;
    vitalCoreAuth?: { authToken?: string; vitals?: Array<{ tag?: string }> };
    message?: string;
    error?: string;
    notificationType?: string;
  }> {
    return this.http.post<{
      success: boolean;
      vitalCoreAuth?: { authToken?: string; vitals?: Array<{ tag?: string }> };
      message?: string;
      error?: string;
      notificationType?: string;
    }>(`${this.apiUrl}/${encodeURIComponent(patientId)}/authorize`, { runToken });
  }

  captureVitals(patientId: string, request: MindsetVitalsCaptureRequest): Observable<MindsetVitalsCaptureResponse> {
    return this.http.post<MindsetVitalsCaptureResponse>(
      `${this.apiUrl}/${encodeURIComponent(patientId)}/capture`,
      request,
    );
  }

  saveRoboVitalSandboxVitals(request: RoboVitalVitalsSaveRequestDTO): Observable<RoboVitalSaveResultDTO> {
    return this.http.post<RoboVitalSaveResultDTO>(this.roboVitalSandboxSaveUrl, request, {
      headers: this.roboVitalHeaders(),
    });
  }

  registerRoboVitalSandboxPatient(
    patientId: string,
    demographics?: { temperature?: number; heightCm?: number | null; weightKg?: number | null },
  ): Observable<RoboVitalRegisterPatientResultDTO> {
    return this.http.post<RoboVitalRegisterPatientResultDTO>(
      this.roboVitalSandboxRegisterUrl,
      {
        patientId,
        temperature: demographics?.temperature ?? 0,
        height: demographics?.heightCm ?? 0,
        weight: demographics?.weightKg ?? 0,
      } satisfies RoboVitalRegisterPatientRequestDTO,
      { headers: this.roboVitalHeaders() },
    );
  }

  saveRoboVitalPatientRegistration(
    patientId: string,
    demographics: { temperature?: number; heightCm?: number | null; weightKg?: number | null },
  ): Observable<RoboVitalSaveResultDTO> {
    const requestUuId =
      (globalThis.crypto as Crypto | undefined)?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return this.saveRoboVitalSandboxVitals({
      vitals: [
        {
          requestUuId,
          patientId,
          temperature: demographics.temperature ?? 0,
          height: demographics.heightCm ?? 0,
          weight: demographics.weightKg ?? 0,
          pulse: 0,
          systolicBloodPressure: 0,
          diastolicBloodPressure: 0,
          oxygenSaturationAtRestValue: 0,
          respirationRate: 0,
          createdDate: new Date().toISOString(),
        },
      ],
    });
  }
}
