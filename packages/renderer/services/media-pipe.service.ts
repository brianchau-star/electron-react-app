import * as Vision from '@mediapipe/tasks-vision';

/**
 * Get a PoseLandmarker instance for video processing.
 */

const MediaPipeService = {
  getVideoPoseLandmarker: async () => {
    const modelAssetPath = '../shared/models/pose_landmarker_full.task';

    return Vision.PoseLandmarker.createFromOptions(
      await Vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.10/wasm',
      ),
      {
        runningMode: 'VIDEO',
        numPoses: 2,
        outputSegmentationMasks: true,
        minPoseDetectionConfidence: 0.35,
        minPosePresenceConfidence: 0.35,
        minTrackingConfidence: 0.4,
        baseOptions: { modelAssetPath, delegate: 'GPU' },
      },
    );
  },
};

export default MediaPipeService;
