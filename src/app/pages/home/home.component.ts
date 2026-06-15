import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import {
  MindsetPatientRegistration,
  MindsetVitalsPatientStatus,
  MindsetVitalsService,
} from '../../mindset/mindset-vitals.service';
import { MindsetVitalsSdkRuntimeService } from '../../mindset/mindset-vitals-sdk-runtime.service';
import { CaptureSessionService } from '../../mindset/capture-session.service';
import {
  extractMindsetVitalsApiErrorMessage,
  isMindsetVitalsServiceUnavailableMessage,
  normalizePatientLookupMessage,
} from '../../mindset/mindset-vitals-http-errors';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class HomeComponent implements OnInit, OnDestroy {
  patientFoundInMindset = false;
  isLookingUpPatient = false;
  isProcessing = false;
  alertMessage = '';
  alertType: 'info' | 'warning' | 'success' | 'danger' = 'info';
  sdkWarmupLoading = false;
  sdkWarmupReady = false;
  preloadPercent = 0;
  isCrossOriginIsolated = false;

  readonly isolationRequiredMessage =
    'Cross-origin isolation is required for vitals capture. Configure COOP/COEP headers on the host.';

  private lastLookedUpPatientId = '';
  private readonly patientIdLookup$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  form;

  constructor(
    private fb: FormBuilder,
    private mindsetVitalsService: MindsetVitalsService,
    private mindsetSdkRuntime: MindsetVitalsSdkRuntimeService,
    private captureSession: CaptureSessionService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      patientId: ['', Validators.required],
      email: [''],
      firstName: [''],
      lastName: [''],
      birthDate: [''],
      heightCm: [null as number | null],
      weightKg: [null as number | null],
      temperature: [null as number | null],
    });
  }

  ngOnInit(): void {
    document.body.classList.add('hg-landing-page');
    document.body.classList.remove('hg-capture-page');
    this.isCrossOriginIsolated = typeof window !== 'undefined' && window.crossOriginIsolated;
    if (this.isCrossOriginIsolated) {
      if (this.mindsetSdkRuntime.isWarmupReady()) {
        this.sdkWarmupReady = true;
        this.sdkWarmupLoading = false;
        this.preloadPercent = 100;
      } else {
        this.startSdkWarmup();
      }
    }
    this.initPatientIdLookup();
    this.form.controls.patientId.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.onPatientIdChanged();
    });
    this.mindsetSdkRuntime.preloadProgress$.pipe(takeUntil(this.destroy$)).subscribe((progress) => {
      this.preloadPercent = progress.percent;
      if (progress.ready) {
        this.sdkWarmupReady = true;
        this.sdkWarmupLoading = false;
      } else if (!this.sdkWarmupReady && this.showWarmupProgress) {
        this.sdkWarmupLoading = true;
      }
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('hg-landing-page', 'hg-capture-page');
    this.destroy$.next();
    this.destroy$.complete();
  }

  get showRegistrationFields(): boolean {
    const patientId = (this.form.controls.patientId.value || '').trim();
    return (
      !!patientId &&
      !this.isLookingUpPatient &&
      this.lastLookedUpPatientId === patientId &&
      !this.patientFoundInMindset
    );
  }

  get captureDisabled(): boolean {
    return this.isProcessing || this.isLookingUpPatient || (this.isCrossOriginIsolated && !this.sdkWarmupReady);
  }

  get showWarmupProgress(): boolean {
    return this.mindsetSdkRuntime.shouldShowWarmupProgress();
  }

  onGenerateId(): void {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(10000 + Math.random() * 90000);
    this.form.reset({
      patientId: `CH-${yy}${mm}${dd}-${random}`,
      email: '',
      firstName: '',
      lastName: '',
      birthDate: '',
      heightCm: null,
      weightKg: null,
      temperature: null,
    });
    this.onPatientIdChanged();
  }

  onCaptureClick(): void {
    if (!this.isCrossOriginIsolated) {
      this.setAlert('danger', this.isolationRequiredMessage);
      return;
    }

    if (!this.sdkWarmupReady) {
      this.setAlert('info', 'AI models are still loading. Please wait a moment.');
      return;
    }

    const patientId = (this.form.controls.patientId.value || '').trim();
    if (!patientId) {
      this.setAlert('danger', 'Patient ID is required.');
      return;
    }

    if (this.lastLookedUpPatientId !== patientId) {
      this.isProcessing = true;
      this.mindsetVitalsService.lookupPatient(patientId).subscribe({
        next: (status) => {
          this.isProcessing = false;
          this.applyPatientLookupUi(status);
          if (!isMindsetVitalsServiceUnavailableMessage(status?.message)) {
            this.proceedToCapture(patientId);
          }
        },
        error: (err) => {
          this.isProcessing = false;
          const message = extractMindsetVitalsApiErrorMessage(err) ?? 'Unable to look up patient.';
          this.applyPatientLookupUi({ found: false, message });
          if (!isMindsetVitalsServiceUnavailableMessage(message)) {
            this.proceedToCapture(patientId);
          }
        },
      });
      return;
    }

    this.proceedToCapture(patientId);
  }

  private proceedToCapture(patientId: string): void {
    if (this.patientFoundInMindset) {
      this.openCapture(patientId, true);
      return;
    }

    if (!this.validateRegistration()) {
      return;
    }

    this.isProcessing = true;
    this.setAlert('info', 'Creating patient...');
    this.mindsetVitalsService.createPatient(patientId, this.buildRegistration()).subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (!response?.success) {
          this.setAlert('danger', response?.message || 'Failed to create patient.');
          return;
        }

        this.patientFoundInMindset = true;
        this.lastLookedUpPatientId = patientId;
        this.setAlert('success', response?.message || 'Patient created successfully.');
        this.openCapture(patientId, false);
      },
      error: (err) => {
        this.isProcessing = false;
        this.setAlert(
          'danger',
          extractMindsetVitalsApiErrorMessage(err) || 'Failed to create patient.',
        );
      },
    });
  }

  private openCapture(patientId: string, mindsetPatientAlreadyRegistered: boolean): void {
    this.mindsetSdkRuntime.setPatientId(patientId);
    this.captureSession.setSession({
      patientId,
      registration: this.buildRegistration(),
      mindsetPatientAlreadyRegistered,
    });

    if (this.mindsetSdkRuntime.isWarmupReady()) {
      void this.router.navigate(['/capture']);
      return;
    }

    this.isProcessing = true;
    void this.mindsetSdkRuntime
      .warmUp()
      .then(() => this.router.navigate(['/capture']))
      .catch(() => {
        this.captureSession.clearSession();
        this.setAlert('danger', 'Failed to prepare vitals scanner. Please wait for models to finish loading and retry.');
      })
      .finally(() => {
        this.isProcessing = false;
      });
  }

  private onPatientIdChanged(): void {
    const patientId = (this.form.controls.patientId.value || '').trim();
    if (!patientId) {
      this.lastLookedUpPatientId = '';
      this.patientFoundInMindset = false;
      this.isLookingUpPatient = false;
      this.alertMessage = '';
      return;
    }

    if (patientId === this.lastLookedUpPatientId) {
      return;
    }

    this.patientFoundInMindset = false;
    this.patientIdLookup$.next(patientId);
  }

  private initPatientIdLookup(): void {
    this.patientIdLookup$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((patientId) => {
          this.isLookingUpPatient = true;
          this.setAlert('info', 'Looking up patient record...');
          return this.mindsetVitalsService.lookupPatient(patientId).pipe(
            catchError((err) =>
              of<MindsetVitalsPatientStatus>({
                found: false,
                message:
                  extractMindsetVitalsApiErrorMessage(err) ?? 'Unable to look up patient.',
              }),
            ),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((status) => {
        this.isLookingUpPatient = false;
        this.applyPatientLookupUi(status);
      });
  }

  private applyPatientLookupUi(status: MindsetVitalsPatientStatus): void {
    const patientId = (this.form.controls.patientId.value || '').trim();
    this.lastLookedUpPatientId = patientId;
    this.patientFoundInMindset = !!status?.found;

    if (this.patientFoundInMindset) {
      this.setAlert('success', status?.message || 'Patient found. You can capture vitals.');
      return;
    }

    const lookupMessage = normalizePatientLookupMessage(status?.message);
    this.setAlert(
      isMindsetVitalsServiceUnavailableMessage(status?.message) ? 'danger' : 'warning',
      lookupMessage,
    );
  }

  private validateRegistration(): boolean {
    const controls = this.form.controls;
    const required = [
      controls.email,
      controls.firstName,
      controls.lastName,
      controls.birthDate,
      controls.heightCm,
      controls.weightKg,
      controls.temperature,
    ];

    let valid = true;
    for (const control of required) {
      control.setValidators([Validators.required]);
      control.updateValueAndValidity();
      if (control.invalid) {
        valid = false;
      }
    }

    if (!valid) {
      this.setAlert(
        'danger',
        'Email, first name, last name, birth date, height, weight, and temperature are required.',
      );
    }

    return valid;
  }

  private buildRegistration(): MindsetPatientRegistration {
    const value = this.form.getRawValue();
    const base: MindsetPatientRegistration = {
      memberId: (value.patientId || '').trim(),
      heightCm: value.heightCm,
      weightKg: value.weightKg,
      temperature: value.temperature,
    };

    if (this.patientFoundInMindset) {
      return base;
    }

    return {
      ...base,
      email: (value.email || '').trim() || undefined,
      firstName: (value.firstName || '').trim() || undefined,
      lastName: (value.lastName || '').trim() || undefined,
      birthDate: (value.birthDate || '').trim() || undefined,
    };
  }

  private startSdkWarmup(): void {
    if (this.mindsetSdkRuntime.isWarmupReady()) {
      this.sdkWarmupReady = true;
      this.sdkWarmupLoading = false;
      this.preloadPercent = 100;
      return;
    }

    if (!this.showWarmupProgress) {
      this.sdkWarmupLoading = false;
    } else {
      this.sdkWarmupLoading = true;
    }

    this.sdkWarmupReady = false;
    void this.mindsetSdkRuntime.warmUp().catch(() => {
      this.sdkWarmupLoading = false;
      this.sdkWarmupReady = false;
      this.preloadPercent = 0;
      this.setAlert(
        'danger',
        'Vitals engine failed to load. Redeploy the app with the latest Web.config, then hard-refresh.',
      );
    });
  }

  private setAlert(type: 'info' | 'warning' | 'success' | 'danger', message: string): void {
    this.alertType = type;
    this.alertMessage = message;
  }

}
