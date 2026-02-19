const mongoose = require('mongoose');

const LeaderboardEntrySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 40 },
  score: { type: Number, required: true, min: 0 },
  finishedTime: { type: Number, required: true, min: 0 },
  rank: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LeaderboardEntry', LeaderboardEntrySchema);
