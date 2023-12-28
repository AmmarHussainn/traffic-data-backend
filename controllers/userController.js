const jwt = require('jsonwebtoken');
const User = require('../Schema/user');
const bcrypt = require('bcrypt');
require('dotenv').config();

const saltRounds = 10; // You can adjust this value based on your security requirements

async function registerUser(req, res) {
  try {
    const { email, businessName, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({ message: 'Email and password are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new User({
      email: email,
      businessName: businessName,
      password: hashedPassword,
      isVerified: true,
    });

    const userData = await user.save();
    const token = jwt.sign({ userId: userData._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return res.status(201).json({ message: 'User registered successfully.', data: userData, token: token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Registration failed. Please try again later.' });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find user in the database
    const user = await User.findOne({ email });

    // Check if user exists and password matches
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate a JSON Web Token (JWT)
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // Send successful response with user data and token
    return res.json({ message: 'Login successful.', data: user._id, token: token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Login failed. Please try again later.' });
  }
}

module.exports = {
  registerUser,
  loginUser,
};
