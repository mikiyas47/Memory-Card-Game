const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

const LeaderboardEntry = require('./models/LeaderboardEntry');

const PORT = Number(process.env.PORT || 4000);
const MAX_LIMIT = 200;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/memory-card-game';

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(MONGO_URI, { })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Connection event logging for easier diagnostics
mongoose.connection.on('connected', () => console.log('Mongoose connection: connected'));
mongoose.connection.on('error', (err) => console.error('Mongoose connection: error', err));
mongoose.connection.on('disconnected', () => console.warn('Mongoose connection: disconnected'));

// DB status endpoint (0=disconnected,1=connected,2=connecting,3=disconnecting)
app.get('/api/db-status', (_req, res) => {
  res.json({ readyState: mongoose.connection.readyState });
});

function normalizeName(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (value.length === 0 || value.length > 40) return null;
  return value;
}

function toNonNegativeInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function toBoundedInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return fallback;
  return parsed;
}

function mapEntry(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    score: doc.score,
    finishedTime: doc.finishedTime,
    time: doc.finishedTime,
    rank: doc.rank,
    createdAt: doc.createdAt,
  };
}

async function recomputeRanks() {
  const entries = await LeaderboardEntry.find()
    .sort({ score: -1, finishedTime: 1, createdAt: 1, _id: 1 })
    .select('_id')
    .lean();

  if (!entries.length) return;

  const bulkOps = entries.map((row, index) => ({
    updateOne: {
      filter: { _id: row._id },
      update: { $set: { rank: index + 1 } },
    },
  }));

  await LeaderboardEntry.bulkWrite(bulkOps);
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/leaderboard', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(toBoundedInt(req.query.limit, 20), 1), MAX_LIMIT);
    const offset = Math.max(toBoundedInt(req.query.offset, 0), 0);
    const rows = await LeaderboardEntry.find()
      .sort({ rank: 1, _id: 1 })
      .skip(offset)
      .limit(limit)
      .lean();
    res.json(rows.map(mapEntry));
  } catch (err) {
    next(err);
  }
});

app.get('/api/leaderboard/standing/:name', async (req, res, next) => {
  try {
    const name = normalizeName(req.params.name);
    if (!name) return res.status(400).json({ error: 'Invalid player name.' });

    const best = await LeaderboardEntry.findOne({ name: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') })
      .sort({ rank: 1, _id: 1 })
      .lean();

    const totalPlayersAgg = await LeaderboardEntry.aggregate([
      { $group: { _id: { $toLower: '$name' } } },
      { $count: 'count' },
    ]);
    const totalPlayers = totalPlayersAgg[0]?.count || 0;

    if (!best) {
      return res.status(404).json({ error: 'No scores found for this player.', totalPlayers });
    }

    return res.json({ name: best.name, rank: best.rank, score: best.score, finishedTime: best.finishedTime, totalPlayers });
  } catch (err) {
    next(err);
  }
});

app.post('/api/leaderboard', async (req, res, next) => {
  try {
    const name = normalizeName(req.body?.name);
    const score = toNonNegativeInteger(req.body?.score);
    const finishedTime = toNonNegativeInteger(req.body?.finishedTime ?? req.body?.time);

    if (!name) return res.status(400).json({ error: 'name is required and must be 1-40 chars.' });
    if (score === null) return res.status(400).json({ error: 'score must be a non-negative integer.' });
    if (finishedTime === null) return res.status(400).json({ error: 'finishedTime (or time) must be a non-negative integer.' });

    const createdDoc = await LeaderboardEntry.create({ name, score, finishedTime });
    await recomputeRanks();
    const created = await LeaderboardEntry.findById(createdDoc._id).lean();
    return res.status(201).json(mapEntry(created));
  } catch (err) {
    next(err);
  }
});

app.get('/api/leaderboard/stats', async (_req, res, next) => {
  try {
    const totalEntries = await LeaderboardEntry.countDocuments();
    const totalPlayersAgg = await LeaderboardEntry.aggregate([
      { $group: { _id: { $toLower: '$name' } } },
      { $count: 'count' },
    ]);
    const totalPlayers = totalPlayersAgg[0]?.count || 0;
    res.json({ totalEntries, totalPlayers });
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Leaderboard API running on http://localhost:${PORT}`);
});
