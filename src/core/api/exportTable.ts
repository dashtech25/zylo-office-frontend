import { apiFetchBlob } from "@/core/api/client";

export type ExportTableFormat = "xlsx" | "docx";

/** Génère un fichier XLSX ou DOCX à partir d'un tableau déjà construit côté
 * client (en-têtes + lignes) et déclenche son téléchargement — même
 * fonction pour n'importe quel écran de liste de l'app (P1-3, audit module
 * Stations 2026-09-16 : l'export était limité au CSV). Le CSV, lui, reste
 * généré entièrement côté client (`downloadCsv`), inchangé — seuls XLSX et
 * DOCX nécessitent un rendu serveur. */
export async function exportTable(
  format: ExportTableFormat,
  filename: string,
  headers: string[],
  rows: string[][],
  organizationId: string
): Promise<void> {
  const blob = await apiFetchBlob(`/export/${format}`, {
    method: "POST",
    organizationId,
    body: JSON.stringify({ filename, headers, rows }),
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}
