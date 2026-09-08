> **Statut : analyse uniquement — aucune implémentation frontend n'a été faite à partir de ce document.**
> Conforme à la consigne reçue : *"Ne commence aucune implémentation frontend avant que cette analyse soit terminée et validée."*
>
> **Portée** : cette analyse est fondée **exclusivement** sur les 7 captures de référence fournies (toutes des écrans **Zylo Liquid** : Tableau de bord réseau ×2, Liste des stations, Détail d'une station, Interface "Ajouter une cuve" ×2, Détail d'une cuve, Alertes réseau, Livraisons réseau). Elle ne couvre donc que ce module — étendre la conclusion à "tout Zylo" nécessiterait des références d'autres modules, que je n'ai pas.
>
> **Articulation avec l'existant** : ce dépôt a déjà `docs/frontend-foundations.md`, un design system fondateur avec sa propre palette et sa propre échelle typographique (marquage [OBSERVÉ]/[DÉDUIT]/[ADAPTÉ]/[DÉCIDÉ]). Les références fournies ici montrent des valeurs **partiellement différentes** (voir §A.1) — je les signale plutôt que de trancher arbitrairement entre les deux sources.

---

## Étape 1 — Inventaire des écrans analysés

| # | Écran | Objectif | Layout général |
|---|---|---|---|
| 1 | Tableau de bord réseau | Vue d'ensemble consolidée, contrôle global | Sidebar + header + zones empilées (statut → KPI → graphique → tableau/alertes → activité) |
| 1b | Tableau de bord (avec modal) | Détail d'une synthèse produit au clic | Même écran + modal centrée overlay |
| 2 | Liste des stations | Gestion/surveillance de flotte | Sidebar + header + titre/actions → filtres → table dense |
| 3 | Détail d'une station | Supervision + gestion d'une station | Sidebar + header → bandeau alertes → cartes cuves → 3 colonnes basses |
| 3b/3c | Modal "Ajouter une cuve" | Création d'une cuve (formulaire) | Modal pleine hauteur, sections empilées |
| 4 | Détail d'une cuve | Diagnostic précis d'une cuve | Sidebar + header → bandeau alerte → cylindre+volumes → graphique → 4 cartes info → 3 colonnes |
| 5 | Alertes réseau | Centre de traitement des anomalies | Sidebar + header → compteurs → onglets/filtres → table |
| 6 | Livraisons réseau | Registre des réceptions | Sidebar + header → synthèse produits → filtres/actions → table |

Récurrence immédiate et systématique sur les 7 écrans : **Header (56px) + Sidebar (220px) + zone de contenu scrollable**, jamais d'exception. C'est la convention de layout n°1.

---

## Étape 2 — Catalogue des layouts Zylo Liquid

### App Layout (racine, sur tous les écrans)
- Header fixe 56px, pleine largeur.
- Sidebar fixe 220px, hauteur pleine (sous le header).
- Contenu principal scrollable, padding page ~24px.

### Dashboard Layout (écran 1)
- Empilement vertical de sections en largeur pleine : barre de statut (64px) → grille de cartes KPI (220px) → graphique+panneau (160px+) → deux blocs côte à côte (table stations 60% / alertes 40%) → table pleine largeur (activité récente).

### List Layout (écrans 2, 5, 6)
- Titre + actions globales (72–120px) → barre filtres (56px) → table (header fixe 40px + lignes 88–120px + footer/pagination).
- **Constante** : filtres = pills de statut cliquables (à gauche) + dropdowns (Statut/Ville ou Type/Station/Produit + Trier par) + recherche (à droite). Identique sur les 3 écrans à quelques libellés près → c'est un **pattern**, pas trois implémentations différentes.

### Detail Layout (écrans 3, 4)
- En-tête d'entité (icône statut + nom + badge + ligne secondaire + actions à droite) → bandeau d'alerte conditionnel → contenu spécifique (cartes cuves / cylindre+graphique) → 3 colonnes d'info basses (Alertes/Livraisons/Fuites), toujours dans cet ordre, toujours avec lien "Voir toutes →".

### Form Layout (modal "Ajouter une cuve")
- Header modal (icône + titre + fermer) → sections empilées avec titre de section en majuscules → footer d'actions aligné à droite (Annuler outline + action primaire).

