/**
 * captureHdrResources — HDR resource setup helpers for the HDR layered
 * composite stage. Extracted from `captureHdrStage.ts` so the orchestrator
 * stays under the project's 500-line ceiling.
 *
 * Responsibilities (in order, called by `captureHdrStage.ts`):
 *   1. Probe per-element HDR extraction dimensions at the elements' own
 *      start times (so GSAP-driven `data-start > 0` images don't fall out).
 *   2. Pre-extract every HDR video into a raw rgb48le frame file via a
 *      single FFmpeg pass per video.
 *   3. Pre-decode every HDR image into rgb48le buffers, resampled to the
 *      element's layout box using CSS `object-fit` / `object-position`
 *      semantics.
 *
 * All helpers are SDR-content-safe: they no-op cleanly when no HDR layers
 * exist, leaving the caller with empty maps that the hot loop tolerates.
 */
import { type CaptureSession } from "@hyperframes/engine";
import type { ProducerLogger } from "../../../logger.js";
import type { HdrDiagnostics, HdrImageBuffer, HdrVideoFrameSource, RenderJob } from "../../renderOrchestrator.js";
import type { CompositionMetadata } from "../shared.js";
export interface HdrResourcePrep {
    hdrVideoIds: string[];
    hdrVideoSrcPaths: Map<string, string>;
    hdrVideoStartTimes: Map<string, number>;
    hdrImageStartTimes: Map<string, number>;
    hdrExtractionDims: Map<string, {
        width: number;
        height: number;
    }>;
    hdrImageFitInfo: Map<string, {
        fit: string;
        position: string;
    }>;
}
/**
 * Build the maps the resource-extraction helpers below need. Pure data
 * transformation against `composition` + the native-HDR ID sets.
 */
export declare function planHdrResources(args: {
    composition: CompositionMetadata;
    nativeHdrVideoIds: Set<string>;
    nativeHdrImageIds: Set<string>;
    projectDir: string;
    compiledDir: string;
    existsSync: (p: string) => boolean;
}): HdrResourcePrep;
/**
 * Probe per-element layout dimensions at each unique start time, populating
 * `hdrExtractionDims` and `hdrImageFitInfo` in place. Also runs a fallback
 * probe for HDR images whose `data-start` instant reports zero dims (GSAP
 * `from` tweens animate the element in slightly later).
 */
export declare function probeHdrExtractionDims(args: {
    domSession: CaptureSession;
    nativeHdrIds: Set<string>;
    nativeHdrImageIds: Set<string>;
    composition: CompositionMetadata;
    prep: HdrResourcePrep;
}): Promise<void>;
/**
 * Extract each HDR video into a raw rgb48le frame file via a single FFmpeg
 * pass per video, and open a file descriptor for each. Returns a map keyed
 * by video id. Caller owns lifecycle teardown (closing fds + rm-rf).
 */
export declare function extractHdrVideoFrames(args: {
    job: RenderJob;
    log: ProducerLogger;
    framesDir: string;
    composition: CompositionMetadata;
    prep: HdrResourcePrep;
    width: number;
    height: number;
    abortSignal: AbortSignal | undefined;
    hdrDiagnostics: HdrDiagnostics;
}): Promise<Map<string, HdrVideoFrameSource>>;
/**
 * Decode each HDR image into an rgb48le buffer, resampling to the element's
 * layout box if known. Failures abort the render to avoid shipping missing
 * layers (the hot loop has no fallback for a missing HDR layer that the
 * composition expects to see).
 */
export declare function decodeHdrImageBuffers(args: {
    log: ProducerLogger;
    hdrImageSrcPaths: Map<string, string>;
    prep: HdrResourcePrep;
    hdrDiagnostics: HdrDiagnostics;
}): Map<string, HdrImageBuffer>;
//# sourceMappingURL=captureHdrResources.d.ts.map