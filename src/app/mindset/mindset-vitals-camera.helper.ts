export function buildMindsetCameraVideoConstraints(): MediaTrackConstraints {
  return {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: 'user',
  };
}

export function logMindsetCameraSettings(track: MediaStreamTrack | undefined, label: string): void {
  if (!track) {
    return;
  }

  const settings = track.getSettings();
  const width = settings.width ?? 0;
  const height = settings.height ?? 0;
  const fps = settings.frameRate ? Math.round(settings.frameRate) : null;
  console.info(`Mindset camera ${label}`, {
    resolution: fps ? `${width}x${height} @ ${fps}fps` : `${width}x${height}`,
    facingMode: settings.facingMode,
  });
}