### Split Layout (implicite, cuve dans la liste des cuves d'une station — écran 3)
- Carte = 4 colonnes horizontales : identité | cylindre | seuils | volumes+actions. Retrouvé à l'identique (structure, pas taille) en version agrandie sur l'écran 4.

---

## Étape 3 — Inventaire des composants

### Navigation
- **Sidebar** — groupes de liens sous labels de section (majuscules, muted), item actif = fond + bordure gauche accent + texte primary, "Retour Zylo Office" toujours en pied de sidebar après séparateur.
- **Header** — icône marque + wordmark, séparateur vertical, fil d'ariane, zone droite : statut sync (point animé + texte), notifications (icône + badge rouge), avatar+chevron.
- **Breadcrumb** — cliquable, `>` comme séparateur, dernier niveau non cliquable (texte plein).
- **Tabs** — vus sur Alertes (Actives/Résolues/Toutes) avec compteur entre parenthèses dans le libellé même.
- **Liens "Voir tout(e)s →"** — systématiques en coin haut-droit de toute section résumée.

### Actions
- **Bouton primaire** — fond plein primary, texte blanc (ex. "+ Ajouter une station", "Créer la cuve").
- **Bouton secondaire/outline** — bordure + texte primary ou neutre, fond transparent (ex. "Annuler", "Exporter").
- **Bouton icône+libellé** — vu pour actions contextuelles secondaires dans les en-têtes de détail (Livraisons, Fuites).
- **Bouton pill** — radius total (999px), utilisé pour sélecteurs de période ET filtres de statut rapides ; actif = fond plein, inactif = fond neutre/outline.
- **Menu kebab (⋮)** — actions de ligne/carte, présent sur toutes les tables et sur l'en-tête de détail station/cuve.
- **Lien externe (icône)** — à côté du select "Produit carburant" dans le formulaire cuve.

### Formulaires
- **Input texte/nombre** — libellé au-dessus, placeholder en exemple ("Ex. : ..."), astérisque si obligatoire.
- **Select** — même style d'input, chevron à droite.
- **Dropdown filtre** — variante compacte du select, utilisée dans les barres de filtre.
- **Search input** — icône loupe à gauche, toujours à l'extrême droite de la barre de filtres.
- **Toggle** — vu une fois ("Ignorer temporairement la calibration"), interrupteur classique.
- **Zone de dépôt de fichier (dropzone)** — bordure pointillée, icône upload, texte d'instruction + format attendu.
- **Bouton "+ Ajouter un(e) X"** — pattern répété pour ajouter dynamiquement une ligne (capteur) ou une entité (cuve, station).

### Données
- **Table** — header muted uppercase, lignes séparées par bordure fine, ligne totale/footer distincte (fond légèrement teinté), pagination en pied.
- **Barre de progression + %** — le pattern de représentation de taux de remplissage, de la carte KPI à la ligne de station jusqu'au badge d'écart livraison.
- **Status dot** — vert/orange/rouge/gris, seul indicateur de statut binaire/multiple répété partout (station en ligne, sonde connectée, sync fraîcheur, sévérité alerte).

### Information
- **Card** (voir Étape 4 pour le détail des variantes).
- **Badge/Pill de statut** — texte court, fond teinté clair + texte teinté foncé de la même couleur.
- **Tag "Auto"/"Manuel"** (livraisons) — même famille visuelle que le badge de statut mais sémantique différente (source de la donnée, pas état).
- **Tooltip/hint** — texte petit muted sous un champ ou une valeur (ex. "Hauteur intérieure totale de la cuve").
- **Empty state** — icône + titre + texte + CTA, vu explicitement en légende de l'écran Liste des stations.

