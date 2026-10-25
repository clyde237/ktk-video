import { describe, expect, it } from "vitest";
import { buildVtt, parseSrt, type SubtitleCue } from "./srt";

describe("parseSrt", () => {
  it("analyse correctement un bloc SRT standard", () => {
    const srt = `1
00:00:01,500 --> 00:00:04,000
Bonjour le monde !`;

    const cues = parseSrt(srt);
    expect(cues).toHaveLength(1);
    expect(cues[0]).toEqual({
      start: 1.5,
      end: 4.0,
      text: "Bonjour le monde !",
    });
  });

  it("gère les sous-titres multi-lignes", () => {
    const srt = `1
00:01:02,000 --> 00:01:05,250
Première ligne
Deuxième ligne
Troisième ligne`;

    const cues = parseSrt(srt);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("Première ligne\nDeuxième ligne\nTroisième ligne");
    expect(cues[0].start).toBe(62);
    expect(cues[0].end).toBe(65.25);
  });

  it("neutralise le BOM UTF-8 et les retours chariot Windows CRLF", () => {
    const srt = "\ufeff1\r\n00:00:02,000 --> 00:00:05,000\r\nTexte sans BOM\r\n";

    const cues = parseSrt(srt);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("Texte sans BOM");
    expect(cues[0].start).toBe(2);
    expect(cues[0].end).toBe(5);
  });

  it("accepte les points au lieu des virgules dans l'horodatage", () => {
    const srt = `1
00:00:10.125 --> 00:00:15.500
Horodatage avec point`;

    const cues = parseSrt(srt);
    expect(cues).toHaveLength(1);
    expect(cues[0].start).toBe(10.125);
    expect(cues[0].end).toBe(15.5);
  });

  it("gère l'absence de ligne d'index numérique", () => {
    const srt = `00:00:03,000 --> 00:00:07,000
Sous-titre sans numéro d'index`;

    const cues = parseSrt(srt);
    expect(cues).toHaveLength(1);
    expect(cues[0].start).toBe(3);
    expect(cues[0].end).toBe(7);
  });

  it("ignore les blocs invalides sans casser les blocs valides", () => {
    const srt = `1
00:00:01,000 --> 00:00:03,000
Premier sous-titre

Bloc corrompu sans horodatage

2
00:00:05,000 --> 00:00:02,000
Incohérent (end avant start)

3
00:00:08,000 --> 00:00:10,000
Deuxième sous-titre valide

4
00:00:12,000 --> 00:00:14,000
`;

    const cues = parseSrt(srt);
    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe("Premier sous-titre");
    expect(cues[1].text).toBe("Deuxième sous-titre valide");
  });

  it("retourne une liste vide pour un texte vide ou corrompu", () => {
    expect(parseSrt("")).toEqual([]);
    expect(parseSrt("Texte quelconque sans aucun horodatage valide.")).toEqual([]);
  });
});

describe("buildVtt", () => {
  it("produit un document WebVTT conforme avec points et en-tête WEBVTT", () => {
    const cues: SubtitleCue[] = [
      { start: 1.5, end: 4.025, text: "Ligne A" },
      { start: 62.005, end: 3661.12, text: "Ligne B\nLigne C" },
    ];

    const vtt = buildVtt(cues);
    expect(vtt).toContain("WEBVTT\n\n");
    expect(vtt).toContain("1\n00:00:01.500 --> 00:00:04.025\nLigne A");
    expect(vtt).toContain("2\n00:01:02.005 --> 01:01:01.120\nLigne B\nLigne C");
  });

  it("gère correctement le padding des millisecondes et des heures", () => {
    const cues: SubtitleCue[] = [
      { start: 0.007, end: 5.07, text: "Padding test" },
    ];

    const vtt = buildVtt(cues);
    expect(vtt).toContain("00:00:00.007 --> 00:00:05.070\nPadding test");
  });

  it("retourne l'en-tête WEBVTT pour une liste de cues vide", () => {
    expect(buildVtt([])).toBe("WEBVTT\n\n\n");
  });
});
