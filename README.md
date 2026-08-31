# Zylo Office — Frontend

Socle frontend de Zylo Office (Next.js 15 / App Router). Cette première phase
construit uniquement le `core/` applicatif (authentification, client API,
routes protégées, shell de navigation) — aucune page de module métier n'est
encore implémentée. Voir `grande_phases.md` (racine du projet) pour
l'architecture complète.

## Stack

- **Next.js 15** (App Router, Turbopack), **React 19**, **TypeScript**
- **Tailwind CSS 4**
- Aucune librairie d'état globale ajoutée pour l'instant — `AuthContext`
  (React Context) suffit au périmètre du socle

## Démarrage local

Prérequis : le backend (`zylo-office-backend`) doit tourner sur le port 3007.

```bash
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3007
npm run dev
```

Le serveur écoute sur `http://localhost:3006`.

## Architecture

```text
src/
├── app/
│   ├── (auth)/login/     # pages publiques (non protégées)
│   └── (app)/            # zone authentifiée — layout.tsx applique ProtectedRoute + AppShell
├── core/
│   ├── api/client.ts     # seul point d'appel HTTP vers le backend — jamais de fetch() direct ailleurs
│   ├── auth/             # tokens, AuthContext, ProtectedRoute
│   └── layout/AppShell   # sidebar catégorisée (entrées actives / "À venir")
└── modules/              # dossiers de modules métier futurs — vide pour l'instant
```

Convention : tout appel réseau passe par `core/api/client.ts` (gestion
uniforme des erreurs `{error:{code,message,details}}` et du refresh
automatique du token sur 401). Toute page protégée vit sous `app/(app)/`, qui
applique déjà `ProtectedRoute` + `AppShell` — pas besoin de le refaire page
par page.

## Git

Stratégie : `main` → `develop` → `remy`. Chaque tâche = une issue + une
branche dédiée, fusionnée dans `remy` après vérification réelle dans le
navigateur (pas seulement une revue de code).
