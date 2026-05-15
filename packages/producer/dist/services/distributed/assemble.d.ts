/**
 * Activity C of the distributed render pipeline.
 *
 * `assemble(planDir, chunkPaths, audioPath, outputPath)` stitches per-chunk
 * outputs into the final deliverable. For mp4/mov this is `ffmpeg -f concat
 * -c copy` (free of re-encode loss because every chunk's first frame is an
 * IDR keyframe — the chunk encoder sets `lockGopForChunkConcat` to
 * enforce this). For png-sequence chunks (each chunk is a directory of
 * frames) this is a straight directory merge with global re-numbering.
 *
 * Mux + faststart for mp4/mov go through the engine's `muxVideoWithAudio`
 * + `applyFaststart` helpers — same path the in-process renderer uses; we
 * just feed concat output rather than streaming-encoder output. Audio
 * length is pad-or-trimmed to `frameCount / fps` via
 * `padOrTrimAudioToVideoFrameCount` so the mux step doesn't introduce
 * sub-millisecond drift at the end of long renders.
 *
 * Pure function over local paths. No networking. The caller is responsible
 * for moving `outputPath` to its orchestration-level storage.
 */
import { type ProducerLogger } from "../../logger.js";
/**
 * Result of {@link assemble}. `fileSize` reflects the final file on disk
 * (mp4/mov) or the cumulative byte total of the frame directory
 * (png-sequence).
 */
export interface AssembleResult {
    outputPath: string;
    durationMs: number;
    framesEncoded: number;
    fileSize: number;
}
/**
 * Assemble the chunk outputs into a single deliverable.
 *
 * @param planDir — absolute path to the planDir produced by `plan()`.
 * @param chunkPaths — ordered chunk outputs, length === `chunks.json` length.
 *   For mp4/mov each entry is a path to an encoded chunk file; for
 *   png-sequence each entry is a path to a directory of frames.
 * @param audioPath — `<planDir>/audio.aac` for mux'd formats. Pass `null`
 *   when the composition has no audio (or `assemble` is being called for a
 *   format whose audio is muxed elsewhere). `assemble` always normalizes
 *   audio length against the assembled video's frame count when
 *   `audioPath` is non-null.
 * @param outputPath — final on-disk output (file for mp4/mov; directory
 *   for png-sequence — created if missing).
 */
export declare function assemble(planDir: string, chunkPaths: readonly string[], audioPath: string | null, outputPath: string, options?: {
    logger?: ProducerLogger;
    abortSignal?: AbortSignal;
}): Promise<AssembleResult>;
//# sourceMappingURL=assemble.d.ts.map