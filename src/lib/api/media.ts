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

export async function openMediaFile(): Promise<MediaItem | null> {
  const selection = await open({
    multiple: false,
    title: "Ouvrir un média",
    filters: [
      {
        name: "Médias (vidéo et audio)",
        extensions: [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS],
      },
    ],
  });

  if (typeof selection !== "string") return null;

  const info = await invoke<MediaFileInfo>("load_media_file", { path: selection });

  return {
    id: crypto.randomUUID(),
    path: info.path,
    name: info.name,
    kind: info.kind,
    extension: info.extension,
    size: info.size,
  };
}
