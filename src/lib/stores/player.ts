import { writable } from "svelte/store";
import type { MediaItem, PlaybackMode } from "$lib/types/media";

export interface PlayerState {
  currentItem: MediaItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  playbackMode: PlaybackMode;
}

export const initialPlayerState: PlayerState = {
  currentItem: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  playbackMode: "normal",
};

export const playerStore = writable<PlayerState>(initialPlayerState);

export function setCurrentItem(item: MediaItem | null): void {
  playerStore.update((state) => ({
    ...state,
    currentItem: item,
    isPlaying: false,
    duration: item?.duration ?? 0,
    currentTime: 0,
  }));
}

export function setPlaybackMode(playbackMode: PlaybackMode): void {
  playerStore.update((state) => ({ ...state, playbackMode }));
}

export function togglePlayback(): void {
  playerStore.update((state) => ({ ...state, isPlaying: !state.isPlaying }));
}
