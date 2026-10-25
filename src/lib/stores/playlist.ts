import { writable } from "svelte/store";
import type { MediaItem, Playlist } from "$lib/types/media";

export interface PlaylistState {
  activePlaylistId: string | null;
  playlists: Playlist[];
}

export const initialPlaylistState: PlaylistState = {
  activePlaylistId: null,
  playlists: [],
};

export const playlistStore = writable<PlaylistState>(initialPlaylistState);

export function createPlaylist(name: string, items: MediaItem[] = []): Playlist {
  const now = new Date().toISOString();

  return {
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `playlist-${Date.now()}`,
    name,
    items,
    createdAt: now,
    updatedAt: now,
  };
}

export function addPlaylist(name: string, items: MediaItem[] = []): void {
  playlistStore.update((state) => ({
    ...state,
    playlists: [...state.playlists, createPlaylist(name, items)],
    activePlaylistId: state.activePlaylistId ?? state.playlists[0]?.id ?? null,
  }));
}

export function setActivePlaylist(playlistId: string | null): void {
  playlistStore.update((state) => ({ ...state, activePlaylistId: playlistId }));
}
