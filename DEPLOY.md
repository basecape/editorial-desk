# Deploying The Editorial Desk

A complete, no-command-line walkthrough. About 20 minutes from zero to live URL.

You'll end up with the app running at a URL like `editorial-desk.vercel.app` (or your own domain), accessible from any device, with your data saved per browser.

---

## What you're about to pay for

- **Vercel hosting:** free (Hobby plan). Fine for personal use; if you put it behind a custom domain and pile on team members, you may bump into limits.
- **Anthropic API:** pay-as-you-go. Roughly R3–R7 per generated article with web search on, R0.50–R1.50 for topic generation. A reasonable budget for an active site is R200–R500/month.
- **Domain (optional):** R150–R300/year if you want a custom URL.

Anthropic requires a credit card to start. Vercel doesn't, for the free tier.

---

## Step 1 — Get an Anthropic API key

1. Go to **console.anthropic.com** in your browser.
2. Sign up with an email or Google account.
3. Add a payment method: Settings → Billing → "Add payment method". Add R200 or so of credit to start.
4. Go to **Settings → API Keys → Create Key**. Name it "editorial-desk".
5. Copy the key. It starts with `sk-ant-api03-...`. **Save it in a notes app or password manager now — Anthropic won't show it again.**

---

## Step 2 — Make a GitHub account (skip if you already have one)

1. Go to **github.com**.
2. Sign up with your email.
3. Verify the email.

You don't need to learn Git. You'll just use the web interface to upload files.

---

## Step 3 — Create the GitHub repo

1. Once signed in, click the **+** in the top-right of GitHub → **New repository**.
2. Repository name: `editorial-desk` (or whatever you want).
3. Set it to **Private** (recommended — keeps your code yours).
4. Tick **Add a README file**.
5. Click **Create repository**.

---

## Step 4 — Upload the project files

You should now be looking at your new empty repo with just a README. Now upload the files I gave you.

1. Click **Add file → Upload files** (top of the file list).
2. **Drag the entire `hosted-version` folder contents** into the upload area. Important: drag the **contents**, not the folder itself. On a Mac, open the folder and select-all + drag. The structure when uploaded should look like:
   ```
   app/
   components/
   .env.local.example
   .gitignore
   next.config.mjs
   package.json
   DEPLOY.md
   ```
3. Wait for the upload to finish. GitHub shows green ticks beside each file when ready.
4. Scroll down. In the "Commit changes" box, leave the default message ("Add files via upload") and click **Commit changes**.

You should now see your files in the repo.

> **On a phone?** GitHub's mobile site doesn't support drag-drop uploads of folders. Easiest fix: use a laptop for this step. If you really can't, use **github.dev** (open the repo, press `.` on a keyboard) — but at that point a laptop is just easier.

---

## Step 5 — Sign up for Vercel

1. Go to **vercel.com**.
2. Click **Sign Up**.
3. Choose **Continue with GitHub** — this auto-connects the two accounts.
4. Approve the access Vercel asks for.
5. When asked, pick the **Hobby** plan (free).

---

## Step 6 — Deploy

1. On the Vercel dashboard, click **Add New… → Project**.
2. You'll see a list of your GitHub repos. Find **editorial-desk** and click **Import**.
3. On the configure screen, you'll see:
   - **Framework Preset:** Next.js (auto-detected ✓)
   - **Root Directory:** `./` (leave as-is)
   - **Build Command:** leave default
   - **Environment Variables:** ← this is the one you need to fill in
4. Expand **Environment Variables**. Add:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** paste your `sk-ant-api03-...` key from Step 1
   - Click **Add**.
5. Click **Deploy**.

Vercel will take 1–3 minutes to build. When it's done, you'll see a celebratory screen with a screenshot of your live app and a URL like `editorial-desk-abc123.vercel.app`.

Click the URL. You're live.

---

## Step 7 — Use it

Same app as the artifact, but now:
- Works on any device, any browser
- Your data is saved in **each browser's** local storage (per-device). The phone has its data, the laptop has its data. They don't sync.
- Generation actually works on mobile because the API call goes through your server proxy, not the mobile app's restricted webview.

