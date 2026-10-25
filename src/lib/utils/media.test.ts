import { describe, expect, it } from "vitest";
import {
  AUDIO_EXTENSIONS,
  getExtension,
  getMediaKind,
  isAudioFile,
  isVideoFile,
  VIDEO_EXTENSIONS,
} from "./media";

describe("getExtension", () => {
  it("extrait l'extension d'un chemin Unix", () => {
    expect(getExtension("/home/user/videos/film.mkv")).toBe("mkv");
    expect(getExtension("/home/user/music/song.MP3")).toBe("mp3");
  });

  it("extrait l'extension d'un chemin Windows", () => {
    expect(getExtension("C:\\Users\\Video\\clip.mp4")).toBe("mp4");
  });

  it("gère les fichiers avec plusieurs points", () => {
    expect(getExtension("/path/to/archive.tar.gz")).toBe("gz");
    expect(getExtension("/path/to/my.video.final.webm")).toBe("webm");
  });

  it("gère les dossiers contenant des points", () => {
    expect(getExtension("/path/v1.0/video")).toBe("");
    expect(getExtension("/path/v1.0/video.avi")).toBe("avi");
  });

  it("retourne une chaîne vide en l'absence d'extension", () => {
    expect(getExtension("fichier_sans_extension")).toBe("");
  });
});

describe("isVideoFile et isAudioFile", () => {
  it("reconnaît toutes les extensions vidéo supportées", () => {
    for (const ext of VIDEO_EXTENSIONS) {
      expect(isVideoFile(`test.${ext}`)).toBe(true);
      expect(isAudioFile(`test.${ext}`)).toBe(false);
      expect(getMediaKind(`test.${ext}`)).toBe("video");
    }
  });

  it("reconnaît toutes les extensions audio supportées", () => {
    for (const ext of AUDIO_EXTENSIONS) {
      expect(isAudioFile(`test.${ext}`)).toBe(true);
      expect(isVideoFile(`test.${ext}`)).toBe(false);
      expect(getMediaKind(`test.${ext}`)).toBe("audio");
    }
  });

  it("rejette les fichiers non multimédia", () => {
    expect(isVideoFile("document.pdf")).toBe(false);
    expect(isAudioFile("document.pdf")).toBe(false);
    expect(getMediaKind("document.pdf")).toBeNull();
    expect(getMediaKind("script.sh")).toBeNull();
  });
});
