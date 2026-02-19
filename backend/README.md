# Memory Card Game Backend

Node.js backend API for leaderboard data.

## Table Schema

SQLite table: `leaderboard_entries` (also defined in `backend/schema.sql`)

- `name` (TEXT)
- `score` (INTEGER)
- `finished_time` (INTEGER, seconds)
- `rank` (INTEGER, auto-recomputed after each insert)

Additional columns:

- `id` (primary key)
- `created_at` (timestamp)

## Run

1. Open a terminal in `backend/`.
2. Install dependencies:
   - `npm install`
3. Start the server:
   - `npm start`

By default, the API runs on `http://localhost:4000`.

## Endpoints

- `GET /health`
  - health check

- `GET /api/leaderboard?limit=20&offset=0`
  - returns leaderboard rows sorted by rank

- `POST /api/leaderboard`
  - body:
    ```json
    {
      "name": "Player",
      "score": 1200,
      "finishedTime": 75
    }
    ```
  - `time` is also accepted as an alias of `finishedTime`
  - inserts a score, recalculates ranks, returns inserted row

- `GET /api/leaderboard/standing/:name`
  - best standing for a specific player name

- `GET /api/leaderboard/stats`
  - total entries and distinct players

## Optional Environment Variables

- `PORT` (default `4000`)
- `DB_FILE` (default `backend/leaderboard.db`) (legacy - no longer used when using MongoDB)
- `MONGO_URI` (default `mongodb://localhost:27017/memory-card-game`)

To run with a custom MongoDB connection string, set `MONGO_URI` in your environment or a `.env` file in the `backend/` folder. Example `.env`:

```
MONGO_URI=mongodb://username:password@host:27017/my-db
PORT=4000
```
