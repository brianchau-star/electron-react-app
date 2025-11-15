import * as Vision from '@mediapipe/tasks-vision';

/**
 * Get a PoseLandmarker instance for video processing.
 */
export async function useGetVideoPoseLandmarker() {
  const modelAssetPath = '../shared/models/pose_landmarker_full.task';

  return Vision.PoseLandmarker.createFromOptions(
    await Vision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    ),
    {
      runningMode: 'VIDEO',
      numPoses: 1,
      outputSegmentationMasks: true,
      baseOptions: {
        modelAssetPath,
        delegate: 'GPU',
      },
    },
  );
}
