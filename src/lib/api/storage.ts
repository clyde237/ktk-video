import { invoke } from "@tauri-apps/api/core";

export function savePlaylistsData(data: string): Promise<void> {
  return invoke("save_playlists", { data });
}

export function loadPlaylistsData(): Promise<string | null> {
  return invoke("load_playlists");
}
