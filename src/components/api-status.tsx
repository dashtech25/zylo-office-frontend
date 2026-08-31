"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "loading" | "online" | "offline";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3007";

export function ApiStatus() {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    fetch(`${API_URL}/api/v1/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(() => {
        if (!cancelled) setStatus("online");
      })
      .catch(() => {
        if (!cancelled) setStatus("offline");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const color =
    status === "online"
      ? "bg-emerald-500"
      : status === "offline"
        ? "bg-red-500"
        : "bg-amber-400";

  const label =
    status === "online"
      ? `Backend connecté (${API_URL})`
      : status === "offline"
        ? `Backend injoignable (${API_URL})`
        : "Vérification de la connexion…";

  return (
    <div className="flex items-center gap-2 rounded-full border border-black/[.08] dark:border-white/[.145] px-4 py-2 text-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}
