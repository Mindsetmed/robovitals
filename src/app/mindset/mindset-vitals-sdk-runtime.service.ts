import { Injectable, NgZone } from '@angular/core';
import { createVitalClient } from '@mindset-vitals/web-sdk';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { buildMindsetCameraVideoConstraints } from './mindset-vitals-camera.helper';
import {
  MINDSET_VITALS_PRELOAD_URLS,
  MINDSET_VITALS_SDK_ASSET_VERSION,
  MINDSET_VITALS_WORKER_DIRECTORY,
} from './mindset-vitals-sdk.paths';
import { MindsetVitalsService } from './mindset-vitals.service';
import { summarizeEncryptedVitalCoreAuth } from './mindset-vitals-auth.helper';

export type MindsetVitalClient = ReturnType<typeof createVitalClient>;

export interface MindsetVitalsPreloadProgress {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
  ready: boolean;
}

export interface MindsetVitalsSdkSessionHandlers {
  onAuthorizedVitals: (vitals: string[]) => void;
  onMaxSessionTime: (duration: number) => void;
  onTimeLeft: (data: { percentComplete?: number; timeLeft?: number; maxTime?: number }) => void;
  onStop: (data: unknown) => void;
  onReady: () => void;
  onGuideCoordinates: (coords: { x: number; y: number; width: number; height: number }) => void;
  onSignsMessage: (message: {
    dataStatus?: Array<string | { message?: string; severity?: string; code?: string }>;
  }) => void;
  onLog: (msg: Record<string, unknown>) => void;
  onError: (error: unknown) => void;
}

@Injectable({ providedIn: 'root' })
export class MindsetVitalsSdkRuntimeService {
  readonly preloadProgress$ = new BehaviorSubject<MindsetVitalsPreloadProgress>({
    loadedBytes: 0,
    totalBytes: 0,
    percent: 0,
    ready: false,
  });

  private warmUpPromise: Promise<void> | null = null;
  private clientCreationPromise: Promise<void> | null = null;
  private cameraWarmupPromise: Promise<MediaStream | null> | null = null;
  private vitalClient: MindsetVitalClient | null = null;
  private vitalCoreVersion: string | null = null;
  private wasmEnvironmentVerified = false;
  private currentPatientId = '';
  private previewActive = false;
  private measuringActive = false;
  private captureEpoch = 0;
  private warmedCameraStream: MediaStream | null = null;
  private readonly eventBindings = new Map<string, (...args: unknown[]) => void>();
  private readonly preloadAssetProgress = new Map<string, { loaded: number; total: number }>();
  private lastEmittedPercent = 0;
  private progressEmitTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingProgress: MindsetVitalsPreloadProgress | null = null;
  private assetsWarmupComplete = false;

  constructor(
    private readonly mindsetVitalsService: MindsetVitalsService,
    private readonly ngZone: NgZone,
  ) {}

  warmUp(): Promise<void> {
    if (this.warmUpPromise) {
      return this.warmUpPromise;
    }

    if (this.assetsWarmupComplete) {
      this.warmUpPromise = Promise.resolve();
      return this.warmUpPromise;
    }

    if (typeof window === 'undefined' || !window.crossOriginIsolated) {
      this.warmUpPromise = Promise.resolve();
      this.assetsWarmupComplete = true;
      this.emitProgress({ loadedBytes: 0, totalBytes: 0, percent: 100, ready: true }, true);
      return this.warmUpPromise;
    }

    this.warmUpPromise = this.runWarmUp();
    return this.warmUpPromise;
  }

  isWarmupReady(): boolean {
    return this.assetsWarmupComplete || this.preloadProgress$.value.ready;
  }

  shouldShowWarmupProgress(): boolean {
    return !this.assetsWarmupComplete;
  }

  beginClientInit(): Promise<void> {
    if (this.vitalClient) {
      return Promise.resolve();
    }

    return this.warmUp().then(() => this.ensureClientInitialized());
  }

  warmUpCamera(): Promise<MediaStream | null> {
    if (this.warmedCameraStream) {
      return Promise.resolve(this.warmedCameraStream);
    }

    if (this.cameraWarmupPromise) {
      return this.cameraWarmupPromise;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return Promise.resolve(null);
    }

    this.cameraWarmupPromise = navigator.mediaDevices
      .getUserMedia({
        video: buildMindsetCameraVideoConstraints(),
        audio: false,
      })
      .then((stream) => {
        this.warmedCameraStream = stream;
        return stream;
      })
      .catch(() => null)
      .finally(() => {
        this.cameraWarmupPromise = null;
      });

    return this.cameraWarmupPromise;
  }

