/**
 * Lecture du format SubRip (.srt) et conversion en WebVTT (.vtt).
 * Fonctions PURES : aucune dépendance, aucun état — faciles à tester.
 */

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

const TIMESTAMP = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;

function toSeconds(hours: number, minutes: number, seconds: number, millis: number): number {
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

export function parseSrt(content: string): SubtitleCue[] {
  const normalized = content.replace(/^\ufeff/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const cues: SubtitleCue[] = [];

  for (const block of normalized.split(/\n{2,}/)) {
    const lines = block.split("\n").filter((line) => line.trim() !== "");
    const stampIndex = lines.findIndex((line) => TIMESTAMP.test(line));
    if (stampIndex === -1) continue;

    const match = lines[stampIndex].match(TIMESTAMP);
    if (!match) continue;

    const start = toSeconds(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      Number(match[4]),
    );
    const end = toSeconds(
      Number(match[5]),
      Number(match[6]),
      Number(match[7]),
      Number(match[8]),
    );
    const text = lines.slice(stampIndex + 1).join("\n");

    if (text === "" || end <= start) continue;

    cues.push({ start, end, text });
  }

  return cues;
}

export function buildVtt(cues: SubtitleCue[]): string {
  function stamp(totalSeconds: number): string {
    const totalMillis = Math.round(totalSeconds * 1000);
    const millis = String(totalMillis % 1000).padStart(3, "0");
    const total = Math.floor(totalMillis / 1000);
    const hours = String(Math.floor(total / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const seconds = String(total % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}.${millis}`;
  }

  const blocks = cues.map(
    (cue, index) => `${index + 1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}`,
  );

  return `WEBVTT\n\n${blocks.join("\n\n")}\n`;
}
