/**
 * Fonctions de formatage pour l'affichage (durées, tailles de fichiers).
 * Pures et sans dépendance : testables très facilement (Phase 4).
 */

/** Formate des secondes en "m:ss" ou "h:mm:ss" (ex. : 3725 → "1:02:05"). */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";

  const total = Math.floor(totalSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const twoDigits = (value: number) => String(value).padStart(2, "0");

  return hours > 0
    ? `${hours}:${twoDigits(minutes)}:${twoDigits(seconds)}`
    : `${minutes}:${twoDigits(seconds)}`;
}

/** Formate des octets en unité lisible (ex. : 745654836 → "711,1 Mo"). */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 o";

  const units = ["o", "Ko", "Mo", "Go", "To"];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / 1024 ** exponent;

  const formatted = exponent === 0
    ? Math.round(value).toString()
    : value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

  return `${formatted} ${units[exponent]}`;
}
