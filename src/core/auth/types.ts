export interface User {
  id: string;
  email: string;
  fullName: string;
  status: string;
  /** Vrai après une création de compte par un tiers (module Personnel,
   * mot de passe temporaire) — force l'écran de changement de mot de
   * passe avant tout accès normal à l'application. */
  mustChangePassword: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
}
