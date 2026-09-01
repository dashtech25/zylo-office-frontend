# Fondations frontend — Design System, primitives UI, i18n FR/EN

> Document produit en application d'`interface-zylo-liquid-convention/instruction.md`
> (dépôt `zylo_liquid_prototype`), en respectant `grande_phases.md` comme source
> directrice, et en s'appuyant sur le rapport de reverse engineering AlloTech
> et `prototype.html` (Zylo Liquid) comme sources de conventions réutilisables.
>
> Légende : **[OBSERVÉ]** fait constaté dans une source · **[DÉDUIT]**
> convention déduite d'une répétition · **[ADAPTÉ]** repris d'une source puis
> modifié pour Zylo Office · **[DÉCIDÉ]** décision autonome faute de source.

## 1. Corrections factuelles par rapport à `instruction.md`

- **[OBSERVÉ]** Le rapport AlloTech se trouve réellement dans
  `zylo_liquid_prototype/interface-zylo-liquid-convention/`, pas sous
  `zylo-office/` comme indiqué dans `instruction.md` §2/§28.
- **[OBSERVÉ]** Les branches `remy`/`develop` du frontend existaient déjà au
  moment de cette tâche (contrairement à l'audit `grande_phases.md` §4, qui
  reflétait un état antérieur) ; `remy` avait 5 commits (Phase 9 + Phase 14)
  non encore fusionnés dans `develop` — fusionnés en tout premier lieu par
  cette tâche.
- **[DÉDUIT]** `instruction.md` §21 demande de travailler "conformément aux
  phases 1 à 7" de `grande_phases.md`, mais ces phases sont toutes
  **backend** (architecture, infra, DB, core, auth, RBAC, modules) ; le socle
  **frontend** est la Phase 9 (déjà mergée, mais sans design system/i18n).
  Cette tâche est traitée comme un approfondissement de la Phase 9, seule
  phase pertinente pour un travail frontend — pas de renumérotation forcée.

## 2. Matrice de décision

