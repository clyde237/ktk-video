import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { MediaItem, MediaKind } from "$lib/types/media";
import { AUDIO_EXTENSIONS, VIDEO_EXTENSIONS } from "$lib/utils/media";

interface MediaFileInfo {
  path: string;
  name: string;
  kind: MediaKind;
  extension: string;
  size: number;
}

const MEDIA_FILTERS = [
  {
    name: "Médias (vidéo et audio)",
    extensions: [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS],
  },
];

function toMediaItem(info: MediaFileInfo): MediaItem {
  return {
    id: crypto.randomUUID(),
    path: info.path,
    name: info.name,
    kind: info.kind,
    extension: info.extension,
    size: info.size,
  };
}

export async function openMediaFile(): Promise<MediaItem | null> {
  const selection = await open({
    multiple: false,
    title: "Ouvrir un média",
    filters: MEDIA_FILTERS,
  });

  if (typeof selection !== "string") return null;

  const info = await invoke<MediaFileInfo>("load_media_file", { path: selection });
  return toMediaItem(info);
}

export async function openMediaFolder(): Promise<MediaItem[] | null> {
  const selection = await open({
    multiple: false,
    directory: true,
    title: "Importer un dossier de médias",
  });

  if (typeof selection !== "string") return null;

  const infos = await invoke<MediaFileInfo[]>("load_media_folder", { path: selection });
  return infos.map(toMediaItem);
}

export async function remuxMedia(path: string): Promise<string> {
  return invoke<string>("remux_media", { path });
}

export async function transcodeMedia(path: string): Promise<string> {
  return invoke<string>("transcode_media", { path });
}