  takeWarmCameraStream(): MediaStream | null {
    const stream = this.warmedCameraStream;
    this.warmedCameraStream = null;
    return stream;
  }

  releaseWarmCamera(): void {
    this.warmedCameraStream?.getTracks().forEach((track) => track.stop());
    this.warmedCameraStream = null;
  }

  isReady(): boolean {
    return !!this.vitalClient;
  }

  getClient(): MindsetVitalClient | null {
    return this.vitalClient;
  }

  getVitalCoreVersion(): string | null {
    return this.vitalCoreVersion;
  }

  async captureVitalCoreVersion(): Promise<string | null> {
    const client = this.vitalClient;
    if (!client?.getVersion) {
      return null;
    }

    try {
      const version = await client.getVersion();
      const normalized = typeof version === 'string' ? version.trim() : String(version ?? '').trim();
      this.vitalCoreVersion = normalized || null;
      if (this.vitalCoreVersion) {
        console.info('Mindset Vital Core version', this.vitalCoreVersion);
      }
      return this.vitalCoreVersion;
    } catch (error) {
      console.warn('Unable to read Mindset Vital Core version', error);
      return null;
    }
  }

  setPatientId(patientId: string): void {
    this.currentPatientId = (patientId || '').trim();
  }

  startCaptureEpoch(): number {
    this.captureEpoch += 1;
    return this.captureEpoch;
  }

  async ensureReady(): Promise<MindsetVitalClient> {
    await this.beginClientInit();
    if (!this.vitalClient) {
      throw new Error('Vitals scanner is not available in this browser session.');
    }
    return this.vitalClient;
  }

  async prepareForNewCapture(): Promise<MindsetVitalClient> {
    return this.recycleClient();
  }

  markMeasurementStarted(): void {
    this.measuringActive = true;
    this.previewActive = false;
  }

  resetMeasurementState(): void {
    this.measuringActive = false;
    this.previewActive = false;
  }

  async stopMeasurement(): Promise<unknown | null> {
    if (!this.vitalClient || !this.measuringActive) {
      return null;
    }
    try {
      return await this.vitalClient.stop();
    } finally {
      this.measuringActive = false;
      this.previewActive = false;
    }
  }

  bindSession(handlers: MindsetVitalsSdkSessionHandlers): void {
    const client = this.vitalClient;
    if (!client) {
      return;
    }

    this.unbindSession();

    const bind = <K extends keyof MindsetVitalsSdkSessionHandlers>(
      event: string,
      handler: MindsetVitalsSdkSessionHandlers[K],
    ): void => {
      const wrapped = (...args: unknown[]) => {
        this.ngZone.run(() => (handler as (...a: unknown[]) => void)(...args));
      };
      this.eventBindings.set(event, wrapped);
      client.on(event, wrapped as never);
    };

    bind('authorizedVitals', handlers.onAuthorizedVitals);
    bind('maxSessionTime', handlers.onMaxSessionTime);
    bind('timeLeft', handlers.onTimeLeft);
    bind('stop', handlers.onStop);
    bind('ready', handlers.onReady);
    bind('guideCoordinates', handlers.onGuideCoordinates);
    bind('signsMessage', handlers.onSignsMessage);
    bind('log', handlers.onLog);
    bind('error', handlers.onError);
  }

  unbindSession(): void {
    const client = this.vitalClient;
    if (!client) {
      this.eventBindings.clear();
      return;
    }

    for (const [event, handler] of this.eventBindings.entries()) {
      client.off(event, handler as never);
    }
    this.eventBindings.clear();
  }

  async startPreview(video: HTMLVideoElement): Promise<void> {
    const client = await this.ensureReady();
    await client.startPreviewMode(video);
    this.previewActive = true;
  }

  async endCaptureSession(): Promise<void> {
    if (this.measuringActive && this.vitalClient) {
      try {
        await this.vitalClient.stop();
      } catch {}
    }
    this.unbindSession();
    this.previewActive = false;
    this.measuringActive = false;
  }

  async recycleClient(): Promise<MindsetVitalClient> {
    await this.endCaptureSession();

    if (this.vitalClient) {
      try {
        await this.vitalClient.destroy();
      } catch {}
      this.vitalClient = null;
    }

    this.vitalCoreVersion = null;
    this.clientCreationPromise = null;
    await this.ensureClientInitialized();

    if (!this.vitalClient) {
      throw new Error('Vitals scanner failed to initialize.');
    }

    return this.vitalClient;
  }

