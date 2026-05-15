/**
 * Build the `RenderPerfSummary` that lands on `job.perfSummary` and
 * the `perf-summary.json` debug artifact.
 */
import type { CaptureAttemptSummary, CaptureCalibrationSample, CaptureCostEstimate, HdrDiagnostics, RenderJob, RenderPerfSummary } from "../renderOrchestrator.js";
import { type HdrPerfCollector } from "./hdrPerf.js";
export declare function buildRenderPerfSummary(input: {
    job: RenderJob;
    workerCount: number;
    enableChunkedEncode: boolean;
    chunkedEncodeSize: number;
    compositionDurationSeconds: number;
    totalFrames: number;
    outputWidth: number;
    outputHeight: number;
    videoCount: number;
    audioCount: number;
    totalElapsedMs: number;
    perfStages: Record<string, number>;
    videoExtractBreakdown: RenderPerfSummary["videoExtractBreakdown"];
    tmpPeakBytes: number;
    captureCalibration?: {
        estimate: CaptureCostEstimate;
        samples: CaptureCalibrationSample[];
    };
    captureAttempts: CaptureAttemptSummary[];
    hdrDiagnostics: HdrDiagnostics;
    hdrPerf?: HdrPerfCollector;
    peakRssBytes: number;
    peakHeapUsedBytes: number;
}): RenderPerfSummary;
//# sourceMappingURL=perfSummary.d.ts.map