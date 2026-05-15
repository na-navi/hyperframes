/**
 * Capture-cost calibration and worker-count resolution.
 *
 * The "calibration" flow renders a handful of representative frames in
 * a throwaway `CaptureSession` and uses p95 capture time to scale the
 * auto-worker budget. The calibration ceiling
 * (`MAX_MEASURED_CAPTURE_COST_MULTIPLIER`) and target
 * (`CAPTURE_CALIBRATION_TARGET_MS`) are tunable knobs — they pin the
 * relationship between observed capture time and worker count.
 */
import { type BeforeCaptureHook, type CaptureOptions, type CaptureSession, type EngineConfig } from "@hyperframes/engine";
import type { CompiledComposition } from "../htmlCompiler.js";
import type { FileServerHandle } from "../fileServer.js";
import { type ProducerLogger } from "../../logger.js";
import type { RenderJob } from "../renderOrchestrator.js";
export interface CaptureCostEstimate {
    multiplier: number;
    reasons: string[];
    p95Ms?: number;
}
export interface CaptureCalibrationSample {
    frameIndex: number;
    captureTimeMs: number;
}
/**
 * Target p95 capture time used to scale the auto-worker budget. If the
 * measured p95 exceeds this, the multiplier ratchets up. Empirically
 * tuned against the producer's regression-harness fixtures.
 */
export declare const CAPTURE_CALIBRATION_TARGET_MS = 600;
/**
 * Ceiling on the measured cost multiplier. Without this, a pathological
 * 30-second capture would push the auto-worker budget arbitrarily high.
 */
export declare const MAX_MEASURED_CAPTURE_COST_MULTIPLIER = 8;
/**
 * CDP protocol timeout used while running calibration. Bounded below
 * the normal `cfg.protocolTimeout` so a wedged BeginFrame calibration
 * times out fast and falls back to screenshot mode (see the
 * `shouldFallbackToScreenshotAfterCalibrationError` path in the
 * sequencer).
 */
export declare const CAPTURE_CALIBRATION_PROTOCOL_TIMEOUT_MS = 30000;
export declare function estimateCaptureCostMultiplier(compiled: Pick<CompiledComposition, "hasShaderTransitions" | "renderModeHints">): CaptureCostEstimate;
export declare function resolveRenderWorkerCount(totalFrames: number, requestedWorkers: number | undefined, cfg: EngineConfig, compiled: Pick<CompiledComposition, "hasShaderTransitions" | "renderModeHints">, log?: ProducerLogger, measuredCaptureCost?: CaptureCostEstimate): number;
export declare function createCaptureCalibrationConfig(cfg: EngineConfig): EngineConfig;
export declare function estimateMeasuredCaptureCostMultiplier(samples: CaptureCalibrationSample[]): CaptureCostEstimate;
export declare function selectCaptureCalibrationFrames(totalFrames: number): number[];
export declare function measureCaptureCostFromSession(session: CaptureSession, totalFrames: number, fps: number): Promise<{
    estimate: CaptureCostEstimate;
    samples: CaptureCalibrationSample[];
}>;
export declare function logCaptureCalibrationResult(calibration: {
    estimate: CaptureCostEstimate;
    samples: CaptureCalibrationSample[];
}, log: ProducerLogger): void;
export type CaptureCalibrationFailureReason = "calibration-failed" | "calibration-screenshot-failed";
export declare function createFailedCaptureCalibrationEstimate(reason: CaptureCalibrationFailureReason): {
    estimate: CaptureCostEstimate;
    samples: CaptureCalibrationSample[];
};
export interface CaptureCalibrationOutcome {
    calibration: {
        estimate: CaptureCostEstimate;
        samples: CaptureCalibrationSample[];
    } | undefined;
    /** Flipped to `true` if BeginFrame calibration timed out and the screenshot retry fired. */
    forceScreenshot: boolean;
    /** Closed and nulled when the screenshot fallback fires; passthrough otherwise. */
    probeSession: CaptureSession | null;
    /** Buffer of whichever session was active last; the sequencer uses it for the error-path tail. */
    lastBrowserConsole: string[];
}
/**
 * Run the auto-worker capture-cost calibration, including the
 * BeginFrame → screenshot fallback on timeout. Owns the calibration
 * session lifecycle and may close the caller-owned `probeSession` when
 * the fallback fires (BeginFrame is no longer the active capture mode,
 * so the probe session is no longer reusable).
 */
export declare function runCaptureCalibration(input: {
    cfg: EngineConfig;
    fileServer: FileServerHandle;
    workDir: string;
    log: ProducerLogger;
    job: RenderJob;
    totalFrames: number;
    forceScreenshot: boolean;
    probeSession: CaptureSession | null;
    buildCaptureOptions: () => CaptureOptions;
    createRenderVideoFrameInjector: () => BeforeCaptureHook | null;
    /** Throws `RenderCancelledError` when the caller's abort signal fires. */
    assertNotAborted: () => void;
}): Promise<CaptureCalibrationOutcome>;
/**
 * Same as `runCaptureCalibration`'s error-classification check, but
 * exported separately because the sequencer also calls it from the
 * disk-capture retry loop. Returns `true` for the BeginFrame-specific
 * protocol errors that recover cleanly under screenshot mode.
 */
export declare function shouldFallbackToScreenshotAfterCalibrationError(error: unknown): boolean;
//# sourceMappingURL=captureCost.d.ts.map