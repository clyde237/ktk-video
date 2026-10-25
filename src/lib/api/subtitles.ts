import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export function findSubtitles(videoPath: string): Promise<string[]> {
  return invoke("find_subtitles", { videoPath });
}

export function extractEmbeddedSubtitle(videoPath: string): Promise<string> {
  return invoke("extract_embedded_subtitle", { path: videoPath });
}

export function readSubtitleFile(path: string): Promise<string> {
  return invoke("read_text_file", { path });
}

export async function pickSubtitleFile(): Promise<string | null> {
  const selection = await open({
    multiple: false,
    title: "Choisir un fichier de sous-titres",
    filters: [{ name: "Sous-titres SubRip", extensions: ["srt"] }],
  });

  return typeof selection === "string" ? selection : null;
}