  async releaseAfterCapture(captureEpoch: number): Promise<void> {
    if (captureEpoch !== this.captureEpoch) {
      return;
    }

    await this.endCaptureSession();

    if (this.vitalClient) {
      try {
        await this.vitalClient.destroy();
      } catch {}
      this.vitalClient = null;
    }

    this.clientCreationPromise = null;
    this.currentPatientId = '';
    this.vitalCoreVersion = null;
    this.previewActive = false;
    this.measuringActive = false;
  }

  async destroy(): Promise<void> {
    await this.endCaptureSession();
    if (this.vitalClient) {
      try {
        await this.vitalClient.destroy();
      } catch {}
      this.vitalClient = null;
    }
    this.releaseWarmCamera();
    this.warmUpPromise = null;
    this.clientCreationPromise = null;
    this.wasmEnvironmentVerified = false;
    this.assetsWarmupComplete = false;
    this.currentPatientId = '';
    this.vitalCoreVersion = null;
    this.preloadAssetProgress.clear();
    this.lastEmittedPercent = 0;
    this.pendingProgress = null;
    if (this.progressEmitTimer) {
      clearTimeout(this.progressEmitTimer);
      this.progressEmitTimer = null;
    }
    this.emitProgress({ loadedBytes: 0, totalBytes: 0, percent: 0, ready: false }, true);
  }

  private async runWarmUp(): Promise<void> {
    try {
      await Promise.all([this.preloadAssets(), this.verifyWasmRuntimeEnvironment()]);
      const current = this.preloadProgress$.value;
      this.emitProgress({
        loadedBytes: current.totalBytes || current.loadedBytes,
        totalBytes: current.totalBytes || current.loadedBytes,
        percent: 100,
        ready: true,
      }, true);
      this.assetsWarmupComplete = true;
    } catch {
      this.emitProgress({
        loadedBytes: 0,
        totalBytes: 0,
        percent: 0,
        ready: false,
      }, true);
      throw new Error('Vitals asset preload failed.');
    }
  }

  private async ensureClientInitialized(): Promise<void> {
    if (this.vitalClient) {
      return;
    }

    if (this.clientCreationPromise) {
      await this.clientCreationPromise;
      return;
    }

    this.clientCreationPromise = this.createAndInitClient().finally(() => {
      this.clientCreationPromise = null;
    });

    await this.clientCreationPromise;
  }

  private async createAndInitClient(): Promise<void> {
    const client = createVitalClient({
      workerDirectory: MINDSET_VITALS_WORKER_DIRECTORY,
      authenticator: async (runToken: unknown) => {
        const patientId = this.currentPatientId;
        if (!patientId) {
          throw new Error('Patient ID is required for vitals authorization.');
        }
        const response = await firstValueFrom(
          this.mindsetVitalsService.authorizeVitals(patientId, runToken),
        );
        if (!response?.success || !response.vitalCoreAuth) {
          throw new Error(response?.message || 'Authorization failed');
        }
        console.info(
          '[Vitals Auth] API authorize response — passing encrypted vitals_auth to SDK',
          summarizeEncryptedVitalCoreAuth(response.vitalCoreAuth),
        );
        return response.vitalCoreAuth;
      },
    });

    try {
      await this.initializeClient(client);
      this.vitalClient = client;

      if (!environment.production) {
        try {
          await this.vitalClient.setExtendedLogs?.(true);
        } catch {}
      }
    } catch (error) {
      try {
        await client.destroy();
      } catch {}
      this.vitalClient = null;
      throw error;
    }
  }

