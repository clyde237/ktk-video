/**
 * Types partagés du projet ktk-video.
 * Ils décrivent un média (vidéo ou audio) et une playlist.
 */

/** Nature d'un média. */
export type MediaKind = "video" | "audio";

/** Un élément média (fichier vidéo ou audio) de la bibliothèque. */
export interface MediaItem {
  id: string;
  /** Chemin absolu du fichier sur le disque. */
  path: string;
  /** Nom du fichier sans extension (affiché dans l'interface). */
  name: string;
  /** Vidéo ou audio. */
  kind: MediaKind;
  /** Extension en minuscules, sans point (ex. : "mp4"). */
  extension: string;
  /** Taille du fichier en octets. */
  size: number;
  /** Durée en secondes — renseignée à la lecture (Phase 2). */
  duration?: number;
}

/** Une playlist : une liste ordonnée de médias. */
export interface Playlist {
  id: string;
  name: string;
  items: MediaItem[];
  /** Dates au format ISO 8601 (ex. : "2026-10-25T14:30:00.000Z"). */
  createdAt: string;
  updatedAt: string;
}

/** Mode de lecture d'une playlist. */
export type PlaybackMode = "normal" | "shuffle" | "repeat-one" | "repeat-all";