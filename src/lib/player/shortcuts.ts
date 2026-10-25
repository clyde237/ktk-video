import { getCurrentWindow } from "@tauri-apps/api/window";
import { get } from "svelte/store";
import { changeVolumeBy, playNext, playPrevious, seekBy, seekTo, stop, toggleMute, togglePlay } from "$lib/player/controller";
import { duration, playbackError } from "$lib/stores/player";

const SEEK_STEP = 10;
const VOLUME_STEP = 0.05;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true;
  if (target.isContentEditable || target.closest("[contenteditable='true']")) return true;

  return ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
}

function isOnButton(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("button") !== null;
}

function reportShortcutError(action: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  playbackError.set(`${action} : ${message}`);
}

async function toggleFullscreen(): Promise<void> {
  try {
    const window = getCurrentWindow();
    await window.setFullscreen(!(await window.isFullscreen()));
  } catch (error: unknown) {
    reportShortcutError("Impossible de changer le mode plein écran", error);
  }
}

async function exitFullscreen(): Promise<void> {
  try {
    await getCurrentWindow().setFullscreen(false);
  } catch (error: unknown) {
    reportShortcutError("Impossible de quitter le mode plein écran", error);
  }
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
  if (isTypingTarget(event.target)) return;

  switch (event.key) {
    case " ":
    case "k":
    case "K":
      if (event.key === " " && isOnButton(event.target)) return;
      event.preventDefault();
      void togglePlay();
      break;
    case "ArrowRight":
      event.preventDefault();
      seekBy(SEEK_STEP);
      break;
    case "ArrowLeft":
      event.preventDefault();
      seekBy(-SEEK_STEP);
      break;
    case "ArrowUp":
      event.preventDefault();
      changeVolumeBy(VOLUME_STEP);
      break;
    case "ArrowDown":
      event.preventDefault();
      changeVolumeBy(-VOLUME_STEP);
      break;
    case "m":
    case "M":
      toggleMute();
      break;
    case "f":
    case "F":
      void toggleFullscreen();
      break;
    case "Escape":
      void exitFullscreen();
      break;
    case "n":
    case "N":
      playNext();
      break;
    case "p":
    case "P":
      playPrevious();
      break;
    case "s":
    case "S":
      stop();
      break;
    default:
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        seekTo((Number(event.key) / 10) * get(duration));
      }
  }
}

export function installKeyboardShortcuts(): () => void {
  const controller = new AbortController();
  window.addEventListener("keydown", handleKeyDown, { signal: controller.signal });
  return () => controller.abort();
}
