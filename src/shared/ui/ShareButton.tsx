"use client";

import { Copy, Mail, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/shared/ui/Button";
import { DropdownMenu, DropdownMenuItem } from "@/shared/ui/DropdownMenu";

export interface ShareButtonProps {
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  label: string;
  copyLinkLabel: string;
  copiedLabel: string;
  emailLabel: string;
  whatsappLabel: string;
}

/** Partage générique d'un fichier déjà stocké (mission « bon de commande +
 * aperçu/partage », 2026-09-10). Priorité au sélecteur natif du système
 * (`navigator.share` avec le fichier réel, pas juste un lien — fonctionne
 * indépendamment de l'expiration de l'URL signée, 15 min) ; repli manuel
 * (copier le lien / mailto / wa.me) quand l'API n'est pas disponible ou
 * refuse les fichiers (Firefox desktop notamment).*/
export function ShareButton({ fileUrl, fileName, mimeType, label, copyLinkLabel, copiedLabel, emailLabel, whatsappLabel }: ShareButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node) || triggerRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  async function handleShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      setBusy(true);
      try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: mimeType ?? blob.type });
        const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
        if (nav.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: fileName });
          setBusy(false);
          return;
        }
      } catch {
        // Annulé par l'utilisateur ou fichier refusé — repli manuel ci-dessous.
      }
      setBusy(false);
    }
    setMenuOpen((v) => !v);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(fileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative inline-block">
      <Button ref={triggerRef} variant="outline" size="sm" onClick={handleShare} disabled={busy}>
        <Share2 className="size-4" aria-hidden />
        {label}
      </Button>
      <DropdownMenu open={menuOpen} menuRef={menuRef}>
        <DropdownMenuItem onClick={handleCopyLink}>
          <Copy className="mr-2 inline size-4" aria-hidden />
          {copied ? copiedLabel : copyLinkLabel}
        </DropdownMenuItem>
        <a
          href={`mailto:?subject=${encodeURIComponent(fileName)}&body=${encodeURIComponent(fileUrl)}`}
          className="flex w-full items-center rounded-button px-3 py-2 text-left text-body-sm text-text transition-colors hover:bg-surface-muted"
        >
          <Mail className="mr-2 inline size-4" aria-hidden />
          {emailLabel}
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(fileUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center rounded-button px-3 py-2 text-left text-body-sm text-text transition-colors hover:bg-surface-muted"
        >
          {whatsappLabel}
        </a>
      </DropdownMenu>
    </div>
  );
}