### Feedback
- **Alert banner** (pleine largeur, en tête de page détail) — fond teinté orange (alerte) ou rouge (fuite), icône + résumé + lien d'action.
- **Modal** — deux variantes (voir §A des cartes/modales) : modal de **détail** (header blanc, contenu tabulaire) et modal de **formulaire** (header sombre, sections).
- **Toast/loading/error** — non représentés explicitement dans les références fournies → **je ne les invente pas**, ils restent à définir quand une capture les montrera (cohérent avec `frontend-foundations.md`, qui a déjà posé un triptyque loading/empty/error générique — à réutiliser plutôt qu'à redéfinir).

---

## Étape 4 — Les cartes (analyse détaillée)

| Variante | Où | Fond | Bordure | Radius | Padding | Contenu type |
|---|---|---|---|---|---|---|
| **KPI produit** | Dashboard Zone B | blanc | 1px gris clair | ~12px | ~20px | dot+label, valeur XL bold, sous-texte capacité, barre+%, lien "N stations", "Valeur du stock" bold |
| **KPI réseau (accent)** | Dashboard Zone B (carte "Total réseau") | fond **secondary plein** (bleu marine), texte blanc | aucune (contraste par couleur) | ~12px | ~20px | même structure que KPI produit, mais inversée en couleur — seule carte "spéciale" du dashboard |
| **Carte cuve (liste)** | Détail station Zone C | blanc | 1px, **gauche colorée si alerte/fuite** | ~12px | ~16px | 4 colonnes (voir Split Layout) |
| **Carte info compacte** | Détail cuve Zone E | blanc | 1px | ~12px | ~16px | icône+titre, liste clé/valeur, lien bas |
| **Carte synthèse produit** | Livraisons Zone B | blanc | 1px | ~12px | ~16px | nom produit+dot, compteur livraisons, volume reçu bold, valeur, répartition Auto/Manuel |

**Regroupement** : toutes sauf la carte "Total réseau" partagent exactement la même enveloppe (blanc, bordure 1px gris clair, radius ~12px). → un seul composant `Card` avec :
- `variant="default"` (enveloppe commune),
- `variant="accent"` (fond plein coloré, réservé à la mise en avant d'un total réseau),
- une bordure gauche optionnelle pilotée par un état (`alert` / `leak`), pas une variante de carte en soi mais un modificateur d'état — cohérent avec le principe "les événements ne redéfinissent pas la carte, ils la teintent".

Je ne crée **pas** de variante "statistic" séparée de "default" : la carte KPI et la carte info compacte ont une enveloppe identique, seule la densité du contenu change (ce n'est pas une variante visuelle, juste un contenu différent dans le même composant).

---

## Étape 5 — Analyse des tableaux

Trois tables pleinement spécifiées (Dashboard Zone D, Liste des stations, Alertes, Livraisons) partagent :
- **Header** : fond légèrement teinté (`--surface-muted`), texte petit, majuscules, muted.
- **Lignes** : séparateur horizontal fin (`--border`), hauteur variable selon densité de contenu (40px table simple → 88-120px quand chaque ligne embarque des sous-composants comme barre de progression ou multi-produits).
- **Alignement** : texte à gauche, valeurs numériques à droite (`tabular-nums` implicite vu l'alignement des chiffres).
- **Cellule "statut"** : badge coloré, jamais du texte brut seul.
- **Cellule "action"** : toujours en dernière colonne, kebab (⋮) + parfois un lien flèche "→" séparé.
- **Ligne totale** : fond teinté distinct, texte en gras, toujours en dernière ligne (jamais en première) — vu sur Stations, Dashboard, Livraisons.
- **Pagination** : vue sur Alertes (numérotée + chevrons), à généraliser aux autres tables denses.
- **États vides/recherche sans résultat** : explicitement documentés sur l'écran Stations (icône+texte+CTA distincts selon la cause — réseau vide vs recherche infructueuse).

→ **Composant `Table` de référence** avec sous-composants `TableHeader`, `TableRow` (props `variant="total"` pour la ligne finale), `TableCell` (aligné automatiquement selon type de donnée), `TablePagination`, `TableEmptyState`.

---

## Étape 6 — Analyse des filtres

Pattern **identique** sur Stations / Alertes / Livraisons :
1. Pills de comptage cliquables tout à gauche (ex. "● 8 actives", "⚠ 2 alertes") — double rôle : information ET filtre rapide.
2. Une série de `Select`/dropdown (2 à 5 selon l'écran : Statut, Ville/Station, Produit/Type, Trier par).
3. `Search input` toujours en dernière position, aligné à droite.

Aucun "chip de filtre actif" ni bouton "Reset" explicite n'est visible dans les références → je ne l'invente pas, à statuer plus tard si le besoin apparaît réellement à l'implémentation.

**Pattern de filtre Zylo Liquid** = `[pills de statut] [dropdowns...] [espace flexible] [recherche]`, toujours sur une seule ligne de ~56px.

---

## Étape 7 — Analyse des icônes

Les références sont des maquettes annotées (pas des rendus pixel-exacts des glyphes), donc je ne peux **pas** identifier une bibliothèque d'icônes précise à partir des images elles-mêmes. Ce que j'observe en revanche, de façon fiable :
- Une icône par **fonction sémantique constante**, jamais décorative : statut (dot plein), alerte (triangle), fuite (goutte), livraison (camion), sync (horloge/point animé), notification (cloche), calibration (grille), capteur (radio/antenne), température (thermomètre), export (flèche vers le bas), ajout (plus).
- Taille cohérente avec le texte adjacent (icônes de table/liste ≈ taille du texte body, icônes d'en-tête de section légèrement plus grandes).
- Poids visuel uniformément fin/outline (aucune icône "remplie" massive observée) — cohérent avec le ton "professionnel, dense" demandé en Direction Visuelle sur chaque page.

Le dépôt utilise déjà `lucide-react` dans le code existant (`_components/*.tsx` de ce même projet, ex. `AlertTriangle`, `Droplet`, `Truck`) — c'est cohérent avec le style outline/fin observé ici. Je ne propose donc pas une nouvelle bibliothèque : **lucide-react reste le choix cohérent**, déjà en place, déjà aligné visuellement.

---

## Étape 8 — Espacements (observés, pas inventés)

Valeurs **explicitement annotées** dans les références (dimensions données en légende) :
| Élément | Valeur observée |
|---|---|
| Header | 56px |
| Sidebar | 220px |
| Zone de statut réseau (dashboard) | 64px |
| Carte KPI (dashboard) | 220px de haut |
| Graphique tendance | 160px |
| Ligne de station (liste) | 120px |
| Ligne d'alerte | 88px |
| Ligne de livraison | 100–140px selon contenu |
| En-tête de page détail | 72–100px |
| Barre filtres/statut | 56px |
| En-tête de modal | 56–64px |
| Carte cuve (liste) | 220px |
| Padding carte | ~16–20px (estimé par proportion, non annoté en px exact) |

Ces valeurs suggèrent une échelle de hauteurs de zone en **paliers de ~8px** (56, 64, 72, 88, 100, 120, 160, 220 — tous multiples de 4, la plupart de 8). C'est cohérent avec une échelle `spacing` en base 4/8, déjà probablement en place dans `frontend-foundations.md` — **je ne redéfinis pas** cette échelle sans l'avoir confrontée au fichier de tokens existant.

---

## Étape 9 — Lignes, bordures, séparateurs

- Bordure de carte : 1px, couleur claire (`--border` gris ~#E1E5EA selon légendes).
- Séparateur de ligne de table : 1px, même famille de couleur, légèrement plus discret que la bordure de carte.
- Bordure gauche accentuée (3-4px) : **seul** usage observé = signaler un état (alerte orange / fuite rouge) sur une carte cuve ou une ligne de tableau — jamais décorative.
- Séparateur vertical dans le header (entre logo et fil d'ariane) : 1px, discret.
- Aucun état hover/active/selected n'est représenté explicitement dans des maquettes statiques → à confirmer à l'implémentation plutôt qu'à déduire d'une image fixe.

---

## Étape 10 — Typographie (observée)

| Rôle | Taille/poids observés |
|---|---|
| Titres (h2/h3 de page et de section) | font-semibold à font-bold selon niveau |
| Valeurs principales (KPI, volumes) | font-bold, la plus grande taille de l'écran |
| Corps de texte | font-regular |
| Labels de formulaire | font-medium |
| h3 | 20px (annoté explicitement) |
| body | 14px (annoté explicitement) |
| small/caption | 12px (annoté explicitement) |
| Famille | Inter, Roboto ou system-ui (annoté explicitement, dans cet ordre de préférence) |

Cohérent avec `frontend-foundations.md` qui retient déjà Geist Sans + échelle compacte — **à réconcilier** : les références annotent explicitement "Inter, Roboto, ou system-ui", pas Geist. Je signale l'écart plutôt que de trancher.

---

## Étape 11 — Couleurs (rôles sémantiques)

Table reconstituée à partir des légendes **répétées sur chaque écran** (valeurs quasi identiques d'un écran à l'autre, avec de légères variations que je note) :

| Rôle | Valeur(s) observée(s) | Note |
|---|---|---|
| `primary` | `#3498DB` | Constant sur les 7 écrans |
| `primary-muted` | `#EBF5FF` | Constant |
| `secondary` | `#2C3E50` | Constant (fond header/sidebar/carte accent) |
| `surface` | `#FFFFFF` | Constant |
| `surface-muted` / `surface-subtle` | `#E1E5EA` / `#E5EBEC` selon écran | **Léger écart entre écrans** — deux graphies très proches, probablement la même intention |
| `border` | `#E1E5EA` (dashboard) → `#E9EBEC`/`#E5E9EC` (autres écrans) | **Idem, variations mineures** |
| `text` | `#1F2937` | Constant |
| `text-muted`/`text-secondary` | `#687280` | Constant |
| `success` | `#27AE60` | Constant |
| `warning`/`alert` | `#F39C12` / `#E67E22` selon écran | **Deux oranges différents utilisés** — à trancher |
| `danger`/`critique` | `#E74C3C` | Constant |
| `info` | `#2980B9` / `#0EASE9`(?) | Vu sur Alertes uniquement, moins de références croisées |
| `hors-ligne`/`neutre` | `#95A5A6` | Vu sur Liste des stations |

**Recommandation** (pas une décision imposée) : consolider warning à une seule valeur (`#E67E22` apparaît déjà comme couleur "pré-alarme" dans le code Zylo Liquid actuel — `TankGauge.tsx` — donc la réutiliser pour `warning` évite une 3ᵉ nuance d'orange dans l'app) et `border`/`surface-muted` à une seule valeur chacun. **Je ne l'applique pas moi-même** : c'est un arbitrage de palette, pas une observation.

---

## Étape 12 — États des composants (observés vs à définir)

| Composant | États **observés** dans les références | États **non observés** (à définir à l'implémentation, pas à inventer ici) |
|---|---|---|
| Bouton pill | actif (plein) / inactif (outline) | hover, focus, disabled |
| Badge statut | en ligne / hors ligne / alerte / critique | — |
| Ligne de table | normale / totale | hover, sélectionnée |
| Carte cuve | normale / alerte (bordure orange) / fuite (bordure rouge) | offline (mentionné dans la légende texte, pas illustré visuellement) |
| Input | normal / requis (astérisque) | erreur, focus, disabled (mentionnés en texte d'annotation "bordure rouge en cas d'erreur" mais pas montrés) |
| Sync/sonde | connectée (vert) / déconnectée (gris) / très en retard (rouge, déduit de la légende fraîcheur) | — |

---

## Étape 13 — Patterns UX récurrents

- **Recherche** : toujours un input texte simple à droite de la barre de filtres, jamais de recherche globale séparée.
- **Filtrage** : combinaison pills rapides + dropdowns, jamais de panneau de filtres avancés séparé/dépliable.
- **Consultation d'une donnée agrégée** : clic sur un lien ("N stations concernées") ouvre une **modal de détail tabulaire**, plutôt que de naviguer vers une nouvelle page — pattern "drill-down local".
- **Ouverture d'un détail d'entité** : clic sur la ligne/carte entière (pas seulement un bouton) navigue vers la page de détail correspondante (cohérent avec le code déjà en place : `router.push(detailHref)` sur `onClick` de la carte station).
- **Retour en arrière** : fil d'ariane cliquable + lien "Retour Zylo Office" fixe en bas de sidebar — deux mécanismes de sortie, jamais de bouton "retour" flottant.
- **Action destructive/de résolution** ("Résoudre") : bouton direct dans la ligne, pas de confirmation modale visible dans les références — à confirmer avant de l'implémenter sans garde-fou.
- **Erreurs** : non représentées dans ces maquettes (ce sont des états "nominaux" ou "déjà peuplés") → rien à en déduire, réutiliser le pattern déjà posé dans `frontend-foundations.md`.
- **Chargement** : non représenté → idem.
- **États vides** : représentés une fois (Stations), avec une distinction claire "réseau vide" (CTA de création) vs "recherche sans résultat" (CTA d'effacement de recherche) — pattern à répliquer partout où une liste peut être vide pour ces deux raisons différentes.

---

## Étape 14 — Regroupement / factorisation

Doublons identifiés à fusionner en un seul composant chacun :
- **Barre de filtres** (Stations / Alertes / Livraisons) → un seul composant `FilterBar` paramétrable (liste de pills + liste de dropdowns + recherche), pas trois implémentations.
- **Carte enveloppe** (KPI / cuve / info / synthèse) → un seul `Card` (voir Étape 4).
- **Bouton pill** (période dashboard / statut filtres) → un seul composant `PillToggle`/`PillGroup`.
- **Lien "Voir tout(e)s →"** → un seul composant `SectionLink`.
- **Badge de statut** (station/sonde/alerte/livraison) → un seul `StatusBadge` avec un mapping couleur→sémantique par domaine (le mapping est métier, pas le composant).
- **Barre de progression + %** → un seul `ProgressBar` avec label optionnel — **déjà en place dans le code actuel** (`ProductBar.tsx`, `TankMetricsColumn.tsx`) ; les références confirment que ce composant est correctement scopé et ne doit pas être réinventé par écran.
- **3 colonnes "Alertes/Livraisons/Fuites"** (détail station ET détail cuve) → un seul composant `RelatedEventsColumn` réutilisé deux fois avec des données différentes.

---

## Étape 15 — Architecture proposée (Design System Zylo Liquid)

```text
ZYLO LIQUID — DESIGN SYSTEM (screens)

01. Foundations
    ├── Colors            (à réconcilier avec frontend-foundations.md, voir §11)
    ├── Typography         (à réconcilier — Inter/Roboto vs Geist, voir §10)
    ├── Spacing            (paliers 56/64/72/88/100/120/160/220, base 4/8)
    ├── Radius             (carte ~12px, pill 999px)
    ├── Borders            (1px, --border)
    ├── Icons              (lucide-react — déjà en place, cohérent)
    └── Status colors      (dot vert/orange/rouge/gris — sémantique unique et partagée)

02. Layouts
    ├── App Layout          (Header 56 + Sidebar 220 + contenu)
    ├── List Layout          (titre/actions → filtres → table)
    ├── Detail Layout        (en-tête entité → bandeau alerte → contenu → 3 colonnes liées)
    └── Form Layout (modal)  (header → sections → footer actions)

03. Navigation
    ├── Sidebar (groupes + item actif + retour fixe)
    ├── Header (marque + fil d'ariane + statut sync + notifs + avatar)
    ├── Breadcrumb
    └── Tabs (avec compteur inline)

04. Components
    ├── Card (default | accent, modificateur bordure d'état)
    ├── StatusBadge
    ├── PillToggle / PillGroup
    ├── ProgressBar (+label)
    ├── FilterBar (pills + selects + search)
    ├── Table (header, row[+total], cell, pagination, emptyState)
    ├── AlertBanner
    ├── Modal (variant detail | variant form)
    ├── SectionLink ("Voir tout(e)s →")
    ├── KebabMenu
    └── TankGauge (composant signature Zylo Liquid — cylindre horizontal, DÉJÀ en place dans le code : `_components/TankGauge.tsx`, cohérent avec les références)

05. Patterns
    ├── Drill-down local (lien → modal de détail agrégé)
    ├── Navigation par clic sur ligne/carte entière
    ├── Recherche + filtres combinés sur une ligne
    ├── États vides différenciés (vide vs recherche infructueuse)
    └── 3 colonnes d'événements liés (Alertes/Livraisons/Fuites), réutilisées à 2 échelles

06. Page Templates
    ├── Dashboard (statut → KPI → tendance → table+alertes → activité)
    ├── List (Stations / Alertes / Livraisons — même squelette, contenu différent)
    ├── Detail (Station / Cuve — même squelette, densité différente)
    └── Form modal (Ajouter une cuve — modèle pour toute création d'entité)
```

---

## Étape 16 — Matrice de réutilisation

| Composant | Dashboard | Stations | Détail station | Ajouter cuve | Détail cuve | Alertes | Livraisons | Variante |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| Sidebar | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Global |
| Header | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Global |
| FilterBar | — | ✓ | — | — | — | ✓ | ✓ | Standard |
| PillToggle | ✓ (période) | ✓ (statut) | — | — | ✓ (période) | — | ✓ (période) | 2 usages : période / statut |
| Card | ✓ (KPI) | — | ✓ (cuve) | — | ✓ (info) | — | ✓ (synthèse) | default / accent |
| ProgressBar | ✓ | ✓ | ✓ | — | ✓ | — | — | Standard |
| StatusBadge | — | ✓ | ✓ | — | ✓ | ✓ | ✓ | Statut / sévérité / source |
| Table | ✓ | ✓ | — | — | — | ✓ | ✓ | Standard / avec total |
| AlertBanner | — | — | ✓ | — | ✓ | — | — | orange / rouge |
| Modal | ✓ (détail) | — | — | ✓ (form) | — | — | — | detail / form |
| TankGauge | — | — | ✓ | — | ✓ (grand) | — | — | compact / grand |
| SectionLink | ✓ | — | ✓ | — | ✓ | — | — | Standard |
| KebabMenu | — | ✓ | ✓ | — | ✓ | ✓ | ✓ | Standard |
| RelatedEventsColumn | — | — | ✓ | — | ✓ | — | — | Réutilisé identique |

Cette matrice confirme qu'aucun composant n'est utilisé une seule fois par hasard : tout ce qui apparaît sur ≥2 écrans est un vrai candidat à la factorisation ; le seul composant à usage unique observé est `AlertBanner`/`Modal (form)` — ils restent légitimes en tant que composants séparés car ils ont une fonction bien identifiée, réutilisable dès qu'un autre écran de création apparaîtra.

---

## Étape 18 — Livrable final (synthèse)

### A. Foundations
Voir §8 (Spacing), §10 (Typography), §11 (Colors), §7 (Icons — lucide-react confirmé). **Point d'action requis** : réconcilier avec `frontend-foundations.md` (couleurs warning, border/surface-muted, police Geist vs Inter/Roboto) — décision produit, pas technique.

### B. Layouts
App / List / Detail / Form — voir §2.

### C. Components
Liste complète en §3, regroupements en §14, architecture en §15.

### D. Variants
- `Card` : default, accent ; modificateur bordure d'état (alert/leak).
- `StatusBadge` : par domaine (station, sonde, alerte-sévérité, livraison-source).
- `Modal` : detail, form.
- `TankGauge` : compact (liste), detailed (cuve) — **déjà les noms réels utilisés dans le code** (`TankGauge.tsx`, prop `size`).

### E. States
Voir §12 — plusieurs états (hover/focus/disabled/erreur) sont mentionnés en légende texte mais non illustrés visuellement ; à confirmer avant implémentation plutôt qu'à inventer depuis une image statique.

### F. Patterns UX
Voir §13.

### G. Page templates
Voir §15, section 06.

### H. Règles de composition
1. Toute page = `AppLayout` (Header+Sidebar) + un des 4 templates de layout de contenu (§2) — jamais un layout ad hoc par page.
2. Toute liste filtrable utilise `FilterBar` tel quel, pas de réimplémentation locale des pills/selects/recherche.
3. Toute carte utilise l'enveloppe `Card` commune ; une bordure d'état (alerte/fuite) est un **modificateur**, jamais une nouvelle variante de carte.
4. Tout accès à une donnée liée (alertes/livraisons/fuites d'une entité) utilise `RelatedEventsColumn`, pas une liste ad hoc.
5. Toute valeur agrégée cliquable ouvre un `Modal` de type "detail" (drill-down local) plutôt qu'une navigation de page, sauf si l'entité a déjà sa propre page de détail (auquel cas c'est une navigation, pas une modal).

### I. Matrice de réutilisation
Voir §16.

---

## Points explicitement non tranchés (à valider avant implémentation)

1. **Palette** : plusieurs micro-écarts hex entre écrans (warning, border, surface-muted) et un écart plus net avec `frontend-foundations.md` (success/danger notamment) — je ne les ai pas arbitrés.
2. **Police** : Inter/Roboto/system-ui (annoté ici) vs Geist Sans (déjà en place) — à trancher.
3. **États non illustrés** (hover, focus, disabled, erreur de formulaire, loading, toast) — à définir au moment de l'implémentation, pas à déduire d'images statiques.
4. **Confirmation d'action destructive** ("Résoudre" une alerte) — aucune modale de confirmation visible dans les références ; à confirmer que c'est voulu (action directe) avant de l'implémenter sans garde-fou.

Ce document sert de base à la prochaine étape (implémentation), mais **ne préjuge d'aucune de ces quatre décisions** — elles doivent être validées par vous avant que je commence à coder quoi que ce soit.
