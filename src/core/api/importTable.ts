import { API_URL, ApiError } from "@/core/api/client";
import { getAccessToken } from "@/core/auth/tokens";

/** Envoie un fichier XLSX au backend (openpyxl) pour en extraire les lignes
 * de cellules texte — miroir en lecture de `exportTable` (P1-7, audit module
 * Stations 2026-09-16 : import de calibration limité au CSV). Upload
 * multipart direct (pas d'`apiFetch`/`apiFetchBlob` : ni JSON ni binaire en
 * sortie de requête, un `FormData` avec Content-Type auto-défini par le
 * navigateur). */
export async function parseXlsxFile(file: File, organizationId: string): Promise<string[][]> {
  const formData = new FormData();
  formData.append("file", file);
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-Organization-Id", organizationId);

  const response = await fetch(`${API_URL}/api/v1/import/xlsx`, { method: "POST", headers, body: formData });
  if (!response.ok) {
    let message = `Erreur ${response.status}`;
    try {
      const body = await response.json();
      if (body?.detail) message = body.detail;
    } catch {
      // corps non-JSON — message générique conservé
    }
    throw new ApiError(response.status, "import_error", message);
  }
  const body = (await response.json()) as { rows: string[][] };
  return body.rows;
}
