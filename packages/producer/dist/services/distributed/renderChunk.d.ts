/**
 * Activity B of the distributed render pipeline.
 *
 * `renderChunk(planDir, chunkIndex, outputChunkPath)` validates the planDir
 * against the worker's environment, captures the chunk's frame range, and
 * encodes a single closed-GOP video chunk (or, for png-sequence, a directory
 * of PNGs). The output is byte-identical across retries on the same worker
 * and PSNR-equivalent across workers — that contract is what makes Temporal
 * activity retries safe.
 *
 * Pure function over local paths. No networking. Spins up its own headless
 * Chrome + file server scoped to the chunk; tears them down before
 * returning. The caller is responsible for moving `outputChunkPath` to its
 * orchestration-level storage (S3 / GCS / EFS / …).
 *
 * Hard contracts:
 *   - The worker re-applies `meta/encoder.json.runtimeEnv` into
 *     `process.env` BEFORE the file server starts so the served HTML's
 *     `RENDER_MODE_SCRIPT` sees the same env it would have seen on the
 *     controller.
 *   - Browser is launched with `browserGpuMode: "software"` and verified
 *     against `chrome://gpu` via `assertSwiftShader` — a non-SwiftShader
 *     backend trips a non-retryable `BROWSER_GPU_NOT_SOFTWARE`.
 *   - The file server serves with the seeded-random shim
 *     (`buildVirtualTimeShim({ seedRandomFromFrame: true })`) so any
 *     composition that uses `Math.random` / `crypto.getRandomValues`
 *     produces byte-identical pixels per `(planDir, chunkIndex)`.
 *   - No `lastFrameCache` priming: every frame seeks fresh DOM so the
 *     cache is never read, and priming would deadlock the compositor.
 *   - The chunk's encode runs with `lockGopForChunkConcat: true` and
 *     `gopSize === framesInChunk` so concat-copy at assemble time is safe.
 *
 * Every determinism toggle above is opt-in — only this primitive enables them.
 * In-process renders (`executeRenderJob`) leave them off.
 */
import type { Page } from "puppeteer-core";
import { BROWSER_GPU_NOT_SOFTWARE } from "@hyperframes/engine";
import { type LockedRenderConfig } from "../render/stages/freezePlan.js";
/**
 * Non-retryable error codes raised when the planDir is structurally
 * malformed, semantically out of range, or fingerprints differently from
 * what the controller wrote. Each is distinct so adapter retry policies
 * can route them independently — e.g. `MISSING_PLAN_ARTIFACT` may point
 * to a partial S3 download that a retry could heal, while
 * `PLAN_HASH_MISMATCH` strictly indicates cross-version drift that
 * retries won't fix.
 */
export declare const FFMPEG_VERSION_MISMATCH = "FFMPEG_VERSION_MISMATCH";
export declare const PLAN_HASH_MISMATCH = "PLAN_HASH_MISMATCH";
export declare const MISSING_PLAN_ARTIFACT = "MISSING_PLAN_ARTIFACT";
export declare const CHUNK_INDEX_OUT_OF_RANGE = "CHUNK_INDEX_OUT_OF_RANGE";
export declare const MISSING_RUNTIME_ENV_SNAPSHOT = "MISSING_RUNTIME_ENV_SNAPSHOT";
export type RenderChunkValidationCode = typeof FFMPEG_VERSION_MISMATCH | typeof PLAN_HASH_MISMATCH | typeof MISSING_PLAN_ARTIFACT | typeof CHUNK_INDEX_OUT_OF_RANGE | typeof MISSING_RUNTIME_ENV_SNAPSHOT | typeof BROWSER_GPU_NOT_SOFTWARE;
/**
 * Typed non-retryable error raised by `renderChunk` when the planDir is
 * malformed or the worker's runtime doesn't match the planDir's
 * controller-side fingerprint. Workflow adapters key retry policies off
 * `code` — most of these failures will not heal on retry.
 */
export declare class RenderChunkValidationError extends Error {
    readonly code: RenderChunkValidationCode;
    constructor(code: RenderChunkValidationCode, message: string);
}
/**
 * Result of {@link renderChunk}. The `sha256` field is the byte hash of the
 * primary output (the mp4/mov file, or, for png-sequence, the sorted-frame
 * fingerprint). Retries on the same `(planDir, chunkIndex)` MUST produce
 * the same `sha256` — that contract is the byte-identical-retry axis.
 */
export interface ChunkResult {
    /** Absolute path the encoded chunk was written to (file or directory). */
    outputPath: string;
    /** `"file"` for mp4/mov; `"frame-dir"` for png-sequence. */
    outputKind: "file" | "frame-dir";
    framesEncoded: number;
    sha256: string;
    durationMs: number;
    /**
     * Path to a sidecar JSON containing per-chunk perf counters. Adapters
     * upload this alongside the chunk so per-chunk regressions are
     * inspectable without the workflow having to carry the payload.
     */
    perfPath: string;
}
/**
 * Re-export the runtime-env apply helper so adapters that import only
 * this subpath can prime `process.env` before instantiating their own
 * file server. Returns a `{ restore }` handle — adapters that fan out
 * multiple chunks per process MUST call `restore()` between chunks.
 */
export { applyRuntimeEnvSnapshot } from "../render/runtimeEnvSnapshot.js";
/**
 * Read SwiftShader vendor/renderer via a 1×1 WebGL canvas + the
 * `WEBGL_debug_renderer_info` extension. Used as the `readInfo` override
 * for {@link assertSwiftShader} when the worker is running on
 * `chrome-headless-shell` — that build serves `chrome://gpu` as an empty
 * document so the default `chrome://gpu`-based info reader trips
 * `net::ERR_FAILED` even when the GL backend is in fact SwiftShader.
 *
 * The canvas-based probe runs against whatever page the caller hands in
 * (we use a fresh `about:blank` so it doesn't depend on the composition
 * URL being navigated yet). The renderer string returned matches the
 * format `assertSwiftShader` expects (substring match against
 * `"swiftshader"`).
 */
export declare function readWebGlVendorInfoFromCanvas(page: Page): Promise<{
    vendor: string;
    renderer: string;
}>;
/**
 * Apply the planDir's locked-encoder choice on top of an
 * `EncoderPreset` from `getEncoderPreset`. `getEncoderPreset` returns
 * h265 only on the HDR branch, but distributed mode is SDR-only — for
 * an `libx265-software` planDir we still need to flip the preset's
 * codec to h265 so `runEncodeStage` invokes libx265. Exported so a
 * unit test can pin the override independently of the heavyweight
 * Docker fixture: a refactor that moves the override (e.g. into
 * `getEncoderPreset` itself) shouldn't be able to silently regress
 * the contract without a fast-test signal.
 */
export declare function resolvePresetForLockedEncoder<P extends {
    codec: "h264" | "h265" | "vp9" | "prores";
}>(basePreset: P, lockedEncoder: LockedRenderConfig["encoder"]): P;
/**
 * Activity B: render a single chunk of the planDir. The `outputChunkPath`
 * argument is a file for mp4/mov outputs and a directory for png-sequence
 * outputs — the caller picks the right shape based on `meta/encoder.json`.
 * `renderChunk` enforces the same choice via `outputKind` on the result.
 */
export declare function renderChunk(planDir: string, chunkIndex: number, outputChunkPath: string): Promise<ChunkResult>;
//# sourceMappingURL=renderChunk.d.ts.map