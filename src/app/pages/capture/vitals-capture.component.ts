import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
import { extractMindsetVitalsApiErrorMessage, isGatewayHttpStatus, isMissingProSubmissionCaptureError } from '../../mindset/mindset-vitals-http-errors';
import { MindsetVitalsSdkRuntimeService } from '../../mindset/mindset-vitals-sdk-runtime.service';
import { CaptureSessionService } from '../../mindset/capture-session.service';
import { MindsetPatientRegistration, MindsetVitalsCaptureRequest, MindsetVitalsService } from '../../mindset/mindset-vitals.service';
import {
  mapSdkStopResultToCaptureRequest,
  MappedVitalsCaptureResult,
  VitalsCaptureScanState,
} from '../../mindset/mindset-vitals-sdk.mapper';
import {
  buildVitalResultRowsForCapture,
  hasUnmeasurableResults,
  hasSubmittableResults,
  hasWarningResults,
  needsRespiratoryRateVerification,
  needsPulseRateVerification,
  needsBoundaryQualifierVerification,
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
  measureWithRetries,
  MINDSET_VITALS_MAX_ATTEMPTS,
} from '../../mindset/mindset-vitals-retry.helper';
import { IfuHelpButtonComponent } from '../../shared/ifu-help-button/ifu-help-button.component';

