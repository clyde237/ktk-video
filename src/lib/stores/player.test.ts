import { describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import type { MediaItem } from "$lib/types/media";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://localhost/${path}`,
}));

import {
  currentMedia,
  duration,
  fallbackPath,
  isPlaying,
  loadMedia,
  playbackError,
  playbackNotice,
  playbackSource,
  playbackStage,
  position,
} from "./player";

function mockMedia(path: string, durationSec = 120): MediaItem {
  return {
    id: "test-id",
    name: "test-video.mp4",
    path,
    kind: "video",
    extension: "mp4",
    size: 2048,
    duration: durationSec,
  };
}

describe("store player", () => {
  it("initialise et réinitialise l'état lors de loadMedia", () => {
    position.set(50);
    isPlaying.set(true);
    playbackStage.set(1);
    playbackNotice.set("Message");
    playbackError.set("Erreur");

    const media = mockMedia("/home/user/video.mp4", 300);
    loadMedia(media);

    expect(get(currentMedia)).toEqual(media);
    expect(get(position)).toBe(0);
    expect(get(duration)).toBe(300);
    expect(get(isPlaying)).toBe(false);
    expect(get(playbackStage)).toBe(0);
    expect(get(fallbackPath)).toBeNull();
    expect(get(playbackNotice)).toBeNull();
    expect(get(playbackError)).toBeNull();
  });

  it("génère l'URL de lecture via playbackSource", () => {
    currentMedia.set(null);
    fallbackPath.set(null);
    expect(get(playbackSource)).toBe("");

    const media = mockMedia("/home/user/film.mkv");
    loadMedia(media);
    expect(get(playbackSource)).toBe("asset://localhost//home/user/film.mkv");

    // Quand un chemin de repli existe (remux ou transcode), il a priorité
    fallbackPath.set("/tmp/ktk-video/cache.mp4");
    expect(get(playbackSource)).toBe("asset://localhost//tmp/ktk-video/cache.mp4");
  });
});