---

## Connect to WordPress (recommended)

This lets the app push approved articles to your WordPress site automatically as draft posts. You then review and publish from WordPress admin.

### 1. Enable Application Passwords in WordPress

Application passwords are built into WordPress 5.6+. They're separate from your login password, can be revoked individually, and don't grant admin access.

1. Log into your WordPress admin.
2. Go to **Users → Profile** (or **Users → Your username**).
3. Scroll to the **Application Passwords** section near the bottom.
4. In "New Application Password Name", enter: `Editorial Desk`
5. Click **Add New Application Password**.
6. WordPress shows the password — looks like `xxxx xxxx xxxx xxxx xxxx xxxx` (24 chars). **Copy it now — you won't see it again.** Spaces are part of it but can be removed.

If you don't see Application Passwords, your host may have disabled them. Bluehost, SiteGround, and most quality hosts have them enabled. Some shared hosts disable for "security" — contact support to enable.

### 2. Add three environment variables in Vercel

1. Vercel dashboard → your project → **Settings → Environment Variables**.
2. Add three new variables (Production, Preview, and Development scopes):
   - **`WP_URL`** — your WordPress site URL, no trailing slash. Example: `https://yoursite.co.za`
   - **`WP_USER`** — your WordPress username (the one you log in with).
   - **`WP_APP_PASSWORD`** — paste the application password from step 1.
3. Save.
4. Go to **Deployments** → click the most recent → three dots ⋯ → **Redeploy** so the new env vars take effect.

### 3. Verify the connection

Open your live app, go to the **Library** tab. Top of the page shows a banner:

- ✅ Green: "Connected to WordPress as [your name]" → working.
- ⚠️ Yellow: "WordPress credentials not set" → env vars missing, didn't redeploy, or wrong values.

### 4. How pushing works

In the Library, each article has a 🚀 button. Click it:

1. The article is converted to clean HTML.
2. The WordPress REST API creates a new post with **status: draft** (unpublished).
3. Categories are matched by name — if your WordPress has a category called "Fitness", that's where Fitness articles land. If not, the post falls into Uncategorised.
4. Tags are created automatically if they don't exist.
5. If you have Yoast SEO active, the meta description gets set too.
6. The library item flips to "Deployed" and shows an "in WordPress" link that opens the post's edit page in WP admin.

The post is **never published automatically** — it's always a draft. You review in WordPress, add featured image, tweak categories if needed, then hit Publish.

### Troubleshooting

- **"401 Authentication failed"** → wrong username or app password. Generate a fresh app password and update the env var.
- **"403 Forbidden"** → user doesn't have publishing rights. Make sure the WP user is an Editor or Administrator.
- **"Could not reach WordPress"** → wrong URL, site is down, or REST API is blocked. Visit `https://yoursite.co.za/wp-json/wp/v2/posts` in your browser — should return JSON, not an error page.
- **"Cloudflare/firewall blocking"** → some security plugins (Wordfence, etc.) block REST API requests by default. Either whitelist your Vercel IP, or temporarily disable the rule.

---

## Set up the database (required)

The app stores users, content, and activity in Vercel KV — a Redis database that runs alongside your app.

### 1. Add Vercel KV to your project

1. In Vercel, open your project → **Storage** tab (top of project).
2. Click **Create Database** → choose **KV** → name it `editorial-desk-kv` (or anything).
3. Pick a region close to you (e.g. London for SA).
4. Click **Create**.
5. After creation, click **Connect Project** and select your `editorial-desk` project. Vercel will automatically add the required environment variables (`KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`) to your project.
6. Go to **Deployments** → three dots ⋯ on the latest → **Redeploy** so the new env vars take effect.

Free tier is 30,000 commands/month and 256MB of storage — more than enough for a small team.

### 2. Create the first admin

After redeploy, open your live URL. Because the database is empty, the app shows a one-time **"Create the first admin"** setup screen.

1. Enter your name, a username (used to sign in), and an 8+ character password.
2. Click **Create admin account**.
3. You're signed in and the full app loads.

From now on, that screen is gone forever. To add more users:

