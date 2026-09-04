# Zylo Office — Frontend

Socle frontend de Zylo Office (Next.js 15 / App Router). Le `core/`
applicatif (authentification, client API, routes protégées, shell de
navigation) est complété par un **design system**, des **primitives UI**
génériques et une **i18n FR/EN native**. Un premier module métier complet
(`zylo-liquid`) est implémenté et sert de référence pour tout futur module
(CRM, Stock, Comptabilité, RH, POS).

> **⚠️ Avant toute modification de ce dépôt, lire `/CLAUDE.md`** (directive
> d'architecture — app = routing, modules = métier, shared = design system,
> core = fondation). C'est la règle qui prime. Détail des décisions et de
> leur justification historique : `docs/frontend-foundations.md`. Vision
> globale du produit : `grande_phases.md` (racine du projet `zylo-office/`).

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

Chaque dossier ci-dessous a son propre `CLAUDE.md` avec la règle précise à
respecter en y travaillant — cette section n'en est qu'un résumé.

```text
src/
├── app/
│   ├── (auth)/login/               # pages publiques (non protégées)
│   ├── (app)/                      # zone authentifiée — layout.tsx applique ProtectedRoute + AppShell
│   │   └── ui-preview/             # vitrine des primitives shared/ui (guide de style vivant)
│   └── zylo-liquid/**/page.tsx     # 1 ligne chacun : export { default } from "@/modules/zylo-liquid/screens/..."
├── core/
│   ├── api/client.ts               # seul point d'appel HTTP générique — jamais de fetch() direct ailleurs
│   ├── auth/, organization/        # tokens, AuthContext, ProtectedRoute, contexte d'organisation
│   └── layout/AppShell             # sidebar catégorisée (entrées actives / "À venir")
├── shared/
│   ├── ui/                         # ~25 primitives génériques (Button, Card, Badge, Modal, Table,
│   │                                # Tabs, FormField, PageHeader, Stack, DropdownMenu...) — zéro
│   │                                # connaissance métier, tout exporté depuis index.ts
│   ├── lib/cn.ts                    # helper clsx + tailwind-merge
│   └── i18n/                        # config next-intl, request config, LocaleSwitcher
├── locales/{fr,en}/                # un fichier json par domaine (common, navigation, auth, zyloLiquid...)
└── modules/
    └── zylo-liquid/                # premier module métier complet — patron pour les futurs modules
        ├── screens/<nom>/<Nom>Screen.tsx   # composition d'écran, cible de chaque app/**/page.tsx
        ├── components/              # composants métier utilisés par ≥ 2 écrans
        ├── services/zyloLiquidApi.ts       # tous les appels API + types du module
        ├── hooks/, utils/           # hooks de données et utilitaires partagés par ≥ 2 écrans
        └── styles/prototype.css     # CSS legacy — importé UNIQUEMENT par ZyloLiquidShell (sidebar/navbar)
```

Convention : tout appel réseau passe par `core/api/client.ts` (fetch
générique) ou par un service de module (`modules/<domaine>/services/`) qui
l'utilise — jamais de `fetch()` direct dans un composant. Toute page
protégée vit sous `app/(app)/` (ou `app/<domaine>/` pour un module déjà
protégé par son propre layout), qui applique déjà `ProtectedRoute` +
`AppShell` — pas besoin de le refaire page par page. Toute primitive UI
vient de `shared/ui` ; un composant qui connaît le vocabulaire d'un module
(statuts, entités métier) est un composant **métier** et vit dans
`modules/<domaine>/`, jamais dans `shared/ui`. Un fichier de route
(`app/**/page.tsx`) ne contient aucune logique : il délègue à l'écran du
module correspondant.

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
