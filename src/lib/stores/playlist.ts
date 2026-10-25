import { derived, get, writable, type Readable } from "svelte/store";
import { loadPlaylistsData, savePlaylistsData } from "$lib/api/storage";
import type { MediaItem, PlaybackMode, Playlist } from "$lib/types/media";

interface StoredState {
  version: 1;
  playlists: Playlist[];
  activePlaylistId: string;
}

const SAVE_DEBOUNCE_MS = 800;
const DEFAULT_PLAYLIST_NAME = "Ma playlist";

function createId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `playlist-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makePlaylist(name: string): Playlist {
  const now = new Date().toISOString();
  return { id: createId(), name, items: [], createdAt: now, updatedAt: now };
}

const firstPlaylist = makePlaylist(DEFAULT_PLAYLIST_NAME);

export const playbackMode = writable<PlaybackMode>("normal");
export const playlists = writable<Playlist[]>([firstPlaylist]);
export const activePlaylistId = writable(firstPlaylist.id);
export const playlistStoreReady = writable(false);
export const playlistPersistenceError = writable<string | null>(null);

export const activePlaylist: Readable<Playlist> = derived(
  [playlists, activePlaylistId],
  ([$playlists, $activePlaylistId]) =>
    $playlists.find((playlist) => playlist.id === $activePlaylistId) ?? firstPlaylist,
);

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveQueue: Promise<void> = Promise.resolve();
let initialization: Promise<void> | null = null;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function scheduleSave(): void {
  if (!get(playlistStoreReady)) return;
  if (saveTimer !== null) clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    saveTimer = null;
    const state: StoredState = {
      version: 1,
      playlists: get(playlists),
      activePlaylistId: get(activePlaylistId),
    };
    const serialized = JSON.stringify(state);

    saveQueue = saveQueue
      .catch(() => undefined)
      .then(() => savePlaylistsData(serialized))
      .then(() => playlistPersistenceError.set(null))
      .catch((error: unknown) => {
        playlistPersistenceError.set(
          `Sauvegarde des playlists impossible : ${errorText(error)}`,
        );
      });
  }, SAVE_DEBOUNCE_MS);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMediaItem(value: unknown): value is MediaItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.path === "string" &&
    value.path.length > 0 &&
    typeof value.name === "string" &&
    (value.kind === "video" || value.kind === "audio") &&
    typeof value.extension === "string" &&
    typeof value.size === "number" &&
    Number.isFinite(value.size) &&
    value.size >= 0 &&
    (value.duration === undefined ||
      (typeof value.duration === "number" &&
        Number.isFinite(value.duration) &&
        value.duration >= 0))
  );
}

function isPlaylist(value: unknown): value is Playlist {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.items) &&
    value.items.every(isMediaItem) &&
    new Set(value.items.map((item) => item.id)).size === value.items.length
  );
}

function isStoredState(value: unknown): value is StoredState {
  if (!isRecord(value)) return false;
  if (
    value.version !== 1 ||
    typeof value.activePlaylistId !== "string" ||
    !Array.isArray(value.playlists) ||
    value.playlists.length === 0 ||
    !value.playlists.every(isPlaylist)
  ) {
    return false;
  }

  const ids = value.playlists.map((playlist) => playlist.id);
  return new Set(ids).size === ids.length;
}

export function initPlaylistStore(): Promise<void> {
  if (initialization !== null) return initialization;

  initialization = (async () => {
    try {
      const raw = await loadPlaylistsData();
      if (raw === null) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (error: unknown) {
        throw new Error(`Le fichier playlists.json est illisible : ${errorText(error)}`);
      }

      if (!isStoredState(parsed)) {
        throw new Error("Le fichier playlists.json ne contient pas un état valide.");
      }

      playlists.set(parsed.playlists);
      activePlaylistId.set(
        parsed.playlists.some((playlist) => playlist.id === parsed.activePlaylistId)
          ? parsed.activePlaylistId
          : parsed.playlists[0].id,
      );
    } catch (error: unknown) {
      playlistPersistenceError.set(
        `Chargement des playlists impossible : ${errorText(error)}`,
      );
    } finally {
      playlistStoreReady.set(true);
    }
  })();

  return initialization;
}

function updateActivePlaylist(mutate: (playlist: Playlist) => boolean): void {
  const selectedId = get(activePlaylistId);
  let changed = false;

  playlists.update((all) =>
    all.map((playlist) => {
      if (playlist.id !== selectedId) return playlist;
      const draft: Playlist = { ...playlist, items: [...playlist.items] };
      if (!mutate(draft)) return playlist;
      draft.updatedAt = new Date().toISOString();
      changed = true;
      return draft;
    }),
  );

  if (changed) scheduleSave();
}

export function addToPlaylist(item: MediaItem): void {
  updateActivePlaylist((playlist) => {
    playlist.items.push(item);
    return true;
  });
}

export function addManyToPlaylist(items: MediaItem[]): void {
  if (items.length === 0) return;
  updateActivePlaylist((playlist) => {
    playlist.items.push(...items);
    return true;
  });
}

export function removeFromPlaylist(itemId: string): void {
  updateActivePlaylist((playlist) => {
    if (!playlist.items.some((item) => item.id === itemId)) return false;
    playlist.items = playlist.items.filter((item) => item.id !== itemId);
    return true;
  });
}

export function clearPlaylist(): void {
  updateActivePlaylist((playlist) => {
    if (playlist.items.length === 0) return false;
    playlist.items = [];
    return true;
  });
}

export function moveItem(itemId: string, delta: -1 | 1): void {
  updateActivePlaylist((playlist) => {
    const from = playlist.items.findIndex((item) => item.id === itemId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= playlist.items.length) return false;

    const [moved] = playlist.items.splice(from, 1);
    playlist.items.splice(to, 0, moved);
    return true;
  });
}

export function moveItemBefore(fromId: string, toId: string): void {
  if (fromId === toId) return;

  updateActivePlaylist((playlist) => {
    const from = playlist.items.findIndex((item) => item.id === fromId);
    if (from < 0 || !playlist.items.some((item) => item.id === toId)) return false;

    const [moved] = playlist.items.splice(from, 1);
    const insertAt = playlist.items.findIndex((item) => item.id === toId);
    playlist.items.splice(insertAt, 0, moved);
    return true;
  });
}

export function createPlaylist(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;

  const playlist = makePlaylist(trimmed);
  playlists.update((all) => [...all, playlist]);
  activePlaylistId.set(playlist.id);
  scheduleSave();
}

export function renamePlaylist(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;

  let changed = false;
  playlists.update((all) =>
    all.map((playlist) => {
      if (playlist.id !== id || playlist.name === trimmed) return playlist;
      changed = true;
      return { ...playlist, name: trimmed, updatedAt: new Date().toISOString() };
    }),
  );
  if (changed) scheduleSave();
}

export function deletePlaylist(id: string): void {
  const currentPlaylists = get(playlists);
  if (!currentPlaylists.some((playlist) => playlist.id === id)) return;

  const remaining = currentPlaylists.filter((playlist) => playlist.id !== id);
  if (remaining.length === 0) remaining.push(makePlaylist(DEFAULT_PLAYLIST_NAME));

  playlists.set(remaining);
  if (get(activePlaylistId) === id) activePlaylistId.set(remaining[0].id);
  scheduleSave();
}

export function setActivePlaylist(id: string): void {
  if (get(activePlaylistId) === id || !get(playlists).some((playlist) => playlist.id === id)) {
    return;
  }

  activePlaylistId.set(id);
  scheduleSave();
}
