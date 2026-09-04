# src/modules/ — le métier, un dossier par domaine

Voir la directive complète : `/CLAUDE.md` (racine du dépôt).

Un module (`zylo-liquid/`, et demain `crm/`, `stock/`, `accounting/`,
`hr/`, `pos/`) est autonome dans son domaine et ne dépend jamais d'un autre
module. Structure de référence (voir `zylo-liquid/`, déjà en place) :

```text
modules/<domaine>/
├── screens/<nom>/<Nom>Screen.tsx   # composition d'écran, cible d'un app/**/page.tsx
├── components/                     # composants métier utilisés par ≥ 2 écrans
├── services/<domaine>Api.ts        # tous les appels API + types du module
├── hooks/                          # hooks de données partagés par ≥ 2 écrans
└── utils/                          # utilitaires purs du module
```

**Nouveau module** : copie cette convention exactement (mêmes noms de
sous-dossiers) — ne réinvente pas une organisation différente pour CRM ou
Stock. Un nouveau module consomme `core/` et `shared/`, jamais l'inverse,
et ne dépend d'aucun autre module métier.

**Avant de créer un composant/hook/service ici** : vérifie qu'un équivalent
générique n'existe pas déjà dans `shared/ui/` (auquel cas réutilise-le) —
ne recrée jamais un bouton, un modal, un input, un tableau ou un système
d'espacement dans un module.

Un composant/hook utilisé par un seul écran reste colocalisé dans
`screens/<nom>/` (ne pas le promouvoir à `components/`/`hooks/` "au cas
où" — sur-abstraction interdite, cf. directive racine §18). Il ne monte au
niveau du module que le jour où un deuxième écran en a réellement besoin.
