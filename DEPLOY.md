# Deploying westonwhat.com to Cloudflare Pages

This guide goes from "folder on my computer" to "live at https://westonwhat.com" without guessing at DNS.

> Cloudflare renames dashboard menus now and then. If a label below doesn't match exactly, look for the closest one. The steps themselves don't change.

## What gets deployed

`npm run build` turns this project into a plain folder, `dist/`. That folder is the website: HTML, CSS, JS, images, `_headers` (security headers) and `_redirects` (friendly short URLs). Cloudflare serves it as-is. Nothing runs on a server.

There are two ways to get it there:

| | **A. GitHub + automatic builds** (recommended) | **B. Direct Upload** |
|---|---|---|
| How you publish | Commit a change to GitHub. Cloudflare builds and publishes it in about a minute. | Run `npm run build` yourself and upload `dist/`. |
| Needs | A free GitHub account | Node.js on your computer |
| Edit from your phone | Yes, in GitHub's web editor | No |
| Previews of unfinished work | Yes, every branch gets its own preview link | Manual |
| Catch | None really | **A Direct Upload project can never be switched to GitHub later.** You'd have to make a new project. |

The rest of this guide uses **A**. Option B is at the end.

---

## A1. Put the project on GitHub

1. Create a free account at github.com if you don't have one.
2. Make a **new repository**, for example `westonwhat`. **Private** is fine; Cloudflare can still read it. Don't add a README; this project has one.
3. Upload the project. Either:
   - **GitHub Desktop** (easiest): *File → Add local repository* → pick the `westonwhat` folder → publish.
   - **Command line**, from inside the folder:
     ```bash
     git init
     git add .
     git commit -m "Node online"
     git branch -M main
     git remote add origin https://github.com/YOUR-NAME/westonwhat.git
     git push -u origin main
     ```

Don't upload `dist/`; Cloudflare builds its own. The `.gitignore` file already excludes it.

## A2. Create the Pages project

1. Log in at **dash.cloudflare.com**.
2. In the sidebar, open **Workers & Pages** (it may sit under **Compute**). Select **Create application**.
3. Cloudflare now steers new projects toward Workers. Choose the **Pages** option. If you only see Worker options, look for a link near the bottom of the page reading **"Looking to deploy Pages? Get started."** Then pick **Import an existing Git repository** (sometimes labeled **Connect to Git**).
4. Connect GitHub. Grant access to **only** the `westonwhat` repository. Then select it and choose **Begin setup**.
5. Fill in the settings:

   | Setting | Value |
   |---|---|
   | Project name | `westonwhat` (this becomes `westonwhat.pages.dev`) |
   | Production branch | `main` |
   | Framework preset | **None** |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | leave empty |
   | Environment variables | none needed. The `.node-version` file asks for Node 22. |

6. Select **Save and Deploy**. The log should end with `westonwhat build complete` and then a successful deployment.

> If the name `westonwhat` is taken on pages.dev, Cloudflare adds a few random characters. That's fine. Your real address will be westonwhat.com anyway.

## A3. Preview it before going public

Open the `https://westonwhat.pages.dev` link from the deployment screen. Click around on your phone too. Nothing is connected to westonwhat.com yet, so there's no rush.

(If the link shows a DNS error right away, wait a minute. New pages.dev addresses take a moment to appear.)

---

## A4. Check what's already in DNS (do this before connecting the domain)

Your domain is already on Cloudflare, so it may already have DNS records from your registrar or an old parking page.

1. In the dashboard, open **westonwhat.com → DNS → Records**.
2. Look for records whose **Name** is `westonwhat.com` (shown as `@` in some views) or `www`, of type **A**, **AAAA** or **CNAME**.

| What you see | What it means | What to do |
|---|---|---|
| No `@` or `www` records | Clean slate | Go straight to A5 |
| A/AAAA/CNAME records pointing at a registrar parking page or "coming soon" page | Leftovers that would compete with the new site | Note down what they say. These are the only ones that need to go, and Cloudflare will offer to replace them in A5. |
| Records you recognize and still use (an old site, a service) | Something else lives at that name | Stop and decide. Connecting the domain would replace it. |
| **MX** or **TXT** records | Email and verification records | **Leave them alone.** They don't affect the website and removing them can break email. |

If you're not sure what something is, send me a screenshot of the records list before deleting anything.

**Don't add a CNAME for the site by hand.** Cloudflare's docs warn that a manually added record makes the domain fail with a 522 error. The next step creates the correct record for you.

## A5. Connect westonwhat.com

