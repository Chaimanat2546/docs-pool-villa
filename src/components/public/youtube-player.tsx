"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type YouTubePlayerControls = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  setVolume(volume: number): void;
  getVolume(): number;
  isMuted(): boolean;
  destroy(): void;
};

type YouTubePlayerEvents = {
  onReady(event: { target: YouTubePlayerControls }): void;
  onStateChange(event: { data: number }): void;
  onError(): void;
};

type YouTubeApi = {
  Player: new (element: HTMLElement, options: { videoId: string; playerVars: Record<string, number>; events: YouTubePlayerEvents }) => YouTubePlayerControls;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeApi> | undefined;

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube IFrame API ไม่พร้อมใช้งาน"));
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-youtube-iframe-api="true"]');
    if (existingScript) return;

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.dataset.youtubeIframeApi = "true";
    script.onerror = () => reject(new Error("ไม่สามารถโหลด YouTube IFrame API ได้"));
    document.head.append(script);
  });

  return apiPromise;
}

function getVideoId(src: string): string | null {
  try {
    const url = new URL(src);
    const id = url.pathname.split("/")[2] ?? "";
    return url.hostname === "www.youtube-nocookie.com" && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function YouTubePlayer({ src }: { src: string }) {
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerControls | null>(null);
  const videoId = useMemo(() => getVideoId(src), [src]);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!videoId || !playerHostRef.current) return;
    let disposed = false;
    let player: YouTubePlayerControls | null = null;

    void loadYouTubeApi()
      .then((api) => {
        if (disposed || !playerHostRef.current) return;
        player = new api.Player(playerHostRef.current, {
          videoId,
          playerVars: { controls: 0, disablekb: 1, enablejsapi: 1, fs: 0, iv_load_policy: 3, playsinline: 1, rel: 0 },
          events: {
            onReady: ({ target }) => {
              if (disposed) return;
              playerRef.current = target;
              setMuted(target.isMuted());
              setVolume(target.getVolume());
              setReady(true);
            },
            onStateChange: ({ data }) => {
              if (!disposed) setPlaying(data === 1);
            },
            onError: () => {
              if (!disposed) setFailed(true);
            },
          },
        });
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });

    return () => {
      disposed = true;
      playerRef.current = null;
      player?.destroy();
    };
  }, [videoId]);

  if (!videoId) return null;
  if (failed) {
    return <div className="doc-video doc-video-fallback"><p>ไม่สามารถโหลดวิดีโอได้</p><a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">เปิดวิดีโอใน YouTube</a></div>;
  }

  const togglePlayback = () => {
    if (!playerRef.current) return;
    if (playing) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (muted) playerRef.current.unMute();
    else playerRef.current.mute();
    setMuted(!muted);
  };

  const updateVolume = (value: string) => {
    const nextVolume = Math.min(100, Math.max(0, Number(value) || 0));
    playerRef.current?.setVolume(nextVolume);
    setVolume(nextVolume);
  };

  return (
    <div className="doc-video">
      <div className="doc-video-frame">
        <div ref={playerHostRef} className="doc-video-player" />
        <div className="doc-video-overlay" aria-hidden="true" />
      </div>
      <div className="doc-video-controls" aria-label="ควบคุมวิดีโอ">
        <button type="button" onClick={togglePlayback} disabled={!ready} aria-label={playing ? "หยุดวิดีโอชั่วคราว" : "เล่นวิดีโอ"}>{playing ? "หยุดชั่วคราว" : "เล่น"}</button>
        <button type="button" onClick={toggleMute} disabled={!ready} aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}>{muted ? "เปิดเสียง" : "ปิดเสียง"}</button>
        <label>ระดับเสียง<input type="range" min="0" max="100" value={volume} onChange={(event) => updateVolume(event.target.value)} disabled={!ready} /></label>
      </div>
    </div>
  );
}
