/**
 * Helpers shared between the distributed activity scripts (`plan.ts`,
 * `renderChunk.ts`, `assemble.ts`). Kept module-local so the public surface
 * stays just the three activity functions plus their result types.
 */
import { type Fps } from "@hyperframes/core";
import { type VideoElement, type VideoMetadata } from "@hyperframes/engine";
import { type RenderConfig, type RenderJob } from "../renderOrchestrator.js";
import { type ProducerLogger } from "../../logger.js";
/**
 * Filename of the per-video extraction manifest written by `plan()` into
 * `<planDir>/meta/` and consumed by `renderChunk()` to rebuild the
 * BeforeCaptureHook that injects pre-extracted frames into the page.
 * Absence is fine — compositions with no `<video>` elements never
 * produce the file.
 */
export declare const PLAN_VIDEOS_META_RELATIVE_PATH = "meta/videos.json";
/**
 * On-disk shape of `<planDir>/meta/videos.json`. The engine's
 * `ExtractedFrames` shape carries an absolute `outputDir`, a `framePaths`
 * Map, and potentially an open file descriptor — none of those survive
 * a serialize → re-deserialize round trip across processes. The
 * serialized form keeps only what plan-time produced; `renderChunk` re-
 * derives `outputDir` (always `<planDir>/video-frames/<videoId>`) and
 * `framePaths` (re-listed from that directory) when reconstructing the
 * `FrameLookupTable`.
 */
export interface PlanVideosJson {
    videos: VideoElement[];
    extracted: Array<{
        videoId: string;
        srcPath: string;
        framePattern: string;
        fps: number;
        totalFrames: number;
        metadata: VideoMetadata;
    }>;
}
/**
 * Read `ffmpeg -version` first line. The string is opaque — `planHash`
 * mixes it in verbatim, so any drift across worker hosts trips a
 * `FFMPEG_VERSION_MISMATCH` rather than producing pixels that subtly
 * disagree with the plan's baked-in encoder args.
 */
export declare function readFfmpegVersion(): Promise<string>;
/** Test-only: clear the cached ffmpeg version so a fresh probe runs. */
export declare function _resetFfmpegVersionCacheForTests(): void;
/**
 * Inputs for {@link buildSyntheticRenderJob}. The two distributed activity
 * scripts (`plan.ts`, `renderChunk.ts`) reach for slightly different
 * sources — caller config vs. frozen `LockedRenderConfig` — but the
 * resulting `RenderJob` shape is identical, so the helper accepts both.
 */
export interface SyntheticRenderJobInput {
    fps: Fps;
    format: RenderConfig["format"];
    quality: RenderConfig["quality"];
    crf?: number;
    bitrate?: string;
    outputResolution?: RenderConfig["outputResolution"];
    hdrMode: RenderConfig["hdrMode"];
    entryFile: string;
    logger?: ProducerLogger;
    producerConfig?: RenderConfig["producerConfig"];
}
/**
 * Synthesize a `RenderJob` from a distributed-render config. The distributed
 * activities operate without a full `RenderJob` (they're stateless workers),
 * so we build one to feed the existing stage interfaces.
 */
export declare function buildSyntheticRenderJob(input: SyntheticRenderJobInput): RenderJob;
export declare function readProducerVersion(): string;
//# sourceMappingURL=shared.d.ts.map