| Élément | Source | Applicable à Zylo Office ? | Décision | Justification |
|---|---|---|---|---|
| Stack (Next.js vs Vite) | `grande_phases.md` §5.1 (Niveau 1) | Oui | Next.js 15 App Router | Décision déjà figée, prioritaire sur AlloTech (Vite/SPA — rapport §21) |
| Primary/Secondary | `instruction.md` §6 | Oui | `#3498DB` / `#2C3E50` | Valeurs imposées explicitement |
| Success/Warning/Error/Info | `prototype.html` (Niveau 2) | Oui | `#0D9488`/`#D97706`/`#DC2626`/`#5EBCFC` | Palette IEC 62682/ISA-101 déjà présente dans le prototype Zylo Liquid — plus pertinente pour un produit industriel que le vert/jaune/rouge génériques d'AlloTech |
| Tons de sévérité (critical/major/minor/ok/maintenance/pending/idle) | `prototype.html` | Oui, en tokens seulement | Tokens `--color-severity-*` définis, **aucun mapping statut→tone dans `shared/ui`** | Reprend le principe AlloTech "le générique ignore le métier" (rapport §16/§20) ; le mapping réel vivra dans `modules/zylo_liquid` |
| Neutres bg/surface/border/text | `prototype.html` (fréquence d'usage observée) | Oui | `#EEF2F6`, `#C6D0DA`, `#E5EBF1`, `#8FA6BA`, `#41576B`, `#0A141B` | Valeurs déjà éprouvées visuellement dans l'écosystème Zylo Liquid |
| Pattern de composant générique | Rapport AlloTech §6/§20 (Niveau 3) | Oui, amélioré | Objet de variantes + `clsx`, formalisé avec `cva` | Le rapport suggère lui-même cette évolution (§20) |
| Accessibilité clavier (Modal/Tabs/Tooltip/Select) | Rapport AlloTech §15/§21 (trou identifié) | Oui | Radix UI headless pour ces 4 primitives | Corrige explicitement le point faible constaté chez AlloTech (Dropdown sans navigation clavier) |
| Typographie | `prototype.html` (dense) vs AlloTech (éditorial) | Prototype retenu | Geist Sans, échelle compacte (h1 24px…), `tabular-nums` | Une interface de données industrielles privilégie la densité/lisibilité tabulaire à l'esthétique éditoriale d'AlloTech (rapport §21 le suggère explicitement) |
| Radius/Shadows | AlloTech (structure : échelle nommée à 3 niveaux) | Structure reprise, valeurs adaptées | `rounded-card`=12px, `rounded-button/input`=8px, `rounded-pill`, ombres `soft/card/elevated` | Structure éprouvée, valeurs plus sobres qu'AlloTech (moins "éditorial") |
| i18n | `instruction.md` §8-11 (obligatoire) | Oui | `next-intl`, résolution par cookie (pas de préfixe `[locale]`) | Évite de restructurer `app/(auth)`/`app/(app)` déjà posé par `grande_phases.md` §5.1 pour un besoin non demandé |
| Bibliothèque de formulaires (react-hook-form/zod) | Rapport AlloTech §12/§21 (absent chez AlloTech, recommandé pour Zylo Liquid) | Différé | Non ajouté maintenant | Aucun formulaire complexe réel à brancher ; `FormField`/`Input` déjà compatibles sans réécriture |
| Bibliothèque de tables (TanStack Table) | Rapport AlloTech §13/§21 | Différé | `Table` présentationnel seul | Aucune donnée réelle de module à afficher encore ; décision à prendre au premier écran de données de zylo_liquid |
| Dark mode | Absent chez AlloTech, aucune source ne le demande | Différé | Tokens en une seule couche `:root`, prêts à dupliquer sous `[data-theme="dark"]` | Pas de besoin exprimé |
| `framer-motion` | AlloTech l'utilise largement | Non repris | Transitions CSS + attributs `data-state` de Radix | Évite une dépendance lourde pour un produit orienté données, pas marketing |

## 3. Ce qui vient d'AlloTech

- Le pattern "objet de variantes + `clsx`" (ici formalisé avec `cva`).
- La séparation stricte composants génériques (`shared/ui`, sans
  connaissance métier) / composants métier (futurs `modules/<domaine>`).
- Le triplet loading/empty/error/skeleton systématique, avec presets
  (`CardSkeleton`, `TableRowSkeleton`, `ListSkeleton`, `KpiSkeleton`).
- Le principe "le générique ignore le métier" appliqué à `Badge` (tons
  génériques, aucun statut réel codé en dur).
- La convention `tabular-nums` sur les valeurs numériques (KPI, tableaux).
- ESLint + Prettier + TypeScript strict comme base qualité (déjà en place
  côté `zylo-office-frontend`).
- **Ce qui n'a volontairement PAS été repris** : Vite/SPA, typographie
  éditoriale (Jost/Lora), `framer-motion`, absence de gestion clavier sur
  les composants interactifs, coexistence de deux générations de tokens
  (ink/surface vs neutral) — corrigée dès le départ ici en imposant les
  tokens sémantiques à 100% des composants neufs.

## 4. Ce qui vient du prototype Zylo Liquid

- La palette de couleurs (primary/secondary imposés par `instruction.md`,
  mais success/warning/error/info et les tons de sévérité proviennent
  directement des variables CSS `--ok/--major/--crit/--brand` observées
  dans `prototype.html`).
- Les neutres de fond/texte/bordure (fréquences d'usage observées).
- La densité typographique compacte (h1/h2/h3 plus petits qu'AlloTech).
- L'inspiration KPI tiles (`Kpi.tsx`) — pattern déjà central dans les
  dashboards du prototype.
- **Non repris automatiquement** (rappel `instruction.md` §5) : aucune page,
  aucun composant métier (tank gauge, alarm list...), aucun vocabulaire
  Zylo Liquid — ce sera l'objet du module `modules/zylo_liquid`.

## 5. Ce qui vient directement de `grande_phases.md`

- Arborescence `core/`/`shared/`/`modules/`/`app/(auth)`/`app/(app)/[module]`.
- Règle de dépendance stricte (un module dépend de `core`/`shared`, jamais
  l'inverse).
- Enveloppe API `{data, meta:{total,limit,offset}}` / `{error:{code,message,details}}`
  — déjà respectée par `core/api/client.ts`, non modifiée par cette tâche.

## 6. Décisions autonomes [DÉCIDÉ]

- `next-intl` en mode cookie plutôt que routing par préfixe de locale.
- `cva` + Radix UI (Dialog/Tabs/Tooltip/Select) comme socle des primitives
  interactives — 4 dépendances Radix ciblées, pas une suite de composants
  headless complète.
- `Table` présentationnel seul, sans moteur de données, en attendant le
  premier écran réel de zylo_liquid.
- `FormField`/`Input`/`Select`/`Textarea`/`Checkbox` sans lib de validation,
  compatibles avec un branchement futur de `react-hook-form`/`zod` sans
  réécriture.
- Page interne `/ui-preview` (guide de style vivant, accessible via la
  section "Administration" de la sidebar) comme méthode de vérification
  manuelle réelle dans le navigateur — son contenu illustratif est
  volontairement exempté de la règle i18n stricte (page de démonstration
  interne, pas une page métier livrée aux utilisateurs finaux) ; les
  composants qu'elle assemble, eux, n'ont aucun texte en dur.
- Suppression du bloc `@media (prefers-color-scheme: dark)` du scaffold
  `create-next-app` d'origine (contredisait la décision "light-only").

## 7. Éléments volontairement différés

- Bibliothèque de formulaires/validation (react-hook-form + zod).
- Bibliothèque de tables (TanStack Table), tri/filtrage/colonnes figées/
  virtualisation.
- Dark mode.
- Espaces de noms i18n `dashboard.json`, `stations.json`, etc. — seuls
  `common`, `navigation`, `auth` existent, remplis au fil des pages
  réellement construites.
- Suite de tests automatisés frontend (`Phase 13` de `grande_phases.md`).
- Composants supplémentaires listés par `instruction.md` mais non
  construits maintenant faute de besoin réel : DatePicker, SearchBar,
  Breadcrumb autonome (fondu dans `PageHeader`), menu contextuel
  (Dropdown-menu, distinct du `Select`).

## 8. Conflits détectés et résolution

- **`instruction.md` (couleurs #3498DB/#2C3E50) vs mémoire projet
  ("la vraie palette Zylo vient d'Odoo")** : résolu en faveur
  d'`instruction.md`, qui donne une instruction explicite et directe pour
  cette tâche — traité comme une mise à jour de la décision de branding,
  pas comme une contradiction à arbitrer.
- **Numérotation de phases** : voir §1 ci-dessus.
- **Chemin du rapport AlloTech** : voir §1 ci-dessus, chemin réel utilisé.

## 9. Vérification effectuée

- `npm run build` et `npm run lint` verts.
- Parcours navigateur réel : `/login` et l'`AppShell` affichent du texte
  traduit, le sélecteur de langue (header) fonctionne, `/ui-preview` rend
  chaque primitive, Modal/Tabs/Tooltip/Select navigables au clavier.
- Recherche globale de texte français/anglais en dur dans le code touché
  (`AppShell.tsx`, page de login, `shared/ui/*`) — aucune occurrence
  utilisateur restante hors `locales/` et la page `/ui-preview` (exemption
  documentée en §6).
