import React, { useEffect, useRef, useState } from "react";
import { collection, addDoc, getDocs, updateDoc, doc, orderBy, query } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase.js";

const SPEEDS = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];

export default function App() {
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [videos, setVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [uploading, setUploading] = useState(false);

  const chunksRef = useRef([]);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const leftTapRef = useRef(null);
  const rightTapRef = useRef(null);

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    if (!recording) return;

    timerRef.current = setInterval(() => {
      setRecordTime((time) => time + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [recording]);

  const loadVideos = async () => {
    const q = query(collection(db, "videos"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const loadedVideos = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));

    setVideos(loadedVideos);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setUploading(true);

        try {
          const blob = new Blob(chunksRef.current, { type: "video/webm" });
          const videoId = Date.now().toString();
          const storageRef = ref(storage, `videos/${videoId}.webm`);

          await uploadBytes(storageRef, blob);
          const videoUrl = await getDownloadURL(storageRef);

          await addDoc(collection(db, "videos"), {
            name: `Recording ${new Date().toLocaleString()}`,
            category: "Uncategorized",
            videoUrl,
            createdAt: Date.now(),
          });

          await loadVideos();
        } catch (error) {
          alert("Upload failed. Check Firebase Storage and Firestore rules.");
          console.error(error);
        }

        chunksRef.current = [];
        setRecordTime(0);
        setUploading(false);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setRecordTime(0);
    } catch (error) {
      alert("Recording permission denied.");
    }
  };

  const stopRecording = () => {
    if (!mediaRecorder) return;

    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    setRecording(false);
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      await video.play();
    } else {
      video.pause();
    }
  };

  const skipVideo = (seconds) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, video.currentTime + seconds);
  };

  const handleDoubleTapSkip = (side) => {
    const tapRef = side === "left" ? leftTapRef : rightTapRef;

    if (tapRef.current) {
      clearTimeout(tapRef.current);
      tapRef.current = null;
      skipVideo(side === "left" ? -5 : 5);
      return;
    }

    tapRef.current = setTimeout(() => {
      tapRef.current = null;
    }, 280);
  };

  const changeSpeed = (newSpeed) => {
    setSpeed(newSpeed);

    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  const openFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  const renameVideo = async (video, newName) => {
    setVideos((oldVideos) =>
      oldVideos.map((item) =>
        item.id === video.id ? { ...item, name: newName } : item
      )
    );

    await updateDoc(doc(db, "videos", video.id), {
      name: newName,
    });
  };

  const changeCategory = async (video, newCategory) => {
    setVideos((oldVideos) =>
      oldVideos.map((item) =>
        item.id === video.id ? { ...item, category: newCategory } : item
      )
    );

    await updateDoc(doc(db, "videos", video.id), {
      category: newCategory,
    });
  };

  const copyVideoLink = async (video) => {
    await navigator.clipboard.writeText(video.videoUrl);
    alert("Video link copied.");
  };

  const formatTime = (seconds) => {
    const min = String(Math.floor(seconds / 60)).padStart(2, "0");
    const sec = String(seconds % 60).padStart(2, "0");
    return `${min}:${sec}`;
  };

  useEffect(() => {
    const handleKeys = (event) => {
      if (!currentVideo) return;

      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        skipVideo(5);
      }

      if (event.code === "ArrowLeft") {
        event.preventDefault();
        skipVideo(-5);
      }
    };

    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [currentVideo]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [currentVideo, speed]);

  return (
    <div className="app">
      <h1>Recorder App</h1>

      {!recording ? (
        <button className="start-btn" onClick={startRecording} disabled={uploading}>
          {uploading ? "Uploading..." : "▶ Start Recording"}
        </button>
      ) : (
        <div className="recording-box">
          <span className="record-dot"></span>
          <strong>Recording</strong>
          <span>{formatTime(recordTime)}</span>

          <button onClick={() => mediaRecorder?.pause()}>⏸</button>
          <button onClick={() => mediaRecorder?.resume()}>▶</button>
          <button onClick={stopRecording}>⏹</button>
        </div>
      )}

      {uploading && <p>Uploading video to Firebase...</p>}

      <h2>Saved Videos</h2>

      <div className="video-grid">
        {videos.map((video) => (
          <div className="video-card" key={video.id}>
            <video src={video.videoUrl} className="thumb" muted />

            <input
              value={video.name}
              onChange={(e) => renameVideo(video, e.target.value)}
            />

            <select
              value={video.category}
              onChange={(e) => changeCategory(video, e.target.value)}
            >
              <option>Uncategorized</option>
              <option>Tuition</option>
              <option>Study</option>
              <option>Personal</option>
            </select>

            <button onClick={() => setCurrentVideo(video)}>Watch</button>
            <button onClick={() => copyVideoLink(video)}>Copy Link</button>
          </div>
        ))}
      </div>

      {currentVideo && (
        <div className="player-modal">
          <button className="close-btn" onClick={() => setCurrentVideo(null)}>
            ✕
          </button>

          <h2>{currentVideo.name}</h2>

          <div className="player-wrap">
            <video ref={videoRef} src={currentVideo.videoUrl} className="main-video" />

            <button
              className="tap-zone tap-left"
              onClick={() => handleDoubleTapSkip("left")}
            >
              ⏪ -5s
            </button>

            <button className="tap-zone tap-center" onClick={togglePlay}>
              ▶ / ⏸
            </button>

            <button
              className="tap-zone tap-right"
              onClick={() => handleDoubleTapSkip("right")}
            >
              +5s ⏩
            </button>
          </div>

          <button className="fullscreen-btn" onClick={openFullscreen}>
            ⛶ Fullscreen
          </button>

          <div className="speed-box">
            {SPEEDS.map((item) => (
              <button
                key={item}
                className={speed === item ? "active-speed" : ""}
                onClick={() => changeSpeed(item)}
              >
                {item}x
              </button>
            ))}
          </div>

          <p className="hint">
            Mobile: center tap = play/pause, double tap left/right = 5s. PC:
            Space = play/pause, ← / → = 5s.
          </p>
        </div>
      )}
    </div>
  );
}
