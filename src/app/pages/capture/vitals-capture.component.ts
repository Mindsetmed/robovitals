import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { extractMindsetVitalsApiErrorMessage } from '../../mindset/mindset-vitals-http-errors';
import { MindsetVitalsSdkRuntimeService } from '../../mindset/mindset-vitals-sdk-runtime.service';
import { CaptureSessionService } from '../../mindset/capture-session.service';
import { MindsetPatientRegistration, MindsetVitalsService } from '../../mindset/mindset-vitals.service';
import {
  mapSdkStopResultToCaptureRequest,
  MappedVitalsCaptureResult,
  VitalsCaptureScanState,
} from '../../mindset/mindset-vitals-sdk.mapper';
import {
  ALL_CAPTURE_CARDS,
  buildVitalResultRowsAll,
  hasUnmeasurableResults,
  hasWarningResults,
  vitalEmojiIcon,
  VITALS_RESULTS_BP_NOTE,
  VITALS_RESULTS_DISCLAIMER,
  VitalCaptureCard,
  VitalResultRow,
} from '../../mindset/vitals-display.helper';
import {
  buildMindsetCameraVideoConstraints,
  logMindsetCameraSettings,
} from '../../mindset/mindset-vitals-camera.helper';
import {
  isMindsetQualityWarning,
  normalizeMindsetDataStatus,
} from '../../mindset/mindset-vitals-guidance.helper';
import {
  buildScanProgressSegments,
  computeScanOverlayForStage,
  SCAN_OVERLAY,
  ScanOverlayLayout,
} from './scan-progress-paths';
import {
  measureWithRetries,
  MINDSET_VITALS_MAX_ATTEMPTS,
} from '../../mindset/mindset-vitals-retry.helper';

