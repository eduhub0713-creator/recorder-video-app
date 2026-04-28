import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(cors());
app.use(express.json());
app.use("/videos", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + ".webm";
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

app.post("/upload", upload.single("video"), (req, res) => {
  const videoId = req.file.filename.replace(".webm", "");

  res.json({
    success: true,
    videoId,
    url: `${BASE_URL}/watch/${videoId}`,
    videoUrl: `${BASE_URL}/videos/${req.file.filename}`,
  });
});

app.get("/watch/:id", (req, res) => {
  const videoId = req.params.id;
  const videoUrl = `${BASE_URL}/videos/${videoId}.webm`;

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Watch Video</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      margin: 0;
      background: #050505;
      color: white;
      font-family: Arial, sans-serif;
    }

    .page {
      min-height: 100vh;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    video {
      width: 100%;
      max-width: 1000px;
      max-height: 70vh;
      background: black;
      border-radius: 18px;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
      justify-content: center;
    }

    button {
      border: none;
      border-radius: 999px;
      padding: 10px 15px;
      font-weight: bold;
      cursor: pointer;
    }

    .hint {
      color: #aaa;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="page">
    <h1>Watch Video</h1>

    <video id="video" src="${videoUrl}" controls controlsList="nodownload"></video>

    <div class="controls">
      <button onclick="skip(-5)">⏪ 5s</button>
      <button onclick="togglePlay()">▶ / ⏸</button>
      <button onclick="skip(5)">5s ⏩</button>
      <button onclick="fullscreen()">⛶ Fullscreen</button>
    </div>

    <div class="controls">
      <button onclick="setSpeed(1)">1x</button>
      <button onclick="setSpeed(1.25)">1.25x</button>
      <button onclick="setSpeed(1.5)">1.5x</button>
      <button onclick="setSpeed(1.75)">1.75x</button>
      <button onclick="setSpeed(2)">2x</button>
      <button onclick="setSpeed(2.25)">2.25x</button>
      <button onclick="setSpeed(2.5)">2.5x</button>
      <button onclick="setSpeed(2.75)">2.75x</button>
      <button onclick="setSpeed(3)">3x</button>
    </div>

    <p class="hint">Space = play/pause | Arrow keys = ±5s</p>
  </div>

  <script>
    const video = document.getElementById("video");

    function togglePlay() {
      video.paused ? video.play() : video.pause();
    }

    function skip(seconds) {
      video.currentTime = Math.max(0, video.currentTime + seconds);
    }

    function setSpeed(speed) {
      video.playbackRate = speed;
    }

    function fullscreen() {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      }
    }

    document.addEventListener("keydown", function(event) {
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      }

      if (event.code === "ArrowRight") {
        skip(5);
      }

      if (event.code === "ArrowLeft") {
        skip(-5);
      }
    });
  </script>
</body>
</html>
  `);
});

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.listen(PORT, () => {
  console.log(`Server running on ${BASE_URL}`);
});