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
  websiteName: { type: String }, // Change from businessName to websiteName
  firstName: { type: String }, // New field
  lastName: { type: String }, // New field
  password: { type: String, required: true },
  newPassTesting: { type: String },
  freeTrialAvailed: { type: Boolean, default: false },
  freetrialCreated: { type: Date },
  subscription: {
    amount: { type: Number },
    created_at: { type: Number },
    expires_at: { type: Number },
    id: { type: String },
    invoice: { type: String },
    subscriptionId: { type: String },
    payment_status: { type: String },
    customerDetails: { type: Object },
    customer: { type: Object },
    leads: { type: Number },
    totalLeads: { type: Number },
  },
  phoneNumber: { type: String },
  accountId: { type: String },
  role: { type: String },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
