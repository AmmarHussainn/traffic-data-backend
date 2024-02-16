
const mongoose = require('mongoose');

const loginSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  filterName: { type: String, },
  filters : { type: Array },
});

const Audiences = mongoose.model('Audiences', loginSchema);

module.exports = Audiences;
