/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { YouTubePlayer } from "./youtube-player";

describe("YouTubePlayer", () => {
  afterEach(cleanup);

  it("shows a YouTube thumbnail and accessible play button before loading the player", () => {
    const { container } = render(<YouTubePlayer src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" />);

    expect(screen.getByRole("button", { name: "เล่นวิดีโอ YouTube" })).not.toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("loads a restricted player with click guards after play", () => {
    const { container } = render(<YouTubePlayer src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" />);
    fireEvent.click(screen.getByRole("button", { name: "เล่นวิดีโอ YouTube" }));

    const iframe = container.querySelector("iframe");
    const playerUrl = new URL(iframe?.getAttribute("src") ?? "", "https://example.test");
    expect(playerUrl.searchParams.get("autoplay")).toBe("1");
    expect(playerUrl.searchParams.get("controls")).toBe("0");
    expect(playerUrl.searchParams.get("disablekb")).toBe("1");
    expect(playerUrl.searchParams.get("fs")).toBe("0");
    expect(playerUrl.searchParams.get("iv_load_policy")).toBe("3");
    expect(playerUrl.searchParams.get("playsinline")).toBe("1");
    expect(playerUrl.searchParams.get("rel")).toBe("0");
    expect(iframe?.hasAttribute("allowfullscreen")).toBe(false);
    expect(container.querySelector("[data-youtube-click-guard]")?.children).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "ปิดเสียง" })).toBeNull();
    expect(container.querySelector('input[type="range"]')).toBeNull();
  });
});
