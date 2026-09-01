# Zylo Office — Frontend

Socle frontend de Zylo Office (Next.js 15 / App Router). Le `core/`
applicatif (authentification, client API, routes protégées, shell de
navigation) est complété par un **design system**, des **primitives UI**
génériques et une **i18n FR/EN native** — voir
`docs/frontend-foundations.md` pour le détail des décisions et leur
justification. Aucune page de module métier n'est encore implémentée. Voir
`grande_phases.md` (racine du projet) pour l'architecture complète.

## Stack

- **Next.js 15** (App Router, Turbopack), **React 19**, **TypeScript**
- **Tailwind CSS 4** — tokens de design centralisés dans `src/app/globals.css`
- **next-intl** — i18n FR/EN (résolution par cookie `NEXT_LOCALE`, pas de
  préfixe d'URL)
- **Radix UI** (Dialog/Tabs/Tooltip/Select) — accessibilité clavier des
  primitives interactives
- `class-variance-authority` + `clsx` + `tailwind-merge` — pattern de
  variantes des composants (`shared/ui/*`)
- `lucide-react` — iconographie
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
│       └── ui-preview/   # vitrine des primitives shared/ui (guide de style vivant)
├── core/
│   ├── api/client.ts     # seul point d'appel HTTP vers le backend — jamais de fetch() direct ailleurs
│   ├── auth/             # tokens, AuthContext, ProtectedRoute
│   └── layout/AppShell   # sidebar catégorisée (entrées actives / "À venir")
├── shared/
│   ├── ui/               # ~20 primitives génériques (Button, Input, Modal, Table...) — zéro connaissance métier
│   ├── lib/cn.ts          # helper clsx + tailwind-merge
│   └── i18n/              # config next-intl, request config, LocaleSwitcher
├── locales/{fr,en}/      # common.json, navigation.json, auth.json — un fichier par domaine
└── modules/              # dossiers de modules métier futurs — vide pour l'instant
```

Convention : tout appel réseau passe par `core/api/client.ts` (gestion
uniforme des erreurs `{error:{code,message,details}}` et du refresh
automatique du token sur 401). Toute page protégée vit sous `app/(app)/`, qui
applique déjà `ProtectedRoute` + `AppShell` — pas besoin de le refaire page
par page. Toute primitive UI vient de `shared/ui` — un composant qui connaît
le vocabulaire d'un module (statuts, entités) est un composant **métier** et
vit dans `modules/<domaine>/`, jamais dans `shared/ui`.

**Internationalisation** : aucun texte utilisateur en dur (règle stricte,
voir `docs/frontend-foundations.md` §6 pour l'unique exemption documentée).
Tout texte visible passe par `useTranslations()` (next-intl) et un fichier
`locales/{fr,en}/<namespace>.json`. Les composants `shared/ui` génériques ne
définissent aucun texte par défaut : les libellés sont toujours fournis par
le composant appelant.

## Git

Stratégie : `main` → `develop` → `remy`. Chaque tâche = une issue + une
branche dédiée, fusionnée dans `remy` après vérification réelle dans le
navigateur (pas seulement une revue de code).
