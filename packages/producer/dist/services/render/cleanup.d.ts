/**
 * Sequencer cleanup + error-details helpers shared by the cancel and
 * error paths in `executeRenderJob`.
 */
import { type CaptureSession } from "@hyperframes/engine";
import type { FileServerHandle } from "../fileServer.js";
import { type ProducerLogger } from "../../logger.js";
import type { HdrDiagnostics, RenderJob } from "../renderOrchestrator.js";
/**
 * Wrap a cleanup operation so it never throws, but logs any failure.
 * The sequencer needs to keep tearing down resources even when one of
 * them is stuck (e.g. a `fileServer.close()` hitting a TCP race); a
 * thrown cleanup error would mask the original render failure.
 */
export declare function safeCleanup(label: string, fn: () => Promise<void> | void, log?: ProducerLogger): Promise<void>;
/**
 * Close the file server, close the probe session, and remove the
 * working directory. Each step runs through `safeCleanup` so a stuck
 * resource doesn't mask the original render error.
 */
export declare function cleanupRenderResources(input: {
    fileServer: FileServerHandle | null;
    probeSession: CaptureSession | null;
    workDir: string;
    debug: boolean;
    log: ProducerLogger;
    /** Suffix appended to safeCleanup labels. Pinned to the existing diagnostic payloads. */
    label: "cancel" | "error";
}): Promise<void>;
/**
 * Build the `RenderJob.errorDetails` shape downstream consumers (SSE,
 * sync `/render` response, queue introspection) read on failure.
 */
export declare function buildRenderErrorDetails(input: {
    error: unknown;
    pipelineStartMs: number;
    lastBrowserConsole: string[];
    perfStages: Record<string, number>;
    hdrDiagnostics: HdrDiagnostics;
}): NonNullable<RenderJob["errorDetails"]>;
//# sourceMappingURL=cleanup.d.ts.map