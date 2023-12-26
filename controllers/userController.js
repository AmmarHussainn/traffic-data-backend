const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');
const User = require('../Schema/user'); // Import the User model
// Import the Login model
const Login = require('../Schema/loginSchema');
require('dotenv').config();

// Function to handle user registration and email verification
async function registerUser(req, res) {
  try {
    console.log('req.body', req.body);
    const { email, businessName, password } = req.body;
    // Input validation
    if (!email || !password) {
      return res.status(400).send({ message: 'Email, password are required.' });
    }

  
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: 'User with this email already exists.' });
    }
  

    // Create a new user
      const user = new User({
      email: email,
      businessName: businessName,
      password: password,
      isVerified: true, // Since email verification is skipped, set to true
    });
    console.log(user , 'user');
    // Hash the user's password
    user.password = await bcrypt.hash(password, 10);

    // Save the user to the database
    const userData = await user.save(user);
    console.log('userData', userData);
    const token = jwt.sign({ userId: userData._id }, 'your-secret-key', {
      expiresIn: '1h', // Token expiration time
    });

    return res.status(201).json({ message: 'User registered successfully.',data : userData , token: token});
  } catch (error) {
    console.error(error); // Log the error for debugging
    return res
      .status(500)
      .json({ message: 'Registration failed. Please try again later.' });
  }
}

// Function to handle user login
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required.' });
    }

    // Find the user in the database
    const user = await User.findOne({ email });

    // If the user does not exist, return an error
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Compare the entered password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // If the password is correct, create a JWT token
    const token = jwt.sign({ userId: user._id }, 'your-secret-key', {
      expiresIn: '1h', // Token expiration time
    });

    // Return the token
    return res.json({ token: token, data: user });
  } catch (error) {
    console.error(error); // Log the error for debugging
    return res
      .status(500)
      .json({ message: 'Login failed. Please try again later.' });
  }
}

module.exports = {
  registerUser,
  loginUser,
};