  private initializeClient(client: MindsetVitalClient): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeoutMs = 120_000;
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Vitals scanner initialization timed out.'));
      }, timeoutMs);

      const onReady = (): void => {
        cleanup();
        resolve();
      };

      const onError = (error: unknown): void => {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      const cleanup = (): void => {
        clearTimeout(timeoutId);
        client.off('ready', onReady);
        client.off('error', onError);
      };

      client.on('ready', onReady);
      client.on('error', onError);
      void client.init().catch(onError);
    });
  }

  private async preloadAssets(): Promise<void> {
    if (this.assetsWarmupComplete) {
      return;
    }

    const versionQuery = `?v=${MINDSET_VITALS_SDK_ASSET_VERSION}`;
    const heavyAssets = MINDSET_VITALS_PRELOAD_URLS.filter((path) => path.endsWith('.tflite'));
    const otherAssets = MINDSET_VITALS_PRELOAD_URLS.filter((path) => !path.endsWith('.tflite'));
    const allAssets = [...heavyAssets, ...otherAssets];

    this.preloadAssetProgress.clear();
    this.lastEmittedPercent = 0;
    this.emitProgress({ loadedBytes: 0, totalBytes: 0, percent: 0, ready: false }, true);

    await Promise.all(
      allAssets.map(async (path) => {
        const url = `${path}${versionQuery}`;
        this.preloadAssetProgress.set(url, { loaded: 0, total: 0 });

        const result = await this.fetchAsset(url, (bytesLoaded, bytesTotal) => {
          this.preloadAssetProgress.set(url, {
            loaded: bytesLoaded,
            total: bytesTotal || bytesLoaded,
          });
          this.emitAggregatePreloadProgress();
        });

        this.preloadAssetProgress.set(url, {
          loaded: result.loaded,
          total: result.total || result.loaded,
        });
        this.emitAggregatePreloadProgress(true);
      }),
    );
  }

  private emitAggregatePreloadProgress(force = false): void {
    let loadedBytes = 0;
    let totalBytes = 0;

    for (const entry of this.preloadAssetProgress.values()) {
      loadedBytes += entry.loaded;
      totalBytes += entry.total || entry.loaded;
    }

    const percent = totalBytes > 0 ? Math.min(99, Math.round((loadedBytes / totalBytes) * 100)) : 0;
    this.emitProgress({ loadedBytes, totalBytes, percent, ready: false }, force);
  }

  private async fetchAsset(
    url: string,
    onProgress: (loaded: number, total: number) => void,
  ): Promise<{ loaded: number; total: number }> {
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'force-cache',
    }).catch(() => null);

    if (!response?.ok) {
      return { loaded: 0, total: 0 };
    }

    if (!response.body) {
      const blob = await response.blob();
      onProgress(blob.size, blob.size);
      return { loaded: blob.size, total: blob.size };
    }

    const total = Number(response.headers.get('content-length')) || 0;
    const reader = response.body.getReader();
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      loaded += value.byteLength;
      onProgress(loaded, total || loaded);
    }

    return { loaded, total: total || loaded };
  }

  private async verifyWasmRuntimeEnvironment(): Promise<void> {
    if (this.wasmEnvironmentVerified) {
      return;
    }

    if (!window.crossOriginIsolated) {
      throw new Error(
        'Cross-origin isolation is off. Configure COOP/COEP headers on the host, then hard-refresh.',
      );
    }

    const wasmUrl = `${MINDSET_VITALS_WORKER_DIRECTORY}/webvital.wasm?v=${MINDSET_VITALS_SDK_ASSET_VERSION}`;
    const probe = await fetch(wasmUrl, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Range: 'bytes=0-0' },
    });
    if (!probe.ok) {
      throw new Error(`Mindset WASM not reachable (${probe.status}). Expected ${wasmUrl}`);
    }

    const contentType = (probe.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/wasm')) {
      throw new Error(`webvital.wasm Content-Type is "${contentType || 'missing'}", not application/wasm.`);
    }

    this.wasmEnvironmentVerified = true;
  }

  private emitProgress(progress: MindsetVitalsPreloadProgress, force = false): void {
    const normalized = { ...progress };

    if (normalized.ready) {
      normalized.percent = 100;
      this.lastEmittedPercent = 100;
    } else if (normalized.percent <= 0) {
      this.lastEmittedPercent = 0;
    } else {
      this.lastEmittedPercent = Math.max(this.lastEmittedPercent, normalized.percent);
      normalized.percent = this.lastEmittedPercent;
    }

    this.pendingProgress = normalized;

    if (force) {
      if (this.progressEmitTimer) {
        clearTimeout(this.progressEmitTimer);
        this.progressEmitTimer = null;
      }
      this.flushProgress();
      return;
    }

    if (this.progressEmitTimer) {
      return;
    }

    this.progressEmitTimer = setTimeout(() => {
      this.progressEmitTimer = null;
      this.flushProgress();
    }, 100);
  }

  private flushProgress(): void {
    if (!this.pendingProgress) {
      return;
    }

    const next = this.pendingProgress;
    this.pendingProgress = null;
    this.ngZone.run(() => this.preloadProgress$.next(next));
  }
}
