/**
 * Activity A of the distributed render pipeline.
 *
 * `plan(projectDir, config, planDir)` composes the existing render stages
 * (compile → probe → extract videos → audio → freeze) into a self-contained
 * `<planDir>/` directory tree that downstream chunk workers consume:
 *
 *     <planDir>/
 *     ├── plan.json
 *     ├── compiled/                # compileForRender output (self-contained)
 *     ├── video-frames/            # per-video JPEG sequences (dereferenced)
 *     ├── audio.aac                # only when composition has audio
 *     └── meta/
 *         ├── composition.json
 *         ├── encoder.json         # LockedRenderConfig
 *         └── chunks.json
 *
 * Pure function over local paths. No networking. Two invocations with the
 * same inputs produce the same `planHash` — adapters use that contract to
 * short-circuit `plan()` on workflow replay.
 *
 * Banned configurations (GPU encode, hardware browser GL, system primary
 * fonts) are rejected at plan time via `planValidation.ts` so chunk workers
 * never have to handle them.
 */
import { type CanvasResolution } from "@hyperframes/core";
import { type EngineConfig } from "@hyperframes/engine";
import { type ProducerLogger } from "../../logger.js";
import { type ChunkSliceJson } from "../render/stages/freezePlan.js";
/**
 * Caller-supplied configuration for a distributed render. `fps`, `width`,
 * `height`, and `format` are required; everything else carries a default
 * sensible for AWS Lambda fan-out.
 */
export interface DistributedRenderConfig {
    /** Integer frame rate. Distributed renders only accept integer fps; the in-process renderer's `Fps` rational handles NTSC. */
    fps: 24 | 30 | 60;
    width: number;
    height: number;
    /**
     * Output container format. webm and HDR mp4 are not supported in
     * distributed mode — `plan()` refuses them up front with a typed
     * `FormatNotSupportedInDistributedError`. The in-process renderer
     * supports both.
     */
    format: "mp4" | "mov" | "png-sequence";
    /**
     * Codec selection for `format: "mp4"`. `"h264"` (the default) → libx264 +
     * yuv420p; `"h265"` → libx265 + yuv420p with closed-GOP keyint params
     * (`min-keyint=N:scenecut=0:open-gop=0:repeat-headers=1`) so chunked
     * concat-copy round-trips losslessly the same way h264 does. Ignored for
     * `format: "mov"` (always ProRes 4444) and `format: "png-sequence"`
     * (no encoder). Passing `codec` with a non-mp4 format throws at plan
     * time so caller errors surface immediately rather than producing a
     * silently-wrong planDir.
     */
    codec?: "h264" | "h265";
    quality?: "draft" | "standard" | "high";
    /** Constant-rate-factor override; mutually exclusive with `bitrate`. */
    crf?: number;
    /** Target video bitrate (e.g. `"10M"`); mutually exclusive with `crf`. */
    bitrate?: string;
    /** Output resolution preset; engages Chrome `deviceScaleFactor` supersampling. */
    outputResolution?: CanvasResolution;
    /** Default `240` frames (~8s @ 30fps; fits Lambda's 15-min cap). */
    chunkSize?: number;
    /** Default `16`. Caps long renders to fewer-but-longer chunks for operational fairness. */
    maxParallelChunks?: number;
    /** Runtime hint; consumed by future per-runtime budget checks. The current implementation records the value but does not enforce. */
    runtimeCap?: "lambda" | "temporal" | "cloud-run-job" | "k8s-job" | "none";
    /**
     * Reject compositions whose primary font-family resolves to a host-OS /
     * generic family. Default `true` for distributed renders — overriding to
     * `false` is unsupported and exists only as an escape hatch for tests.
     */
    rejectOnSystemFonts?: boolean;
    /**
     * Threaded into the `injectDeterministicFontFaces` font loader. Default
     * `true` — distributed renders must not silently fall back to system fonts.
     */
    failClosedFontFetch?: boolean;
    /** HDR is not supported in distributed mode; `force-hdr` trips a `FormatNotSupportedInDistributedError`. Defaults to `force-sdr`. */
    hdrMode?: "auto" | "force-sdr";
    logger?: ProducerLogger;
    /** Optional engine config override (env vars are not read when provided). */
    producerConfig?: EngineConfig;
    /** Entry HTML file relative to `projectDir`. Defaults to `"index.html"`. */
    entryFile?: string;
    /** Caller-supplied AbortSignal. Threaded through compile / probe / extract / audio stages. */
    abortSignal?: AbortSignal;
    /**
     * Hard ceiling on `<planDir>/` size in bytes; trips a non-retryable
     * `PLAN_TOO_LARGE` error after freeze. Defaults to
     * {@link PLAN_DIR_SIZE_LIMIT_BYTES} (2 GB — fits inside AWS Lambda's
     * 10 GB `/tmp` budget alongside the chunk worker's frame buffer +
     * ffmpeg working set). Adapters that deploy onto storage with
     * tighter ceilings can pass a smaller cap; tests pass a tiny cap to
     * exercise the throw path.
     */
    planDirSizeLimitBytes?: number;
}
/**
 * Result of {@link plan}. The `planHash` is the content-addressed identifier
 * that adapters key replay short-circuits off of.
 */
