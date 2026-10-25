import { writable } from "svelte/store";
import {
  extractEmbeddedSubtitle,
  findSubtitles,
  readSubtitleFile,
} from "$lib/api/subtitles";
import { buildVtt, parseSrt } from "$lib/subtitles/srt";

export interface ActiveSubtitle {
  label: string;
  url: string;
  source: string | null;
}

export const activeSubtitle = writable<ActiveSubtitle | null>(null);
export const subtitleCandidates = writable<string[]>([]);
export const subtitlesNotice = writable<string | null>(null);

let currentUrl: string | null = null;

export function applySubtitleText(
  label: string,
  srtText: string,
  source: string | null = null,
): boolean {
  const cues = parseSrt(srtText);
  if (cues.length === 0) {
    subtitlesNotice.set("Ce fichier .srt ne contient aucun sous-titre valide.");
    return false;
  }

  const blob = new Blob([buildVtt(cues)], { type: "text/vtt" });
  const url = URL.createObjectURL(blob);
  if (currentUrl !== null) URL.revokeObjectURL(currentUrl);
  currentUrl = url;

  activeSubtitle.set({ label, url, source });
  subtitlesNotice.set(null);
  return true;
}

export function clearSubtitle(): void {
  if (currentUrl !== null) URL.revokeObjectURL(currentUrl);
  currentUrl = null;
  activeSubtitle.set(null);
  subtitlesNotice.set(null);
}

export function resetSubtitles(): void {
  clearSubtitle();
  subtitleCandidates.set([]);
}

export async function detectSubtitles(videoPath: string): Promise<void> {
  try {
    const candidates = await findSubtitles(videoPath);
    subtitleCandidates.set(candidates);
    if (candidates.length === 0) return;

    const videoName = videoPath.split(/[\\/]/).pop() ?? videoPath;
    const videoStem = videoName.replace(/\.[^.]+$/, "").toLowerCase();

    const exact = candidates.find((candidate) => {
      const srtName = candidate.split(/[\\/]/).pop() ?? candidate;
      return srtName.replace(/\.srt$/i, "").toLowerCase() === videoStem;
    });

    if (exact) await loadSubtitleFile(exact);
  } catch {
    subtitleCandidates.set([]);
  }
}

export async function loadSubtitleFile(path: string): Promise<void> {
  const name = path.split(/[\\/]/).pop() ?? "Sous-titres";
  const label = name.replace(/\.srt$/i, "");

  try {
    const text = await readSubtitleFile(path);
    applySubtitleText(label, text, path);
  } catch (error) {
    subtitlesNotice.set(error instanceof Error ? error.message : String(error));
  }
}

export async function loadEmbeddedSubtitle(videoPath: string): Promise<void> {
  subtitlesNotice.set("Extraction de la piste embarquée…");

  try {
    const srtPath = await extractEmbeddedSubtitle(videoPath);
    const text = await readSubtitleFile(srtPath);
    if (!applySubtitleText("Piste embarquée", text, "embedded")) {
      subtitlesNotice.set("Piste embarquée trouvée, mais illisible.");
    }
  } catch (error) {
    subtitlesNotice.set(
      error instanceof Error && error.message
        ? error.message
        : "Aucune piste de sous-titres texte dans ce fichier.",
    );
  }
}
