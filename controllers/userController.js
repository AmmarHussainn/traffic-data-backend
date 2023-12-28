const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../Schema/user');
const crypto = require('crypto');
require('dotenv').config();

const Shields = {
  SALT: 'e8d3a06b282c67d03a959cf88179c66f',
  ALGORITHM: 'aes-256-cbc',
  IV_LENGTH: 16,
  KEY: 'f23dbbe74fa7853879d1cd480a2ddec2',
  PRIVATE_KEY:
    '118188eadccb71345738a3b3ad19161e43468959f0635ac0ca3e3c0b1c3c55b8',
};

const generatePassHash = (password) => {
  return crypto
    .pbkdf2Sync(password, Shields.SALT, 1000, 64, 'sha512')
    .toString('hex');
};
const verifyPass = (pass, passHash) => {
  console.log('pass', pass, generatePassHash(pass));

  const result = bcrypt.compareSync(generatePassHash(pass), passHash);
  return result;
};

async function registerUser(req, res) {
  try {
    const { email, businessName, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required.' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'User with this email already exists.' });
    }

    let newPass = generatePassHash(password);
    console.log('pass', password, newPass);
    const user = new User({
      email: email,
      businessName: businessName,
      password: newPass,
      isVerified: true, // Change this to false if you implement email confirmation
    });
    console.log('user', user);
    const userData = await user.save();
    const token = jwt.sign({ userId: userData._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return res.status(201).json({
      message: 'User registered successfully.',
      data: userData,
      token: token,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: 'Registration failed. Please try again later.' });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required.' });
    }

    try {
      const user = await User.findOne({ email });
      if (!user) {
        console.log('User not found');
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      console.log(
        'Password comparison result:',
        verifyPass(password, user.password)
      );
      if (!verifyPass(password, user.password)) {
        return res.status(401).json({ message: 'Invalid  password.' });
      }

      // Passwords match, generate token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });

      return res.json({
        message: 'Login successful.',
        data: user._id,
        token: token,
      });
    } catch (userError) {
      console.error('User retrieval error:', userError);
      return res
        .status(500)
        .json({ message: 'Login failed. Please try again later.' });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: 'Login failed. Please try again later.' });
  }
}

module.exports = {
  registerUser,
  loginUser,
};
