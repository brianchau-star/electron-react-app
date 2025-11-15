/**
 * A collection of MediaPipe-related constants.
 */
export const MEDIAPIPE = {
  /** The paths to the MediaPipe task files. */
  POSE_LANDMARKER: {
    DEFAULT: "/shared/models/pose_landmarker_heavy.task",
    HEAVY: "/shared/models/pose_landmarker_heavy.task",
    LITE: "/shared/models/pose_landmarker_lite.task",
    FULL: "/shared/models/pose_landmarker_full.task",
  },
  /** The running mode of the MediaPipe task. */
  RUNNING_MODE: {
    IMAGE: "IMAGE",
    VIDEO: "VIDEO",
  },
  /** The device to run the model on. */
  DELEGATE: {
    GPU: "GPU",
    CPU: "CPU",
  },
} as const;

export type GetVideoLandmarkerOptions = {
  /**
   * The device to run the model on. The "CPU" device is the slowest but most compatible,
   * the "GPU" device is the fastest but requires a compatible GPU.
   * @default "CPU"
   */
  delegate?: (typeof MEDIAPIPE.DELEGATE)[keyof typeof MEDIAPIPE.DELEGATE];
  /**
   * The type of the model to use. The "HEAVY" model is the most accurate but slowest,
   * the "LITE" model is the fastest but least accurate, and the "FULL" model is in between.
   * @default "HEAVY"
   */
  modelType?: keyof typeof MEDIAPIPE.POSE_LANDMARKER;
};

export type GetVideoPoseLandmarkerOptions = GetVideoLandmarkerOptions;
