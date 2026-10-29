# Game Tracker

A full-stack web application built with **Express**, **TypeScript**, and **PostgreSQL** to manage a master game catalog and track personal gameplay playthroughs (Want to Play, Currently Playing, Completed, On Hold, Dropped).

---

## Features

- **Personal Playthrough Tracking:** Filter your gaming library by status (`Want to Play`, `Currently Playing`, `Completed`, `On Hold`, `Dropped`) with dynamic count badges, star ratings (1–10), hours logged, and detailed personal review notes.
- **Master Catalog Inventory:** Full inventory of games with release year, description, and multi-select associations for genres, studios/developers, and gaming platforms.
- **Referential Integrity & Safe Delete Behavior:**
  - Deleting a category (genre or developer) safely disassociates it from catalog games via `ON DELETE CASCADE` on junction tables—**games are never deleted**.
  - Deleting a library entry removes it from the user's personal tracker while leaving the game intact in the master catalog.
  - Deleting a game from the catalog cascades to remove all associated playthrough entries and category links.
- **Clean UI:** Plain, high-contrast, functional design using system sans-serif typography, crisp data tables, and legible status indicators.

---

## Database Architecture

- **`users`**: User profiles (`id`, `username`, `email`, `created_at`).
- **`games`**: Master catalog (`id`, `title`, `description`, `release_year`, timestamps).
- **`genres`**: Categories (`id`, `name`, `description`).
- **`developers`**: Game studios (`id`, `name`, `country`, `website`).
- **`platforms`**: Target systems (`id`, `name`).
- **Junction Tables:** `game_genres`, `game_developers`, `game_platforms` (Many-to-Many with `ON DELETE CASCADE`).
- **`user_games`**: Tracking entries linking user to a catalog game (`status`, `rating`, `hours_played`, `review_notes`, timestamps, `UNIQUE(user_id, game_id)`).

---

## Tech Stack

- **Runtime & Language:** Node.js, TypeScript
- **Framework:** Express
- **Database:** PostgreSQL (`pg` connection pool with SSL support)
- **Templating:** EJS
- **Styling:** Vanilla CSS (no bloated UI frameworks or AI styles)
- **Development Tools:** `tsx` (watch/runtime), `tsc` (compiler)

---

## Getting Started Locally

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3000
PGHOST=localhost
PGPORT=5432
PGUSER=your_postgres_username
PGPASSWORD=your_postgres_password
PGDATABASE=game_tracker
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Initialize & Seed Database
```bash
# Initialize schema and tables
npm run db:init

# Populate with realistic sample data
npm run db:seed
```

### 5. Run the Server
```bash
# Development mode (with live reload)
npm run dev

# Or build and run compiled production code
npm run build
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment (Render.com)

A [`render.yaml`](render.yaml) blueprint is included in the repository.

1. Connect your repository to **[Render.com](https://render.com)**.
2. Select **Blueprints** and point it to this repository.
3. Render will automatically provision:
   - A managed PostgreSQL database (`game-tracker-db`)
   - A Node.js web service running `npm run build` and `npm start` with database seeding on first deploy.
