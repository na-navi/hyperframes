/**
 * Pool of Node `worker_threads` Workers for off-main-thread PNG decode +
 * rgba8-over-rgb48le blit. The hf#732 lever-4 follow-up: capture (Chrome
 * compositor) and decode+blit (Node CPU) were previously serialized per
 * frame inside `captureTransitionFrame` / `compositeHdrFrame`. Each frame
 * waited ~30 ms (decode) + ~50 ms (blit) on the Node main thread before the
 * next CDP screenshot could begin. With the decode+blit on a worker pool,
 * the calling thread can kick off the next CDP capture immediately and the
 * decode+blit overlaps Chrome's screenshot work.
 *
 * Why a SEPARATE pool from `shaderTransitionWorkerPool`:
 *
 *   - Different work shapes: shader-blend reads 2× rgb48le, writes 1×
 *     rgb48le. Decode+blit reads 1× PNG bytes (variable size, often
 *     ~250 KB for 854×480 with sparse DOM content), allocates a temporary
 *     RGBA8 buffer, and writes 1× rgb48le (over an existing destination).
 *   - Different concurrency profile: shader-blend fires once per
 *     transition frame; decode+blit fires once per DOM layer per frame
 *     (typically 3-6× per normal frame, 2× per transition frame). The
 *     pools have very different dispatch rates and queuing characteristics.
 *   - Sizing them independently lets us tune each to its bottleneck without
 *     starving the other.
 *
 * API:
 *
 *   const pool = await createPngDecodeBlitWorkerPool({ size, log });
 *   const result = await pool.run({
 *     png: pngBuffer,             // alpha-channel PNG from CDP (zero-copy in)
 *     dest: rgb48leDestBuffer,    // rgb48le canvas to blend onto (zero-copy in)
 *     width, height,
 *     transfer: "srgb" | "pq" | "hlg" | etc.,
 *   });
 *   // result.dest is the SAME memory as the input `dest`, but re-attached
 *   // to the main thread. The input Buffer is detached on dispatch — the
 *   // caller must use `result.dest` for any subsequent reads/writes.
 *   await pool.terminate();
 *
 * Buffer transfer contract:
 *
 *   The PNG bytes are transferred IN with `transferList: [png.buffer]` so
 *   we don't copy them across the worker boundary. The `dest` rgb48le
 *   ArrayBuffer is also transferred IN (and back OUT) so the blit happens
 *   in place on the same memory the caller pre-allocated. After `run`
 *   resolves, the caller MUST swap its Buffer reference to `result.dest`
 *   — the original Buffer's underlying ArrayBuffer is detached on dispatch.
 *
 *   The intermediate RGBA8 decode buffer is allocated INSIDE the worker
 *   and dropped on the worker side — there is no main-thread allocation
 *   for it. The PNG ArrayBuffer is transferred back too so the caller can
 *   release it.
 */
interface PoolLogger {
    info?: (msg: string, meta?: Record<string, unknown>) => void;
    warn?: (msg: string, meta?: Record<string, unknown>) => void;
    error?: (msg: string, meta?: Record<string, unknown>) => void;
}
export interface PngDecodeBlitPoolOptions {
    /** Number of worker threads. Clamped to [1, cpus().length]. */
    size: number;
    /** Optional logger; falls back to no-op. */
    log?: PoolLogger;
    /**
     * Absolute filesystem path to the worker entry module. When provided, the
     * pool spawns workers from this exact path and skips the fallback
     * `import.meta.url`-based resolver entirely. Required by callers that
     * bundle the worker via a separate build (e.g. the CLI's tsup bundle):
     * `import.meta.url` inside the bundled pool resolves to the bundle's own
     * location, NOT the bundled worker entry's location, so the heuristic
     * resolver below cannot find the worker. Path extension determines the
     * loader behaviour (`.ts` → tsx/esm loader is appended to execArgv).
     */
    workerEntryPath?: string;
}
export interface PngDecodeBlitRequest {
    /** PNG bytes captured from CDP (Page.captureScreenshot). */
    png: Buffer;
    /**
     * Pre-allocated rgb48le destination canvas (width*height*6 bytes). The
     * blit composites the decoded RGBA8 image OVER this buffer's existing
     * contents in `transfer` space.
     */
    dest: Buffer;
    width: number;
    height: number;
    /**
     * Composite color space tag matching the engine's `CompositeTransfer`
     * union. Passed through to `blitRgba8OverRgb48le` in the worker.
     */
    transfer: string;
}
export interface PngDecodeBlitResult {
    /**
     * Re-attached destination buffer holding the composited rgb48le pixels.
     * Same memory as the request's `dest`, viewed through a fresh Buffer.
     */
    dest: Buffer;
    /** Per-worker timing: decode duration in ms (excluding postMessage latency). */
    decodeMs: number;
    /** Per-worker timing: blit duration in ms. */
    blitMs: number;
}
export interface PngDecodeBlitWorkerPool {
    readonly size: number;
    run(req: PngDecodeBlitRequest): Promise<PngDecodeBlitResult>;
    terminate(): Promise<void>;
}
export declare function createPngDecodeBlitWorkerPool(opts: PngDecodeBlitPoolOptions): Promise<PngDecodeBlitWorkerPool>;
export {};
//# sourceMappingURL=pngDecodeBlitWorkerPool.d.ts.map