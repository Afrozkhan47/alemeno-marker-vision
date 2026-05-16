import { SCAN_SESSION_FRAME_COUNT } from '@/constants/scanSession';
import { ScannerSession } from '@/store';

/** Placeholder for future CV pipeline; not wired into UI yet. */
export const simulateScan = async (): Promise<ScannerSession> => {
  const startedAt = Date.now();

  await new Promise((resolve) => setTimeout(resolve, 900));

  return {
    capturedFrames: SCAN_SESSION_FRAME_COUNT,
    processingMs: Date.now() - startedAt,
  };
};
