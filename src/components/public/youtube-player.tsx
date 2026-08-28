"use client";

import { useMemo, useState } from "react";

function getVideoId(src: string): string | null {
  try {
    const url = new URL(src);
    const id = url.pathname.split("/")[2] ?? "";
    return url.hostname === "www.youtube-nocookie.com" && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function getPlayerUrl(src: string): string {
  const url = new URL(src);
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("controls", "0");
  url.searchParams.set("disablekb", "1");
  url.searchParams.set("fs", "0");
  url.searchParams.set("iv_load_policy", "3");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  return url.href;
}

export function YouTubePlayer({ src }: { src: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = useMemo(() => getVideoId(src), [src]);
  const playerUrl = useMemo(() => getPlayerUrl(src), [src]);

  if (!videoId) return null;

  return (
    <div className="doc-video">
      <div className="doc-video-frame">
        {isPlaying ? (
          <>
            <iframe
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              className="doc-video-player"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-presentation allow-same-origin allow-scripts"
              src={playerUrl}
              title="วิดีโอ YouTube"
            />
            <div aria-hidden="true" className="doc-video-overlay" data-youtube-click-guard>
              <span className="doc-video-guard-top" />
              <span className="doc-video-guard-bottom" />
              <span className="doc-video-guard-left" />
              <span className="doc-video-guard-right" />
            </div>
          </>
        ) : (
          <button type="button" className="doc-video-thumbnail" aria-label="เล่นวิดีโอ YouTube" onClick={() => setIsPlaying(true)}>
            {/* The image URL is derived only from the validated YouTube video ID. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" />
            <span aria-hidden="true">▶</span>
          </button>
        )}
      </div>
    </div>
  );
}
