# Nutrix — Calorie & Macro Tracker

Nutrix is a modern, privacy-friendly calorie and macronutrient tracker built with Next.js and Firebase, featuring USDA FoodData Central integration for accurate nutrition data. This single README contains everything you need: features, setup, architecture, deployment, troubleshooting, and more.

![Logo](https://github.com/AthemiS13/nutrix/blob/main/public/nutrix-logo.png)

## Table of Contents
- Features
- Screenshots & Assets
- Tech Stack
- Quick Start
- Environment Variables
- Firestore Security Rules
- Usage Guide
- Project Structure
- Architecture Overview
- Scripts
- Deployment (Cloudflare Pages)
- Performance & Limits
- Troubleshooting
- Known Limitations
- Roadmap
- Contributing
- License

![Dashboard Overview](https://github.com/AthemiS13/nutrix/blob/main/public/iPhone%2015%20Pro-1.jpg)

## Features
- Authentication: Email/password auth, password reset (Firebase Auth)
- Profiles: Body weight, daily calorie goal, optional target weight change
- Ingredient Search: Live USDA FoodData Central integration
- Recipes: Build recipes from ingredients with automatic nutrition per 100g and totals
- Meal Logging: Log portions of recipes per day; view/edit today’s meals
- Dashboard: Daily calorie progress, macros chart, 7‑day trends
- UI/UX: Clean dark theme, responsive layout, loading and error states
- Data: User-scoped data in Firestore with strict security rules
- Performance: Client caching for USDA results, static export for fast delivery

![Macros](https://github.com/AthemiS13/nutrix/blob/main/public/iPhone%2016%20Pro-1.jpg)

## Tech Stack
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4
- Firebase Auth + Firestore
- USDA FoodData Central API
- Chart.js via `react-chartjs-2` (and `recharts` available)
- Lucide React icons, date-fns, React Query (@tanstack/react-query)

![Recipe Builder](https://github.com/AthemiS13/nutrix/blob/main/public/iPhone%2016%20Pro.jpg)

## Quick Start
```bash
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000

## Environment Variables
Set the following (see `.env.example`):
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_USDA_API_KEY=
```

## Firestore Security Rules
Add in Firebase Console → Firestore → Rules:
```javascript
rules_version = '2';
service cloud.firestore {
	match /databases/{database}/documents {
		match /users/{userId} {
			allow read, write: if request.auth != null && request.auth.uid == userId;
			match /recipes/{recipeId} {
				allow read, write: if request.auth != null && request.auth.uid == userId;
			}
			match /meals/{mealId} {
				allow read, write: if request.auth != null && request.auth.uid == userId;
			}
		}
	}
}
```

## Usage Guide
1. Sign Up: Create an account with email/password
2. Profile: Enter body weight and daily calorie goal
3. Create Recipe:
	 - Search ingredients via USDA
	 - Add ingredients and masses (grams)
	 - Save to compute totals and per‑100g
4. Log Meal:
	 - Select saved recipe
	 - Enter consumed mass
	 - Day totals update instantly
5. Dashboard:
	 - Track daily calories and macros
	 - Review 7‑day trend chart

## Project Structure
```
Nutrix/
├─ app/                 # Next.js App Router (layout, page, globals)
├─ components/          # UI components (auth, dashboard, meals, recipe, ...)
├─ contexts/            # React providers (AuthContext)
├─ lib/                 # firebase, usda-api, services, types, utils
├─ public/              # Static assets
├─ next.config.ts       # output: 'export' (static)
├─ package.json         # Scripts & dependencies
├─ tsconfig.json        # TypeScript config
├─ .env.example         # Env template
└─ README.md            # You are here
```

## Architecture Overview
- Auth: Firebase Auth (email/password)
- Data: Firestore under `users/{uid}` with `recipes` and `meals` subcollections
- USDA API: Client-side search and detail fetch with in-memory cache
- Rendering: Client-first; statically exported via Next.js `output: 'export'`
- Charts: Chart.js (`react-chartjs-2`)

Simplified data model:
```ts
// Profile
{ uid, email, bodyWeight, dailyCalorieGoal, targetMonthlyWeightChange? }

// Recipe
{ id, userId, name, ingredients: [{ ingredient, mass }],
	totalNutrients, nutrientsPer100g, totalMass }

// Meal
{ id, userId, recipeId, recipeName, mass, nutrients, date }
```

## Scripts
Run in project root:
- `npm run dev`: Start dev server
- `npm run build`: Build static export to `out/`
- `npm start`: Start production server (SSR not used; export is static)
- `npm run lint`: Lint the codebase

## Deployment (Cloudflare Pages)
1. Push repository to GitHub
2. Cloudflare Dashboard → Workers & Pages → Create Application → Pages → Connect Git
3. Build settings:
	 - Framework preset: Next.js
	 - Build command: `npm run build`
	 - Output directory: `out`
4. Add environment variables (same as `.env.local`)
5. Deploy and add domain to Firebase Auth authorized domains

Wrangler CLI alternative:
```bash
npm run build
npx wrangler pages publish out --project-name=nutrix
```

## Performance & Limits
- Static export + CDN delivery (Cloudflare Pages)
- Client caching for USDA requests
- Free tier friendly:
	- Cloudflare Pages: builds + unlimited bandwidth
	- Firebase Spark: typical read/write/auth within limits
	- USDA API: free with key

## Troubleshooting
- Module not found → `npm install`
- Firebase errors → verify `.env.local` and authorized domains
- USDA search fails → check `NEXT_PUBLIC_USDA_API_KEY`
- Port in use → `npm run dev -- -p 3001`
- Charts missing → verify Chart.js data and imports

## Known Limitations
- No offline/PWA support
- No data export (CSV/PDF)
- No barcode scanning

## Roadmap
- Weight history and charts
- Macro targets per day
- Meal planning and templates
- Data export (CSV/PDF)
- Media uploads for recipes
- Theme toggle

## Contributing
Contributions are welcome. Please:
- Use feature branches like `feat/<short-description>` or `fix/<short-description>`
- Prefer conventional commit messages (e.g., `feat(recipe): add per-100g panel`)
- Ensure `npm run build` and `npm run lint` pass before opening a PR

