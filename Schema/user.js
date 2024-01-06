// models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  _id: {
    type: String, // Using String type for _id
    default: () => new  mongoose.Types.ObjectId().toString(), // Generating default ObjectId as a string
  },
  email: { type: String, required: true },
  businessName: { type: String, required: true },
  password: { type: String, required: true ,  },
  newPassTesting: { type: String,},
  freeTrialAvailed: { type: Boolean, default: false },
  freetrialCreated: { type: Date  },
  subscription : {type: Object},

});



const User = mongoose.model('User', userSchema);

module.exports = User;
