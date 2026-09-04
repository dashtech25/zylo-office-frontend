# src/app/ — routage uniquement

Voir la directive complète : `/CLAUDE.md` (racine du dépôt).

**Règle unique de ce dossier** : un fichier `page.tsx` ne contient pas de
logique. Il délègue immédiatement à un écran de module :

```ts
export { default } from "@/modules/<domaine>/screens/<nom>/<Nom>Screen";
```

Si tu es en train d'écrire du JSX, des hooks, ou un `useState` directement
dans un fichier sous `src/app/`, tu es au mauvais endroit — ce code
appartient à `src/modules/<domaine>/screens/`.

Exception : les groupes de routes (`(auth)`, `(app)`), `layout.tsx`,
`loading.tsx`, `error.tsx` — ces fichiers appartiennent légitimement à
App Router et peuvent contenir la logique de layout/garde de route
elle-même (ex. `ProtectedRoute`, application du shell).
