// Ré-export depuis l'emplacement partagé (P2 §5.5, audit module Stations
// 2026-09-16 — factorisé pour être réutilisé aussi par le composant Select
// générique, qui ne peut pas dépendre d'un module métier). Ne pas dupliquer
// l'implémentation ici.
export { normalizeSearchText } from "@/shared/lib/normalizeSearchText";
