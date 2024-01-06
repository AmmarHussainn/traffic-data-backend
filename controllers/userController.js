const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../Schema/user');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

require('dotenv').config();

const Shields = {
  SALT: 'e8d3a06b282c67d03a959cf88179c66f',
  ALGORITHM: 'aes-256-cbc',
  IV_LENGTH: 16,
  KEY: 'f23dbbe74fa7853879d1cd480a2ddec2',
  PRIVATE_KEY:
    '118188eadccb71345738a3b3ad19161e43468959f0635ac0ca3e3c0b1c3c55b8',
};
const JWT_SECRET =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const generatePassHash = (password) => {
  return crypto
    .pbkdf2Sync(password, Shields.SALT, 1000, 64, 'sha512')
    .toString('hex');
};
const verifyPass = (pass, passHash) => {
  console.log('pass', pass);
  console.log('passHash', passHash);
  const result = generatePassHash(pass) == passHash ? true : false;
  console.log('result', result);
  return result;
};
function generateRandomPassword() {
  const length = 8;
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    password += characters.charAt(randomIndex);
  }

  return password;
}

async function registerUser(req, res) {
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
    isVerified: true,
    freeTrialAvailed: false,
    isSubscribed: false,
  });
  console.log('user', user);
  const userData = await user.save();
  const token = jwt.sign({ userId: userData._id }, JWT_SECRET, {
    expiresIn: '1h',
  });

  return res.status(201).json({
    message: 'User registered successfully.',
    data: userData,
    token: token,
  });
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
      console.log('user1', user);
      if (!verifyPass(password, user.password)) {
        return res.status(401).json({ message: 'Invalid  password.' });
      }
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
        expiresIn: '1h',
      });

      if (user && user.freetrialCreated) {
        let date = new Date(user.freetrialCreated).valueOf() + 604800000;
        if (new Date().valueOf() > date) {
          user.isSubscribed = false;
          user.freetrialCreated = '';
          await User.findByIdAndUpdate(user._id, { ...user });
        }
      }

      return res.json({
        message: 'Login successful.',
        data: user,
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

async function updateUser(req, res) {
  let data = req.body;
  console.log('data', data);

  const user = await User.findOne({ _id: data.userId });
  console.log('user', user);

  if (user) {
    const timeInSeconds = Date.now();
    const sevenDaysInMilliseconds = 7 * 24 * 60 * 60 * 1000;
    const newTimeInMilliseconds = timeInSeconds + sevenDaysInMilliseconds;

    let newData = {
      ...user.toObject(), // Convert Mongoose document to plain object
      subscription: {
        amount: 0,
        created_at: Date.now(),
        expires_at: newTimeInMilliseconds,
        id: 'FreeTrial',
        invoice: 'FreeTrial',
        payment_status: 'paid',
      },
      freeTrialAvailed: true,
    };

    try {
      let updatedUser = await User.findByIdAndUpdate(data.userId, newData, {
        new: true,
      });

      console.log('updatedUser', updatedUser);

      return res.status(201).json({
        message: 'User updated successfully.',
        data: updatedUser,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        message: 'User update failed.',
        error: error.message,
        success: false,
      });
    }
  } else {
    return res.status(404).json({
      message: 'User not found.',
      success: false,
    });
  }
}

async function forgetPassword(req, res) {
  let data = req.body;
  let nPass = generateRandomPassword();
  let newPassword = generatePassHash(nPass);
  if (!data.email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  const user = await User.find({ email: data.email });
  console.log('user', user);
  if (user.length > 0) {
    let newData = {
      ...user._doc,
      password: newPassword,
    };
    let updatedUser = await User.findByIdAndUpdate(user[0]._id, newData, {
      new: true,
    });

    console.log('newPassword', nPass);
    sendEmail(data.email, 'new password', nPass);
    return res.status(200).json({
      message: 'User updated successfully.',
      success: true,
      updatedUser: updatedUser,
    });
  } else {
    return res.status(404).json({
      message: 'User not found.',
      success: false,
    });
  }
}

function sendEmail(to, subject, text) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ammarhussain0315@gmail.com',
      pass: 'uavs xvjy ehpk jpii',
    },
  });

  const mailOptions = {
    from: 'ammarhussain0315@gmail.com',
    to,
    subject,
    html: `<div style="text-align: center;">
    <h1>Your New Password is:</h1>
    <p>${text}</p>
  </div>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

module.exports = {
  registerUser,
  loginUser,
  updateUser,
  forgetPassword,
};
