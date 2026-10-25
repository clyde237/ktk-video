import { derived, writable } from "svelte/store";
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
export const activePlaylist = derived(playlistStore, (state) =>
  state.playlists.find((playlist) => playlist.id === state.activePlaylistId) ?? null
);

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
  playlistStore.update((state) => {
    const playlist = createPlaylist(name, items);
    return {
      ...state,
      playlists: [...state.playlists, playlist],
      activePlaylistId: state.activePlaylistId ?? playlist.id,
    };
  });
}

export function setActivePlaylist(playlistId: string | null): void {
  playlistStore.update((state) => ({ ...state, activePlaylistId: playlistId }));
}

function updateActivePlaylist(
  updateItems: (items: MediaItem[]) => MediaItem[],
  createIfMissing = true
): void {
  playlistStore.update((state) => {
    const currentPlaylist = state.playlists.find(
      (playlist) => playlist.id === state.activePlaylistId
    );

    if (!currentPlaylist) {
      if (!createIfMissing) return state;

      const playlist = createPlaylist("Playlist", updateItems([]));
      return {
        ...state,
        playlists: [...state.playlists, playlist],
        activePlaylistId: playlist.id,
      };
    }

    const updatedPlaylist: Playlist = {
      ...currentPlaylist,
      items: updateItems(currentPlaylist.items),
      updatedAt: new Date().toISOString(),
    };

    return {
      ...state,
      playlists: state.playlists.map((playlist) =>
        playlist.id === updatedPlaylist.id ? updatedPlaylist : playlist
      ),
    };
  });
}

export function addManyToPlaylist(items: MediaItem[]): void {
  if (items.length === 0) return;
  updateActivePlaylist((currentItems) => [...currentItems, ...items]);
}

export function addToPlaylist(item: MediaItem): void {
  updateActivePlaylist((items) => [...items, item]);
}

export function removeFromPlaylist(itemId: string): void {
  updateActivePlaylist((items) => items.filter((item) => item.id !== itemId), false);
}

export function clearPlaylist(): void {
  updateActivePlaylist(() => [], false);
}
