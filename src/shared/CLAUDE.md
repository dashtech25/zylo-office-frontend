# src/shared/ — véritable système UI, pas un fourre-tout

Voir la directive complète : `/CLAUDE.md` (racine du dépôt).

`shared/ui/` contient les primitives génériques utilisables par **n'importe
quel** module présent ou futur (Button, Card, Badge, Modal, Table, Tabs,
FormField, Input, Select, Alert, EmptyState, PageHeader, Stack, ProgressBar,
DropdownMenu, Kpi, ActivityRow, InfoRow, CardSectionHeader...). Tout est
exporté depuis `index.ts`.

**Avant de créer un composant ici**, vérifie qu'il répond à ces deux
conditions :
1. Il est **réellement réutilisable** par plusieurs modules (pas juste
   "pourrait servir un jour").
2. Il **ne connaît aucune logique métier** — aucun statut, entité, ou
   vocabulaire propre à un domaine (`Tank`, `Station`, `Contact`...). Les
   couleurs/tons sont sémantiques et génériques (`error`, `warning`,
   `success`, `info`, `neutral`, `primary`) — jamais `crit`/`major`/`ok`
   ou un hex codé en dur : ce sont des noms/valeurs métier ou legacy.

Si un composant échoue à l'un des deux tests, il va dans
`modules/<domaine>/components/`, jamais ici — même s'il est bien écrit
(interdiction du "junk drawer", cf. directive racine §17).

**Avant de créer** : cherche dans `index.ts` si un composant proche existe
déjà — étends-le (nouvelle variante `cva`) plutôt que d'en écrire un
nouveau. Exemple réel : `Button` a été étendu avec un variant `link` et une
taille `inline` plutôt que de créer un composant "lien-bouton" séparé.