export interface PlanResult {
    planDir: string;
    planHash: string;
    chunkCount: number;
    totalFrames: number;
    fps: 24 | 30 | 60;
    width: number;
    height: number;
    format: "mp4" | "mov" | "png-sequence";
    ffmpegVersion: string;
    producerVersion: string;
}
/** Default chunk size in frames (~8s @ 30fps; fits Lambda's 15-min cap). */
export declare const DEFAULT_CHUNK_SIZE = 240;
/** Default cap on parallel chunks for operational fairness across renders. */
export declare const DEFAULT_MAX_PARALLEL_CHUNKS = 16;
/**
 * Default hard ceiling on `<planDir>/` size in bytes. 2 GB fits inside
 * AWS Lambda's 10 GB `/tmp` alongside the chunk worker's captured frames
 * and ffmpeg's temporary files. Compositions that exceed this have to
 * fall back to the in-process renderer until per-chunk video-frame
 * slicing lands.
 */
export declare const PLAN_DIR_SIZE_LIMIT_BYTES: number;
/**
 * Non-retryable error code raised when `plan()` produces a planDir whose
 * total size exceeds the configured limit. Workflow adapters key retry
 * policies off `code` — the planDir would fail the same way on every
 * retry, so the failure must not auto-retry.
 */
export declare const PLAN_TOO_LARGE = "PLAN_TOO_LARGE";
/** Typed error raised when the produced planDir exceeds {@link PLAN_DIR_SIZE_LIMIT_BYTES}. */
export declare class PlanTooLargeError extends Error {
    readonly code: typeof PLAN_TOO_LARGE;
    readonly sizeBytes: number;
    readonly limitBytes: number;
    constructor(sizeBytes: number, limitBytes: number);
}
/**
 * Non-retryable error code raised when `plan()` is asked for an output
 * format that distributed mode doesn't support (webm, HDR mp4). The same
 * config would fail on every retry, so the failure must not auto-retry.
 */
export declare const FORMAT_NOT_SUPPORTED_IN_DISTRIBUTED = "FORMAT_NOT_SUPPORTED_IN_DISTRIBUTED";
/**
 * Typed error raised by `plan()` for outputs that distributed mode
 * refuses to ship.
 *
 *   - webm — VP9 + matroska concat-copy is fragile across libvpx-vp9
 *     builds, and the chunked pipeline can't guarantee bit-identical
 *     concat output across worker versions.
 *   - mp4 + HDR (PQ / HLG) — chunked HDR pre-extract + HDR signaling
 *     re-apply on the assembled file is not implemented yet.
 *
 * The in-process renderer (`executeRenderJob`) handles both natively.
 */
export declare class FormatNotSupportedInDistributedError extends Error {
    readonly code: typeof FORMAT_NOT_SUPPORTED_IN_DISTRIBUTED;
    readonly format: string;
    readonly reason: string;
    constructor(format: string, reason: string);
}
/**
 * Reject formats the distributed pipeline cannot ship (webm + HDR mp4).
 * Throws {@link FormatNotSupportedInDistributedError} with a message
 * naming the rejected format. Runs at the very top of `plan()` so a
 * banned input never produces a partial planDir.
 *
 * Exported so adapters can call the same gate at their own input layer
 * (Step Functions input validation, Temporal workflow start) before the
 * activity even runs — the resulting non-retryable error then matches
 * what `plan()` would have thrown.
 */
export declare function rejectUnsupportedDistributedFormat(config: Pick<DistributedRenderConfig, "format" | "hdrMode">): void;
/**
 * Walk `<planDir>/` depth-first and sum all regular file sizes. Symlinks
 * are not traversed — they shouldn't appear inside a planDir to begin with
 * (the extract stage materializes them), and following them could push the
 * walker outside the planDir.
 */
export declare function measurePlanDirBytes(planDir: string): number;
/**
 * Compute `(chunkCount, effectiveChunkSize)` from total frames and the
 * caller's chunking knobs:
 *
 *     chunkCount = min(maxParallelChunks, ceil(totalFrames / chunkSize))
 *     effectiveChunkSize = max(configChunkSize, ceil(totalFrames / maxParallelChunks))
 *
 * Long renders auto-rescale to fewer-but-longer chunks rather than
 * fragmenting infinitely. Returned `chunkCount >= 1` (`totalFrames === 0`
 * is rejected upstream); `effectiveChunkSize >= configChunkSize`.
 */
export declare function resolveChunkPlan(totalFrames: number, configChunkSize: number, maxParallelChunks: number): {
    chunkCount: number;
    effectiveChunkSize: number;
};
/**
 * Slice `totalFrames` into `chunkCount` consecutive ranges. Each chunk gets
 * `effectiveChunkSize` frames except the last, which absorbs the remainder
 * so the union is exactly `[0, totalFrames)`. `endFrame` is the EXCLUSIVE
 * upper bound — chunk workers iterate `i in [startFrame, endFrame)`.
 */
export declare function buildChunkSlices(totalFrames: number, chunkCount: number, effectiveChunkSize: number): ChunkSliceJson[];
/**
 * Activity A of the distributed render pipeline. Produces a self-contained
 * `<planDir>/` from a project + config. See module docstring for the
 * directory layout.
 */
export declare function plan(projectDir: string, config: DistributedRenderConfig, planDir: string): Promise<PlanResult>;
//# sourceMappingURL=plan.d.ts.map