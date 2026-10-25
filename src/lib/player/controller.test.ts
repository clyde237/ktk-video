import { beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import type { MediaItem } from "$lib/types/media";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://localhost/${path}`,
}));

vi.mock("$lib/api/media", () => ({
  remuxMedia: vi.fn(),
  transcodeMedia: vi.fn(),
}));

import {
  changePlaybackRate,
  changeVolume,
  changeVolumeBy,
  detachMediaElement,
  playNext,
  playPrevious,
  seekBy,
  seekTo,
  toggleMute,
} from "./controller";
import {
  currentMedia,
  isMuted,
  loadMedia,
  playbackRate,
  position,
  volume,
} from "$lib/stores/player";
import { activePlaylistId, playlists } from "$lib/stores/playlist";

function mockMedia(id: string, name: string): MediaItem {
  return {
    id,
    name,
    path: `/videos/${name}`,
    kind: "video",
    extension: "mp4",
    size: 1024,
    duration: 100,
  };
}

describe("player controller", () => {
  beforeEach(() => {
    detachMediaElement();
    position.set(0);
    volume.set(1);
    isMuted.set(false);
    playbackRate.set(1);
  });

  describe("contrôles de volume", () => {
    it("modifie le volume et le borne entre 0 et 1", () => {
      changeVolume(0.5);
      expect(get(volume)).toBe(0.5);

      changeVolume(1.5);
      expect(get(volume)).toBe(1);

      changeVolume(-0.5);
      expect(get(volume)).toBe(0);
    });

    it("ajuste le volume avec changeVolumeBy", () => {
      changeVolume(0.5);
      changeVolumeBy(0.1);
      expect(get(volume)).toBeCloseTo(0.6);

      changeVolumeBy(-0.3);
      expect(get(volume)).toBeCloseTo(0.3);
    });

    it("bascule le mute avec toggleMute", () => {
      expect(get(isMuted)).toBe(false);
      toggleMute();
      expect(get(isMuted)).toBe(true);
      toggleMute();
      expect(get(isMuted)).toBe(false);
    });
  });

  describe("vitesse de lecture", () => {
    it("borne la vitesse entre 0.25x et 2x", () => {
      changePlaybackRate(1.5);
      expect(get(playbackRate)).toBe(1.5);

      changePlaybackRate(5.0);
      expect(get(playbackRate)).toBe(2);

      changePlaybackRate(0.1);
      expect(get(playbackRate)).toBe(0.25);
    });
  });

  describe("navigation dans la playlist", () => {
    it("passe au média suivant et précédent (playNext / playPrevious)", () => {
      const item1 = mockMedia("1", "V1.mp4");
      const item2 = mockMedia("2", "V2.mp4");
      const item3 = mockMedia("3", "V3.mp4");

      playlists.set([
        {
          id: "test-pl",
          name: "Test",
          items: [item1, item2, item3],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      activePlaylistId.set("test-pl");

      // Aucun média chargé
      expect(playNext()).toBe(false);
      expect(playPrevious()).toBe(false);

      // Charge item 1
      loadMedia(item1);
      expect(get(currentMedia)?.id).toBe("1");

      // Suivant -> item 2
      expect(playNext()).toBe(true);
      expect(get(currentMedia)?.id).toBe("2");

      // Suivant -> item 3
      expect(playNext()).toBe(true);
      expect(get(currentMedia)?.id).toBe("3");

      // Fin de playlist -> playNext retourne false
      expect(playNext()).toBe(false);
      expect(get(currentMedia)?.id).toBe("3");

      // Précédent -> item 2
      expect(playPrevious()).toBe(true);
      expect(get(currentMedia)?.id).toBe("2");

      // Précédent -> item 1
      expect(playPrevious()).toBe(true);
      expect(get(currentMedia)?.id).toBe("1");

      // Début de playlist -> playPrevious retourne false
      expect(playPrevious()).toBe(false);
      expect(get(currentMedia)?.id).toBe("1");
    });
  });
});
