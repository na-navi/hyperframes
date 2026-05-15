/**
 * audioPadTrim — pad-or-trim an `audio.aac` file so its exact duration
 * matches the assembled video's frame count divided by fps.
 *
 * Distributed render assemble step needs this because:
 *   - The plan's audio is mixed once against the composition's *declared*
 *     duration.
 *   - The actual video produced by concatenating per-chunk encodes is the
 *     sum of per-chunk frame counts. With closed-GOP concat-copy this is
 *     deterministic and equals the planned frame count, BUT downstream
 *     muxers (ffmpeg `-shortest` plus Apple's mov demuxer in particular)
 *     are sensitive to ±1ms audio/video duration drift and produce silent
 *     "audio cuts off early" or "video shows a frozen final frame" bugs.
 *
 * The fix: post-pad/trim audio to *exactly* `frameCount / fps` seconds at
 * assemble time. Pad with `apad=pad_dur=…` (silence fill), trim with `-t`.
 */
export interface ProbeVideoFrameInfo {
    /** Number of video frames in the stream. */
    frameCount: number;
    /** Numerator of the frame rate fraction (e.g. 30 or 30000). */
    fpsNum: number;
    /** Denominator of the frame rate fraction (e.g. 1 or 1001). */
    fpsDen: number;
}
export interface AudioProbeInfo {
    /** Decoded duration in seconds. */
    durationSeconds: number;
}
export interface PadTrimAudioInput {
    /** Path to the assembled video. Used to derive `frameCount / fps`. */
    videoPath: string;
    /** Path to the pre-mixed audio (typically `<planDir>/audio.aac`). */
    audioPath: string;
    /** Path the helper writes the duration-corrected audio to. */
    outputPath: string;
    /**
     * Optional injectables for unit tests. Production callers omit them and
     * get the real `ffprobe`/`ffmpeg`-backed implementations.
     */
    probeVideoFrameInfo?: (videoPath: string) => Promise<ProbeVideoFrameInfo>;
    probeAudioInfo?: (audioPath: string) => Promise<AudioProbeInfo>;
    runFfmpeg?: (args: string[]) => Promise<{
        success: boolean;
        error?: string;
    }>;
}
export type PadTrimOperation = "pad" | "trim" | "copy";
export interface PadTrimAudioResult {
    success: boolean;
    outputPath: string;
    /** `frameCount / fps` to ~nanosecond precision. */
    targetDurationSeconds: number;
    /** Probed duration of the input audio. */
    sourceDurationSeconds: number;
    /** How the duration was corrected. */
    operation: PadTrimOperation;
    /** Populated only when `success === false`. */
    error?: string;
}
/**
 * Pure helper: decide the pad/trim operation and build the ffmpeg argv list
 * that materializes it. Exported separately so unit tests can pin both
 * branches without spawning ffmpeg.
 *
 *   - `sourceDuration < targetDuration` → pad with `apad=pad_dur=Δ`.
 *     Re-encode is required: `apad` is a filter and filters can't combine
 *     with `-c:a copy`.
 *   - `sourceDuration > targetDuration` → trim with `-t target`. `-c:a copy`
 *     is preserved when the input is already AAC.
 *   - `|Δ| < AUDIO_DURATION_TOLERANCE_SECONDS` → no-op `copy`, but we still
 *     run ffmpeg with `-c:a copy` to materialize the output path.
 */
export declare function buildPadTrimAudioArgs(audioPath: string, outputPath: string, sourceDurationSeconds: number, targetDurationSeconds: number): {
    args: string[];
    operation: PadTrimOperation;
};
/**
 * Pad or trim `audio.aac` so its exact duration matches `frameCount / fps`
 * for the assembled video.
 */
export declare function padOrTrimAudioToVideoFrameCount(input: PadTrimAudioInput): Promise<PadTrimAudioResult>;
//# sourceMappingURL=audioPadTrim.d.ts.map