import { derived, writable, type Readable } from "svelte/store";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { MediaItem } from "$lib/types/media";

export const currentMedia = writable<MediaItem | null>(null);
export const isPlaying = writable(false);
export const isConverting = writable(false);
export const position = writable(0);
export const duration = writable(0);
export const volume = writable(1);
export const isMuted = writable(false);
export const playbackRate = writable(1);

export const playbackStage = writable<0 | 1 | 2>(0);
export const fallbackPath = writable<string | null>(null);
export const playbackNotice = writable<string | null>(null);
export const playbackError = writable<string | null>(null);

export const playbackSource: Readable<string> = derived(
  [currentMedia, fallbackPath],
  ([$currentMedia, $fallbackPath]) =>
    $currentMedia ? convertFileSrc($fallbackPath ?? $currentMedia.path) : "",
);

export function loadMedia(media: MediaItem): void {
  currentMedia.set(media);
  position.set(0);
  duration.set(media.duration ?? 0);
  isPlaying.set(false);
  playbackStage.set(0);
  fallbackPath.set(null);
  playbackNotice.set(null);
  playbackError.set(null);
}
