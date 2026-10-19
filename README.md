# Betel AI — R62-IT-062 research website

Project website for **Intelligent Betel Leaf Management System** (SLIIT, Faculty of Computing, 2026):
the public site that follows the CDAP website guidelines, plus an admin panel where the group can
upload documents, slides and photos and edit every page without touching code.

- **Public pages:** Home, Domain (literature survey, research gap, problem, objectives, methodology,
  technologies, commercialisation and ethics), one page per research component, Milestones (with a
  drop-down to pick an assessment), Documents, Presentations, About Us (team, supervisors, gallery) and
  Contact Us (contact form and an email template).
- **Admin panel** at `/admin`: dashboard with a to-do checklist, site settings, every page section, file
  and photo uploads, a media library, contact-form messages, and a one-click ZIP for the course web.
- **Starter content** comes from the PP2 presentation: problem/solution, the four components with their
  workflows, PP1 feedback and PP2 improvements, results and app screenshots, team photos and the IBRS visit.
- Runs on plain **Node.js** (no framework). Only two packages: `pg` for PostgreSQL and the optional
  `sharp`, which shrinks uploaded photos.

---

## 1. Run it on your computer

You need **Node.js 20.12 or newer** (22 LTS recommended): https://nodejs.org

```bash
npm install
npm start
```

Open http://localhost:3000. The admin panel is at http://localhost:3000/admin — in development the
login is **admin / 1234**. On Vercel, set `ADMIN_USERNAME=admin` and `ADMIN_PASSWORD` in the environment variables.

Everything you change locally is saved in the `data/` folder (content in `data/content.json`, uploads
in `data/uploads/`). Delete that folder to start again from the starter content.

## 2. Using the admin panel

| Section | What it controls |
|---|---|
| Dashboard | Counts, a to-do list of missing content, latest messages, storage details |
| Site settings | Project title, home page text and figures, collaboration, About Us intro, contact details, links |
| Domain | The sections of the Domain page. Text uses Markdown; "key points" become cards, numbered steps or technology tiles |
| Research components | The four component pages: overview, novelty, workflow, PP1 → PP2 progress, results, screenshots |
| Milestones | Date, marks and status for each assessment |
| Documents | Upload a file (PDF, Word, PowerPoint, Excel, ZIP…) or paste a SharePoint/Drive link. Items without either show as *Pending* |
| Presentations | Slides for each assessment, a cover image and an optional recording link |
| Team & supervisors | Members and supervisors with photos, emails and achievements |
| Gallery | Photos for the Home and About Us pages |
| Media library | Every uploaded file, where it is used, and its link for use inside Markdown text |
| Messages | Messages sent through the Contact Us form |
| Course-web export | Downloads the plain HTML/CSS version (see section 4) |

Good to know:

- Big photos are shrunk to at most 2000 px in the browser before uploading, then rotated and saved as
  WebP on the server when `sharp` is installed.
- Files are checked by their content, not just their name. The limit is 25 MB per file (`MAX_UPLOAD_MB`),
  or 4 MB on Vercel.
- Replacing or removing a file deletes the old upload if nothing else uses it.
- Use the ↑ ↓ buttons in each list to change the order on the site.
- **Please review** the starter text marked on the dashboard. The literature survey was drafted from
  well-known general references; add the betel-specific studies from your proposal. Milestone dates and
  marks, supervisors and the group email were not in the PP2 slides, so they still need to be filled in.

## 3. Put it online for free

Free hosts wipe their disk on restarts, so the live site keeps **content and uploaded files in a free
PostgreSQL database** (Neon). Pick Vercel or Render; both are free.

### Vercel + Neon

Vercel does not run `npm start`. It serves the `public/` folder from its CDN and runs everything else
(pages, `/admin`, uploads) as a function in `api/index.js`. `vercel.json` sets this up; without it,
Vercel only serves `public/`, which has no home page, so every page shows **404 NOT_FOUND**.

1. **Code:** push this folder to GitHub, including `vercel.json` and the `api/` folder, and import it in
   Vercel (*Add New* → *Project*). Leave the Framework Preset on *Other* and the build settings empty.
