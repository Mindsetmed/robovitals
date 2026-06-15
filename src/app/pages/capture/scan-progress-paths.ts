export interface ScanProgressSegment { d: string; evenodd?: boolean; }

export interface RenderedScanSegment extends ScanProgressSegment {
  fill: string;
}

export interface ScanOverlayLayout {
  width: number;
  height: number;
  face: { x: number; y: number; width: number; height: number; rx: number };
  ring: { x: number; y: number; width: number; height: number };
}

const OVERLAY_WIDTH = 640;
const OVERLAY_HEIGHT = 480;
const BASE_FACE_WIDTH = 194;
const BASE_FACE_HEIGHT = 260;
const BASE_FACE_RX = 27;
const RING_PAD_X = (227.2 - BASE_FACE_WIDTH) / 2;
const RING_PAD_Y = (292.2857142857143 - BASE_FACE_HEIGHT) / 2;

function buildScanOverlayLayout(scale: number): ScanOverlayLayout {
  const faceWidth = BASE_FACE_WIDTH * scale;
  const faceHeight = BASE_FACE_HEIGHT * scale;
  const faceX = (OVERLAY_WIDTH - faceWidth) / 2;
  const faceY = Math.max(OVERLAY_HEIGHT * 0.06, (OVERLAY_HEIGHT - faceHeight) / 2 - OVERLAY_HEIGHT * 0.03);
  const ringWidth = faceWidth + RING_PAD_X * 2 * scale;
  const ringHeight = faceHeight + RING_PAD_Y * 2 * scale;

  return {
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    face: {
      x: faceX,
      y: faceY,
      width: faceWidth,
      height: faceHeight,
      rx: BASE_FACE_RX * scale,
    },
    ring: {
      x: faceX - RING_PAD_X * scale,
      y: faceY - RING_PAD_Y * scale,
      width: ringWidth,
      height: ringHeight,
    },
  };
}

export const SCAN_OVERLAY: ScanOverlayLayout = buildScanOverlayLayout(1);

export function computeScanOverlayForStage(stageWidth: number, stageHeight: number): ScanOverlayLayout {
  let scale = 1;

  if (stageWidth <= 480 || stageHeight <= 380) {
    scale = 1.42;
  } else if (stageWidth <= 768 || stageHeight <= 520) {
    scale = 1.3;
  } else if (stageWidth <= 1024) {
    scale = 1.16;
  }

  const maxScale = Math.min(
    (OVERLAY_WIDTH * 0.58) / BASE_FACE_WIDTH,
    (OVERLAY_HEIGHT * 0.84) / BASE_FACE_HEIGHT,
  );
  scale = Math.min(scale, maxScale);

  return buildScanOverlayLayout(scale);
}

export function faceGuideScaleForStage(stageWidth: number): number {
  if (stageWidth <= 480) {
    return 1.28;
  }
  if (stageWidth <= 768) {
    return 1.18;
  }
  if (stageWidth <= 1024) {
    return 1.08;
  }
  return 1;
}

export function buildScanProgressSegments(progress: number, warn: boolean): RenderedScanSegment[] {
  const segmentCount = SCAN_PROGRESS_SEGMENTS.length;
  const activeCount = Math.min(
    segmentCount,
    Math.round((Math.max(0, Math.min(100, progress)) / 100) * segmentCount),
  );
  const activeFill = warn ? '#ff4444' : '#3ebcf9';
  const idleFill = 'rgba(255, 255, 255, 0.15)';

  return SCAN_PROGRESS_SEGMENTS.map((segment, index) => ({
    ...segment,
    fill: index >= segmentCount - activeCount ? activeFill : idleFill,
  }));
}

