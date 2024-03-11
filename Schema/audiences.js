const mongoose = require('mongoose');

const loginSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  userId: { type: String, required: true },
  filterName: { type: String },
  filters: { type: Array },
});

const Audiences = mongoose.model('Audiences', loginSchema);

module.exports = Audiences;
