import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { useGetVideoPoseLandmarker } from '../hooks/use-get-video-landmarker';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  const [webcamRunning, setWebcamRunning] = useState(false);

  const initMediaPipe = useCallback(async () => {
    try {
      poseLandmarkerRef.current = await useGetVideoPoseLandmarker();
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

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    const drawingUtils = new DrawingUtils(canvasCtx);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const startTimeMs = performance.now();

    if (lastVideoTimeRef.current !== video.currentTime) {
      lastVideoTimeRef.current = video.currentTime;

      try {
        const result = poseLandmarker.detectForVideo(video, startTimeMs);
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        // Vẽ segmentation masks
        if (result.segmentationMasks && result.segmentationMasks.length > 0) {
          const mask = result.segmentationMasks[0];
          const imageData = canvasCtx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
          const data = imageData.data;

          for (let i = 0; i < mask.width * mask.height; i++) {
            const maskValue = mask.getAsFloat32Array()[i];
            if (maskValue > 0.5) {
              const pixelIndex = i * 4;
              data[pixelIndex] = 0; // R
              data[pixelIndex + 1] = 255; // G
              data[pixelIndex + 2] = 0; // B
              data[pixelIndex + 3] = 100; // Alpha (transparency)
            }
          }

          canvasCtx.putImageData(imageData, 0, 0);
        }

        // Vẽ landmarks và connections
        if (result.landmarks && result.landmarks.length > 0) {
          for (const landmarks of result.landmarks) {
            drawingUtils.drawLandmarks(landmarks, {
              color: '#00FF00',
              radius: (data) =>
                DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1),
            });

            drawingUtils.drawConnectors(
              landmarks,
              PoseLandmarker.POSE_CONNECTIONS,
              {
                color: '#00FF00',
                lineWidth: 2,
              },
            );
          }
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
          video: { width: 1280, height: 720 },
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
