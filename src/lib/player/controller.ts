import { get } from "svelte/store";
import { remuxMedia, transcodeMedia } from "$lib/api/media";
import { activePlaylist } from "$lib/stores/playlist";
import {
  currentMedia,
  duration,
  fallbackPath,
  isConverting,
  isMuted,
  isPlaying,
  loadMedia as setCurrentMedia,
  playbackError,
  playbackNotice,
  playbackRate,
  playbackSource,
  playbackStage,
  position,
  volume,
} from "$lib/stores/player";
import type { MediaItem } from "$lib/types/media";

let mediaElement: HTMLMediaElement | null = null;
let listeners: AbortController | null = null;
let loadGeneration = 0;
let conversionInProgress = false;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function loadMedia(media: MediaItem): void {
  loadGeneration += 1;
  setCurrentMedia(media);
}

export function attachMediaElement(element: HTMLMediaElement): void {
  detachMediaElement();
  mediaElement = element;
  element.volume = get(volume);
  element.muted = get(isMuted);
  element.playbackRate = get(playbackRate);

  listeners = new AbortController();
  const { signal } = listeners;
  const listen = (event: string, handler: () => void) =>
    element.addEventListener(event, handler, { signal });

  listen("play", () => {
    isPlaying.set(true);
    playbackNotice.set(null);
    playbackError.set(null);
  });
  listen("pause", () => isPlaying.set(false));
  listen("timeupdate", () => position.set(element.currentTime));
  listen("loadedmetadata", () =>
    duration.set(Number.isFinite(element.duration) ? element.duration : 0),
  );
  listen("volumechange", () => {
    volume.set(element.volume);
    isMuted.set(element.muted);
  });
  listen("ratechange", () => playbackRate.set(element.playbackRate));
  listen("ended", handleEnded);
  listen("error", () => {
    void handlePlaybackError();
  });
}

export function detachMediaElement(): void {
  listeners?.abort();
  listeners = null;
  mediaElement = null;
}

export async function togglePlay(): Promise<void> {
  const element = mediaElement;
  if (!element) return;

  try {
    if (element.paused) {
      await element.play();
    } else {
      element.pause();
    }
  } catch (error: unknown) {
    playbackError.set(`Impossible de démarrer la lecture : ${errorText(error)}`);
  }
}

export function stop(): void {
  const element = mediaElement;
  if (!element) return;

  element.pause();
  try {
    element.currentTime = 0;
  } catch (error: unknown) {
    playbackError.set(`Impossible de revenir au début du média : ${errorText(error)}`);
    return;
  }
  position.set(element.currentTime);
}

export function seekTo(seconds: number): void {
  const element = mediaElement;
  if (!element || !Number.isFinite(seconds)) return;

  const max = Number.isFinite(element.duration) ? element.duration : Number.POSITIVE_INFINITY;
  try {
    element.currentTime = Math.min(Math.max(seconds, 0), max);
    position.set(element.currentTime);
  } catch (error: unknown) {
    playbackError.set(`Impossible de déplacer la tête de lecture : ${errorText(error)}`);
  }
}

export function changeVolume(value: number): void {
  if (!Number.isFinite(value)) return;

  const clamped = Math.min(Math.max(value, 0), 1);
  if (mediaElement) {
    mediaElement.volume = clamped;
  } else {
    volume.set(clamped);
  }
}

export function toggleMute(): void {
  if (mediaElement) {
    mediaElement.muted = !mediaElement.muted;
  } else {
    isMuted.update((muted) => !muted);
  }
}

export function changePlaybackRate(rate: number): void {
  if (!Number.isFinite(rate)) return;

  const clamped = Math.min(Math.max(rate, 0.25), 2);
  if (mediaElement) {
    mediaElement.playbackRate = clamped;
  } else {
    playbackRate.set(clamped);
  }
}

export function seekBy(delta: number): void {
  if (!Number.isFinite(delta)) return;
  seekTo(get(position) + delta);
}

export function changeVolumeBy(delta: number): void {
  if (!Number.isFinite(delta)) return;
  changeVolume(get(volume) + delta);
}

export function playNext(): boolean {
  const current = get(currentMedia);
  if (!current) return false;

  const playlist = get(activePlaylist);
  if (!playlist) return false;
  const index = playlist.items.findIndex((item) => item.id === current.id);
  if (index < 0) return false;

  const next = playlist.items[index + 1];
  if (!next) return false;

  loadMedia(next);
  return true;
}

export function playPrevious(): boolean {
  const current = get(currentMedia);
  if (!current) return false;

  const playlist = get(activePlaylist);
  if (!playlist) return false;
  const index = playlist.items.findIndex((item) => item.id === current.id);
  if (index <= 0) return false;

  loadMedia(playlist.items[index - 1]);
  return true;
}

function handleEnded(): void {
  playNext();
}

async function handlePlaybackError(): Promise<void> {
  const media = get(currentMedia);
  if (!media || conversionInProgress || get(isConverting)) return;

  const generation = loadGeneration;
  const stage = get(playbackStage);
  if (stage >= 2) {
    playbackError.set("Ce média reste illisible après conversion.");
    playbackNotice.set(null);
    return;
  }

  conversionInProgress = true;
  isConverting.set(true);
  playbackError.set(null);

  try {
    if (stage === 0 && media.kind === "video") {
      playbackNotice.set(
        "Remuxage du fichier en cours (le premier lancement peut télécharger FFmpeg)…",
      );
      try {
        const path = await remuxMedia(media.path);
        if (generation !== loadGeneration) return;
        playbackStage.set(1);
        fallbackPath.set(path);
        return;
      } catch (remuxError: unknown) {
        if (generation !== loadGeneration) return;
        playbackNotice.set(
          "Le remuxage a échoué ; transcodage en cours, cela peut prendre plusieurs minutes…",
        );
        try {
          const path = await transcodeMedia(media.path);
          if (generation !== loadGeneration) return;
          playbackStage.set(2);
          fallbackPath.set(path);
          return;
        } catch (transcodeError: unknown) {
          throw new Error(
            `Le remuxage a échoué (${errorText(remuxError)}) et le transcodage aussi (${errorText(transcodeError)}).`,
          );
        }
      }
    }

    playbackNotice.set(
      media.kind === "audio"
        ? "Transcodage audio en cours (le premier lancement peut télécharger FFmpeg)…"
        : "La vidéo remuxée reste incompatible : transcodage en cours, cela peut prendre plusieurs minutes…",
    );
    const path = await transcodeMedia(media.path);
    if (generation !== loadGeneration) return;
    playbackStage.set(2);
    fallbackPath.set(path);
  } catch (error: unknown) {
    if (generation === loadGeneration) {
      playbackError.set(errorText(error));
      playbackNotice.set(null);
    }
  } finally {
    conversionInProgress = false;
    isConverting.set(false);
  }
}
