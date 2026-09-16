# Directive d'architecture frontend — Zylo Office

**Zylo Office n'est pas un site web. C'est une plateforme ERP/CRM modulaire**
(zylo-liquid aujourd'hui ; CRM, Stock, Comptabilité, RH, POS demain). Toute
décision frontend doit rester cohérente si on ajoute plusieurs modules
majeurs et des dizaines de pages. Référence globale : `grande_phases.md`
(racine du projet `zylo-office/`). Historique des décisions et rationale
détaillée : `docs/frontend-foundations.md`.

**Avant toute intervention dans ce dépôt, lis cette page en entier.** Elle
prime sur toute habitude générique ("je crée un composant là où c'est
pratique") si elle entre en contradiction avec les règles ci-dessous.

## La règle qui prime sur tout : APP = ROUTING

    APP     = ROUTING            (src/app/)
    CORE    = FONDATION APP      (src/core/)
    SHARED  = SYSTÈME RÉUTILISABLE (src/shared/)
    MODULES = MÉTIER             (src/modules/)
    PAGES   = COMPOSITION

Pas : `APP = TOUTE L'APPLICATION`.

Un fichier `src/app/**/page.tsx` ne doit contenir **aucune logique** — il
délègue à un écran de module :

```ts
// src/app/zylo-liquid/alerts/page.tsx — fichier entier
export { default } from "@/modules/zylo-liquid/screens/alerts/AlertsScreen";
```

Toute la composition (JSX, hooks de données, sous-composants privés à cet
écran) vit dans `src/modules/<domaine>/screens/<nom>/<Nom>Screen.tsx`. C'est
déjà fait pour les 10 écrans non triviaux de `zylo-liquid` (dashboard,
stations-list, station-detail, tank-detail, alerts, deliveries, leaks,
tanks-network, configuration, settings) — **suis ce même patron pour toute
nouvelle page**, dans ce module ou un futur module.

## Arborescence réelle (pas une cible théorique — déjà en place)

```text
src/
├── app/zylo-liquid/**/page.tsx   # 1 ligne chacun : export { default } from "@/modules/..."
├── core/
│   ├── api/client.ts             # fetch wrapper générique — jamais de logique métier ici
│   ├── auth/, layout/, organization/
├── shared/ui/                    # Button, Card, Badge, Modal, Table, Tabs, FormField, Input,
│                                  # Select, Alert, EmptyState, PageHeader, Stack, ProgressBar,
│                                  # DropdownMenu, Kpi, ActivityRow, InfoRow, CardSectionHeader...
│                                  # ZÉRO connaissance métier. `index.ts` exporte tout.
└── modules/zylo-liquid/
    ├── screens/<nom>/<Nom>Screen.tsx + fichiers privés à cet écran
    ├── components/                # composants métier utilisés par ≥ 2 écrans
    │   (TankGauge, TankVisual, TankStatusBadge, TrendChart, ProductBreakdownModal,
    │    CreateStationModal, TankFieldsSection, CalibrationModal, ZyloLiquidShell)
    ├── services/zyloLiquidApi.ts  # tous les appels API + types du module
    ├── hooks/                     # hooks de données partagés par ≥ 2 écrans
    ├── utils/                     # formatLiters, formatPercent
    └── styles/prototype.css       # CSS legacy — importé UNIQUEMENT par ZyloLiquidShell (sidebar/navbar)
```

## Séquence obligatoire avant de créer quoi que ce soit

    1. Chercher dans shared/ui/index.ts (composant générique existant ?)
    2. Chercher dans modules/<domaine>/components/ (composant métier existant ?)
    3. Étendre un composant existant (nouvelle variante) plutôt que le dupliquer
    4. Composer plusieurs composants existants
    5. Créer un nouveau composant SEULEMENT si aucun des points ci-dessus ne convient

**La localisation d'un composant dans un autre dossier ne justifie jamais
sa duplication.** Exemple réel : `Kpi` existait en double (`shared/ui/Kpi`
générique et `_components/Kpi` avec icône/tonalité) — fusionné en un seul
composant dans `shared/ui`, l'ancien supprimé.

## Où mettre quoi (procédure pour une nouvelle page ou un nouveau composant)

- **Composant sans AUCUNE connaissance métier** (réutilisable par un futur
  module CRM/Stock/RH) → `src/shared/ui/`, exporté dans `index.ts`.
- **Composant qui connaît le vocabulaire d'un module** (cuve, station,
  alerte, contact CRM, article de stock...) → `modules/<domaine>/components/`
  s'il sert ≥ 2 écrans, sinon colocalisé dans `modules/<domaine>/screens/<nom>/`.
- **Appel API d'un module** → fonction ajoutée dans
  `modules/<domaine>/services/<domaine>Api.ts`. Jamais dans `core/api/`.
- **Hook de données d'un module** → `modules/<domaine>/hooks/` (partagé) ou
  colocalisé dans le dossier de l'écran (privé à un seul écran).
- **Nouvelle page** → `app/<domaine>/<route>/page.tsx` en 1 ligne
  (`export { default } from ...`) + l'écran réel sous
  `modules/<domaine>/screens/<nom>/`. Composer avec `Stack` + `PageHeader`
  (`shared/ui`) + composants métier du module — ne jamais réinventer
  l'espacement, l'en-tête de page, les cartes, les boutons, les tableaux.

## Interdictions explicites

- **Aucun nouveau fichier CSS local.** Avant d'écrire du CSS : un token
  Tailwind existe-t-il ? une variante `cva` ? un composant `shared/ui` ?
  Le seul CSS legacy toléré est `modules/zylo-liquid/styles/prototype.css`,
  et seulement parce qu'il reste la base visuelle de la sidebar/navbar
  (`ZyloLiquidShell`) — ne l'étends pas, ne le réutilise pas ailleurs.
- **`shared/` et `core/` ne dépendent jamais d'un module métier** (pas
  d'import de `modules/zylo-liquid/...` depuis `shared/` ou `core/`). Un
  module dépend de `shared/`/`core/`, jamais l'inverse.
- **Pas de sur-abstraction** : ne crée pas `Text`/`SmallText`/`CardText`
  etc. si `shared/ui` couvre déjà le besoin avec une classe Tailwind.
- **Ne recode pas une page à partir d'une maquette visuelle sans passer par
  le système** : toute caractéristique visuelle répétée devient un
  composant ou un token, jamais du CSS ad hoc par page.
- **Ne pas laisser deux implémentations concurrentes du même concept.**
  Quand un composant partagé remplace un ancien, migrer tous les usages
  et supprimer l'ancien — ne pas le laisser "au cas où".

## Frontières backend côté frontend : composer, jamais mélanger

Le backend migre vers un **monolithe modulaire** (plan complet :
`plan-migration/architecture-migration.md` dans `zylo_liquid_prototype/`) :
Files, Location (GPS), Alertes, Holykell deviennent des modules Python
indépendants (`app/files/`, `app/location/`, `app/alerts/`,
`app/integrations/holykell/`), chacun avec son `service.py`/`router.py`
propres, séparés de `app/modules/zylo_liquid/`. Le frontend applique la
**même discipline de frontières**, symétriquement.

**La règle** : un écran qui a besoin de données appartenant à deux domaines
différents (un fichier attaché à une livraison, la position GPS d'un camion
à côté de son niveau de carburant) appelle **deux endpoints séparés** — un
par domaine propriétaire — jamais un seul endpoint backend qui mélangerait
Files + Liquid + Alertes "pour économiser un aller-retour". Si l'envie
d'un endpoint backend qui fusionne plusieurs domaines apparaît, c'est le
signal qu'il faut composer deux appels côté frontend (deux hooks, combinés
via React Query), pas demander au backend de violer ses propres frontières
de module.

