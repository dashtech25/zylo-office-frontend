import { API_URL, apiFetch } from "@/core/api/client";

/** Client du service de stockage générique Zylo Office (`app/shared/storage.py`
 * côté backend — filesystem local en dev, S3/MinIO en prod selon
 * `STORAGE_BACKEND`) — réutilisable par tout module, jamais un stockage
 * propre à un module. Un module métier (ex. zylo_liquid `Document`) upload
 * d'abord ici pour obtenir une `storageReference` opaque, puis enregistre
 * cette référence dans ses propres métadonnées ; il ne stocke jamais
 * d'octets lui-même. */
export interface UploadedFile {
  storageReference: string;
  thumbnailReference: string | null;
  fileName: string;
  mimeType: string | null;
}

export function uploadFile(organizationId: string, file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<UploadedFile>("/storage/upload", { method: "POST", organizationId, body: formData });
}

/** Le backend local renvoie un chemin relatif signé (`/api/v1/storage/local/...`),
 * le backend S3/MinIO une URL déjà absolue — normalisé ici pour que
 * l'appelant n'ait jamais à connaître le backend actif. */
export function resolveStorageUrl(url: string): string {
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}
