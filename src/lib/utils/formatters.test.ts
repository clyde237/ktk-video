import { describe, expect, it } from "vitest";
import { formatDuration, formatFileSize } from "./formatters";

describe("formatDuration", () => {
  it("formate les valeurs inférieures à une minute au format m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(45)).toBe("0:45");
    expect(formatDuration(59)).toBe("0:59");
  });

  it("formate les minutes et secondes au format m:ss", () => {
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(599)).toBe("9:59");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("formate les durées supérieures à une heure au format h:mm:ss", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3665)).toBe("1:01:05");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(7322)).toBe("2:02:02");
  });

  it("gère les cas limites (négatif, NaN, infini)", () => {
    expect(formatDuration(-10)).toBe("0:00");
    expect(formatDuration(Number.NaN)).toBe("0:00");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("0:00");
    expect(formatDuration(Number.NEGATIVE_INFINITY)).toBe("0:00");
  });
});

describe("formatFileSize", () => {
  it("formate 0 octets ou valeurs négatives", () => {
    expect(formatFileSize(0)).toBe("0 o");
    expect(formatFileSize(-100)).toBe("0 o");
    expect(formatFileSize(Number.NaN)).toBe("0 o");
  });

  it("formate les octets sans décimale", () => {
    expect(formatFileSize(512)).toBe("512 o");
    expect(formatFileSize(1023)).toBe("1023 o");
  });

  it("formate les Ko, Mo, Go avec un chiffre après la virgule", () => {
    expect(formatFileSize(1024)).toBe("1 Ko");
    expect(formatFileSize(1536)).toMatch(/^1[,.]5 Ko$/);
    expect(formatFileSize(1024 * 1024 * 711.1)).toMatch(/^711[,.]1 Mo$/);
    expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toMatch(/^2[,.]5 Go$/);
  });
});
