import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import * as Vision from '@mediapipe/tasks-vision';
import { PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import MediaPipeService from '../services/media-pipe.service';

const iceOffscreenCanvas = document.createElement('canvas');
const iceOffscreenCtx = iceOffscreenCanvas.getContext('2d', {
  willReadFrequently: true,
})!;

let smoothedMaskData: Float32Array | null = null;

function getSmoothedMaskData(rawMaskData: Float32Array) {
  const alpha = 0.7;

  if (!smoothedMaskData || smoothedMaskData.length !== rawMaskData.length) {
    smoothedMaskData = new Float32Array(rawMaskData);
    return smoothedMaskData;
  }

  for (let i = 0; i < rawMaskData.length; i++) {
    smoothedMaskData[i] =
      smoothedMaskData[i] * (1 - alpha) + rawMaskData[i] * alpha;
  }

  return smoothedMaskData;
}

const iceImage = new Image();
iceImage.crossOrigin = 'anonymous';
iceImage.src =
  'https://cdn.fessior.com/content/fessior-tiktok-dev/ice-effect.jpeg';

let iceImageLoaded = false;
iceImage.onload = () => {
  iceImageLoaded = true;
};

function buildIceLayerFromMask(mask: Vision.MPMask) {
  if (!iceImageLoaded) return;

  const maskWidth = mask.width;
  const maskHeight = mask.height;
  const rawMaskData = mask.getAsFloat32Array();
  const smooth = getSmoothedMaskData(rawMaskData);

  iceOffscreenCanvas.width = maskWidth;
  iceOffscreenCanvas.height = maskHeight;

  iceOffscreenCtx.clearRect(0, 0, maskWidth, maskHeight);
  iceOffscreenCtx.drawImage(iceImage, 0, 0, maskWidth, maskHeight);

  const iceImageData = iceOffscreenCtx.getImageData(
    0,
    0,
    maskWidth,
    maskHeight,
  );
  const iceData = iceImageData.data;

  const hardThreshold = 0.4;
  const maxInnerAlpha = 0.4;
  const borderBoost = 1;

  const insideMask = new Uint8Array(maskWidth * maskHeight);

  for (let i = 0; i < smooth.length; i++) {
    const v = smooth[i];
    insideMask[i] = v >= hardThreshold ? 1 : 0;

    if (!insideMask[i]) {
      const idx = i * 4;
      iceData[idx + 3] = 0;
    }
  }

  const growRadius = 6;
  const growR2 = growRadius * growRadius;
  const grownMask = new Uint8Array(maskWidth * maskHeight);

  for (let y = 0; y < maskHeight; y++) {
    for (let x = 0; x < maskWidth; x++) {
      const i = y * maskWidth + x;
      if (!insideMask[i]) continue;

      for (let dy = -growRadius; dy <= growRadius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= maskHeight) continue;

        for (let dx = -growRadius; dx <= growRadius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= maskWidth) continue;

          const d2 = dx * dx + dy * dy;
          if (d2 > growR2) continue;

          const ni = ny * maskWidth + nx;
          grownMask[ni] = 1;
        }
      }
    }
  }

  for (let i = 0; i < insideMask.length; i++) {
    insideMask[i] = grownMask[i];
  }

  const borderIndices: number[] = [];

  for (let y = 0; y < maskHeight; y++) {
    for (let x = 0; x < maskWidth; x++) {
      const i = y * maskWidth + x;
      if (!insideMask[i]) continue;

      const idx = i * 4;

      let isBorder = false;
      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= maskWidth || ny < 0 || ny >= maskHeight) {
          isBorder = true;
          break;
        }
        const ni = ny * maskWidth + nx;
        if (!insideMask[ni]) {
          isBorder = true;
          break;
        }
      }

      let alpha = maxInnerAlpha * 255;

      if (isBorder) {
        borderIndices.push(i);

        iceData[idx] = Math.min(255, iceData[idx] * borderBoost + 30);
        iceData[idx + 1] = Math.min(255, iceData[idx + 1] * borderBoost + 50);
        iceData[idx + 2] = Math.min(255, iceData[idx + 2] * borderBoost + 70);

        alpha = 255;
      }

      iceData[idx + 3] = alpha;
    }
  }

  iceOffscreenCtx.putImageData(iceImageData, 0, 0);
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  const [webcamRunning, setWebcamRunning] = useState(false);

  const initMediaPipe = useCallback(async () => {
    try {
      poseLandmarkerRef.current =
        await MediaPipeService.getVideoPoseLandmarker();
      console.log('PoseLandmarker initialized', poseLandmarkerRef.current);
    } catch (error) {
      console.error('Failed to initialize:', error);
    }
  }, []);

  const predictWebcam = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const poseLandmarker = poseLandmarkerRef.current;

    if (!video || !canvas || !poseLandmarker) return;

    const canvasCtx = canvas.getContext('2d', { willReadFrequently: true });
    if (!canvasCtx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const startTimeMs = performance.now();

    if (lastVideoTimeRef.current !== video.currentTime) {
      lastVideoTimeRef.current = video.currentTime;

      try {
        const result = poseLandmarker.detectForVideo(video, startTimeMs);
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        canvasCtx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (
          result.segmentationMasks &&
          result.segmentationMasks.length > 0 &&
          iceImageLoaded
        ) {
          const mask = result.segmentationMasks[0];

          buildIceLayerFromMask(mask);

          canvasCtx.drawImage(
            iceOffscreenCanvas,
            0,
            0,
            iceOffscreenCanvas.width,
            iceOffscreenCanvas.height,
            0,
            0,
            canvas.width,
            canvas.height,
          );
        }

        canvasCtx.restore();
      } catch (error) {
        console.error('Detection error:', error);
      }
    }

    if (webcamRunning) {
      animationFrameRef.current = window.requestAnimationFrame(predictWebcam);
    }
  }, [webcamRunning]);

  const startCamera = async () => {
    if (!poseLandmarkerRef.current) {
      console.log('Wait! PoseLandmarker not loaded yet.');
      return;
    }

    if (webcamRunning) {
      setWebcamRunning(false);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    } else {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.addEventListener('loadeddata', () => {
            setWebcamRunning(true);
          });
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
      }
    }
  };

  useEffect(() => {
    initMediaPipe();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initMediaPipe]);

  useEffect(() => {
    if (webcamRunning) {
      predictWebcam();
    }
  }, [webcamRunning, predictWebcam]);

  return (
    <div className="card">
      <h1>Pose Detection with MediaPipe</h1>

      <button onClick={startCamera}>
        {webcamRunning ? 'DISABLE WEBCAM' : 'ENABLE WEBCAM'}
      </button>

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '640px',
            height: '480px',
            transform: 'scaleX(-1)',
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '640px',
            height: '480px',
            transform: 'scaleX(-1)',
          }}
        />
      </div>
    </div>
  );
}

export default App;
