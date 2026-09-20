import type { Preview } from '@storybook/nextjs-vite'
import React from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AuthContext } from '../src/core/auth/AuthContext'
import { OrganizationContext } from '../src/core/organization/OrganizationContext'
import { PermissionContext } from '../src/core/rbac/PermissionContext'
import { installMockApi } from './mockApi'

// Feuille de style globale de l'app réelle (directives Tailwind + tokens de
// design — couleurs, rayons, ombres...) — sans cet import, Storybook rend
// des composants "nus" : classes Tailwind présentes dans le DOM mais aucune
// règle CSS chargée pour les interpréter.
import '../src/app/globals.css'

import administration from '../src/locales/fr/administration.json'
import applications from '../src/locales/fr/applications.json'
import auth from '../src/locales/fr/auth.json'
import common from '../src/locales/fr/common.json'
import dashboard from '../src/locales/fr/dashboard.json'
import navigation from '../src/locales/fr/navigation.json'
import organizations from '../src/locales/fr/organizations.json'
import publicApplications from '../src/locales/fr/publicApplications.json'
import publicCommunity from '../src/locales/fr/publicCommunity.json'
import publicHelp from '../src/locales/fr/publicHelp.json'
import publicHome from '../src/locales/fr/publicHome.json'
import publicNav from '../src/locales/fr/publicNav.json'
import publicPricing from '../src/locales/fr/publicPricing.json'
import zyloLiquid from '../src/locales/fr/zyloLiquid.json'

// Un seul objet "messages", au même format que src/shared/i18n/request.ts
// (namespace -> JSON, toutes les namespaces du fichier réel — voir
// src/shared/i18n/request.ts) — nécessaire pour que useTranslations()
// fonctionne dans les composants réels de l'app, y compris les pages
// publiques (vitrine) et le tableau de bord/administration.
const messages = {
  administration, applications, auth, common, dashboard, navigation, organizations,
  publicApplications, publicCommunity, publicHelp, publicHome, publicNav, publicPricing,
  zyloLiquid,
};

// Intercepte tout appel réseau réel (voir mockApi.ts) — installé une seule
// fois, avant le premier rendu de toute story.
installMockApi();

const MOCK_USER = { id: 'user-1', email: 'demo@zylo.example', fullName: 'Amina Ndongo', status: 'active', mustChangePassword: false };
const MOCK_ORGANIZATION = { id: 'org-1', name: 'Zylo Démo', slug: 'zylo-demo', status: 'active' };

const preview: Preview = {
  decorators: [
    (Story) => {
      const [queryClient] = React.useState(
        () => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
      );
      return (
        <NextIntlClientProvider locale="fr" messages={messages} timeZone="Africa/Douala">
          <QueryClientProvider client={queryClient}>
            {/* Utilisateur/organisation/permissions simulés, toujours "connecté"
               et toujours autorisé — une story de page montre son contenu réel,
               jamais un écran de connexion ou un refus de permission. Injecté
               directement via les Context.Provider bruts (exportés uniquement
               pour Storybook, voir AuthContext.tsx) plutôt que via les vrais
               AuthProvider/OrganizationProvider/PermissionProvider, qui
               appelleraient une vraie API au montage. */}
            <AuthContext.Provider value={{ user: MOCK_USER, loading: false, login: async () => {}, register: async () => {}, logout: async () => {}, changePassword: async () => {} }}>
              <OrganizationContext.Provider
                value={{
                  organizations: [MOCK_ORGANIZATION],
                  currentOrganization: MOCK_ORGANIZATION,
                  loading: false,
                  selectOrganization: () => {},
                  reload: async () => {},
                }}
              >
                <PermissionContext.Provider value={{ loading: false, can: () => true, reload: async () => {} }}>
                  <Story />
                </PermissionContext.Provider>
              </OrganizationContext.Provider>
            </AuthContext.Provider>
          </QueryClientProvider>
        </NextIntlClientProvider>
      );
    },
  ],
  parameters: {
    nextjs: {
      // Requis pour que useRouter()/usePathname() (next/navigation, App
      // Router) fonctionnent dans les composants réels de l'app — sans ce
      // flag, @storybook/nextjs-vite ne mocke pas next/navigation et lève
      // "invariant expected app router to be mounted".
      appDirectory: true,
    },
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;
