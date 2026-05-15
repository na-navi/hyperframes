/**
 * Worker entry point for off-main-thread PNG decode + alpha blit. The
 * companion to `pngDecodeBlitWorkerPool.ts`. See that file for the rationale
 * (hf#732 lever-4: overlap Chrome's screenshot with Node's decode+blit).
 *
 * Lifecycle:
 *
 * 1. Pool constructor spawns N of these workers up front.
 * 2. Main thread posts `{ png, pngOffset, pngLength, dest, destOffset,
 *    destLength, width, height, transfer }` with `transferList: [png, dest]`.
 *    Both underlying ArrayBuffers are detached on the sender; the caller
 *    must NOT touch them until the worker replies.
 * 3. Worker wraps each ArrayBuffer as a Node Buffer view (zero-copy),
 *    runs `decodePng` to get an RGBA8 Uint8Array, then `blitRgba8OverRgb48le`
 *    to composite the decoded pixels onto the rgb48le `dest` buffer in
 *    the requested transfer space.
 * 4. Worker posts `{ ok, png, dest, decodeMs, blitMs }` back with
 *    `transferList: [png, dest]`. Both ArrayBuffers return to the main
 *    thread; the caller swaps `result.dest` into its render state.
 * 5. On decode/blit exception, worker posts `{ ok: false, error, png,
 *    dest }` — both ArrayBuffers still returned so the caller can release
 *    them.
 *
 * The worker holds no per-frame state. The intermediate RGBA8 decode
 * buffer is allocated per-call and dropped on the worker side.
 *
 * Import strategy: identical to `shaderTransitionWorker.ts` — use the
 * `./alpha-blit` subpath export of `@hyperframes/engine` rather than the
 * package root, because the root pulls in the full engine graph and the
 * tsx loader's `.js → .ts` rewrite does not survive the Worker boundary
 * under dev/test.
 */
interface DecodeBlitJobOk {
    ok: true;
    png: ArrayBuffer;
    dest: ArrayBuffer;
    decodeMs: number;
    blitMs: number;
}
interface DecodeBlitJobErr {
    ok: false;
    error: string;
    png: ArrayBuffer;
    dest: ArrayBuffer;
}
export type DecodeBlitJobResult = DecodeBlitJobOk | DecodeBlitJobErr;
export {};
//# sourceMappingURL=pngDecodeBlitWorker.d.ts.map