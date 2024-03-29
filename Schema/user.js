// // models/user.js
// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');

// const userSchema = new mongoose.Schema({
//   _id: {
//     type: String, // Using String type for _id
//     default: () => new  mongoose.Types.ObjectId().toString(), // Generating default ObjectId as a string
//   },
//   email: { type: String, required: true },
//   businessName: { type: String, required: true },
//   password: { type: String, required: true ,  },
//   newPassTesting: { type: String,},
//   freeTrialAvailed: { type: Boolean, default: false },
//   freetrialCreated: { type: Date  },
//   subscription : {type: Object},

// });



// const User = mongoose.model('User', userSchema);

// module.exports = User;
// models/user.js
// models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  email: { type: String, required: true },
  websiteName: { type: String, required: true }, // Change from businessName to websiteName
  firstName: { type: String }, // New field
  lastName: { type: String },  // New field
  password: { type: String, required: true },
  newPassTesting: { type: String },
  freeTrialAvailed: { type: Boolean, default: false },
  freetrialCreated: { type: Date },
  subscription: { type: Object },
  phoneNumber: { type: String },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
