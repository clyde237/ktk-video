import { beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import type { MediaItem } from "$lib/types/media";

vi.mock("$lib/api/storage", () => ({
  savePlaylistsData: vi.fn().mockResolvedValue(undefined),
  loadPlaylistsData: vi.fn().mockResolvedValue(null),
}));

import {
  activePlaylist,
  activePlaylistId,
  addManyToPlaylist,
  addToPlaylist,
  clearPlaylist,
  createPlaylist,
  deletePlaylist,
  moveItem,
  moveItemBefore,
  playlists,
  removeFromPlaylist,
  renamePlaylist,
  setActivePlaylist,
} from "./playlist";

function mockMedia(id: string, name: string, path: string): MediaItem {
  return {
    id,
    name,
    path,
    kind: "video",
    extension: "mp4",
    size: 1024 * 1024,
  };
}

describe("store playlist", () => {
  beforeEach(() => {
    // Réinitialise l'état des playlists avec une seule playlist vide
    playlists.set([
      {
        id: "default-test-id",
        name: "Test Playlist",
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    activePlaylistId.set("default-test-id");
  });

  it("ajoute un élément avec addToPlaylist", () => {
    const item = mockMedia("1", "Video 1", "/path/1.mp4");
    addToPlaylist(item);

    const current = get(activePlaylist);
    expect(current.items).toHaveLength(1);
    expect(current.items[0]).toEqual(item);
  });

  it("ajoute plusieurs éléments et ignore les doublons (addManyToPlaylist)", () => {
    const item1 = mockMedia("1", "Video 1", "/path/1.mp4");
    const item2 = mockMedia("2", "Video 2", "/path/2.mp4");
    const duplicate = mockMedia("3", "Video 1 bis", "/path/1.mp4");

    const result = addManyToPlaylist([item1, item2, duplicate]);
    expect(result.added).toBe(2);
    expect(result.skipped).toBe(1);

    const current = get(activePlaylist);
    expect(current.items).toHaveLength(2);
    expect(current.items.map((i) => i.path)).toEqual(["/path/1.mp4", "/path/2.mp4"]);
  });

  it("supprime un élément de la playlist active", () => {
    const item1 = mockMedia("1", "Video 1", "/path/1.mp4");
    const item2 = mockMedia("2", "Video 2", "/path/2.mp4");
    addManyToPlaylist([item1, item2]);

    removeFromPlaylist("1");

    const current = get(activePlaylist);
    expect(current.items).toHaveLength(1);
    expect(current.items[0].id).toBe("2");
  });

  it("vide la playlist avec clearPlaylist", () => {
    addManyToPlaylist([
      mockMedia("1", "V1", "/path/1.mp4"),
      mockMedia("2", "V2", "/path/2.mp4"),
    ]);

    clearPlaylist();
    expect(get(activePlaylist).items).toHaveLength(0);
  });

  it("réordonne les éléments avec moveItem", () => {
    const item1 = mockMedia("1", "V1", "/path/1.mp4");
    const item2 = mockMedia("2", "V2", "/path/2.mp4");
    const item3 = mockMedia("3", "V3", "/path/3.mp4");
    addManyToPlaylist([item1, item2, item3]);

    // Déplace le premier élément vers le bas
    moveItem("1", 1);
    expect(get(activePlaylist).items.map((i) => i.id)).toEqual(["2", "1", "3"]);

    // Déplace le dernier élément vers le bas (hors limites, ne bouge pas)
    moveItem("3", 1);
    expect(get(activePlaylist).items.map((i) => i.id)).toEqual(["2", "1", "3"]);

    // Déplace le deuxième vers le haut
    moveItem("1", -1);
    expect(get(activePlaylist).items.map((i) => i.id)).toEqual(["1", "2", "3"]);
  });

  it("réordonne avec moveItemBefore (glisser-déposer)", () => {
    const item1 = mockMedia("1", "V1", "/path/1.mp4");
    const item2 = mockMedia("2", "V2", "/path/2.mp4");
    const item3 = mockMedia("3", "V3", "/path/3.mp4");
    addManyToPlaylist([item1, item2, item3]);

    // Déplace V3 avant V1
    moveItemBefore("3", "1");
    expect(get(activePlaylist).items.map((i) => i.id)).toEqual(["3", "1", "2"]);
  });

  it("crée, sélectionne, renomme et supprime des playlists", () => {
    createPlaylist("Nouvelle Playlist");

    const allPlaylists = get(playlists);
    expect(allPlaylists).toHaveLength(2);
    expect(get(activePlaylist).name).toBe("Nouvelle Playlist");

    const newId = get(activePlaylistId);
    renamePlaylist(newId, "Playlist Renommée");
    expect(get(activePlaylist).name).toBe("Playlist Renommée");

    // Rebascule sur la première
    setActivePlaylist("default-test-id");
    expect(get(activePlaylist).name).toBe("Test Playlist");

    // Supprime la nouvelle playlist
    deletePlaylist(newId);
    expect(get(playlists)).toHaveLength(1);
    expect(get(playlists)[0].id).toBe("default-test-id");
  });
});