2. **Database:** in the Vercel project open *Storage* → *Create Database* → **Neon**, choose the
   **Singapore** region and connect it to the project. This adds `DATABASE_URL` for you. (Or create the
   database at https://neon.tech and add its connection string as `DATABASE_URL` yourself.)
3. **Settings → Environment Variables:** add
   - `ADMIN_PASSWORD`: a strong password for the admin panel
   - `SESSION_SECRET`: long random text, e.g. from
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `PUBLIC_SITE_URL`: your address, e.g. `https://it22207890.vercel.app`
4. **Redeploy** (*Deployments* → ⋯ → *Redeploy*). Environment variables only reach new deployments.
5. Open the site. The first visit fills the database with the starter content. Sign in at `/admin`.

Good to know on Vercel:

- **Uploads are limited to 4 MB per file**, because Vercel refuses requests over 4.5 MB. The admin panel
  shrinks photos before uploading them and warns about larger files before sending anything. For bigger
  PDFs or slides, put them on OneDrive, Google Drive or SharePoint and paste the share link into
  *Or a link*. (On Render the limit is 25 MB.)
- The function runs in Singapore (`"regions": ["sin1"]` in `vercel.json`), close to Sri Lanka. If your
  database is in another region, change it to the nearest Vercel region, e.g. `iad1` for US East.
- The course-web ZIP downloaded from the admin panel is kept under 4 MB on Vercel. Section 4 shows how to
  build the full 20 MB version.
- "The website could not start" means the database could not be reached: check `DATABASE_URL`, then
  look at the project's *Logs* in Vercel.

### Render + Neon

1. **Database:** create a free project at https://neon.tech and copy the connection string
   (it looks like `postgresql://…neon.tech/neondb?sslmode=require`). Supabase also works.
2. **Code:** push this folder to a GitHub repository (private is fine).
3. **Render:** https://render.com → *New* → *Blueprint* → choose the repository. Render reads
   `render.yaml` and asks for:
   - `DATABASE_URL` — the Neon connection string
   - `ADMIN_PASSWORD` — a strong password for the admin panel
   - `PUBLIC_SITE_URL` — the address Render gives you, e.g. `https://betel-ai-website.onrender.com`

   (Or create a *Web Service* by hand: build command `npm install`, start command `npm start`, and add
   the same variables plus `NODE_ENV=production` and a long random `SESSION_SECRET`.)
4. On the first start the database is filled with the starter content. Sign in at `/admin` and you're done.

Free Render services sleep after 15 minutes without visitors; the next visit takes about a minute to
wake up. Any other Node.js host works too, and the included `Dockerfile` suits container hosts. On a host
with a persistent disk you can skip the database.

## 4. Upload to the SLIIT course web (20 MB, HTML and CSS)

The course web only accepts static files. To get them:

- **Admin → Course-web export → Download course-web ZIP**, or
- `npm run export -- --live=https://your-site.onrender.com` (writes `export/site/` and `export/course-web-site.zip`).

The export contains every page as plain HTML with relative links, the CSS, fonts, images and as many
documents and slides as fit in 20 MB. Anything that does not fit, plus the contact form, links to the live
site. `EXPORT-REPORT.txt` inside the ZIP lists what was included.

On Vercel, the ZIP from the admin panel is kept under 4 MB (Vercel's download limit), so large files such
as the PP2 slides are linked rather than included. To build the full 20 MB version from the live content,
run the export on your computer against the same database:

```bash
npm install
# put DATABASE_URL=<your Neon connection string> in a .env file, then:
npm run export -- --live=https://it22207890.vercel.app
```

## 5. Settings (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `ADMIN_USERNAME` | `admin` | Admin sign-in name |
| `ADMIN_PASSWORD` | `1234` in development, none in production | Admin password. Production sign-in is disabled until this is set |
| `SESSION_SECRET` | derived from `ADMIN_PASSWORD`, else random | Signs the admin cookie. Set it in production |
| `DATABASE_URL` | — | PostgreSQL connection string (`POSTGRES_URL` also works). Without it, content is stored in `DATA_DIR` |
| `DATA_DIR` | `data` (`/tmp/betel-data` on Vercel) | Folder for local content and uploads |
| `PUBLIC_SITE_URL` | — | Live address, used by the course-web export |
| `BREVO_API_KEY` | — | Brevo API key; contact messages are then emailed to the chosen member |
| `MAIL_FROM` | — | Sender email verified in Brevo |
| `MAX_UPLOAD_MB` | `25` (`4` on Vercel) | Largest single upload |
| `EXPORT_BUDGET_MB` | `20` | Size limit for the course-web export |
| `OPTIMISE_IMAGES` | `true` | Resize photos and save them as WebP (needs `sharp`) |
| `PORT` | `3000` | Port to listen on |

Copy `.env.example` to `.env` to set them locally.

## 6. Commands

| Command | What it does |
|---|---|
| `npm start` | Start the website |
| `npm run dev` | Start and restart automatically when files change |
| `npm test` | Run the smoke test (pages, contact form, admin sign-in, uploads, export) on a temporary copy |
| `npm run export` | Build the course-web version into `export/` |
| `npm run reset-content -- --yes` | Replace all content with the starter content (uploaded files are kept) |

## 7. How it is built

```
server.js              entry point for `npm start` (your computer, Render, Docker)
api/index.js           entry point on Vercel (vercel.json sends every non-file request here)
src/config.js          environment variables
src/schema.js          content model; the admin forms are generated from it
src/content.js         cached content service (create / update / delete / reorder)
src/store/local.js     storage in data/ (JSON + files)
src/store/postgres.js  storage in PostgreSQL (tables bl_settings, bl_items, bl_files)
src/routes/            public site, admin panel and file downloads
src/views/             page templates (tagged template literals, escaped by default)
src/views/illustrations.js  the betel leaf artwork, drawn as SVG
src/export.js          static export for the course web
src/seed/content.js    starter content from the PP2 presentation
public/                CSS, JavaScript, fonts, icons and the media used by the starter content
scripts/               export, reset and smoke-test scripts
```

Security: admin pages need a signed, HTTP-only session cookie; every admin form carries a CSRF token;
sign-in attempts are rate-limited; uploads are checked by content and served with `nosniff`; Markdown
cannot inject HTML or scripts; pages send a strict Content Security Policy.

Credits: fonts are under the SIL Open Font License (see `public/fonts/LICENSES.md`); Markdown is rendered
with [marked](https://github.com/markedjs/marked) (MIT, bundled in `src/vendor`). Team photos, app
screenshots, workflow diagrams and the PP2 slides belong to the R62-IT-062 group.
