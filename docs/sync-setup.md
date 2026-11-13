# Turning on sign-in and sync

Out of the box the site saves progress in the browser only. Following these steps adds "Sign in with GitHub" and stores progress in a free [Supabase](https://supabase.com) database, so it follows you between devices. It takes about 10 minutes.

You will create three things: a Supabase project (the database and login service), a GitHub OAuth app (so GitHub knows who is asking for sign-in), and two environment variables that point the site at Supabase.

## 1. Create a Supabase project

1. Sign up at https://supabase.com and create a new project. Any name and region will do. Save the database password it asks for somewhere safe. The site never needs it.
2. When the project is ready, open **Project Settings**, then **API** (or **API Keys**). Keep this tab open. You need two values from it later:
   - the **Project URL**, which looks like `https://abcdefgh.supabase.co`
   - the **anon** key, which newer projects label **publishable** key

## 2. Create the table

1. In Supabase, open the **SQL Editor**.
2. Paste in the contents of [`supabase/schema.sql`](../supabase/schema.sql) and run it.

This creates a `progress` table with one row per user, and security policies so each signed-in user can read and write only their own row.

## 3. Create a GitHub OAuth app

1. On GitHub, go to **Settings**, then **Developer settings**, then **OAuth Apps**, and click **New OAuth App**. The direct link is https://github.com/settings/developers.
2. Fill it in:
   - **Application name:** FDE Prep
   - **Homepage URL:** your site's address, for example `https://fde-prep.vercel.app`. Use `http://localhost:3000` if you have not deployed yet.
   - **Authorization callback URL:** your Supabase Project URL followed by `/auth/v1/callback`, for example `https://abcdefgh.supabase.co/auth/v1/callback`.
3. Click **Register application**. Copy the **Client ID**, then click **Generate a new client secret** and copy the secret.

## 4. Connect GitHub to Supabase

1. In Supabase, open **Authentication**, then **Sign In / Providers**, and choose **GitHub**.
2. Turn it on, paste the Client ID and Client Secret from step 3, and save.
3. Open **Authentication**, then **URL Configuration**:
   - Set **Site URL** to your deployed site's address.
   - Under **Redirect URLs**, add both `http://localhost:3000` and your deployed address. Sign-in sends you back to whichever one you started from, and Supabase refuses addresses that are not on this list.

## 5. Add the environment variables

For local development, copy `.env.example` to `.env.local` and fill in the two values from step 1:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Restart `npm run dev` afterward.

On Vercel, open your project's **Settings**, then **Environment Variables**, add the same two names and values, and redeploy. They are read at build time, so a redeploy is required.

## 6. Check that it works

1. Open the site. A **Sign in with GitHub** button should appear in the header.
2. Sign in. Your GitHub name appears in the header with "Synced" beside it.
3. Solve a problem or tick a task, then open the site in a different browser and sign in. The same progress should be there.
4. In Supabase, open **Table Editor**, then `progress`. You should see one row with your progress as JSON.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| No sign-in button | The environment variables are missing or the site was not rebuilt after adding them |
| GitHub shows "redirect_uri is not associated with this application" | The callback URL in the GitHub OAuth app does not match `<Project URL>/auth/v1/callback` |
| You sign in but land on the wrong site, or on localhost | The address you started from is not in Supabase's Redirect URLs list |
| Header shows "Sync failed" | The `progress` table or its policies are missing. Run `supabase/schema.sql` again |

## Is it safe to expose the key?

Yes. The anon (publishable) key is designed to be shipped to browsers. On its own it grants nothing. Every request is checked against the row-level security policies in `schema.sql`, which only let a signed-in user touch the row whose `user_id` is their own. Never put the **service role** (secret) key or the database password in the site or in this repository.
