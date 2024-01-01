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
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  isSubscribed: { type: Boolean, default: false },
  freeTrialAvailed: { type: Boolean, default: false },
  freetrialCreated: { type: Date  },
});

// Hash the user's password before saving to the database
userSchema.pre('save', async function (next) {
  try {
    // Only hash the password if it has been modified or is new
    if (!this.isModified('password')) {
      return next();
    }

    // Hash the password with a salt round of 10
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
