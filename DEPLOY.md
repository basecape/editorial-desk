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

## Optional: custom domain

If you want `editorial.yoursite.co.za` instead of `editorial-desk-abc123.vercel.app`:

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
