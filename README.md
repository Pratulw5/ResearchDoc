# ResearchDoc

A full-stack research management platform for organising papers, references, and notes — with semantic search, AI-powered comparisons, and team/admin tooling.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django + Django REST Framework |
| Auth | JWT (SimpleJWT) + OAuth (Google, GitHub via allauth) |
| Database | PostgreSQL (with pgvector for embeddings) |
| File Storage | Cloudflare R2 |
| AI | OpenAI (GPT-4o-mini, text-embedding-3-small) |
| Frontend | React + TypeScript + Tailwind CSS |

---

## Project Structure

```
ResearchDoc/          # Django project root
├── accounts/         # User auth, profiles, admin panel, plans
├── papers/           # Papers, references, search, chunking/embeddings
├── projects/         # Projects, tasks/timeline
├── comparisons/      # Saved AI-generated comparison tables
└── ResearchDoc/      # Django settings & root URL conf

frontend/             # React + TypeScript SPA
```

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL database (with pgvector extension)
- Cloudflare R2 bucket
- OpenAI API key

### Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env

# Run migrations
python manage.py migrate

# Start dev server
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_HOST=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# OpenAI
OPENAI_API_KEY=

# OAuth — Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5173/auth/callback/google

# OAuth — GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5173/auth/callback/github
```

Frontend (create `frontend/.env`):

```env
VITE_BACKEND_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=
VITE_GITHUB_CLIENT_ID=
```

---

## API Reference

All endpoints are prefixed relative to the backend base URL. Authenticated routes require `Authorization: Bearer <access_token>`.

### Auth — `/accounts/`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/accounts/login/signup/` | Register a new user |
| POST | `/accounts/login/signin/` | Login (returns JWT) |
| POST | `/accounts/login/logout/` | Logout |
| POST | `/accounts/login/token/refresh/` | Refresh access token |
| GET / PATCH / DELETE | `/accounts/me/` | Get or update current user profile, or delete account |
| POST | `/accounts/change-password/` | Change password |
| POST | `/accounts/social/google/` | OAuth login via Google |
| POST | `/accounts/social/github/` | OAuth login via GitHub |

### Admin — `/accounts/admin/`

Requires admin/staff privileges.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/accounts/admin/stats/` | Platform stats (users, projects, papers) |
| GET | `/accounts/admin/users/` | List all users |
| GET / PATCH / DELETE | `/accounts/admin/users/<id>/` | User detail, update role, delete |
| POST | `/accounts/admin/users/<id>/archive/` | Archive a user (with reason, optional expiry) |
| POST | `/accounts/admin/users/<id>/unarchive/` | Restore an archived user |
| GET | `/accounts/admin/projects/` | List all projects |
| GET / DELETE | `/accounts/admin/projects/<id>/` | Project detail or delete |
| GET | `/accounts/admin/papers/` | List all papers |
| GET / DELETE | `/accounts/admin/papers/<id>/` | Paper detail or delete |
| GET / POST | `/accounts/admin/plans/` | List or create subscription plans |
| GET / PATCH / DELETE | `/accounts/admin/plans/<id>/` | Plan detail, edit, or delete |

### Projects — `/projects/`

| Method | Path | Description |
|--------|------|-------------|
| GET / POST | `/projects/` | List or create projects |
| PATCH | `/projects/<id>/edit/` | Update project |
| DELETE | `/projects/<id>/delete/` | Delete project |
| GET / POST | `/projects/<id>/tasks/` | List or create timeline tasks |
| GET / PATCH / DELETE | `/projects/<id>/tasks/<task_id>/` | Task detail |
| GET | `/projects/search/` | Global semantic/keyword/hybrid search |
| POST | `/projects/compare/` | Ad-hoc AI comparison (not saved) |

### Papers — `/projects/<project_id>/`

| Method | Path | Description |
|--------|------|-------------|
| GET / POST | `papers/` | List or create papers |
| GET / PATCH / DELETE | `papers/<id>/` | Paper detail |
| POST | `papers/<id>/upload/` | Upload a PDF to R2 |
| POST | `papers/<id>/upload-image/` | Upload an inline image |
| GET | `papers/<id>/download/` | Download paper file |
| POST | `papers/<id>/convert-to-blocks/` | Convert PDF/text to editor block JSON via AI |
| POST | `papers/<id>/extract-refs/` | Extract references from paper content |
| GET | `papers/<id>/bibliography/` | Generate bibliography |
| GET | `papers/<id>/citation-markers/` | Get in-text citation markers |
| GET / POST | `references/` | List or create reference items |
| GET / PATCH / DELETE | `references/<id>/` | Reference detail |
| POST | `references/<id>/upload/` | Upload a file to a reference |

### Comparisons — `/comparisons/`

| Method | Path | Description |
|--------|------|-------------|
| GET / POST | `/comparisons/` | List or create saved comparisons |
| GET / PATCH / DELETE | `/comparisons/<id>/` | Saved comparison detail |
| POST | `/comparisons/<id>/regenerate/` | Re-run AI comparison |

---

## Key Features

### Semantic Search
Papers are chunked and embedded using OpenAI's `text-embedding-3-small` model. The `/projects/search/` endpoint supports three modes:
- `keyword` — weighted field matching with relevance scoring
- `semantic` — cosine similarity over stored embeddings
- `hybrid` — merges and deduplicates results from both

### AI Comparison
POST to `/projects/compare/` with a list of paper/reference IDs to get a structured comparison table (5–8 criteria) generated by GPT-4o-mini.

### User Archiving
Admins can archive users with a categorised reason (e.g. subscription expired, terms violation) and an optional auto-restore datetime. Archived users are blocked globally via a DRF permission class.

### Subscription Plans
Plans map directly to `User.role` in the database. They can be created, edited, archived, or deleted from the admin panel. Archived plans hide from new user creation but do not affect existing users.

---

## OAuth Setup

### Google
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google+ API and create OAuth 2.0 credentials
3. Add `http://localhost:5173/auth/callback/google` as an authorised redirect URI
4. Copy the Client ID and Secret to your `.env`

### GitHub
1. Go to GitHub → Settings → Developer Settings → OAuth Apps
2. Set the callback URL to `http://localhost:5173/auth/callback/github`
3. Copy the Client ID and Secret to your `.env`

---

## Deployment Notes

- Set `DEBUG=False` and update `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` for production
- Replace the insecure `SECRET_KEY` with a strong random value
- The database requires SSL (`sslmode: require` is already configured)
- Vercel preview deployments are supported via `CORS_ALLOWED_ORIGIN_REGEXES`
- Set `ACCOUNT_EMAIL_VERIFICATION = "mandatory"` in settings to require email confirmation on signup