# src/core/ — fondation applicative, jamais un module métier

Voir la directive complète : `/CLAUDE.md` (racine du dépôt).

`core/` contient les mécanismes transverses de Zylo Office elle-même :
client HTTP générique (`api/client.ts`), authentification, permissions,
layout applicatif, contexte d'organisation. **Rien ici ne doit connaître le
vocabulaire d'un module métier** (pas de `Tank`, `Station`, `Contact`,
`Article`...).

**Interdiction stricte** : `core/` ne doit jamais importer depuis
`src/modules/<domaine>/`. Si tu es tenté d'ajouter ici un type ou une
fonction spécifique à un module (ex. des endpoints `zylo-liquid`), c'est
qu'elle appartient à `modules/<domaine>/services/`, pas ici — précédent
réel : `core/api/zyloLiquid.ts` a été déplacé vers
`modules/zylo-liquid/services/zyloLiquidApi.ts` pour cette raison exacte.

Avant d'ajouter un mécanisme ici, vérifie qu'il sera vraiment utilisé par
**tous** les futurs modules (CRM, Stock, RH...), pas seulement par celui sur
lequel tu travailles.
