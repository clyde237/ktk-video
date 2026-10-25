import { beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

// Mock des API Tauri
vi.mock("$lib/api/subtitles", () => ({
  findSubtitles: vi.fn(),
  extractEmbeddedSubtitle: vi.fn(),
  readSubtitleFile: vi.fn(),
}));

// Polyfill minimal de URL.createObjectURL / revokeObjectURL si non présents dans l'env
if (typeof URL.createObjectURL !== "function") {
  let objectUrlCounter = 0;
  URL.createObjectURL = vi.fn(() => `blob:mock-url-${++objectUrlCounter}`);
  URL.revokeObjectURL = vi.fn();
}

import {
  activeSubtitle,
  applySubtitleText,
  clearSubtitle,
  resetSubtitles,
  subtitleCandidates,
  subtitlesNotice,
} from "./subtitles";

describe("store subtitles", () => {
  beforeEach(() => {
    resetSubtitles();
  });

  it("applique des sous-titres valides via applySubtitleText", () => {
    const srt = `1
00:00:01,000 --> 00:00:03,000
Bonjour !`;

    const success = applySubtitleText("Français", srt, "/path/film.fr.srt");
    expect(success).toBe(true);

    const active = get(activeSubtitle);
    expect(active).not.toBeNull();
    expect(active?.label).toBe("Français");
    expect(active?.source).toBe("/path/film.fr.srt");
    expect(active?.url).toBeDefined();
    expect(get(subtitlesNotice)).toBeNull();
  });

  it("refuse un contenu sans sous-titre valide et informe l'utilisateur", () => {
    const garbage = "Pas de sous-titres ici !";
    const success = applySubtitleText("Corrompu", garbage);
    expect(success).toBe(false);

    expect(get(activeSubtitle)).toBeNull();
    expect(get(subtitlesNotice)).toBe("Ce fichier .srt ne contient aucun sous-titre valide.");
  });

  it("désactive et nettoie l'URL Blob avec clearSubtitle", () => {
    const srt = `1
00:00:01,000 --> 00:00:03,000
Texte`;
    applySubtitleText("Test", srt);
    expect(get(activeSubtitle)).not.toBeNull();

    clearSubtitle();
    expect(get(activeSubtitle)).toBeNull();
    expect(get(subtitlesNotice)).toBeNull();
  });

  it("remet tout à zéro avec resetSubtitles", () => {
    subtitleCandidates.set(["/path/1.srt", "/path/2.srt"]);
    applySubtitleText("Test", `1\n00:00:01,000 --> 00:00:03,000\nTexte`);

    resetSubtitles();
    expect(get(activeSubtitle)).toBeNull();
    expect(get(subtitleCandidates)).toHaveLength(0);
  });
});
