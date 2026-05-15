/**
 * `@hyperframes/producer/distributed` — the distributed render primitives.
 *
 * See `DISTRIBUTED-RENDERING-PLAN.md` for the full architecture. The three
 * activities (`plan` → `renderChunk` × N → `assemble`) are pure functions
 * over local file paths; networking + orchestration live in adapters.
 *
 * Adopters (AWS Lambda, Cloud Run Jobs, Temporal, K8s Jobs, plain SSH):
 *
 * ```ts
 * import {
 *   plan,
 *   renderChunk,
 *   assemble,
 * } from "@hyperframes/producer/distributed";
 *
 * // Controller-side: produce a self-contained planDir + content-addressed planHash.
 * const planResult = await plan(projectDir, config, planDir);
 *
 * // Worker-side: render one chunk. Byte-identical retries on the same
 * // (planDir, chunkIndex) — Temporal / Step Functions retry policies are
 * // safe to point at this.
 * const chunk = await renderChunk(planDir, chunkIndex, outputChunkPath);
 *
 * // Controller-side: stitch chunks into the final deliverable.
 * await assemble(planDir, chunkPaths, audioPath, outputPath);
 * ```
 *
 * No networking, no AWS SDK, no Temporal SDK — those live in adapter
 * packages. This module is library code only.
 */
export { buildChunkSlices, measurePlanDirBytes, plan, rejectUnsupportedDistributedFormat, resolveChunkPlan, type DistributedRenderConfig, type PlanResult, DEFAULT_CHUNK_SIZE, DEFAULT_MAX_PARALLEL_CHUNKS, PLAN_DIR_SIZE_LIMIT_BYTES, FORMAT_NOT_SUPPORTED_IN_DISTRIBUTED, FormatNotSupportedInDistributedError, PLAN_TOO_LARGE, PlanTooLargeError, } from "./services/distributed/plan.js";
export { applyRuntimeEnvSnapshot, readWebGlVendorInfoFromCanvas, renderChunk, type ChunkResult, FFMPEG_VERSION_MISMATCH, PLAN_HASH_MISMATCH, RenderChunkValidationError, } from "./services/distributed/renderChunk.js";
export { assemble, type AssembleResult } from "./services/distributed/assemble.js";
export type { ChunkSliceJson, CompositionMetadataJson, LockedRenderConfig, } from "./services/render/stages/freezePlan.js";
//# sourceMappingURL=distributed.d.ts.map