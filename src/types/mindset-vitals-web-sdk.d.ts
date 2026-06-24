declare module '@mindset-vitals/web-sdk' {
  export interface VitalClient {
    init(): Promise<void>;
    destroy(): Promise<void>;
    startPreviewMode(video: HTMLVideoElement): Promise<void>;
    authorize(): Promise<{ authorizedVitals?: string[]; maxSessionTime?: number } | void>;
    start(vitals: string[], video: HTMLVideoElement): Promise<void>;
    stop(): Promise<unknown>;
    on(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler: (...args: unknown[]) => void): void;
    setExtendedLogs?(enabled: boolean): Promise<void>;
    getVersion(): Promise<string>;
  }

  export function createVitalClient(options: {
    workerDirectory: string;
    authenticator: (runToken: unknown) => Promise<unknown>;
  }): VitalClient;
}