1. Sign in as admin.
2. Click the **Admin** tab (only visible to admins).
3. Click **Add user**, fill in name/username/password/role, share credentials with them out-of-band.

### Roles

- **Admin** — everything: generate, approve, publish, push to WP, manage users, see reports.
- **Editor** — generate, approve topics & drafts, edit drafts, push to WP. No user management.
- **Contributor** — generate topics and drafts. Cannot approve anything. Their work shows up for admin/editor to review.

---

## Optional: stock images via Pexels

Auto-attaches a relevant featured image to every WordPress push.

### 1. Get a Pexels API key

1. Go to **pexels.com/api** in your browser.
2. Click **Get Started** → sign up (email or Google).
3. Once signed in, copy your **API key** from the dashboard. Looks like `563492ad6f917000010000017ea...` (very long).

Pexels is free, royalty-free, no attribution required (but we add photographer credit as the WP image caption anyway). Limits are 200 requests/hour, 20,000/month — far more than you'll use.

### 2. Add the env var in Vercel

1. Vercel → your project → **Settings → Environment Variables**.
2. Add: **`PEXELS_API_KEY`** with your key as the value.
3. Save → go to **Deployments** → redeploy.

### 3. How it works

- When an article is generated, Claude is asked to suggest a 4–6 word stock-photo search query (it appears in the article's IMAGE_QUERY metadata).
- When you click 🚀 to push to WordPress, the system searches Pexels with that query.
- The top match is uploaded to your WordPress media library and set as the post's featured image.
- The photographer's name is set as the image caption (via Pexels' API attribution courtesy).
- A small thumbnail of the chosen image appears beside the article in your Library.

If Pexels can't find an image, or `PEXELS_API_KEY` isn't set, the article is still pushed — just without a featured image. You can always add one manually in WordPress.

---

## Optional: custom domain

1. In Vercel → your project → **Settings → Domains**.
2. Add the domain you want. Vercel shows you the DNS records to add.
3. Log into your domain registrar (Afrihost, domains.co.za, whoever), and add those DNS records.
4. Within a few minutes to a few hours, the domain points at Vercel.

---

## Updating later

When you (or I) make changes to the code:

1. Go to your GitHub repo.
2. Open the file to change → click the pencil ✎ → paste new content → commit.
3. Vercel detects the commit and auto-redeploys within 1–2 minutes.

If you ever want to update all files at once, drag-and-drop replacement files via **Add file → Upload files** — GitHub will overwrite the existing ones.

---

## Cross-device data sync (later, if you want it)

The current setup saves data per browser. If you want your topics and library to sync across phone and laptop, the upgrade is to add a database. Easiest path:

- **Vercel KV** or **Vercel Postgres** (one-click, integrated with the dashboard)
- Or **Supabase** (free tier is generous, separate signup)

This is a separate project of a few hours' work. I can write it when you're ready.

---

## Troubleshooting

**"Build failed" on Vercel**
- Open the build logs in Vercel → click the failed deployment → "View Function Logs". The error is usually obvious (typo in a file, missing import).
- Most common cause: a file didn't upload. Check the repo has all 9 files/folders.

**"ANTHROPIC_API_KEY environment variable not set"**
- You forgot Step 6.4, or pasted the value into the wrong field.
- Fix: Vercel → Project → Settings → Environment Variables. Confirm the key is there. Then go to Deployments → click the latest → "Redeploy".

**Generation returns "API 401"**
- Your API key is wrong or expired. Regenerate in Anthropic console, update in Vercel env vars, redeploy.

**Generation returns "API 429"**
- Rate limited by Anthropic. Wait a minute and retry. If it happens often, contact Anthropic to raise limits.

**Generation hangs or times out**
- Web search calls can take 60–120 seconds. The route is configured for 5-minute timeouts. If it's still timing out, reduce `count` in topic generation or word count in article generation.

**Topics generate but article writes fail**
- Check the browser console for the actual error. Most likely the API key has insufficient credit, or the model name is outdated. If you see "model not found", update the model in `components/EditorialDesk.jsx` (search for `claude-sonnet-4-20250514`).
