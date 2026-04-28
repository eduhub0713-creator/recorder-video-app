import React, { useEffect, useRef, useState } from "react";

const DB_NAME = "recorder-video-db";
const STORE_NAME = "videos";
const SPEEDS = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function App() {
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [videos, setVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [mediaRecorder, setMediaRecorder] = useState(null);

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

  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const cleanVideoForDB = (video) => {
    const { url, ...safeVideo } = video;
    return safeVideo;
  };

  const saveVideo = async (video) => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(cleanVideoForDB(video));

      tx.oncomplete = async () => {
        await loadVideos();
        resolve();
      };

      tx.onerror = () => reject(tx.error);
    });
  };

  const loadVideos = async () => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).getAll();

      request.onsuccess = () => {
        const savedVideos = request.result.map((video) => ({
          ...video,
          url: URL.createObjectURL(video.blob),
        }));

        setVideos(savedVideos.reverse());
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
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
        const blob = new Blob(chunksRef.current, { type: "video/webm" });

        let shareUrl = "";

        try {
          const formData = new FormData();
          formData.append("video", blob, "recording.webm");

          const response = await fetch(`${BACKEND_URL}/upload`, {
            method: "POST",
            body: formData,
          });

          const data = await response.json();
          shareUrl = data.url;
        } catch (error) {
          alert("Video saved inside app, but backend upload failed.");
        }

        await saveVideo({
          id: Date.now().toString(),
          name: `Recording ${new Date().toLocaleString()}`,
          category: "Uncategorized",
          blob,
          shareUrl,
          createdAt: new Date().toISOString(),
        });

        chunksRef.current = [];
        setRecordTime(0);
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

  const openFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
      video.msRequestFullscreen();
    }
  };

  const changeSpeed = (newSpeed) => {
    setSpeed(newSpeed);

    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  const renameVideo = async (video, newName) => {
    const updatedVideo = { ...video, name: newName };

    setVideos((oldVideos) =>
      oldVideos.map((item) => (item.id === video.id ? updatedVideo : item))
    );

    if (currentVideo?.id === video.id) {
      setCurrentVideo(updatedVideo);
    }

    await saveVideo(updatedVideo);
  };

  const changeCategory = async (video, newCategory) => {
    const updatedVideo = { ...video, category: newCategory };

    setVideos((oldVideos) =>
      oldVideos.map((item) => (item.id === video.id ? updatedVideo : item))
    );

    if (currentVideo?.id === video.id) {
      setCurrentVideo(updatedVideo);
    }

    await saveVideo(updatedVideo);
  };

  const copyVideoLink = async (video) => {
    if (!video.shareUrl) {
      alert("This video does not have an uploaded link yet.");
      return;
    }

    await navigator.clipboard.writeText(video.shareUrl);
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
        <button className="start-btn" onClick={startRecording}>
          ▶ Start Recording
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

      <h2>Saved Videos</h2>

      <div className="video-grid">
        {videos.map((video) => (
          <div className="video-card" key={video.id}>
            <video src={video.url} className="thumb" muted />

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
            <video ref={videoRef} src={currentVideo.url} className="main-video" />

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
            Mobile: single tap center = play/pause, double tap left/right = 5s.
            PC: Space = play/pause, ← / → = 5s.
          </p>
        </div>
      )}
    </div>
  );
}