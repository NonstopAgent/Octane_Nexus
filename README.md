# Octane Nexus

Creator daily loop MVP: discover ideas → production → post lab → clip studio → schedule → monitoring.

## 5-minute setup (local)

1. **Install and run**
   ```bash
   npm install
   npm run dev
   ```

2. **Environment**
   Create `.env.local` with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   Optional for demo mode:
   ```env
   NEXT_PUBLIC_DEMO_MODE=true
   ```

3. **Database**
   - Run Supabase migrations: `supabase db push`  
   - Or paste the SQL from `supabase/migrations/*.sql` into the Supabase SQL editor (in order).

4. Open [http://localhost:3000](http://localhost:3000).

## Demo mode

- **Enable:** Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local`.
- **Try demo:** Go to `/login` and use “Try Demo”, or go to **Settings → Demo Data** and click **Seed Demo Data**.
- **Loop to test:** Trends → Send to Production → Production board → Post Lab → Clip Studio → Schedule → Monitoring.  
  Creator hub: `/dashboard/creator`. After seeding, use “Go to Production” or open Production from the hub.

## API keys (browser)

- **Settings → Developer:** OpenAI, Pexels, and RapidAPI keys are stored in **browser localStorage** (not server env).  
- UI banners (e.g. “OpenAI key missing”) reflect these local keys.  
- For server-only calls (e.g. some API routes), CI/Vercel may use env vars; the app is designed so MVP features work with keys in the browser.

## Deploy on Vercel

- Use **standard Next.js** deployment (Vercel detects the framework). Do **not** use static export: the app uses dynamic API routes and cookies.
- Set the same env vars in the Vercel project (Supabase URL/keys, optional `NEXT_PUBLIC_DEMO_MODE=true`).
- No long-running server jobs; safe for serverless.

## Scripts

- `npm run dev` — development server  
- `npm run build` — production build  
- `npm run start` — start production server  
- `npm run lint` — ESLint