1. Go to **Workers & Pages → westonwhat (your project) → Custom domains**.
2. Select **Set up a custom domain**, enter `westonwhat.com`, then **Continue**.
3. Cloudflare shows the DNS record it will create: a **CNAME** for `westonwhat.com` pointing at your `pages.dev` address. If an old record from A4 conflicts, this screen tells you. Confirm with **Activate domain**.
4. The domain shows **Initializing** or **Pending** for a few minutes while Cloudflare issues the HTTPS certificate. Then it changes to **Active**.

## A6. Make www.westonwhat.com work too (recommended)

People type `www.` out of habit. The cleanest setup is to have one real address, westonwhat.com, and send `www` there.

1. **Give www a home.** In **Custom domains**, also add `www.westonwhat.com`, exactly as in A5. This creates its DNS record and HTTPS certificate.
2. **Send it to the main address.** Open **westonwhat.com → Rules** and create a **Redirect Rule**.
   - If Cloudflare offers a template called **"Redirect from WWW to root"**, use it.
   - Otherwise set it up by hand:
     - **When incoming requests match:** wildcard pattern, request URL `https://www.*`
     - **Then:** dynamic redirect to `https://${1}`
     - **Status code:** `301`
     - **Preserve query string:** on

Without step 2, both addresses still work and show the same site. Every page also tells search engines that the westonwhat.com version is the real one. So the redirect is tidy, not essential.

## A7. Verify DNS and HTTPS

- **Custom domains:** both domains say **Active**.
- **Browser:** `https://westonwhat.com` shows the padlock and the skull. `https://www.westonwhat.com` lands on `https://westonwhat.com`.
- **Force HTTPS:** under **westonwhat.com → SSL/TLS → Edge Certificates**, make sure **Always Use HTTPS** is on.
- **Command line** (optional):
  ```bash
  curl -I https://westonwhat.com/          # expect HTTP/2 200 and a content-security-policy header
  curl -I https://www.westonwhat.com/      # expect 301 with  location: https://westonwhat.com/
  curl -I https://westonwhat.com/nope      # expect 404 (the blue screen page)
  ```
- **Security headers:** paste `https://westonwhat.com` into securityheaders.com. It should find a Content-Security-Policy, X-Frame-Options, Referrer-Policy and friends. They come from the generated `_headers` file.

---

## Making changes later

1. Edit content: add a post, drop in photos, change `site.json`.
2. Preview with `npm run dev` if you're on your computer. This step is optional.
3. Commit and push. GitHub Desktop: *Commit to main → Push origin*. Or edit straight on github.com, including from your phone.
4. Cloudflare rebuilds automatically. The new version is live about a minute later.

- **Previews:** push to any branch other than `main` (say, `new-photos`) and Cloudflare gives that branch its own preview link without touching the live site.
- **Undo:** in **Workers & Pages → westonwhat → Deployments**, any earlier deployment can be rolled back with one click.
- **Build failed?** The deployment log shows the build's own error message. It names the file and what's wrong (for example, a post missing its date).

---

## Option B: Direct Upload (no GitHub)

1. On your computer, in the project folder: `npm run build`.
2. Go to **Workers & Pages → Create application → Pages**, and choose **Upload assets** (or **Drag and drop your files**).
3. Name the project, then drag in the **`dist` folder** (not the whole project), and deploy.
4. Continue from **A3** above.

Every later update means running `npm run build` and uploading `dist/` again with **Create new deployment**.

Limits to know about:
- The dashboard upload takes up to 1,000 files. The site is under 100 files right now.
- The `npx wrangler pages deploy dist` command-line route allows 20,000 files.
- As noted above, a Direct Upload project can't be switched to GitHub builds later.

---

## What does this cost?

**For the site as built: nothing beyond your domain registration.**

- **Cloudflare Pages, Free plan:** 500 builds a month (one per push), unlimited preview deployments, up to 20,000 files of up to 25 MB each. Requests for static files like these are free, and Cloudflare doesn't list a bandwidth cap for them.
- **Redirect Rules** (the www redirect) are included on the Free plan.
- **No** database, functions, or paid add-ons are used.

Things that **would** start costing money, only if you add them:

- **Pages Functions / Workers** (any server-side code) beyond the free daily request allowance. The paid Workers plan has a monthly minimum.
- **R2** storage or **Cloudflare Images** for a browser upload system, beyond their free tiers.
- Very heavy traffic to server-side code. Plain static pages like these don't count.
- Your **domain renewal**, billed yearly by your registrar.

Check the current numbers on Cloudflare's pricing pages before adding any of these; they change from time to time.

---

## A note on Pages vs. Workers

Cloudflare is gradually folding Pages into Workers, and new features arrive in Workers first. Pages is still fully supported and is the simplest home for a static site like this one, so this guide uses it.

If you ever move to **Workers static assets**, the same `dist/` folder works unchanged, including `_headers` and `_redirects`. You'd add a small `wrangler.jsonc` file that sets `assets.directory` to `./dist` and `not_found_handling` to `404-page`.
