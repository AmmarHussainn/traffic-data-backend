// models/login.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const loginSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: false },
});

const Login = mongoose.model('Login', loginSchema);

module.exports = Login;