@Component({
  selector: 'app-vitals-capture',
  standalone: true,
  imports: [CommonModule, IfuHelpButtonComponent],
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
  private pendingCaptureMapped: MappedVitalsCaptureResult | null = null;
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
  private retryLoopActive = false;
  public awaitingRetry = false;
  public awaitingSessionReview = false;
  public sessionReviewRows: VitalResultRow[] = [];
  private retryAttemptNumber = 0;
  private retryStillNeeded: string[] = [];
  private waitForRetryResolver: ((wantsRetry: boolean) => void) | null = null;
  private userChoseSubmitDuringWait = false;
  private hasMeasuredOnce = false;
  private resultsMeasurementActive = false;
  private faceNotDetectedRestartTimer: ReturnType<typeof setTimeout> | null = null;
  private faceNotDetectedWarningMessage: string | null = null;
  private static readonly FACE_NOT_DETECTED_CODE = 'E-FDM-041';
  private static readonly FACE_NOT_DETECTED_RESTART_MS = 3000;
  private captureEpoch = 0;

  private handlingMeasurementStop = false;

  private readonly successMessage = 'Your vitals were submitted successfully.';
  private readonly failureMessage = 'Vitals capture failed';
  private patientRegistered = false;
  private captureFlowStarted = false;
  private vitalsCaptureSubmitted = false;
  public submitErrorMessage = '';

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
    this.resetState();
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
    void this.exitCaptureFullReload();
  };

  onDoneClick = (): void => {
    void this.restartFromHomeKeepingPatientId();
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

  public get showVideoPreparingDim(): boolean {
    return (
      this.scanState === 'camera_permission_required' ||
      (this.scanState === 'initializing_scan' && !this.mediaStream)
    );
  }

  public get showCaptureCards(): boolean {
    return this.scanState === 'scanning_in_progress' || this.showSessionReviewInCards;
  }

  public get showSessionReviewInCards(): boolean {
    return (
      (this.awaitingRetry || this.awaitingSessionReview) &&
      this.scanState === 'ready_to_scan' &&
      this.sessionReviewRows.length > 0
    );
  }

  public get showStartScanButton(): boolean {
    return (
      (this.scanState === 'ready_to_scan' || this.scanState === 'scan_failed') &&
      !this.measurementInFlight &&
      !this.scanFinalizing &&
      !this.awaitingRetry &&
      !this.awaitingSessionReview
    );
  }

  public get startScanDisabled(): boolean {
    return (
      this.isSubmitting ||
      this.measurementInFlight ||
      this.scanFinalizing ||
      this.scanState === 'initializing_scan' ||
      this.scanState === 'scanning_in_progress' ||
      this.scanState === 'camera_permission_required' ||
      this.hasBlockingScanWarnings
    );
  }

  public get hasBlockingScanWarnings(): boolean {
    return this.scanState === 'ready_to_scan' && this.activeQualityWarnings.length > 0;
  }

  public get startScanHint(): string | null {
    return null;
  }

  public get readyScanTitle(): string | null {
    if (this.isSubmitting) {
      return null;
    }
    if (this.awaitingSessionReview) {
      return null;
    }
    if (this.awaitingRetry && this.retryAttemptNumber > 1) {
      return `Attempt ${this.retryAttemptNumber} of ${MINDSET_VITALS_MAX_ATTEMPTS}`;
    }
    return 'Ready to scan';
  }

  public get readyScanSubtitle(): string {
    if (this.isSubmitting && !this.isResultsView) {
      return 'Submitting vitals…';
    }
    if (this.submitErrorMessage) {
      return `${this.submitErrorMessage} Tap Submit to try again.`;
    }
    if (this.awaitingRetry && this.retryStillNeeded.length) {
      if (needsPulseRateVerification(this.sessionReviewRows)) {
        return 'Your pulse rate needs to be verified. Tap Retry to measure again, or Submit to save what you have.';
      }
      if (needsRespiratoryRateVerification(this.sessionReviewRows)) {
        return 'Your breathing rate needs to be verified. Tap Retry to measure again, or Submit to save what you have.';
      }
      if (!this.showMeasurementDecisionSubmit) {
        return 'We could not measure your vitals. Tap Retry to try again.';
      }
      return 'Review your results above. Tap Retry to measure again, or Submit to save what you have.';
    }
    if (this.awaitingSessionReview) {
      return 'Review your results above, and click Submit.';
    }
    if (this.statusMessage?.trim()) {
      return this.statusMessage;
    }
    return 'Center your face in the frame, then tap Start Scan.';
  }

  public get showRetryDecisionFooter(): boolean {
    return (
      this.awaitingRetry &&
      this.scanState === 'ready_to_scan' &&
      !this.isSubmitting
    );
  }

  public get showSessionReviewFooter(): boolean {
    return (
      this.awaitingSessionReview &&
      this.scanState === 'ready_to_scan' &&
      !this.isSubmitting
    );
  }

  public sessionResultForCard(card: VitalCaptureCard): VitalResultRow | null {
    const metricIdByCardKey: Record<string, string> = {
      PR: 'pr',
      RR: 'rr',
      BP: 'bp',
      SpO2: 'spo2',
    };
    const metricId = metricIdByCardKey[card.key];
    if (!metricId) {
      return null;
    }
    return this.sessionReviewRows.find((row) => row.id === metricId) ?? null;
  }

  public showCardSessionResult(card: VitalCaptureCard): boolean {
    return this.showSessionReviewInCards && !!this.sessionResultForCard(card);
  }

  public cardSessionResultText(card: VitalCaptureCard): string {
    const row = this.sessionResultForCard(card);
    if (!row) {
      return '';
    }
    if (row.kind === 'unmeasurable') {
      return 'Unable to measure';
    }
    return this.rowDisplayValue(row);
  }

  public cardSessionResultKind(card: VitalCaptureCard): VitalResultRow['kind'] | null {
    return this.sessionResultForCard(card)?.kind ?? null;
  }

  public rowDisplayValue(row: VitalResultRow): string {
    if (row.kind === 'unmeasurable') {
      return row.displayText ?? 'Unable to Measure';
    }
    if (row.displayText?.trim()) {
      return row.displayText;
    }
    return [row.valuePrefix, row.valueNumber, row.valueUnit].filter(Boolean).join(' ').trim();
  }

  public onMeasurementSubmitClick = (): void => {
    if (!this.showMeasurementDecisionSubmit) {
      return;
    }
    if (this.awaitingRetry) {
      this.onSubmitBetweenAttempts();
      return;
    }
    if (this.awaitingSessionReview) {
      this.onSubmitSessionReview();
    }
  };

  public get scanAttemptLabel(): string | null {
    if (
      this.retryLoopActive &&
      this.scanState === 'scanning_in_progress' &&
      this.retryAttemptNumber > 1
    ) {
      return `Attempt ${this.retryAttemptNumber} of ${MINDSET_VITALS_MAX_ATTEMPTS}`;
    }
    return null;
  }

  public get showMeasurementDecisionRetry(): boolean {
    return this.awaitingRetry && this.retryStillNeeded.length > 0;
  }

  public get showMeasurementDecisionSubmit(): boolean {
    return hasSubmittableResults(this.sessionReviewRows);
  }

  public get showSessionReviewSubmit(): boolean {
    return hasSubmittableResults(this.sessionReviewRows);
  }

  public get retryButtonDisabled(): boolean {
    return this.hasBlockingScanWarnings;
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

  public get showResultsDisclaimerGwIcon(): boolean {
    if (!this.resultRows.length) {
      return true;
    }

    return !this.resultRows.some((row) => !this.showVitalMarkBadge(row));
  }

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
      this.scanState === 'ready_to_scan' ||
      this.scanState === 'initializing_scan' ||
      this.scanState === 'scanning_in_progress'
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
      this.vitalsCaptureSubmitted &&
      !this.isSubmitting
    );
  }

  public get showResultsRangeWarningBanner(): boolean {
    return (
      this.scanState === 'scan_completed' &&
      this.vitalsCaptureSubmitted &&
      !this.isSubmitting &&
      this.showResultsWarning
    );
  }

  public get showResultsSubmitError(): boolean {
    return (
      !!this.submitErrorMessage &&
      !this.isSubmitting &&
      this.resultRows.length > 0
    );
  }

  public get resultsRangeWarningMessage(): string {
    if (needsBoundaryQualifierVerification(this.resultRows)) {
      return 'One or more vitals are outside the measurable range. Tap Retry to verify your reading.';
    }
    return 'One or more vitals are outside the expected range. Please verify your results.';
  }

  public get showResultsBoundaryVerificationRetry(): boolean {
    return (
      this.scanState === 'scan_completed' &&
      this.vitalsCaptureSubmitted &&
      !this.isSubmitting &&
      needsBoundaryQualifierVerification(this.resultRows)
    );
  }

  public onResultsRemeasureClick = (): void => {
    this.vitalsCaptureSubmitted = false;
    this.returnToReadyScan('Tap Start Scan to verify your breathing rate.');
    void this.reattachSdkForNewScan();
  };

  public get showScanLineAnimation(): boolean {
    return (
      this.scanState === 'scanning_in_progress' &&
      !this.isMeasurementCompleting
    );
  }

  public get scanProgressSegments() {
    const progress =
      this.scanState === 'scanning_in_progress' ? this.progressPercent : 0;
    return buildScanProgressSegments(progress, this.showScanWarning);
  }

  public get scanLineYValues(): string {
    const top = this.scanOverlay.face.y + 6;
    const bottom = this.scanOverlay.face.y + this.scanOverlay.face.height - 10;
    return `${top};${bottom};${top}`;
  }

  public trackScanSegment = (_index: number, segment: { d: string }): string => segment.d;

  public trackCaptureCard = (_index: number, card: VitalCaptureCard): string => card.key;

  public get startScanButtonText(): string {
    if (this.scanState === 'scan_failed') {
      return 'Try Again';
    }
    if (this.hasMeasuredOnce) {
      return 'Start New Session';
    }
    return 'Start Scan';
  }

  public onRetryBetweenAttempts = (): void => {
    this.resolveRetryPrompt(true);
  };

  public onSubmitBetweenAttempts = (): void => {
    if (!this.showMeasurementDecisionSubmit) {
      return;
    }
    this.userChoseSubmitDuringWait = true;
    this.resolveRetryPrompt(false);
  };

  public onSubmitSessionReview = (): void => {
    if (!this.pendingCaptureMapped || this.isSubmitting || !this.showSessionReviewSubmit) {
      return;
    }
    void this.submitAndShowResults(this.pendingCaptureMapped);
  };

  public onDiscardSessionResultsAndRestart = (): void => {
    if (this.isSubmitting) {
      return;
    }
    this.returnToReadyScan();
    const video = this.videoEl?.nativeElement;
    if (video) {
      void this.mindsetSdkRuntime.startPreview(video);
    }
  };

  private returnToReadyScan(message = '', preserveResults = false): void {
    if (!preserveResults) {
      this.resultRows = [];
      this.pendingCaptureMapped = null;
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
    this.retryLoopActive = false;
    this.awaitingRetry = false;
    this.awaitingSessionReview = false;
    this.sessionReviewRows = [];
    this.userChoseSubmitDuringWait = false;
    this.submitErrorMessage = '';
    this.retryAttemptNumber = 0;
    this.retryStillNeeded = [];
    this.waitForRetryResolver = null;
    this.resultsMeasurementActive = false;
    this.clearQualityWarnings();
    this.faceNotDetectedWarningMessage = null;
    this.mindsetSdkRuntime.resetMeasurementState();
    this.cancelFaceNotDetectedRestart();
    this.refreshFaceGuideOverlay();
    this.cdr.markForCheck();
  }

  private resolveRetryPrompt(wantsRetry: boolean): void {
    if (!this.awaitingRetry || !this.waitForRetryResolver) {
      return;
    }

    const resolve = this.waitForRetryResolver;
    this.waitForRetryResolver = null;
    this.awaitingRetry = false;
    this.retryStillNeeded = [];
    resolve(wantsRetry);
    this.cdr.markForCheck();
  }

  private waitForRetryPrompt(
    stillNeeded: string[],
    attempt: number,
    partialEnvelope: Record<string, unknown>,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.awaitingRetry = true;
      this.awaitingSessionReview = false;
      this.retryStillNeeded = stillNeeded;
      this.retryAttemptNumber = attempt;
      this.progressPercent = 0;
      this.scanSecondsRemaining = 0;
      this.scanFinalizing = false;
      this.progressAnimatingToComplete = false;
      this.scanState = 'ready_to_scan';
      this.statusMessage = '';
      this.mindsetSdkRuntime.resetMeasurementState();
      this.waitForRetryResolver = resolve;
      this.updateSessionReviewFromSdkResult(partialEnvelope, stillNeeded);

      const video = this.videoEl?.nativeElement;
      if (video) {
        void this.mindsetSdkRuntime.startPreview(video);
      }

      this.refreshFaceGuideOverlay();
      this.cdr.markForCheck();
    });
  }

  private updateSessionReviewFromSdkResult(
    sdkResult: Record<string, unknown>,
    stillNeeded: string[] = [],
  ): void {
    const vitalCoreVersion = this.mindsetSdkRuntime.getVitalCoreVersion();
    const authorizedTags = this.getSelectedVitals();
    let mapped = mapSdkStopResultToCaptureRequest(sdkResult, vitalCoreVersion, authorizedTags);
    mapped = this.applyPendingVitalReadings(mapped, sdkResult, stillNeeded, authorizedTags);
    this.pendingCaptureMapped = mapped;
    this.sessionReviewRows = buildVitalResultRowsForCapture(mapped, this.captureCards);
  }

  private applyPendingVitalReadings(
    mapped: MappedVitalsCaptureResult,
    sdkResult: Record<string, unknown>,
    stillNeeded: string[],
    authorizedTags: string[],
  ): MappedVitalsCaptureResult {
    const pending = sdkResult['pendingVitalReadings'];
    if (!pending || typeof pending !== 'object' || stillNeeded.length === 0) {
      return mapped;
    }

    const pendingReadings = pending as Record<string, Record<string, unknown>>;
    const authorized = new Set(authorizedTags);
    const next: MappedVitalsCaptureResult = { ...mapped };

    if (stillNeeded.some((tag) => tag.startsWith('RR_'))) {
      const rrReading =
        (authorized.has('RR_MD') ? pendingReadings['RR_MD'] : undefined) ??
        (authorized.has('RR_GW') ? pendingReadings['RR_GW'] : undefined);
      const rr = this.readPositiveSdkNumber(rrReading?.['rr']);
      if (rr != null) {
        next.breathingRate = rr;
      }
    }

    if (stillNeeded.some((tag) => tag.startsWith('PR_'))) {
      const prReading =
        (authorized.has('PR_MD') ? pendingReadings['PR_MD'] : undefined) ??
        (authorized.has('PR_GW') ? pendingReadings['PR_GW'] : undefined);
      const hr = this.readPositiveSdkNumber(prReading?.['hr']);
      if (hr != null) {
        next.pulseRate = hr;
      }
    }

    return next;
  }

  private readPositiveSdkNumber(value: unknown): number | undefined {
    if (value == null) {
      return undefined;
    }

    const parsed = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  private showSessionReviewBeforeSubmit(mapped: MappedVitalsCaptureResult): void {
    this.pendingCaptureMapped = mapped;
    this.sessionReviewRows = buildVitalResultRowsForCapture(mapped, this.captureCards);
    this.awaitingSessionReview = true;
    this.awaitingRetry = false;
    this.scanState = 'ready_to_scan';
    this.progressPercent = 0;
    this.scanSecondsRemaining = 0;
    this.statusMessage = '';

    const video = this.videoEl?.nativeElement;
    if (video) {
      void this.mindsetSdkRuntime.startPreview(video);
    }

    this.refreshFaceGuideOverlay();
    this.cdr.markForCheck();
  }

  private beginRetryAttempt(attempt: number, _maxAttempts: number, vitals: string[]): void {
    this.retryAttemptNumber = attempt;
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
    this.mindsetSdkRuntime.markMeasurementStarted();
    console.info(`[Vitals Retry] Starting attempt ${attempt}/${MINDSET_VITALS_MAX_ATTEMPTS} with tags:`, vitals);
    this.cdr.markForCheck();
  }

  private endRetryAttempt(): void {
    this.scanFinalizing = false;
    this.progressAnimatingToComplete = false;
    this.mindsetSdkRuntime.resetMeasurementState();
    this.cdr.markForCheck();
  }

  private async exitCapture(): Promise<void> {
    await this.cleanup();
    this.captureSession.clearActiveSession();
    await this.router.navigate(['/']);
  }

  private async restartFromHomeKeepingPatientId(): Promise<void> {
    const session = {
      patientId: this.patientId,
      registration: this.patientRegistration,
      mindsetPatientAlreadyRegistered: this.mindsetPatientAlreadyRegistered,
    };

    await this.cleanup();
    this.captureSession.clearActiveSession();
    this.captureSession.saveDoneRestartSnapshot(session);
    await this.mindsetSdkRuntime.ensureCleanCaptureStart();
    window.location.href = `/?v=${Date.now()}`;
  }

  private async exitCaptureFullReload(): Promise<void> {
    await this.cleanup();
    this.captureSession.clearAll();
    await this.mindsetSdkRuntime.ensureCleanCaptureStart();
    window.location.href = `/?v=${Date.now()}`;
  }

  private resetState(): void {
    this.scanFinalizing = false;
    this.progressAnimatingToComplete = false;
    this.handlingMeasurementStop = false;
    this.measurementInFlight = false;
    this.retryLoopActive = false;
    this.awaitingRetry = false;
    this.awaitingSessionReview = false;
    this.sessionReviewRows = [];
    this.userChoseSubmitDuringWait = false;
    this.submitErrorMessage = '';
    this.retryAttemptNumber = 0;
    this.retryStillNeeded = [];
    this.waitForRetryResolver = null;
    this.hasMeasuredOnce = false;
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
    this.pendingCaptureMapped = null;
    this.resultsMeasurementActive = false;
    this.vitalsCaptureSubmitted = false;
    this.captureFlowStarted = false;
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
        if (
          !this.retryLoopActive ||
          this.scanState !== 'scanning_in_progress' ||
          this.scanFinalizing
        ) {
          return;
        }

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

        if (measurementComplete) {
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
    if (this.startScanDisabled || !this.vitalClient || this.awaitingRetry) {
      return;
    }

    try {
      await this.runMeasurementSession();
    } catch (error) {
      console.error('Vitals scan failed:', error);
      this.returnToReadyScan(this.resolveErrorMessage(error));
    }
  }

  private async runMeasurementSession(): Promise<void> {
    if (!this.vitalClient || this.measurementInFlight) {
      return;
    }

    this.measurementInFlight = true;
    this.retryLoopActive = true;
    this.progressPercent = 0;
    this.scanSecondsRemaining = 0;
    this.scanFinalizing = false;
    this.progressAnimatingToComplete = false;
    this.scanState = 'initializing_scan';
    this.resultRows = [];
    this.pendingCaptureMapped = null;
    this.vitalsCaptureSubmitted = false;
    this.cdr.markForCheck();

    try {
      await this.ensureCameraReadyForMeasurement();

      const video = this.videoEl?.nativeElement;
      if (!video) {
        throw new Error('Video element not available.');
      }

      await this.authorizeAndSyncVitals();

      if (this.hasMeasuredOnce) {
        await this.createNewProSubmissionOrThrow(this.patientId);
      }

      const wantedVitals = this.getSelectedVitals();
      if (!wantedVitals.length) {
        throw new Error('No vitals authorized. Check authorization.');
      }

      const sdkResult = await measureWithRetries(this.vitalClient, video, wantedVitals, {
        maxAttempts: MINDSET_VITALS_MAX_ATTEMPTS,
        onAttemptStarted: (attempt, maxAttempts, vitals) =>
          this.beginRetryAttempt(attempt, maxAttempts, vitals),
        waitForRetry: (stillNeeded, attempt, partialEnvelope) =>
          this.waitForRetryPrompt(stillNeeded, attempt, partialEnvelope),
        onAttemptComplete: () => this.endRetryAttempt(),
      });

      const vitalCoreVersion = this.mindsetSdkRuntime.getVitalCoreVersion();
      const mapped = mapSdkStopResultToCaptureRequest(
        sdkResult,
        vitalCoreVersion,
        wantedVitals,
      );

      if (this.userChoseSubmitDuringWait) {
        this.userChoseSubmitDuringWait = false;
        const reviewRows = buildVitalResultRowsForCapture(mapped, this.captureCards);
        if (!hasSubmittableResults(reviewRows)) {
          this.resumeReadyScanAfterNoMeasurements(
            'We could not measure your vitals. Tap Start Scan to try again.',
          );
        } else {
          await this.submitAndShowResults(mapped);
        }
      } else {
        const reviewRows = buildVitalResultRowsForCapture(mapped, this.captureCards);
        if (!hasSubmittableResults(reviewRows)) {
          this.resumeReadyScanAfterNoMeasurements(
            'We could not measure your vitals. Tap Start Scan to try again.',
          );
        } else {
          this.showSessionReviewBeforeSubmit(mapped);
        }
      }
    } finally {
      this.retryLoopActive = false;
      this.awaitingRetry = false;
      this.waitForRetryResolver = null;
      this.measurementInFlight = false;
      if (!this.awaitingSessionReview) {
        this.retryAttemptNumber = 0;
        this.retryStillNeeded = [];
      }
      this.cdr.markForCheck();
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

  private clearScanTimers(): void {
    if (this.scanFinalizeTimer) {
      clearTimeout(this.scanFinalizeTimer);
      this.scanFinalizeTimer = null;
    }
  }

  private scheduleFinalizeAtCompletion(): void {
    if (
      !this.retryLoopActive ||
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
      this.returnToReadyScan(message);
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
    if (this.retryLoopActive) {
      if (this.faceNotDetectedRestarting) {
        this.faceNotDetectedRestarting = false;
      }
      return;
    }

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
      this.returnToReadyScan('Face not detected. Center your face in the frame, then tap Start Scan.');
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
      if (!result) {
        this.returnToReadyScan('We could not complete the scan. Please try again.');
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

  private async submitAndShowResults(mapped: MappedVitalsCaptureResult): Promise<void> {
    this.pendingCaptureMapped = mapped;
    this.isSubmitting = true;
    this.submitErrorMessage = '';
    this.statusMessage = 'Submitting vitals…';

    const previewRows = buildVitalResultRowsForCapture(mapped, this.captureCards);
    this.resultRows = previewRows;
    this.awaitingSessionReview = false;
    this.sessionReviewRows = [];
    this.scanState = 'scan_completed';
    this.vitalsCaptureSubmitted = false;
    void this.stopCameraPreview();
    this.cdr.markForCheck();

    const authorizedTags = this.getSelectedVitals();
    const submitMapped = filterMappedCaptureRequestForAuthorizedTags(mapped, authorizedTags);

    try {
      await this.captureVitalsWithRetry(this.patientId, {
        pulseRate: submitMapped.pulseRate,
        breathingRate: submitMapped.breathingRate,
        bloodPressureSystolic: submitMapped.bloodPressureSystolic,
        bloodPressureDiastolic: submitMapped.bloodPressureDiastolic,
        oxygenSaturation: submitMapped.oxygenSaturation,
        sdkVitalsPayload: mapped.sdkVitalsPayload,
        clientUserAgent: this.resolveClientUserAgent(),
      });

      this.vitalsCaptureSubmitted = true;
      this.statusMessage = this.successMessage;
      this.hasMeasuredOnce = true;
      await this.mindsetSdkRuntime.releaseAfterCapture(this.captureEpoch);
      this.vitalClient = null;
    } catch (err) {
      const apiMessage = extractMindsetVitalsApiErrorMessage(err) || this.failureMessage;
      console.error('[Vitals Capture] Submit failed:', apiMessage, err);
      if (!hasSubmittableResults(previewRows)) {
        this.resumeReadyScanAfterNoMeasurements(apiMessage);
      } else {
        this.submitErrorMessage = apiMessage;
        this.statusMessage = apiMessage;
        this.vitalsCaptureSubmitted = false;
      }
    } finally {
      this.isSubmitting = false;
      this.resultsMeasurementActive = false;
      this.cdr.markForCheck();
    }
  }

  private resumeReadyScanAfterNoMeasurements(message: string): void {
    this.returnToReadyScan(message);
    const video = this.videoEl?.nativeElement;
    if (video) {
      void this.mindsetSdkRuntime.startPreview(video);
    }
    this.cdr.markForCheck();
  }

  private async reattachSdkForNewScan(): Promise<void> {
    try {
      await this.attachSharedSdk();
      this.refreshFaceGuideOverlay();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Failed to reinitialize vitals scanner:', error);
      this.setFailedState(this.resolveErrorMessage(error));
    }
  }

  private resolveClientUserAgent(): string | undefined {
    if (typeof navigator === 'undefined') {
      return undefined;
    }

    const agent = navigator.userAgent?.trim();
    return agent || undefined;
  }

  private async captureVitalsWithRetry(
    patientId: string,
    request: MindsetVitalsCaptureRequest,
    maxAttempts = 3,
  ): Promise<void> {
    let lastError: unknown;
    let proRecoveryAttempted = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await firstValueFrom(this.mindsetVitalsService.captureVitals(patientId, request));
        return;
      } catch (err) {
        lastError = err;

        if (!proRecoveryAttempted && isMissingProSubmissionCaptureError(err)) {
          proRecoveryAttempted = true;
          await this.createNewProSubmissionOrThrow(patientId);
          continue;
        }

        const canRetry = attempt < maxAttempts && this.isRetriableCaptureError(err);
        if (!canRetry) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }

    throw lastError;
  }

  private async createNewProSubmissionOrThrow(patientId: string): Promise<void> {
    const newPro = await firstValueFrom(this.mindsetVitalsService.createNewProSubmission(patientId));
    if (!newPro?.success) {
      throw new Error(newPro?.message || 'Failed to create a new PRO submission for this session.');
    }
  }

  private isRetriableCaptureError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return true;
    }

    if (error.status === 0) {
      return true;
    }

    return isGatewayHttpStatus(error.status);
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
    this.clearQualityWarnings();
    this.faceNotDetectedWarningMessage = null;

    try {
      await this.mindsetSdkRuntime.stopMeasurement();
    } catch (error) {
      console.error('Face not detected scan restart failed:', error);
      this.faceNotDetectedRestarting = false;
      this.returnToReadyScan('Face not detected. Center your face in the frame, then tap Start Scan.');
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

    this.resultsMeasurementActive = false;
    this.clearQualityWarnings();
    this.faceNotDetectedWarningMessage = null;
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
    this.faceNotDetectedWarningMessage = null;
    this.clearScanTimers();
    this.cancelFaceNotDetectedRestart();

    await this.mindsetSdkRuntime.forceReleaseClient();
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
