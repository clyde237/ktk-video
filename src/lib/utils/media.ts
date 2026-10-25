import type { MediaKind } from "$lib/types/media";

/**
 * Extensions visées par ktk-video. Cette liste sert à filtrer les
 * fichiers lors des imports. NB : la lecture réelle dépendra du
 * décodage mis en place en Phase 2 (côté navigateur webview et Rust).
 */
export const VIDEO_EXTENSIONS = [
  "mp4", "mkv", "webm", "avi", "mov", "m4v", "ogv", "mpg", "mpeg", "3gp", "ts",
] as const;

export const AUDIO_EXTENSIONS = [
  "mp3", "flac", "ogg", "oga", "wav", "m4a", "aac", "opus", "wma", "aiff",
] as const;

// Les Set sont plus rapides que les tableaux pour tester "est-ce que X est dedans ?"
const VIDEO_SET: ReadonlySet<string> = new Set(VIDEO_EXTENSIONS);
const AUDIO_SET: ReadonlySet<string> = new Set(AUDIO_EXTENSIONS);

/** Extrait l'extension d'un chemin, en minuscules, sans le point. */
export function getExtension(path: string): string {
  // On récupère le nom du fichier après le dernier / ou \ (Windows ET Linux/macOS)
  const fileName = path.split(/[\\/]/).pop() ?? path;
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "";
}

/** Vrai si le chemin pointe vers un fichier vidéo pris en charge. */
export function isVideoFile(path: string): boolean {
  return VIDEO_SET.has(getExtension(path));
}

/** Vrai si le chemin pointe vers un fichier audio pris en charge. */
export function isAudioFile(path: string): boolean {
  return AUDIO_SET.has(getExtension(path));
}

/** Retourne "video", "audio", ou null si l'extension n'est pas reconnue. */
export function getMediaKind(path: string): MediaKind | null {
  if (isVideoFile(path)) return "video";
  if (isAudioFile(path)) return "audio";
  return null;
}