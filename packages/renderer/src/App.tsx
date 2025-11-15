import { useRef } from "react";
import "./App.css";

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  return (
    <div className="card">
      <button onClick={startCamera}>Start Camera</button>
      <video ref={videoRef} autoPlay playsInline style={{ width: "100%" }} />
    </div>
  );
}

export default App;
