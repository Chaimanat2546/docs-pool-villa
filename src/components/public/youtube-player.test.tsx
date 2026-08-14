/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { YouTubePlayer } from "./youtube-player";

type PlayerEvents = {
  onReady: (event: { target: PlayerControls }) => void;
  onStateChange: (event: { data: number }) => void;
  onError: () => void;
};

type PlayerControls = {
  playVideo: ReturnType<typeof vi.fn>;
  pauseVideo: ReturnType<typeof vi.fn>;
  mute: ReturnType<typeof vi.fn>;
  unMute: ReturnType<typeof vi.fn>;
  setVolume: ReturnType<typeof vi.fn>;
  isMuted: ReturnType<typeof vi.fn>;
  getVolume: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

function installYouTubeApi() {
  const player: PlayerControls = {
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    mute: vi.fn(),
    unMute: vi.fn(),
    setVolume: vi.fn(),
    isMuted: vi.fn(() => false),
    getVolume: vi.fn(() => 100),
    destroy: vi.fn(),
  };
  let events: PlayerEvents | undefined;
  const Player = vi.fn(function (_element: HTMLElement, options: { events: PlayerEvents }) {
    events = options.events;
    return player;
  });

  Object.assign(window, { YT: { Player } });

  return {
    Player,
    player,
    ready: () => act(() => events?.onReady({ target: player })),
    fail: () => act(() => events?.onError()),
  };
}

describe("YouTubePlayer", () => {
  afterEach(() => {
    cleanup();
    delete window.YT;
  });

  it("uses restricted YouTube options and exposes only play and volume controls", async () => {
    const api = installYouTubeApi();
    const { container } = render(<YouTubePlayer src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" />);
    await waitFor(() => expect(api.Player).toHaveBeenCalledOnce());
    api.ready();

    expect(api.Player).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        videoId: "dQw4w9WgXcQ",
        playerVars: expect.objectContaining({ controls: 0, disablekb: 1, enablejsapi: 1, fs: 0, iv_load_policy: 3, playsinline: 1, rel: 0 }),
      }),
    );
    expect((screen.getByRole("button", { name: "เล่นวิดีโอ" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "ปิดเสียง" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByLabelText("ระดับเสียง").getAttribute("type")).toBe("range");
    expect(container.querySelector("[allowfullscreen]")).toBeNull();
  });

  it("sends play, mute, and volume commands to the player", async () => {
    const api = installYouTubeApi();
    render(<YouTubePlayer src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" />);
    await waitFor(() => expect(api.Player).toHaveBeenCalledOnce());
    api.ready();

    fireEvent.click(screen.getByRole("button", { name: "เล่นวิดีโอ" }));
    fireEvent.click(screen.getByRole("button", { name: "ปิดเสียง" }));
    fireEvent.change(screen.getByLabelText("ระดับเสียง"), { target: { value: "35" } });

    expect(api.player.playVideo).toHaveBeenCalledOnce();
    expect(api.player.mute).toHaveBeenCalledOnce();
    expect(api.player.setVolume).toHaveBeenCalledWith(35);
  });

  it("shows an external fallback after a player error", async () => {
    const api = installYouTubeApi();
    render(<YouTubePlayer src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" />);
    await waitFor(() => expect(api.Player).toHaveBeenCalledOnce());
    api.fail();

    expect(screen.getByText("ไม่สามารถโหลดวิดีโอได้")).not.toBeNull();
    expect(screen.getByRole("link", { name: "เปิดวิดีโอใน YouTube" }).getAttribute("href")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});
