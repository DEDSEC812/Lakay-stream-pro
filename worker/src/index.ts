/**
 * Streaming worker — scaffold.
 *
 * This is deliberately NOT a finished FFmpeg/RTMP pipeline. Building that for
 * real (video fetch, FFmpeg transcode, RTMP push to Facebook/YouTube/Twitch,
 * BullMQ + Redis queue, retry/reconnect logic, monitoring) is a dedicated
 * milestone on its own — faking it here with code that doesn't actually
 * stream anything would be worse than not having it.
 *
 * What this DOES give you: a real, working container that boots, exposes a
 * health check, and is wired into docker-compose / Render as a Background
 * Worker, so the deployment plumbing is ready the moment the streaming logic
 * lands on top of it.
 */
import express from "express";

const app = express();
const port = process.env.PORT ?? 8080;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "lakay-streaming-worker", ready: false });
});

app.listen(port, () => {
  console.log(`[worker] health check listening on :${port}`);
  console.log("[worker] FFmpeg/RTMP pipeline not yet implemented — scaffold only.");
});
