const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  email: { type: String, required: true },
  activityType: { type: String, required: true },
  eventData: { type: mongoose.Schema.Types.Mixed }, // Use Mixed type for flexible data
  timestamp: { type: Date, default: Date.now },
});

const UserActivityModel = mongoose.model('UserActivity', userActivitySchema);

module.exports = UserActivityModel;
