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
  mergeBpRetryIntoBaseResult,
  mergePrRrRetryIntoBaseResult,
  MappedVitalsCaptureResult,
  VitalsCaptureScanState,
} from '../../mindset/mindset-vitals-sdk.mapper';
import {
  buildVitalResultRowsForCapture,
  hasUnmeasurableResults,
  hasWarningResults,
  vitalEmojiIcon,
  vitalTagsToCaptureCards,
  VITALS_RESULTS_BP_NOTE,
  VITALS_RESULTS_DISCLAIMER,
  VitalCaptureCard,
  VitalResultRow,
} from '../../mindset/vitals-display.helper';
import {
  buildMindsetCameraVideoConstraints,
  logMindsetCameraSettings,
} from '../../mindset/mindset-vitals-camera.helper';
import { extractSdkWarningStatuses } from '../../mindset/mindset-vitals-guidance.helper';
import {
  buildAuthorizationFlagsFromTags,
  filterMappedCaptureRequestForAuthorizedTags,
  MindsetVitalsAuthorizationFlags,
} from '../../mindset/mindset-vitals-auth.helper';
import {
  buildScanProgressSegments,
  computeScanOverlayForStage,
  SCAN_OVERLAY,
  ScanOverlayLayout,
} from './scan-progress-paths';
import {
  canOfferBpRetry,
  canOfferPrRrRetry,
  canShowResultsRetry,
  getAuthorizedBpTags,
  getAuthorizedPrRrTagsForRetry,
  isBpAuthorized,
  MINDSET_VITALS_MAX_ATTEMPTS,
  resolveMeasurementVitals,
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
  private maxSessionTime = 60;
  public showScanWarning = false;
  public isSubmitting = false;
  public faceGuideStyle: Record<string, string> | null = null;
  public videoStageStyle: Record<string, string> | null = null;
  public cameraInfo: string | null = null;
  public activeQualityWarnings: string[] = [];
  public captureCards: VitalCaptureCard[] = vitalTagsToCaptureCards([]);
  public resultRows: VitalResultRow[] = [];

  private vitalClient: ReturnType<MindsetVitalsSdkRuntimeService['getClient']> = null;
  private lastGuideCoords: { x: number; y: number; width: number; height: number } | null = null;
  private videoResizeObserver: ResizeObserver | null = null;
  private mediaStream: MediaStream | null = null;
  private readonly authorizedVitals = new Set<string>();
  private authorizationFlags: MindsetVitalsAuthorizationFlags = {
    pr: false,
    rr: false,
    bp: false,
    spo2: false,
  };
  private destroyPending = false;
  private qualityWarningTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private faceNotDetectedRestarting = false;
  private scanFinalizing = false;
  private scanFinalizeTimer: ReturnType<typeof setTimeout> | null = null;
  private measurementInFlight = false;
  private progressAnimatingToComplete = false;
  private bpRetryUsed = false;
  private bpRetryInProgress = false;
  private bpRetryPending = false;
  private prRrRetryUsed = false;
  private prRrRetryInProgress = false;
  private pendingPrRrRetryTags: string[] | null = null;
  private prRrRetryAttemptNumber = 0;
  private resultsMeasurementActive = false;
  private previousScanEnvelope: Record<string, unknown> | null = null;
  private faceNotDetectedRestartTimer: ReturnType<typeof setTimeout> | null = null;
  private faceNotDetectedWarningMessage: string | null = null;
  private static readonly FACE_NOT_DETECTED_CODE = 'E-FDM-041';
  private static readonly FACE_NOT_DETECTED_RESTART_MS = 3000;
  private captureEpoch = 0;

  private handlingMeasurementStop = false;

  private readonly successMessage = 'Vitals submitted successfully';
  private readonly failureMessage = 'Vitals capture failed';
  private patientRegistered = false;
  private captureFlowStarted = false;
  private vitalsCaptureSubmitted = false;

  constructor(
    private mindsetVitalsService: MindsetVitalsService,
    private mindsetSdkRuntime: MindsetVitalsSdkRuntimeService,
    private captureSession: CaptureSessionService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) { }

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

  public get readyScanTitle(): string {
    if (this.prRrRetryInProgress && this.prRrRetryAttemptNumber >= 2) {
      return `Attempt ${this.prRrRetryAttemptNumber} of ${MINDSET_VITALS_MAX_ATTEMPTS}`;
    }
    return 'Ready to scan';
  }

  public get readyScanSubtitle(): string {
    return 'Center your face in the frame, then tap Start Scan.';
  }

  public get scanAttemptLabel(): string | null {
    if (this.prRrRetryInProgress && this.scanState === 'scanning_in_progress' && this.prRrRetryAttemptNumber >= 2) {
      return `Attempt ${this.prRrRetryAttemptNumber} of ${MINDSET_VITALS_MAX_ATTEMPTS}`;
    }
    return null;
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

  private refreshAuthorizationFlags(): void {
    this.authorizationFlags = buildAuthorizationFlagsFromTags(this.getSelectedVitals());
    this.cdr.markForCheck();
  }

  private onSdkAuthorizedVitals(vitals: string[]): void {
    vitals?.forEach((vital) => this.authorizedVitals.add(vital));
    this.refreshAuthorizationFlags();
    console.info('[Vitals Auth] Allowed categories:', this.authorizationFlags);
    console.info('[Vitals Auth] Authorized tag set:', Array.from(this.authorizedVitals));
    this.syncCaptureCards();
  }

  private async authorizeAndSyncVitals(): Promise<string[]> {
    this.authorizedVitals.clear();
    this.authorizationFlags = { pr: false, rr: false, bp: false, spo2: false };

    const authResult = await this.vitalClient!.authorize();
    if (authResult?.authorizedVitals?.length) {
      console.info('[Vitals Auth] authorize() returned cached tags:', authResult.authorizedVitals);
      this.onSdkAuthorizedVitals(authResult.authorizedVitals);
    }
    if (
      typeof authResult?.maxSessionTime === 'number' &&
      Number.isFinite(authResult.maxSessionTime) &&
      authResult.maxSessionTime > 0
    ) {
      this.maxSessionTime = authResult.maxSessionTime;
    }

    await this.mindsetSdkRuntime.captureVitalCoreVersion();
    this.syncCaptureCards();

    const vitals = await this.waitForAuthorizedVitals(1000);
    if (!vitals.length) {
      console.warn('[Vitals Auth] No authorized tags after authorize() — check SDK authorizedVitals event.');
    }
    return vitals;
  }

  public vitalEmoji = (key: string): string => vitalEmojiIcon(key);

  readonly resultsDisclaimer = VITALS_RESULTS_DISCLAIMER;
  readonly resultsBpNote = VITALS_RESULTS_BP_NOTE;

  public get showResultsBpNote(): boolean {
    return this.authorizationFlags.bp;
  }

  public showVitalMarkBadge = (row: VitalResultRow): boolean =>
    (row.id === 'bp' && this.authorizationFlags.bp) ||
    (row.id === 'spo2' && this.authorizationFlags.spo2);

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
    if (this.resultsMeasurementActive) {
      return false;
    }

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
    return canShowResultsRetry({
      scanFailed: this.scanState === 'scan_failed',
      bp: {
        authorizedTags: this.getSelectedVitals(),
        bpRetryUsed: this.bpRetryUsed,
        bpRetryInProgress: this.bpRetryInProgress,
        bpResultKind: this.resultRows.find((row) => row.id === 'bp')?.kind,
      },
      prRr: {
        authorizedTags: this.getSelectedVitals(),
        prRrRetryUsed: this.prRrRetryUsed,
        prRrRetryInProgress: this.prRrRetryInProgress,
        bpRetryInProgress: this.bpRetryInProgress,
        resultRows: this.resultRows,
      },
    });
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

  private returnToReadyScan(message = '', preserveResults = false): void {
    if (!preserveResults) {
      this.resultRows = [];
    }
    this.scanState = 'ready_to_scan';
    this.statusMessage = message;
    this.progressPercent = 0;
    this.scanSecondsRemaining = 0;
    this.scanFinalizing = false;
    this.progressAnimatingToComplete = false;
    this.isSubmitting = false;
    this.showScanWarning = false;
    this.handlingMeasurementStop = false;
    this.measurementInFlight = false;
    this.bpRetryInProgress = false;
    this.bpRetryPending = false;
    this.prRrRetryInProgress = false;
    this.pendingPrRrRetryTags = null;
    this.prRrRetryAttemptNumber = 0;
    this.resultsMeasurementActive = false;
    this.mindsetSdkRuntime.resetMeasurementState();
    this.cancelFaceNotDetectedRestart();
    this.refreshFaceGuideOverlay();
    this.cdr.markForCheck();
  }

  private async retryFromResults(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    if (this.canRetryBpOnly()) {
      const bpTags = getAuthorizedBpTags(this.getSelectedVitals());
      if (!bpTags.length) {
        console.warn('[Vitals Retry] BP retry requested but no BP tags are authorized.');
        return;
      }

      this.bpRetryUsed = true;
      this.bpRetryPending = true;
      console.info('[Vitals Retry] User initiated BP unmeasurable retry. Authorized BP tags:', bpTags);

      try {
        await this.prepareRetryReadyScan();
      } catch (error) {
        console.error('BP vitals retry failed:', error);
        this.bpRetryPending = false;
        this.resultsMeasurementActive = false;
        this.setFailedState(this.resolveErrorMessage(error), false, true);
      }
      return;
    }

    if (this.canRetryPrRrOnly()) {
      const prRrTags = getAuthorizedPrRrTagsForRetry(this.getSelectedVitals(), this.resultRows);
      if (!prRrTags.length) {
        console.warn('[Vitals Retry] PR/RR retry requested but no eligible PR/RR tags found.');
        return;
      }

      this.prRrRetryUsed = true;
      this.prRrRetryInProgress = true;
      this.pendingPrRrRetryTags = prRrTags;
      this.prRrRetryAttemptNumber = 2;
      console.info('[Vitals Retry] User initiated PR/RR retry. Tags:', prRrTags);

      try {
        await this.prepareRetryReadyScan();
      } catch (error) {
        console.error('PR/RR vitals retry failed:', error);
        this.prRrRetryInProgress = false;
        this.pendingPrRrRetryTags = null;
        this.prRrRetryAttemptNumber = 0;
        this.resultsMeasurementActive = false;
        this.setFailedState(this.resolveErrorMessage(error), false, true);
      }
      return;
    }

    this.resultRows = [];
    this.isSubmitting = false;
    this.statusMessage = '';
    this.progressPercent = 0;
    this.scanSecondsRemaining = 0;
    this.scanFinalizing = false;
    this.progressAnimatingToComplete = false;
    this.showScanWarning = false;
    this.handlingMeasurementStop = false;
    this.measurementInFlight = false;
    this.clearQualityWarnings();
    this.clearScanTimers();
    this.cancelFaceNotDetectedRestart();
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

  private async prepareRetryReadyScan(): Promise<void> {
    this.isSubmitting = false;
    this.statusMessage = '';
    this.clearQualityWarnings();
    this.clearScanTimers();
    this.cancelFaceNotDetectedRestart();
    this.resultsMeasurementActive = true;
    this.cdr.markForCheck();

    this.scanState = 'initializing_scan';
    this.cdr.detectChanges();
    await this.waitForVideoElement();
    if (!this.isCameraStreamActive()) {
      await this.startCamera();
    }
    await this.recycleSdkForRetry();
    this.scanState = 'ready_to_scan';
    this.refreshFaceGuideOverlay();
    this.cdr.markForCheck();
  }

  private returnToPrRrRetryReady(message = ''): void {
    this.scanState = 'ready_to_scan';
    this.statusMessage = message;
    this.progressPercent = 0;
    this.scanSecondsRemaining = 0;
    this.scanFinalizing = false;
    this.progressAnimatingToComplete = false;
    this.isSubmitting = false;
    this.showScanWarning = false;
    this.handlingMeasurementStop = false;
    this.measurementInFlight = false;
    this.mindsetSdkRuntime.resetMeasurementState();
    this.cancelFaceNotDetectedRestart();
    this.refreshFaceGuideOverlay();

    const video = this.videoEl?.nativeElement;
    if (video) {
      void this.mindsetSdkRuntime.startPreview(video);
    }

    this.cdr.markForCheck();
  }

  private finishAndRestartSession(): void {
    this.captureSession.clearActiveSession();
    void this.router.navigate(['/']);
  }

  private resetState(): void {
    this.scanFinalizing = false;
    this.progressAnimatingToComplete = false;
    this.handlingMeasurementStop = false;
    this.measurementInFlight = false;
    this.bpRetryInProgress = false;
    this.bpRetryPending = false;
    this.prRrRetryInProgress = false;
    this.pendingPrRrRetryTags = null;
    this.prRrRetryAttemptNumber = 0;
    this.scanState = 'initializing_scan';
    this.statusMessage = '';
    this.progressPercent = 0;
    this.scanSecondsRemaining = 0;
    this.showScanWarning = false;
    this.isSubmitting = false;
    this.authorizedVitals.clear();
    this.authorizationFlags = { pr: false, rr: false, bp: false, spo2: false };
    this.cameraInfo = null;
    this.activeQualityWarnings = [];
    this.clearQualityWarnings();
    this.captureCards = vitalTagsToCaptureCards([]);
    this.resultRows = [];
    this.previousScanEnvelope = null;
    this.bpRetryUsed = false;
    this.prRrRetryUsed = false;
    this.bpRetryPending = false;
    this.pendingPrRrRetryTags = null;
    this.prRrRetryAttemptNumber = 0;
    this.resultsMeasurementActive = false;
    this.vitalsCaptureSubmitted = false;
    this.clearFaceGuide();
    this.videoStageStyle = null;
    this.cancelFaceNotDetectedRestart();
  }

  private syncCaptureCards(): void {
    this.captureCards = vitalTagsToCaptureCards(this.getSelectedVitals());
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
    this.authorizedVitals.clear();
    this.authorizationFlags = { pr: false, rr: false, bp: false, spo2: false };
    this.bindSdkSessionHandlers();
    await this.mindsetSdkRuntime.startPreview(video);
    this.vitalClient = this.mindsetSdkRuntime.getClient();
    await this.mindsetSdkRuntime.captureVitalCoreVersion();
  }

  private async recycleSdkForRetry(): Promise<void> {
    const video = this.videoEl?.nativeElement;
    if (!video) {
      throw new Error('Video element not available.');
    }

    console.info('[Vitals Retry] Recycling SDK client for fresh backend authorization.');
    this.mindsetSdkRuntime.setPatientId(this.patientId);
    this.vitalClient = await this.mindsetSdkRuntime.prepareForNewCapture();
    this.authorizedVitals.clear();
    this.authorizationFlags = { pr: false, rr: false, bp: false, spo2: false };
    this.bindSdkSessionHandlers();
    await this.mindsetSdkRuntime.startPreview(video);
    this.vitalClient = this.mindsetSdkRuntime.getClient();
    await this.mindsetSdkRuntime.captureVitalCoreVersion();
  }

  private bindSdkSessionHandlers(): void {
    this.mindsetSdkRuntime.bindSession({
      onAuthorizedVitals: (vitals) => {
        this.onSdkAuthorizedVitals(vitals ?? []);
      },
      onMaxSessionTime: (duration) => {
        if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
          this.maxSessionTime = duration;
        }
      },
      onTimeLeft: (data) => {
        if (typeof data?.maxTime === 'number' && data.maxTime > 0) {
          this.maxSessionTime = data.maxTime;
        }

        const timeLeft = data?.timeLeft;
        const nextProgress = this.toProgressPercent(data?.percentComplete);
        this.progressPercent = nextProgress;
        this.scanSecondsRemaining =
          timeLeft != null && Number.isFinite(timeLeft) ? Math.max(0, Math.ceil(timeLeft)) : 0;

        const measurementComplete =
          nextProgress >= 100 ||
          (timeLeft != null && Number.isFinite(timeLeft) && timeLeft <= 0);

        if (
          this.scanState === 'scanning_in_progress' &&
          !this.scanFinalizing &&
          measurementComplete
        ) {
          this.scheduleFinalizeAtCompletion();
        }
        this.cdr.markForCheck();
      },
      onStop: (data) => {
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
  }

  private async startScan(): Promise<void> {
    if (this.startScanDisabled || !this.vitalClient) {
      return;
    }

    try {
      if (this.bpRetryPending) {
        this.bpRetryPending = false;
        this.bpRetryInProgress = true;
        await this.runMeasurement({ bpRetryOnly: true });
        return;
      }

      if (this.prRrRetryInProgress && this.pendingPrRrRetryTags?.length) {
        console.info(
          `[Vitals Retry] User started PR/RR retry attempt ${this.prRrRetryAttemptNumber}/${MINDSET_VITALS_MAX_ATTEMPTS}`,
          this.pendingPrRrRetryTags,
        );
        await this.runMeasurement({ prRrRetryOnly: this.pendingPrRrRetryTags });
        return;
      }

      await this.runMeasurement();
    } catch (error) {
      console.error('Vitals scan failed:', error);
      const message = this.resolveErrorMessage(error);
      if (this.prRrRetryInProgress) {
        this.returnToPrRrRetryReady(message);
        return;
      }
      this.returnToReadyScan(message);
    }
  }

  private async runMeasurement(options?: { bpRetryOnly?: boolean; prRrRetryOnly?: string[] }): Promise<void> {
    if (!this.vitalClient) {
      throw new Error('Vitals client not initialized.');
    }

    if (this.measurementInFlight) {
      return;
    }

    this.measurementInFlight = true;

    try {
      await this.ensureCameraReadyForMeasurement();

      const video = this.videoEl?.nativeElement;
      if (!video) {
        throw new Error('Video element not available.');
      }

      this.progressPercent = 0;
      this.scanSecondsRemaining = 0;
      this.scanFinalizing = false;
      this.progressAnimatingToComplete = false;
      this.showScanWarning = false;
      this.clearScanTimers();
      this.clearQualityWarnings();
      this.cancelFaceNotDetectedRestart();
      this.scanState = 'scanning_in_progress';
      this.statusMessage = '';
      this.refreshFaceGuideOverlay();

      let wantedVitals: string[];
      try {
        const authorizedTags = await this.authorizeAndSyncVitals();
        wantedVitals = options?.bpRetryOnly
          ? resolveMeasurementVitals(authorizedTags, { bpRetryOnly: true })
          : options?.prRrRetryOnly?.length
            ? resolveMeasurementVitals(authorizedTags, { prRrRetryOnly: options.prRrRetryOnly })
            : authorizedTags;
      } catch (error) {
        console.error('Vitals authorization failed:', error);
        this.returnToReadyScan();
        return;
      }

      if (wantedVitals.length === 0) {
        console.error('No vitals authorized. Check authorization.');
        this.returnToReadyScan();
        return;
      }

      if (options?.bpRetryOnly && !isBpAuthorized(this.getSelectedVitals())) {
        console.error('[Vitals Retry] BP retry blocked — BP not in authorizedVitals set.');
        this.returnToReadyScan();
        return;
      }

      console.info(
        options?.bpRetryOnly
          ? '[Vitals Retry] Starting BP-only scan with authorized tags:'
          : options?.prRrRetryOnly?.length
            ? `[Vitals Retry] Starting PR/RR retry attempt ${this.prRrRetryAttemptNumber}/${MINDSET_VITALS_MAX_ATTEMPTS} with tags:`
            : '[Vitals Auth] Starting measurement with authorized tags:',
        wantedVitals,
      );

      this.mindsetSdkRuntime.markMeasurementStarted();
      await this.vitalClient.start(wantedVitals, video);
    } catch (error) {
      this.measurementInFlight = false;
      this.bpRetryInProgress = false;
      if (options?.bpRetryOnly) {
        this.bpRetryPending = true;
      }
      console.error('Vitals measurement failed:', error);
      const message = this.resolveErrorMessage(error);
      if (this.prRrRetryInProgress) {
        this.returnToPrRrRetryReady(message);
        return;
      }
      this.returnToReadyScan(message);
    }
  }

  private getSelectedVitals(): string[] {
    return Array.from(this.authorizedVitals);
  }

  private async waitForAuthorizedVitals(timeoutMs = 5000): Promise<string[]> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const vitals = this.getSelectedVitals();
      if (vitals.length > 0) {
        return vitals;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return this.getSelectedVitals();
  }

  private canRetryBpOnly(): boolean {
    const bpRow = this.resultRows.find((row) => row.id === 'bp');
    return canOfferBpRetry({
      authorizedTags: this.getSelectedVitals(),
      bpRetryUsed: this.bpRetryUsed,
      bpRetryInProgress: this.bpRetryInProgress,
      bpResultKind: bpRow?.kind,
    });
  }

  private canRetryPrRrOnly(): boolean {
    return canOfferPrRrRetry({
      authorizedTags: this.getSelectedVitals(),
      prRrRetryUsed: this.prRrRetryUsed,
      prRrRetryInProgress: this.prRrRetryInProgress,
      bpRetryInProgress: this.bpRetryInProgress,
      resultRows: this.resultRows,
    });
  }

  private clearScanTimers(): void {
    if (this.scanFinalizeTimer) {
      clearTimeout(this.scanFinalizeTimer);
      this.scanFinalizeTimer = null;
    }
  }

  private scheduleFinalizeAtCompletion(): void {
    if (this.scanFinalizeTimer || this.scanFinalizing || this.scanState !== 'scanning_in_progress') {
      return;
    }

    this.scanFinalizeTimer = setTimeout(() => {
      this.scanFinalizeTimer = null;
      void this.finalizeActiveScan();
    }, 400);
  }

  private async finalizeActiveScan(): Promise<void> {
    if (this.scanFinalizing || !this.vitalClient || this.scanState !== 'scanning_in_progress') {
      return;
    }

    this.scanFinalizing = true;
    this.clearScanTimers();
    this.statusMessage = 'Finalizing your results…';
    this.cdr.markForCheck();

    try {
      if (this.progressPercent < 100) {
        await this.animateProgressToComplete();
      } else {
        this.progressPercent = 100;
        this.scanSecondsRemaining = 0;
      }

      const stopPayload = await this.mindsetSdkRuntime.stopMeasurement();
      if (stopPayload) {
        await this.handleMeasurementStop(stopPayload);
      }
    } catch (error) {
      console.error('Vitals finalize failed:', error);
      const message =
        this.resolveSdkErrorMessage(error) || 'Unable to finalize vitals scan. Please try again.';
      if (this.prRrRetryInProgress) {
        this.returnToPrRrRetryReady(message);
      } else {
        this.returnToReadyScan(message);
      }
    } finally {
      this.scanFinalizing = false;
      this.progressAnimatingToComplete = false;
    }
  }

  private animateProgressToComplete(): Promise<void> {
    this.progressAnimatingToComplete = true;
    const startProgress = this.progressPercent;
    const durationMs = 800;

    return new Promise((resolve) => {
      const startedAt = performance.now();

      const step = (now: number): void => {
        const elapsed = now - startedAt;
        const ratio = Math.min(1, elapsed / durationMs);
        this.progressPercent = Math.round(startProgress + (100 - startProgress) * ratio);
        this.scanSecondsRemaining = Math.max(
          0,
          Math.ceil((1 - ratio) * (this.scanSecondsRemaining || this.maxSessionTime)),
        );
        this.cdr.markForCheck();

        if (ratio < 1) {
          requestAnimationFrame(step);
          return;
        }

        this.progressPercent = 100;
        this.scanSecondsRemaining = 0;
        resolve();
      };

      requestAnimationFrame(step);
    });
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

    if (this.faceNotDetectedRestarting) {
      this.faceNotDetectedRestarting = false;
      this.handlingMeasurementStop = true;
      this.clearScanTimers();
      this.scanFinalizing = false;
      this.progressAnimatingToComplete = false;
      this.measurementInFlight = false;
      this.mindsetSdkRuntime.resetMeasurementState();
      this.cancelFaceNotDetectedRestart();
      this.returnToReadyScan();
      this.handlingMeasurementStop = false;
      return;
    }

    this.handlingMeasurementStop = true;
    this.clearScanTimers();
    this.scanFinalizing = false;
    this.progressAnimatingToComplete = false;
    this.measurementInFlight = false;
    this.mindsetSdkRuntime.resetMeasurementState();
    this.cancelFaceNotDetectedRestart();

    try {
      const result = this.resolveStopResult(data);
      if (result) {
        await this.handleScanComplete(result);
        return;
      }

      const failureMessage = 'We could not complete the scan. Please try again.';
      if (this.prRrRetryInProgress) {
        this.returnToPrRrRetryReady(failureMessage);
      } else {
        this.returnToReadyScan(failureMessage);
      }
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
    return this.scanFinalizing || this.progressAnimatingToComplete;
  }

  private toProgressPercent(value?: number): number {
    if (value == null || !Number.isFinite(value)) {
      return 0;
    }
    const normalized = value <= 1 ? value * 100 : value;
    return Math.min(100, Math.max(0, Math.round(normalized)));
  }

  private async handleScanComplete(sdkResult: unknown): Promise<void> {
    let resolvedResult = sdkResult;
    const completingBpRetry = this.bpRetryInProgress;
    const completingPrRrRetry = this.prRrRetryInProgress;

    if (completingBpRetry && this.previousScanEnvelope) {
      resolvedResult = mergeBpRetryIntoBaseResult(this.previousScanEnvelope, sdkResult);
      this.bpRetryInProgress = false;
      console.info('[Vitals Retry] Merged BP retry into prior scan result.');
    } else if (completingPrRrRetry && this.previousScanEnvelope) {
      resolvedResult = mergePrRrRetryIntoBaseResult(this.previousScanEnvelope, sdkResult);
      this.previousScanEnvelope = resolvedResult as Record<string, unknown>;
      console.info(
        `[Vitals Retry] Merged PR/RR attempt ${this.prRrRetryAttemptNumber}/${MINDSET_VITALS_MAX_ATTEMPTS} into prior scan result.`,
      );
    } else if (!completingBpRetry && !completingPrRrRetry) {
      this.previousScanEnvelope = (sdkResult ?? {}) as Record<string, unknown>;
    }

    const vitalCoreVersion = this.mindsetSdkRuntime.getVitalCoreVersion();
    const authorizedTags = this.getSelectedVitals();
    const mapped = mapSdkStopResultToCaptureRequest(resolvedResult, vitalCoreVersion, authorizedTags);
    this.resultRows = buildVitalResultRowsForCapture(mapped, this.captureCards);

    if (completingPrRrRetry) {
      const stillNeeded = getAuthorizedPrRrTagsForRetry(authorizedTags, this.resultRows);
      const hasAttemptsLeft = this.prRrRetryAttemptNumber < MINDSET_VITALS_MAX_ATTEMPTS;

      if (stillNeeded.length > 0 && hasAttemptsLeft) {
        this.pendingPrRrRetryTags = stillNeeded;
        this.prRrRetryAttemptNumber += 1;
        console.info(
          `[Vitals Retry] Preparing attempt ${this.prRrRetryAttemptNumber}/${MINDSET_VITALS_MAX_ATTEMPTS}. Tags still needed:`,
          stillNeeded,
        );
        this.returnToPrRrRetryReady();
        return;
      }

      this.prRrRetryInProgress = false;
      this.pendingPrRrRetryTags = null;
      console.info('[Vitals Retry] PR/RR retry sequence complete.');
    }

    const isRetryCompletion = completingBpRetry || completingPrRrRetry;

    if (!mapped.isValid) {
      if (isRetryCompletion || this.vitalsCaptureSubmitted) {
        this.finishRetryResultsDisplay();
        return;
      }
      this.finishCaptureWithoutSubmit(mapped);
      return;
    }

    this.submitCaptureResults(mapped, authorizedTags, isRetryCompletion);
  }

  private submitCaptureResults(
    mapped: MappedVitalsCaptureResult,
    authorizedTags: string[],
    isRetryCompletion: boolean,
  ): void {
    const submitMapped = filterMappedCaptureRequestForAuthorizedTags(mapped, authorizedTags);

    this.isSubmitting = true;
    this.cdr.markForCheck();

    this.mindsetVitalsService
      .captureVitals(this.patientId, {
        pulseRate: submitMapped.pulseRate,
        breathingRate: submitMapped.breathingRate,
        bloodPressureSystolic: submitMapped.bloodPressureSystolic,
        bloodPressureDiastolic: submitMapped.bloodPressureDiastolic,
        oxygenSaturation: submitMapped.oxygenSaturation,
        sdkVitalsPayload: mapped.sdkVitalsPayload,
      })
      .subscribe({
        next: () => {
          this.vitalsCaptureSubmitted = true;
          this.finishCaptureSuccess();
        },
        error: (err) => {
          const apiMessage = extractMindsetVitalsApiErrorMessage(err) || this.failureMessage;
          console.error('[Vitals Capture] Submit failed:', apiMessage, err);
          this.isSubmitting = false;

          if (isRetryCompletion || this.vitalsCaptureSubmitted) {
            console.warn('[Vitals Retry] Showing merged results after submit failure.');
            this.finishRetryResultsDisplay();
            return;
          }

          this.scanState = 'scan_failed';
          this.statusMessage = apiMessage;
          this.cdr.markForCheck();
        },
      });
  }

  private finishRetryResultsDisplay(): void {
    void this.stopCameraPreview();
    this.scanState = 'scan_completed';
    this.resultsMeasurementActive = false;
    this.statusMessage = this.vitalsCaptureSubmitted ? this.successMessage : '';
    this.isSubmitting = false;
    this.cdr.markForCheck();
  }

  private finishCaptureWithoutSubmit(mapped: MappedVitalsCaptureResult): void {
    void this.stopCameraPreview();
    this.scanState = 'scan_completed';
    this.resultsMeasurementActive = false;
    this.statusMessage = mapped.validationMessage || '';
    this.isSubmitting = false;
    this.cdr.markForCheck();
  }

  private finishCaptureSuccess(): void {
    void this.stopCameraPreview();
    this.scanState = 'scan_completed';
    this.resultsMeasurementActive = false;
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
    const statuses = extractSdkWarningStatuses(message?.dataStatus);
    const hasFaceNotDetected = statuses.some(
      (status) => status.code === VitalsCaptureComponent.FACE_NOT_DETECTED_CODE,
    );

    if (!hasFaceNotDetected && this.faceNotDetectedWarningMessage) {
      this.removeQualityWarning(this.faceNotDetectedWarningMessage);
      this.faceNotDetectedWarningMessage = null;
      this.cancelFaceNotDetectedRestart();
    }

    if (!statuses.length) {
      return;
    }

    let newWarnings = false;
    for (const status of statuses) {
      if (this.activeQualityWarnings.includes(status.message)) {
        continue;
      }

      newWarnings = true;
      if (status.code === VitalsCaptureComponent.FACE_NOT_DETECTED_CODE) {
        this.faceNotDetectedWarningMessage = status.message;
        this.addQualityWarning(status.message, { persist: true });
        if (this.scanState === 'scanning_in_progress' && !this.scanFinalizing) {
          this.scheduleFaceNotDetectedRestart();
        }
      } else {
        this.addQualityWarning(status.message);
      }
    }

    if (newWarnings) {
      this.cdr.markForCheck();
    }
  }

  private scheduleFaceNotDetectedRestart(): void {
    this.cancelFaceNotDetectedRestart();
    this.faceNotDetectedRestartTimer = setTimeout(() => {
      this.faceNotDetectedRestartTimer = null;
      void this.restartScanDueToFaceNotDetected();
    }, VitalsCaptureComponent.FACE_NOT_DETECTED_RESTART_MS);
  }

  private cancelFaceNotDetectedRestart(): void {
    if (this.faceNotDetectedRestartTimer) {
      clearTimeout(this.faceNotDetectedRestartTimer);
      this.faceNotDetectedRestartTimer = null;
    }
  }

  private async restartScanDueToFaceNotDetected(): Promise<void> {
    if (this.scanState !== 'scanning_in_progress' || this.scanFinalizing) {
      return;
    }

    this.faceNotDetectedRestarting = true;
    this.cancelFaceNotDetectedRestart();
    this.clearScanTimers();

    try {
      await this.mindsetSdkRuntime.stopMeasurement();
    } catch (error) {
      console.error('Face not detected scan restart failed:', error);
      this.faceNotDetectedRestarting = false;
      this.returnToReadyScan();
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

  private addQualityWarning(message: string, options?: { persist?: boolean }): void {
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
      this.qualityWarningTimers.delete(trimmed);
    }

    if (!options?.persist) {
      this.qualityWarningTimers.set(
        trimmed,
        setTimeout(() => this.removeQualityWarning(trimmed), 3000),
      );
    }
  }

  private removeQualityWarning(message: string): void {
    this.qualityWarningTimers.delete(message);
    this.activeQualityWarnings = this.activeQualityWarnings.filter((item) => item !== message);
    if (this.faceNotDetectedWarningMessage === message) {
      this.faceNotDetectedWarningMessage = null;
      this.cancelFaceNotDetectedRestart();
    }
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
    this.cancelFaceNotDetectedRestart();

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