@Component({
  selector: 'app-vitals-capture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vitals-capture.component.html',
  styleUrls: ['./vitals-capture.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VitalsCaptureComponent implements OnInit, AfterViewInit, OnDestroy {
  private static overlayCounter = 0;

  readonly overlayInstanceId = VitalsCaptureComponent.overlayCounter++;

  readonly faceMaskId = `hg-vitals-face-mask-${this.overlayInstanceId}`;
  readonly scanClipId = `hg-vitals-scan-clip-${this.overlayInstanceId}`;
  scanOverlay: ScanOverlayLayout = SCAN_OVERLAY;

  patientId = '';
  patientRegistration: MindsetPatientRegistration | null = null;
  mindsetPatientAlreadyRegistered = false;

  @ViewChild('videoEl', { static: false }) videoEl!: ElementRef<HTMLVideoElement>;
  public scanState: VitalsCaptureScanState = 'camera_permission_required';
  public statusMessage = '';
  public progressPercent = 0;
  public scanSecondsRemaining = 0;
  private static readonly DISPLAY_SESSION_SECONDS = 60;
  private maxSessionTime = VitalsCaptureComponent.DISPLAY_SESSION_SECONDS;
  public showScanWarning = false;
  public isSubmitting = false;
  public faceGuideStyle: Record<string, string> | null = null;
  public videoStageStyle: Record<string, string> | null = null;
  public cameraInfo: string | null = null;
  public activeQualityWarnings: string[] = [];
  public captureCards: VitalCaptureCard[] = [...ALL_CAPTURE_CARDS];
  public resultRows: VitalResultRow[] = [];

  private vitalClient: ReturnType<MindsetVitalsSdkRuntimeService['getClient']> = null;
  private lastGuideCoords: { x: number; y: number; width: number; height: number } | null = null;
  private videoResizeObserver: ResizeObserver | null = null;
  private mediaStream: MediaStream | null = null;
  private authorizedVitals: string[] = [];
  private pendingAuthorizedVitalsListener: ((vitals: string[]) => void) | null = null;
  private destroyPending = false;
  private qualityWarningTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private handlingMeasurementStop = false;
  private scanFinalizing = false;
  private scanFinalizeTimer: ReturnType<typeof setTimeout> | null = null;
  private batchAttemptStopTimer: ReturnType<typeof setTimeout> | null = null;
  private batchAttemptStopping = false;
  private measurementBatchActive = false;
  private batchAttemptMeasuring = false;
  private measurementInFlight = false;
  private activeMeasurementRunId = 0;
  private currentMeasureAttempt = 0;
  private maxMeasureAttempts = MINDSET_VITALS_MAX_ATTEMPTS;
  private captureEpoch = 0;

  private readonly successMessage = 'Vitals submitted successfully';
  private readonly failureMessage = 'Vitals capture failed';
  private patientRegistered = false;
  private captureFlowStarted = false;

  constructor(
    private mindsetVitalsService: MindsetVitalsService,
    private mindsetSdkRuntime: MindsetVitalsSdkRuntimeService,
    private captureSession: CaptureSessionService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    document.body.classList.add('hg-capture-page');
    document.body.classList.remove('hg-landing-page');

    if (!this.captureSession.hasActiveSession()) {
      void this.router.navigate(['/']);
      return;
    }

    const session = this.captureSession.getSession();
    this.patientId = session.patientId;
    this.patientRegistration = session.registration;
    this.mindsetPatientAlreadyRegistered = session.mindsetPatientAlreadyRegistered;
    this.mindsetSdkRuntime.setPatientId(this.patientId);
    this.captureEpoch = this.mindsetSdkRuntime.startCaptureEpoch();
  }

  ngAfterViewInit(): void {
    void this.startCaptureFlowWhenReady();
  }

  ngOnDestroy(): void {
    document.body.classList.remove('hg-capture-page');
    void this.cleanup();
  }

  private async startCaptureFlowWhenReady(): Promise<void> {
    if (this.captureFlowStarted || this.destroyPending) {
      return;
    }

    try {
      await this.waitForVideoElement();
      this.captureFlowStarted = true;
      await this.beginCaptureFlow();
    } catch (error) {
      console.error('Vitals capture init failed:', error);
      this.setFailedState(this.resolveErrorMessage(error), true);
    }
  }

  private waitForVideoElement(maxAttempts = 30): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const tryFind = (): void => {
        if (this.destroyPending) {
          reject(new Error('Capture cancelled.'));
          return;
        }

        if (this.videoEl?.nativeElement) {
          resolve();
          return;
        }

        attempts += 1;
        if (attempts >= maxAttempts) {
          reject(new Error('Video element not available.'));
          return;
        }

        this.cdr.detectChanges();
        requestAnimationFrame(tryFind);
      };

      this.cdr.detectChanges();
      requestAnimationFrame(tryFind);
    });
  }

  onBackClick = (): void => {
    this.captureSession.clearActiveSession();
    void this.router.navigate(['/']);
  };

  onDoneClick = (): void => {
    this.finishAndRestartSession();
  };

  public onBtnRetryClick = (): void => {
    this.returnToReadyScan();
  };

  public onStartScanClick = (): void => {
    if (this.scanState === 'scan_failed') {
      this.returnToReadyScan();
    }
    void this.startScan();
  };

  public get isPreparingScan(): boolean {
    return (
      this.scanState === 'camera_permission_required' ||
      this.scanState === 'initializing_scan'
    );
  }

  public get showCaptureCards(): boolean {
    return this.scanState === 'scanning_in_progress';
  }

  public get showStartScanButton(): boolean {
    return this.scanState === 'ready_to_scan' || this.scanState === 'scan_failed';
  }

  public get startScanDisabled(): boolean {
    return (
      this.isSubmitting ||
      this.scanState === 'initializing_scan' ||
      this.scanState === 'scanning_in_progress' ||
      this.scanState === 'camera_permission_required' ||
      (this.scanState === 'ready_to_scan' && this.activeQualityWarnings.length > 0)
    );
  }

  public get startScanHint(): string | null {
    return null;
  }

  public get readyScanSubtitle(): string {
    return 'Center your face in the frame, then tap Start Scan.';
  }

  public get coachingTip(): string | null {
    if (this.isPreparingScan) {
      return null;
    }
    const tip = this.primaryGuidanceTip;
    if (tip) {
      return tip;
    }
    if (this.scanState === 'scanning_in_progress') {
      return 'Hold still while we measure.';
    }
    return null;
  }

  public get isScanFinalizing(): boolean {
    return this.scanFinalizing;
  }

  public get scanStatusMessage(): string | null {
    if (this.scanState !== 'scanning_in_progress' || this.showSideWarning) {
      return null;
    }
    if (this.isMeasurementCompleting) {
      return 'Please wait while we finish.';
    }
    if (this.measurementBatchActive && this.currentMeasureAttempt >= 1) {
      return `Attempt ${this.currentMeasureAttempt} of ${this.maxMeasureAttempts}. Hold still while we measure.`;
    }
    return this.coachingTip;
  }

  public get showScanStatusMessage(): boolean {
    return !!this.scanStatusMessage;
  }

  public showCardLoader(card: VitalCaptureCard): boolean {
    return (
      this.scanState === 'scanning_in_progress' &&
      !this.scanFinalizing &&
      this.progressPercent < 100
    );
  }

  public get showScanCompleteCardAnimation(): boolean {
    return this.scanState === 'scanning_in_progress' && this.isMeasurementCompleting;
  }

  public showCardCompleteDots(card: VitalCaptureCard): boolean {
    if (!this.showScanCompleteCardAnimation) {
      return false;
    }

    return card.key === 'PR' || card.key === 'RR' || card.key === 'BP' || card.key === 'SpO2';
  }

  public vitalEmoji = (key: string): string => vitalEmojiIcon(key);

  readonly resultsDisclaimer = VITALS_RESULTS_DISCLAIMER;
  readonly resultsBpNote = VITALS_RESULTS_BP_NOTE;

  public showVitalMarkBadge = (row: VitalResultRow): boolean =>
    row.id === 'bp' || row.id === 'spo2';

  public get showCoachingTip(): boolean {
    return !!this.coachingTip && (this.scanState === 'ready_to_scan' || this.scanState === 'scanning_in_progress');
  }

  public get scanGuidanceMessage(): string | null {
    if (this.scanState !== 'scanning_in_progress') {
      return null;
    }
    if (this.activeQualityWarnings.length > 0) {
      return this.pickPrimaryWarning();
    }
    return this.coachingTip || 'Hold still while we capture your vitals.';
  }

  public get isResultsView(): boolean {
    return (
      this.resultRows.length > 0 ||
      this.scanState === 'scan_completed' ||
      this.scanState === 'scan_failed'
    );
  }

  public get showFaceFrame(): boolean {
    return (
      !this.isPreparingScan &&
      (this.scanState === 'ready_to_scan' || this.scanState === 'scanning_in_progress')
    );
  }

  public get showSideWarning(): boolean {
    return (
      !this.isPreparingScan &&
      !this.isScanFinalizing &&
      (this.scanState === 'ready_to_scan' || this.scanState === 'scanning_in_progress') &&
      this.activeQualityWarnings.length > 0
    );
  }

  public get sideAlertMessage(): string {
    if (this.activeQualityWarnings.length > 0) {
      return this.pickPrimaryWarning();
    }
    return this.coachingTip || 'Hold still while we capture your vitals.';
  }

  public get showResultsWarning(): boolean {
    return hasWarningResults(this.resultRows);
  }

  public get showResultsUnmeasurable(): boolean {
    return hasUnmeasurableResults(this.resultRows);
  }

  public get showResultsSuccessBanner(): boolean {
    return (
      this.scanState === 'scan_completed' &&
      !this.isSubmitting &&
      !this.showResultsWarning &&
      !this.showResultsUnmeasurable
    );
  }

  public get showResultsIssueBanner(): boolean {
    return (
      this.showResultsUnmeasurable ||
      this.showResultsWarning ||
      (this.scanState === 'scan_failed' && !this.isSubmitting)
    );
  }

  public get resultsBannerPrimary(): string {
    if (this.showResultsUnmeasurable) {
      return 'We were unable to measure one of your vitals at this time.';
    }
    if (this.showResultsWarning) {
      return 'One or more vitals are outside the expected range. Please verify your results.';
    }
    return this.statusMessage || 'Unable to complete vitals capture at this time.';
  }

  public get showScanLineAnimation(): boolean {
    return (
      this.scanState === 'scanning_in_progress' &&
      this.batchAttemptMeasuring &&
      !this.isMeasurementCompleting
    );
  }

  public get scanProgressSegments() {
    return buildScanProgressSegments(this.progressPercent, this.showScanWarning);
  }

  public get scanLineYValues(): string {
    const top = this.scanOverlay.face.y + 6;
    const bottom = this.scanOverlay.face.y + this.scanOverlay.face.height - 10;
    return `${top};${bottom};${top}`;
  }

  public trackScanSegment = (_index: number, segment: { d: string }): string => segment.d;

  public trackCaptureCard = (_index: number, card: VitalCaptureCard): string => card.key;

  public get showResultsRetry(): boolean {
    return (
      this.scanState === 'scan_failed' ||
      this.showResultsWarning ||
      this.showResultsUnmeasurable
    );
  }

  public onResultsRetry = (): void => {
    void this.retryFromResults();
  };

  public get startScanButtonText(): string {
    if (this.scanState === 'scan_failed') {
      return 'Try Again';
    }
    return 'Start Scan';
  }

  private returnToReadyScan(message = ''): void {
    this.resultRows = [];
    this.scanState = 'ready_to_scan';
    this.statusMessage = message;
    this.progressPercent = 0;
    this.scanSecondsRemaining = 0;
    this.scanFinalizing = false;
    this.isSubmitting = false;
    this.showScanWarning = false;
    this.handlingMeasurementStop = false;
    this.measurementBatchActive = false;
    this.batchAttemptMeasuring = false;
    this.currentMeasureAttempt = 0;
    this.mindsetSdkRuntime.resetMeasurementState();
    this.refreshFaceGuideOverlay();
    this.cdr.markForCheck();
  }

  private async retryFromResults(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    this.resultRows = [];
    this.isSubmitting = false;
    this.statusMessage = '';
    this.progressPercent = 0;
    this.scanSecondsRemaining = 0;
    this.scanFinalizing = false;
    this.showScanWarning = false;
    this.handlingMeasurementStop = false;
    this.measurementBatchActive = false;
    this.batchAttemptMeasuring = false;
    this.currentMeasureAttempt = 0;
    this.clearQualityWarnings();
    this.clearScanTimers();
    this.mindsetSdkRuntime.resetMeasurementState();

    try {
      this.scanState = 'initializing_scan';
      this.cdr.detectChanges();
      await this.waitForVideoElement();
      await this.ensureCameraReadyForMeasurement();
      this.scanState = 'ready_to_scan';
      this.refreshFaceGuideOverlay();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Vitals retry failed:', error);
      this.setFailedState(this.resolveErrorMessage(error), false, true);
    }
  }

  private finishAndRestartSession(): void {
    this.captureSession.clearActiveSession();
    void this.router.navigate(['/']);
  }

  private resetState(): void {
    this.scanFinalizing = false;
    this.handlingMeasurementStop = false;
    this.measurementBatchActive = false;
    this.batchAttemptMeasuring = false;
    this.currentMeasureAttempt = 0;
    this.scanState = 'initializing_scan';
    this.statusMessage = '';
    this.progressPercent = 0;
    this.scanSecondsRemaining = 0;
    this.showScanWarning = false;
    this.isSubmitting = false;
    this.authorizedVitals = [];
    this.cameraInfo = null;
    this.activeQualityWarnings = [];
    this.clearQualityWarnings();
    this.captureCards = [...ALL_CAPTURE_CARDS];
    this.resultRows = [];
    this.clearFaceGuide();
    this.videoStageStyle = null;
  }

  private syncCaptureCards(): void {
    this.captureCards = [...ALL_CAPTURE_CARDS];
    this.cdr.markForCheck();
  }

  private async ensureLocalPatientRegistered(): Promise<void> {
    if (this.mindsetPatientAlreadyRegistered) {
      return;
    }

    const result = await firstValueFrom(
      this.mindsetVitalsService.saveRoboVitalPatientRegistration(this.patientId, {
        heightCm: this.patientRegistration?.heightCm,
        weightKg: this.patientRegistration?.weightKg,
        temperature: this.patientRegistration?.temperature ?? 0,
      }),
    );

    const responseCode = parseInt(result?.responseCode ?? '', 10);
    const failed = result?.results?.some(
      (r) => r?.status && r.status.toLowerCase() !== 'success',
    );
    if ((Number.isFinite(responseCode) && responseCode >= 400) || failed) {
      throw new Error(
        result?.statusMessage ||
          result?.results?.find((r) => r?.syncErrorReason)?.syncErrorReason ||
          'Failed to save patient demographics.',
      );
    }
  }

  private async beginCaptureFlow(): Promise<void> {
    if (!this.patientId || this.destroyPending) {
      return;
    }

    if (!window.crossOriginIsolated) {
      this.setFailedState(
        'This browser session is not ready for vitals capture. Please refresh the page and try again.',
        true,
      );
      return;
    }

    try {
      this.scanState = 'initializing_scan';
      this.patientRegistration = this.patientRegistration ?? { memberId: this.patientId };
      this.patientRegistered = this.mindsetPatientAlreadyRegistered;

      if (!this.patientRegistered) {
        const createResponse = await firstValueFrom(
          this.mindsetVitalsService.createPatient(this.patientId, {
            memberId: this.patientRegistration?.memberId ?? this.patientId,
            email: this.patientRegistration?.email,
            firstName: this.patientRegistration?.firstName,
            lastName: this.patientRegistration?.lastName,
            birthDate: this.patientRegistration?.birthDate,
            heightCm: this.patientRegistration?.heightCm,
            weightKg: this.patientRegistration?.weightKg,
            temperature: this.patientRegistration?.temperature,
          }),
        );
        if (!createResponse?.success) {
          throw new Error(createResponse?.message || 'Failed to create patient');
        }
        this.patientRegistered = true;
      }

      await this.ensureLocalPatientRegistered();

      await this.startCamera();
      this.cdr.markForCheck();
      await this.attachSharedSdk();
      this.syncCaptureCards();
      this.scanState = 'ready_to_scan';
      this.statusMessage = '';
      this.refreshFaceGuideOverlay();
    } catch (error) {
      console.error('Vitals capture flow failed:', error);
      this.setFailedState(this.resolveErrorMessage(error), true);
    }
  }

  private async startCamera(): Promise<void> {
    const video = this.videoEl?.nativeElement;
    if (!video) {
      throw new Error('Video element not available.');
    }

    const warmedStream = this.mindsetSdkRuntime.takeWarmCameraStream();
    if (warmedStream) {
      this.mediaStream = warmedStream;
      video.srcObject = this.mediaStream;
      await video.play();
      await this.waitForVideoMetadata(video);
      logMindsetCameraSettings(this.mediaStream.getVideoTracks()[0], 'active (warmed)');
      this.updateVideoStageLayout();
      this.cameraInfo = this.buildCameraInfo();
      this.attachVideoLayoutObserver();
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: buildMindsetCameraVideoConstraints(),
        audio: false,
      });
    } catch (error) {
      throw error instanceof Error ? error : new Error('Camera access denied.');
    }

    if (!this.mediaStream) {
      throw new Error('Camera access denied.');
    }

    video.srcObject = this.mediaStream;
    await video.play();
    await this.waitForVideoMetadata(video);
    logMindsetCameraSettings(this.mediaStream.getVideoTracks()[0], 'active');
    this.updateVideoStageLayout();
    this.cameraInfo = this.buildCameraInfo();
    this.attachVideoLayoutObserver();
  }

  private async waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      const onReady = (): void => {
        video.removeEventListener('loadedmetadata', onReady);
        resolve();
      };
      video.addEventListener('loadedmetadata', onReady);
    });
  }

  private buildCameraInfo(): string | null {
    const video = this.videoEl?.nativeElement;
    const track = this.mediaStream?.getVideoTracks()[0];
    if (!video || !track) {
      return null;
    }

    const settings = track.getSettings();
    const width = settings.width ?? video.videoWidth;
    const height = settings.height ?? video.videoHeight;
    const fps = settings.frameRate ? Math.round(settings.frameRate) : null;
    if (!width || !height) {
      return null;
    }

    return fps ? `${width}x${height} @ ${fps}fps` : `${width}x${height}`;
  }

  private async attachSharedSdk(): Promise<void> {
    const video = this.videoEl.nativeElement;
    this.mindsetSdkRuntime.setPatientId(this.patientId);
    this.vitalClient = await this.mindsetSdkRuntime.prepareForNewCapture();
    this.authorizedVitals = [];
    this.mindsetSdkRuntime.bindSession({
      onAuthorizedVitals: (vitals) => {
        this.authorizedVitals = vitals || [];
        this.pendingAuthorizedVitalsListener?.(this.authorizedVitals);
        this.syncCaptureCards();
      },
      onMaxSessionTime: (duration) => {
        if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
          this.maxSessionTime = duration;
        }
      },
      onTimeLeft: (data) => {
        if (this.measurementBatchActive && !this.batchAttemptMeasuring) {
          return;
        }

        if (data?.maxTime && data.maxTime > 0) {
          this.maxSessionTime = data.maxTime;
        }

        const nextProgress = this.toProgressPercent(data?.percentComplete);
        const nextRemaining = this.toDisplayRemainingSeconds(
          data?.timeLeft,
          data?.maxTime,
          data?.percentComplete,
        );

        this.progressPercent = nextProgress;
        this.scanSecondsRemaining = nextRemaining;

        const rawTimeLeft = data?.timeLeft;
        const measurementComplete =
          nextProgress >= 100 ||
          (rawTimeLeft != null && Number.isFinite(rawTimeLeft) && rawTimeLeft <= 0);

        if (this.scanState === 'scanning_in_progress' && measurementComplete) {
          if (this.measurementBatchActive) {
            this.scheduleBatchAttemptStop();
          } else {
            this.scheduleFinalizeAtCompletion();
          }
        }
        this.cdr.markForCheck();
      },
      onStop: (data) => {
        if (this.measurementBatchActive) {
          return;
        }
        void this.handleMeasurementStop(data);
      },
      onReady: () => {
        if (this.scanState === 'initializing_scan') {
          this.statusMessage = '';
          this.cdr.markForCheck();
        }
      },
      onGuideCoordinates: (coords) => {
        this.lastGuideCoords = coords;
        this.refreshFaceGuideOverlay();
      },
      onSignsMessage: (message) => {
        this.processSignsMessage(message);
      },
      onLog: (msg) => {
        if (msg?.['wasmEnvReport']) {
          const report = msg['wasmEnvReport'] as {
            wasmSupported?: boolean;
            wasmThreads?: boolean;
            likelyJITDisabled?: boolean;
          };
          if (report.wasmSupported === false) {
            this.setFailedState('WebAssembly is not supported in this browser.');
          } else if (report.wasmThreads === false) {
            this.setFailedState(
              'Cross-origin isolation is not active in the vitals worker (SharedArrayBuffer unavailable). ' +
              'Confirm COOP/COEP headers on the HTML page, update wwwroot/web.config, then hard-refresh.',
            );
          } else if (report.likelyJITDisabled) {
            this.setFailedState('WebAssembly performance is degraded. Disable Lockdown Mode or use Chrome on desktop.');
          }
        }
        if (typeof msg?.['error'] === 'string' && msg['error'].includes('Out of memory')) {
          this.setFailedState('Unable to allocate memory for vitals processing.');
        }
      },
      onError: (error) => {
        console.error('Vitals SDK error:', error);
        this.setFailedState(this.resolveSdkErrorMessage(error));
      },
    });
    await this.mindsetSdkRuntime.startPreview(video);
    this.vitalClient = this.mindsetSdkRuntime.getClient();
    await this.mindsetSdkRuntime.captureVitalCoreVersion();
  }

  private async startScan(): Promise<void> {
    if (this.startScanDisabled || !this.vitalClient) {
      return;
    }

    try {
      await this.runMeasurement();
    } catch (error) {
      console.error('Vitals scan failed:', error);
      this.returnToReadyScan(this.resolveErrorMessage(error));
    }
  }

  private async runMeasurement(): Promise<void> {
    if (!this.vitalClient) {
      throw new Error('Vitals client not initialized.');
    }

    if (this.measurementInFlight) {
      return;
    }

    const runId = ++this.activeMeasurementRunId;
    this.measurementInFlight = true;
    this.currentMeasureAttempt = 0;
    this.batchAttemptMeasuring = false;

    try {
      await this.runMeasurementBatch(runId);
    } finally {
      if (runId === this.activeMeasurementRunId) {
        this.measurementInFlight = false;
        this.measurementBatchActive = false;
        this.currentMeasureAttempt = 0;
        this.batchAttemptMeasuring = false;
        this.mindsetSdkRuntime.resetMeasurementState();
        this.clearScanTimers();
      }
    }
  }

  private async runMeasurementBatch(runId: number): Promise<void> {
    if (!this.vitalClient) {
      throw new Error('Vitals client not initialized.');
    }

    await this.ensureCameraReadyForMeasurement();

    const video = this.videoEl?.nativeElement;
    if (!video) {
      throw new Error('Video element not available.');
    }

    this.progressPercent = 0;
    this.scanSecondsRemaining = 0;
    this.scanFinalizing = false;
    this.showScanWarning = false;
    this.clearScanTimers();
    this.clearQualityWarnings();
    this.scanState = 'scanning_in_progress';
    this.statusMessage = '';
    this.refreshFaceGuideOverlay();

    let wantedVitals: string[];
    try {
      wantedVitals = await this.authorizeForMeasurement();
    } catch (error) {
      console.error('Vitals authorization failed:', error);
      this.returnToReadyScan(this.resolveErrorMessage(error));
      return;
    }

    await this.mindsetSdkRuntime.captureVitalCoreVersion();

    if (wantedVitals.length === 0) {
      console.error('No vitals authorized. Check authorization.');
      this.returnToReadyScan();
      return;
    }

    this.measurementBatchActive = true;
    this.batchAttemptMeasuring = false;
    this.maxMeasureAttempts = MINDSET_VITALS_MAX_ATTEMPTS;

    try {
      const mergedResult = await measureWithRetries(this.vitalClient, video, wantedVitals, {
        maxAttempts: MINDSET_VITALS_MAX_ATTEMPTS,
        attemptTimeoutMs: (this.maxSessionTime + 10) * 1000,
        delayBetweenAttemptsMs: 400,
        onAttemptStarted: (attempt, maxAttempts, vitals) => {
          if (runId !== this.activeMeasurementRunId) {
            return;
          }

          this.batchAttemptMeasuring = true;
          this.currentMeasureAttempt = attempt;
          this.maxMeasureAttempts = maxAttempts;
          this.progressPercent = 0;
          this.scanSecondsRemaining = 0;
          this.scanFinalizing = false;
          this.handlingMeasurementStop = false;
          this.clearScanTimers();
          this.mindsetSdkRuntime.markMeasurementStarted();
          console.info(`Vitals attempt ${attempt}/${maxAttempts}: measuring`, vitals);
          this.cdr.markForCheck();
        },
        onAttemptComplete: () => {
          if (runId !== this.activeMeasurementRunId) {
            return;
          }

          this.batchAttemptMeasuring = false;
          this.progressPercent = 0;
          this.scanSecondsRemaining = 0;
          this.scanFinalizing = false;
          this.clearScanTimers();
          this.mindsetSdkRuntime.resetMeasurementState();
        },
      });

      if (runId !== this.activeMeasurementRunId) {
        return;
      }

      await this.handleScanComplete(mergedResult);
    } catch (error) {
      if (runId !== this.activeMeasurementRunId) {
        return;
      }

      console.error('Vitals measurement failed:', error);
      this.returnToReadyScan(this.resolveErrorMessage(error));
    }
  }

  private getSelectedVitals(): string[] {
    return [...this.authorizedVitals];
  }

  private async authorizeForMeasurement(): Promise<string[]> {
    if (!this.vitalClient) {
      throw new Error('Vitals client not initialized.');
    }

    const fallbackVitals = [...this.authorizedVitals];

    await this.vitalClient.authorize();

    if (this.authorizedVitals.length > 0) {
      return [...this.authorizedVitals];
    }

    const fromEvent = await this.waitForAuthorizedVitalsEvent(3000);
    if (fromEvent.length > 0) {
      return fromEvent;
    }

    if (fallbackVitals.length > 0) {
      this.authorizedVitals = fallbackVitals;
      return fallbackVitals;
    }

    throw new Error('No vitals authorized. Check authorization.');
  }

  private waitForAuthorizedVitalsEvent(timeoutMs: number): Promise<string[]> {
    if (this.authorizedVitals.length > 0) {
      return Promise.resolve([...this.authorizedVitals]);
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.pendingAuthorizedVitalsListener = null;
        resolve([]);
      }, timeoutMs);

      this.pendingAuthorizedVitalsListener = (vitals) => {
        clearTimeout(timeoutId);
        this.pendingAuthorizedVitalsListener = null;
        resolve([...vitals]);
      };
    });
  }

  private clearScanTimers(): void {
    if (this.scanFinalizeTimer) {
      clearTimeout(this.scanFinalizeTimer);
      this.scanFinalizeTimer = null;
    }
    if (this.batchAttemptStopTimer) {
      clearTimeout(this.batchAttemptStopTimer);
      this.batchAttemptStopTimer = null;
    }
  }

  private scheduleBatchAttemptStop(): void {
    if (
      this.batchAttemptStopTimer ||
      this.batchAttemptStopping ||
      !this.measurementBatchActive ||
      this.scanState !== 'scanning_in_progress'
    ) {
      return;
    }

    this.batchAttemptStopTimer = setTimeout(() => {
      this.batchAttemptStopTimer = null;
      void this.finalizeBatchAttempt();
    }, 400);
  }

  private async finalizeBatchAttempt(): Promise<void> {
    if (
      !this.measurementBatchActive ||
      this.batchAttemptStopping ||
      !this.vitalClient ||
      this.scanState !== 'scanning_in_progress'
    ) {
      return;
    }

    this.batchAttemptStopping = true;
    try {
      await this.mindsetSdkRuntime.stopMeasurement();
    } catch (error) {
      console.error('Batch attempt stop failed:', error);
    } finally {
      this.batchAttemptStopping = false;
    }
  }

  private scheduleFinalizeAtCompletion(): void {
    if (
      this.measurementBatchActive ||
      this.scanFinalizeTimer ||
      this.scanFinalizing ||
      this.scanState !== 'scanning_in_progress'
    ) {
      return;
    }

    this.scanFinalizeTimer = setTimeout(() => {
      this.scanFinalizeTimer = null;
      void this.finalizeActiveScan();
    }, 400);
  }

  private async finalizeActiveScan(): Promise<void> {
    if (
      this.measurementBatchActive ||
      this.scanFinalizing ||
      !this.vitalClient ||
      this.scanState !== 'scanning_in_progress'
    ) {
      return;
    }

    this.scanFinalizing = true;
    this.clearScanTimers();
    this.progressPercent = 100;
    this.scanSecondsRemaining = 0;
    this.statusMessage = 'Finalizing your results…';
    this.cdr.markForCheck();

    try {
      const stopPayload = await this.mindsetSdkRuntime.stopMeasurement();
      if (stopPayload) {
        await this.handleMeasurementStop(stopPayload);
      }
    } catch (error) {
      console.error('Vitals finalize failed:', error);
      this.returnToReadyScan(
        this.resolveSdkErrorMessage(error) || 'Unable to finalize vitals scan. Please try again.',
      );
    } finally {
      this.scanFinalizing = false;
    }
  }

  private async handleMeasurementStop(data: unknown): Promise<void> {
    if (
      this.handlingMeasurementStop ||
      this.destroyPending ||
      this.isSubmitting ||
      this.scanState === 'scan_completed'
    ) {
      return;
    }

    if (this.scanState !== 'scanning_in_progress' && !this.scanFinalizing) {
      return;
    }

    this.handlingMeasurementStop = true;
    this.clearScanTimers();
    this.scanFinalizing = false;
    this.mindsetSdkRuntime.resetMeasurementState();

    try {
      const result = this.resolveStopResult(data);
      if (result) {
        await this.handleScanComplete(result);
        return;
      }

      this.returnToReadyScan('We could not complete the scan. Please try again.');
    } finally {
      this.handlingMeasurementStop = false;
    }
  }

  private resolveStopResult(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const record = data as Record<string, unknown>;
    if (
      'finalVitalsMeasurementValues' in record ||
      'signsMsgs' in record ||
      'noValidMeasurements' in record ||
      ('vitals' in record && 'timestamp' in record)
    ) {
      return data;
    }

    if ('result' in record) {
      return record['result'];
    }

    return null;
  }

  private get isMeasurementCompleting(): boolean {
    return (
      this.scanFinalizing ||
      this.batchAttemptStopping ||
      (this.batchAttemptMeasuring && this.progressPercent >= 100)
    );
  }

  private toProgressPercent(value?: number): number {
    if (value == null || !Number.isFinite(value)) {
      return 0;
    }
    const normalized = value <= 1 ? value * 100 : value;
    return Math.min(100, Math.max(0, Math.round(normalized)));
  }

  private toDisplayRemainingSeconds(
    timeLeft?: number,
    maxTime?: number,
    percentComplete?: number,
  ): number {
    const sessionMax = maxTime && maxTime > 0 ? maxTime : this.maxSessionTime;
    const displayMax = VitalsCaptureComponent.DISPLAY_SESSION_SECONDS;

    if (timeLeft != null && Number.isFinite(timeLeft) && sessionMax > 0) {
      const ratio = Math.max(0, Math.min(1, timeLeft / sessionMax));
      return Math.max(0, Math.ceil(ratio * displayMax));
    }

    if (percentComplete != null && Number.isFinite(percentComplete)) {
      const pct = percentComplete <= 1 ? percentComplete * 100 : percentComplete;
      const remainingPct = 100 - Math.min(100, Math.max(0, pct));
      return Math.max(0, Math.ceil((remainingPct / 100) * displayMax));
    }

    return 0;
  }

  private async handleScanComplete(sdkResult: unknown): Promise<void> {
    const vitalCoreVersion = this.mindsetSdkRuntime.getVitalCoreVersion();
    const mapped = mapSdkStopResultToCaptureRequest(sdkResult, vitalCoreVersion);
    this.resultRows = buildVitalResultRowsAll(mapped);

    if (!mapped.isValid) {
      this.finishCaptureWithoutSubmit(mapped);
      return;
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();

    this.mindsetVitalsService
      .captureVitals(this.patientId, {
        pulseRate: mapped.pulseRate,
        breathingRate: mapped.breathingRate,
        bloodPressureSystolic: mapped.bloodPressureSystolic,
        bloodPressureDiastolic: mapped.bloodPressureDiastolic,
        oxygenSaturation: mapped.oxygenSaturation,
        sdkVitalsPayload: mapped.sdkVitalsPayload,
      })
      .subscribe({
        next: () => {
          this.finishCaptureSuccess();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.scanState = 'scan_failed';
          this.statusMessage = extractMindsetVitalsApiErrorMessage(err) || this.failureMessage;
          this.cdr.markForCheck();
        },
      });
  }

  private finishCaptureWithoutSubmit(mapped: MappedVitalsCaptureResult): void {
    void this.stopCameraPreview();
    this.scanState = 'scan_completed';
    this.statusMessage = mapped.validationMessage || '';
    this.isSubmitting = false;
    this.cdr.markForCheck();
  }

  private finishCaptureSuccess(): void {
    void this.stopCameraPreview();
    this.scanState = 'scan_completed';
    this.statusMessage = this.successMessage;
    this.isSubmitting = false;
    this.cdr.markForCheck();
  }

  private resolveErrorMessage(error: unknown): string {
    const apiMessage = extractMindsetVitalsApiErrorMessage(error);
    if (apiMessage) {
      return apiMessage;
    }

    const sdkMessage = this.resolveSdkErrorMessage(error);
    if (sdkMessage) {
      return sdkMessage;
    }

    const message = error instanceof Error ? error.message : '';
    if (message.trim()) {
      return message;
    }
    return this.failureMessage;
  }

  private mapSdkErrorText(message: string): string {
    const trimmed = message.trim();
    if (trimmed.includes('No remaining session attempts')) {
      return 'This scan session has ended. Close the scan window, then tap Capture Vitals again to start a new session.';
    }
    if (trimmed.includes('Worker initialization timeout')) {
      return 'The vitals engine did not finish loading in time.';
    }
    return trimmed;
  }

  private resolveSdkErrorMessage(error: unknown): string | undefined {
    if (error == null) {
      return undefined;
    }

    if (typeof error === 'string' && error.trim()) {
      return this.mapSdkErrorText(error);
    }

    if (error instanceof Error && error.message.trim()) {
      return this.mapSdkErrorText(error.message);
    }

    if (typeof error === 'object') {
      const record = error as Record<string, unknown>;
      const message = record['message'] ?? record['error'] ?? record['reason'];
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }

    return undefined;
  }

  private readonly onVideoMetadata = (): void => {
    this.updateVideoStageLayout();
    this.refreshFaceGuideOverlay();
  };

  private updateVideoStageLayout(): void {
    const video = this.videoEl?.nativeElement;
    if (!video) {
      return;
    }

    if (video.videoWidth && video.videoHeight) {
      this.videoStageStyle = {
        aspectRatio: `${video.videoWidth} / ${video.videoHeight}`,
      };
    } else {
      this.videoStageStyle = null;
    }

    this.updateScanOverlayLayout();
  }

  private updateScanOverlayLayout(): void {
    const video = this.videoEl?.nativeElement;
    if (!video?.clientWidth || !video.clientHeight) {
      return;
    }

    this.scanOverlay = computeScanOverlayForStage(video.clientWidth, video.clientHeight);
    this.cdr.markForCheck();
  }

  private attachVideoLayoutObserver(): void {
    const video = this.videoEl?.nativeElement;
    if (!video) {
      return;
    }
    this.detachVideoLayoutObserver();
    this.videoResizeObserver = new ResizeObserver(() => {
      this.ngZone.run(() => {
        this.updateVideoStageLayout();
        this.refreshFaceGuideOverlay();
      });
    });
    this.videoResizeObserver.observe(video);
    video.addEventListener('loadedmetadata', this.onVideoMetadata);
  }

  private detachVideoLayoutObserver(): void {
    const video = this.videoEl?.nativeElement;
    if (video) {
      video.removeEventListener('loadedmetadata', this.onVideoMetadata);
    }
    this.videoResizeObserver?.disconnect();
    this.videoResizeObserver = null;
  }

  private clearFaceGuide(): void {
    this.lastGuideCoords = null;
    this.faceGuideStyle = null;
  }

  private refreshFaceGuideOverlay(): void {
    if (!this.showFaceFrame) {
      this.clearFaceGuide();
      return;
    }

    const video = this.videoEl?.nativeElement;
    if (!video?.videoWidth || !video.clientWidth || !this.lastGuideCoords) {
      this.faceGuideStyle = null;
      this.cdr.markForCheck();
      return;
    }

    const mapped = this.mapVideoRectToDisplay(this.lastGuideCoords, video);
    const cw = video.clientWidth;
    const ch = video.clientHeight;
    this.faceGuideStyle = {
      left: `${(mapped.left / cw) * 100}%`,
      top: `${(mapped.top / ch) * 100}%`,
      width: `${(mapped.width / cw) * 100}%`,
      height: `${(mapped.height / ch) * 100}%`,
    };
    this.cdr.markForCheck();
  }

  private processSignsMessage(message: {
    dataStatus?: Array<string | { message?: string; severity?: string; code?: string }>;
  }): void {
    const statuses = normalizeMindsetDataStatus(message?.dataStatus);
    if (!statuses.length) {
      return;
    }

    let newWarnings = false;
    for (const status of statuses) {
      if (!isMindsetQualityWarning(status)) {
        continue;
      }

      if (!this.activeQualityWarnings.includes(status.message)) {
        newWarnings = true;
        this.addQualityWarning(status.message);
      }
    }

    if (newWarnings) {
      this.cdr.markForCheck();
    }
  }

  private get primaryGuidanceTip(): string | null {
    if (this.activeQualityWarnings.length === 0) {
      return null;
    }
    return this.pickPrimaryWarning();
  }

  private pickPrimaryWarning(): string {
    return this.activeQualityWarnings[0];
  }

  private addQualityWarning(message: string): void {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    if (!this.activeQualityWarnings.includes(trimmed)) {
      this.activeQualityWarnings = [...this.activeQualityWarnings, trimmed];
    }
    this.showScanWarning = true;

    const existingTimer = this.qualityWarningTimers.get(trimmed);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.qualityWarningTimers.set(
      trimmed,
      setTimeout(() => this.removeQualityWarning(trimmed), 3000),
    );
  }

  private removeQualityWarning(message: string): void {
    this.qualityWarningTimers.delete(message);
    this.activeQualityWarnings = this.activeQualityWarnings.filter((item) => item !== message);
    if (this.activeQualityWarnings.length === 0) {
      this.showScanWarning = false;
    }
    this.cdr.markForCheck();
  }

  private clearQualityWarnings(): void {
    for (const timer of this.qualityWarningTimers.values()) {
      clearTimeout(timer);
    }
    this.qualityWarningTimers.clear();
    this.activeQualityWarnings = [];
  }

  private mapVideoRectToDisplay(
    rect: { x: number; y: number; width: number; height: number },
    video: HTMLVideoElement,
  ): { left: number; top: number; width: number; height: number } {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = video.clientWidth;
    const ch = video.clientHeight;
    if (!vw || !vh || !cw || !ch) {
      return { left: 0, top: 0, width: 0, height: 0 };
    }

    const scale = Math.min(cw / vw, ch / vh);
    const displayedW = vw * scale;
    const displayedH = vh * scale;
    const offsetX = (cw - displayedW) / 2;
    const offsetY = (ch - displayedH) / 2;
    const mirrorX = vw - rect.x - rect.width;
    return {
      left: mirrorX * scale + offsetX,
      top: rect.y * scale + offsetY,
      width: rect.width * scale,
      height: rect.height * scale,
    };
  }

  private setFailedState(message?: string, _notifyUser = false, keepResults = false): void {
    const resolved = this.mapSdkErrorText((message ?? '').trim() || this.failureMessage);
    if (this.scanState === 'scan_failed' && this.statusMessage === resolved) {
      return;
    }

    void this.stopCameraPreview();
    this.scanState = 'scan_failed';
    if (!keepResults) {
      this.resultRows = [];
    }
    this.statusMessage = resolved;
    this.cdr.markForCheck();
  }

  private async stopCameraPreview(): Promise<void> {
    this.clearFaceGuide();
    this.detachVideoLayoutObserver();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    const video = this.videoEl?.nativeElement;
    if (video) {
      video.srcObject = null;
    }

    this.cdr.markForCheck();
  }

  private isCameraStreamActive(): boolean {
    const track = this.mediaStream?.getVideoTracks()[0];
    return !!track && track.readyState === 'live';
  }

  private async ensureCameraReadyForMeasurement(): Promise<void> {
    await this.waitForVideoElement();

    const video = this.videoEl?.nativeElement;
    if (!video) {
      throw new Error('Video element not available.');
    }

    if (!this.isCameraStreamActive() || !video.srcObject) {
      await this.startCamera();
    }

    if (!this.vitalClient) {
      await this.attachSharedSdk();
      return;
    }

    await this.mindsetSdkRuntime.startPreview(video);
    this.refreshFaceGuideOverlay();
  }

  private async cleanup(): Promise<void> {
    this.destroyPending = true;
    this.detachVideoLayoutObserver();
    this.clearFaceGuide();
    this.clearQualityWarnings();
    this.clearScanTimers();
    this.pendingAuthorizedVitalsListener = null;

    await this.mindsetSdkRuntime.releaseAfterCapture(this.captureEpoch);
    this.vitalClient = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    const video = this.videoEl?.nativeElement;
    if (video) {
      video.srcObject = null;
    }

    this.destroyPending = false;
  }
}