**Patron déjà en place dans ce dépôt — s'en inspirer, ne pas réinventer** :
- `src/modules/zylo-liquid/services/zyloLiquidApi.ts` reste le fichier
  client API centralisé du module `zylo-liquid` (un seul fichier, toutes
  les fonctions `listX`/`createX`/`updateX` + leurs types).
- `src/modules/zylo-liquid/screens/trucks/useTrucks.ts` illustre déjà la
  composition frontend : `fetchTrucksData` lance en parallèle
  `listTrucks`, `listCarriers`, `listGpsDevices`,
  `listTruckCurrentPositions`, `listTrackingLocations`,
  `listTruckStopReconciliations`, `getTraccarConnection` via `Promise.all`,
  puis un seul hook `useTrucks` expose le résultat combiné à l'écran.
  Chaque fonction reste un appel indépendant à son propre endpoint — c'est
  exactement le patron "composer côté frontend, ne pas mélanger côté
  backend" à reproduire pour Files/Alertes/Location.
- `src/modules/zylo-liquid/services/liveTruckPositions.ts` montre qu'une
  préoccupation frontend spécifique (flux SSE, authentification manuelle
  via `fetch`/`ReadableStream` car `EventSource` natif ne permet pas l'en-
  tête `Authorization`) reste dans son propre fichier plutôt que d'être
  ajoutée dans `zyloLiquidApi.ts` — un fichier client API garde des
  fonctions `fetch` simples et uniformes, pas de la logique de streaming.

**Effet de la migration backend sur le frontend** : le plan de migration
choisit explicitement de garder les préfixes d'URL actuels
(`/api/v1/zylo-liquid/...`) même une fois le code physiquement déplacé
côté backend vers `app/files/`, `app/location/`, `app/alerts/` — pour ne
rien casser côté frontend pendant le refactor. **Aucune modification
frontend n'est donc requise par la migration backend elle-même.** Mais
tout **nouveau** code frontend doit déjà suivre la discipline "un
hook/appel par domaine, composer plutôt que mélanger" — ne pas attendre
que le backend ait fini de se découper pour l'appliquer.

**Direction pour l'organisation des clients API** (pas urgent, juste le
sens dans lequel avancer à mesure que les modules backend se stabilisent) :
quand un domaine backend (Files, Location, Alertes) devient un module
backend indépendant et stable avec son propre préfixe d'URL dédié, lui
donner son propre fichier client frontend au même niveau que
`zyloLiquidApi.ts` (ex. `services/filesApi.ts`,
`services/alertsApi.ts`) plutôt que de continuer à accumuler ses fonctions
dans `zyloLiquidApi.ts`. Tant que le préfixe reste `/zylo-liquid/...` et
que le domaine n'a pas de vie propre côté produit, le laisser où il est
déjà — pas de scission prématurée sur la seule base du découpage backend.

## Méthode de travail

Par familles cohérentes (layout → tokens → primitives → composants →
patterns → modules → pages), en vérifiant après chaque famille :
`tsc --noEmit`, lint, `next build`. Ne pas tout refactoriser en un seul
changement énorme, mais ne pas non plus rester bloqué en analyse — dès
qu'une partie est comprise, l'implémenter, vérifier, continuer.

Avant un changement de grande ampleur touchant beaucoup de fichiers,
vérifier `git status` : si des fichiers sont déjà modifiés/non commités par
un travail en cours (une autre session), rester chirurgical sur ces
fichiers (ne toucher que ce qui est nécessaire) plutôt que de les réécrire
entièrement, sauf instruction explicite contraire de l'utilisateur.