export const SCAN_PROGRESS_SEGMENTS: readonly ScanProgressSegment[] = [
  { d: 'M167.1 0H145.9V16H167.1V0Z' },
  { d: 'M143.9 0H122.7V16H143.9V0Z' },
  { d: 'M120.8 0H99.6001V16H120.8V0Z' },
  { d: 'M97.7 0H76.5V16H97.7V0Z' },
  { d: 'M74.6 0H64C60.1 0 56.3 0.4 52.5 1L55.3 16.7C58.1 16.2 61 15.9 63.9 15.9H74.5V0H74.6Z', evenodd: true },
  { d: 'M50.4999 1.3999L53.8999 16.9999C48.1999 18.1999 42.7999 20.4999 38.0999 23.5999L29.3999 10.1999C35.7999 6.0999 42.8999 3.0999 50.5999 1.3999H50.4999Z', evenodd: true },
  { d: 'M27.5999 11.3999L36.6999 24.4999C31.8999 27.7999 27.7999 31.8999 24.4999 36.6999L11.3999 27.5999C15.7999 21.2999 21.2999 15.7999 27.5999 11.3999Z', evenodd: true },
  { d: 'M10.1999 29.3002L23.5999 38.0002C20.4999 42.8002 18.2999 48.1002 16.9999 53.8002L1.3999 50.4002C2.9999 42.7002 6.0999 35.6002 10.1999 29.2002V29.3002Z', evenodd: true },
  { d: 'M0 74.7001H16V64.0001C16 61.0001 16.3 58.2001 16.8 55.4001L1.1 52.6001C0.4 56.3001 0.1 60.2001 0.1 64.1001V74.8001L0 74.7001Z', evenodd: true },
  { d: 'M16 76.7002H0V98.1002H16V76.7002Z' },
  { d: 'M16 100.1H0V121.5H16V100.1Z' },
  { d: 'M16 123.4H0V144.8H16V123.4Z' },
  { d: 'M16 146.8H0V168.2H16V146.8Z' },
  { d: 'M16 170.2H0V191.6H16V170.2Z' },
  { d: 'M16 193.6H0V215H16V193.6Z' },
  { d: 'M16 217H0V238.4H16V217Z' },
  { d: 'M16 240.4H0V261.8H16V240.4Z' },
  { d: 'M16 263.7H0V285.1H16V263.7Z' },
  { d: 'M16 287.1H0V308.5H16V287.1Z' },
  { d: 'M16 310.5H0V331.9H16V310.5Z' },
  { d: 'M16 333.9H0V355.3H16V333.9Z' },
  { d: 'M0 357.3H16V368C16 371 16.3 373.8 16.8 376.6L1.1 379.4C0.4 375.7 0.1 371.8 0.1 367.9V357.2L0 357.3Z', evenodd: true },
  { d: 'M1.3999 381.5L16.9999 378.1C18.1999 383.8 20.4999 389.2 23.5999 393.9L10.1999 402.6C6.0999 396.2 3.0999 389.1 1.3999 381.4V381.5Z', evenodd: true },
  { d: 'M11.3999 404.4C15.7999 410.7 21.2999 416.2 27.5999 420.6L36.6999 407.5C31.8999 404.2 27.7999 400.1 24.4999 395.3L11.3999 404.4Z', evenodd: true },
  { d: 'M50.4999 430.6L53.8999 415C48.1999 413.8 42.7999 411.5 38.0999 408.4L29.3999 421.8C35.7999 425.9 42.8999 428.9 50.5999 430.6H50.4999Z', evenodd: true },
  { d: 'M52.4999 431L55.2999 415.3C58.0999 415.8 60.9999 416.1 63.8999 416.1H74.4999V432.1H63.8999C59.9999 432.1 56.1999 431.7 52.3999 431.1L52.4999 431Z', evenodd: true },
  { d: 'M97.7 416H76.5V432H97.7V416Z' },
  { d: 'M120.8 416H99.6001V432H120.8V416Z' },
  { d: 'M143.9 416H122.7V432H143.9V416Z' },
  { d: 'M167.1 416H145.9V432H167.1V416Z' },
  { d: 'M190.2 416H169V432H190.2V416Z' },
  { d: 'M213.3 416H192.1V432H213.3V416Z' },
  { d: 'M236.4 416H215.2V432H236.4V416Z' },
  { d: 'M259.5 416H238.3V432H259.5V416Z' },
  { d: 'M261.4 432V416H272C275 416 277.8 415.7 280.6 415.2L283.4 430.9C279.7 431.6 275.8 431.9 271.9 431.9H261.3L261.4 432Z', evenodd: true },
  { d: 'M285.5 430.6L282.1 415C287.8 413.8 293.2 411.5 297.9 408.4L306.6 421.8C300.2 425.9 293.1 428.9 285.4 430.6H285.5Z', evenodd: true },
  { d: 'M308.4 420.6L299.3 407.5C304.1 404.2 308.2 400.1 311.5 395.3L324.6 404.4C320.2 410.7 314.7 416.2 308.4 420.6Z', evenodd: true },
  { d: 'M325.8 402.7L312.4 394C315.5 389.2 317.7 383.9 319 378.2L334.6 381.6C333 389.3 329.9 396.4 325.8 402.8V402.7Z', evenodd: true },
  { d: 'M336 357.3H320V368C320 371 319.7 373.8 319.2 376.6L334.9 379.4C335.6 375.7 335.9 371.8 335.9 367.9V357.2L336 357.3Z', evenodd: true },
  { d: 'M336 333.9H320V355.3H336V333.9Z' },
  { d: 'M336 310.5H320V331.9H336V310.5Z' },
  { d: 'M336 287.1H320V308.5H336V287.1Z' },
  { d: 'M336 263.7H320V285.1H336V263.7Z' },
  { d: 'M336 240.4H320V261.8H336V240.4Z' },
  { d: 'M336 217H320V238.4H336V217Z' },
  { d: 'M336 193.6H320V215H336V193.6Z' },
  { d: 'M336 170.2H320V191.6H336V170.2Z' },
  { d: 'M336 146.8H320V168.2H336V146.8Z' },
  { d: 'M336 123.4H320V144.8H336V123.4Z' },
  { d: 'M336 100.1H320V121.5H336V100.1Z' },
  { d: 'M336 76.7002H320V98.1002H336V76.7002Z' },
  { d: 'M336 74.7001H320V64.0001C320 61.0001 319.7 58.2001 319.2 55.4001L334.9 52.6001C335.6 56.3001 335.9 60.2001 335.9 64.1001V74.8001L336 74.7001Z', evenodd: true },
  { d: 'M334.6 50.4999L319 53.8999C317.8 48.1999 315.5 42.7999 312.4 38.0999L325.8 29.3999C329.9 35.7999 332.9 42.8999 334.6 50.5999V50.4999Z', evenodd: true },
  { d: 'M324.6 27.5999L311.5 36.6999C308.2 31.8999 304.1 27.7999 299.3 24.4999L308.4 11.3999C314.7 15.7999 320.2 21.2999 324.6 27.5999Z', evenodd: true },
  { d: 'M306.7 10.1999L298 23.5999C293.2 20.4999 287.9 18.2999 282.2 16.9999L285.6 1.3999C293.3 2.9999 300.4 6.0999 306.8 10.1999H306.7Z', evenodd: true },
  { d: 'M261.4 0V16H272C275 16 277.8 16.3 280.6 16.8L283.4 1.1C279.7 0.4 275.8 0.1 271.9 0.1H261.3L261.4 0Z', evenodd: true },
  { d: 'M259.5 0H238.3V16H259.5V0Z' },
  { d: 'M236.4 0H215.2V16H236.4V0Z' },
  { d: 'M213.3 0H192.1V16H213.3V0Z' },
  { d: 'M190.2 0H169V16H190.2V0Z' },
];

