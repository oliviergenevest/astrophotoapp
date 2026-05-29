# PhotoApp – Webapp Droit à l'image

Progressive Web App de signature électronique du droit à l'image, en présentiel sur le téléphone du photographe.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework principal | Astro JS (SSR) |
| Composants interactifs | React (Astro Islands) |
| Style | Tailwind CSS v4 |
| Composants UI | shadcn/ui (Radix – preset Luma) |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Stockage fichiers | Supabase Storage |
| Fusion PDF | pdf-lib |
| Pad de signature | signature_pad |
| Emails transactionnels | Resend |
| Hébergement frontend | Vercel |
| Hébergement backend | Railway / Render |

---

## Prérequis

- **Node.js** v24.x (LTS) — version paire requise par Astro
- **npm** v11.x

```bash
node --version   # → v24.x.x
npm --version    # → v11.x.x
```

---

## Installation

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd photoapp
npm install
```

### 2. Intégrations Astro

```bash
npx astro add react
npx astro add tailwind
npx astro add node
```

### 3. Dépendances

```bash
npm install @supabase/supabase-js @supabase/ssr pdf-lib signature_pad resend
```

### 4. shadcn/ui

```bash
npx shadcn@latest init
# Sélectionner : Radix › preset Luma

npx shadcn@latest add button input card table dialog badge
```

> **Note :** Si l'init échoue avec `Could not find valid path aliases`, vérifier que `tsconfig.json` contient bien les alias (voir section Configuration ci-dessous).

### 5. Variables d'environnement

```bash
cp .env.example .env
```

Remplir `.env` avec vos propres clés :

```env
PUBLIC_SUPABASE_URL=votre_url_supabase
PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role
RESEND_API_KEY=votre_clé_resend
```

---

## Configuration

### `tsconfig.json`

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### `astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), tailwind()],
  vite: {
    resolve: {
      alias: {
        '@': '/src'
      }
    }
  }
});
```

### `package.json` — version Node

```json
"engines": {
  "node": ">=24.0.0"
}
```

### `.nvmrc`

```
24
```

---

## Structure du projet

```
src/
├── components/
│   └── ui/          # Composants shadcn/ui
├── layouts/         # Layouts Astro partagés
├── lib/
│   └── supabase.ts  # Client Supabase
├── middleware.ts    # Protection des routes (auth)
└── pages/
    ├── index.astro          # Landing page (publique)
    ├── login.astro          # Connexion photographe
    ├── dashboard/           # Back office photographe
    ├── nouvelle-signature/  # Formulaire de signature
    ├── signer/[id].astro    # Page kiosque (plein écran)
    ├── confirmation/[id].astro
    └── contrats/            # Gestion des modèles PDF
```

---

## Lancer le projet en développement

```bash
npm run dev
# → http://localhost:4321
```

## Build de production

```bash
npm run build
npm run preview
```

---

## Pages de l'application

| Route | Accès | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Public | Connexion photographe |
| `/dashboard` | Privé | Liste des signatures |
| `/nouvelle-signature` | Privé | Initier une signature |
| `/signer/:id` | Public | Page kiosque de signature |
| `/confirmation/:id` | Privé | Récapitulatif post-signature |
| `/contrats` | Privé | Gestion des modèles de contrats |

---

## Notes

- Les routes privées sont protégées par le middleware Astro (`src/middleware.ts`) via Supabase Auth
- La session reste active 30 jours grâce au refresh token automatique
- L'app fonctionne hors ligne (PWA + Service Worker + IndexedDB)
- Les PDFs signés sont générés par fusion du contrat original via `pdf-lib`