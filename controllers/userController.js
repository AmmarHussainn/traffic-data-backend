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
  const token = jwt.sign({ userId: userData._id }, process.env.JWT_SECRET, {
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
      if (!verifyPass(password, user.password)) {
        return res.status(401).json({ message: 'Invalid  password.' });
      }
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
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

// async function updateUser(req, res) {
//   let data = req.body;
//   console.log('data', data);
//   const user = await User.findOne({ _id: data.userId });
//   console.log('user', user);

//   if (user) {
//     console.log('user', user);
//     let newData = {
//       ...user,
//       isSubscribed: true,
//       freeTrialAvailed: true,
//       freetrialCreated: new Date(),
//     };
//     console.log('newData', newData);
//     let updatedUser = await User.findByIdAndUpdate(data.userId, {
//       ...user,
//       isSubscribed: true,
//       freeTrialAvailed: true,
//       freetrialCreated: new Date(),
//     });
//     console.log('newData', newData);

//     if (updatedUser) {
//       console.log('updatedUser', updatedUser);
//       return res.status(201).json({
//         message: 'User updated successfully.',
//         data: updatedUser,
//         success: true,
//       });
//     } else {
//       return res.status(201).json({
//         message: 'User updated failed.',
//         data: updatedUser,
//         success: false,
//       });
//     }
//   }
// }
async function updateUser(req, res) {
  let data = req.body;
  console.log('data', data);
  
  const user = await User.findOne({ _id: data.userId });
  console.log('user', user);

  if (user) {
    let newData = {
      ...user.toObject(), // Convert Mongoose document to plain object
      isSubscribed: true,
      freeTrialAvailed: true,
      freetrialCreated: new Date(),
    };

    console.log('newData', newData);

    try {
      let updatedUser = await User.findByIdAndUpdate(data.userId, newData, { new: true });

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

module.exports = {
  registerUser,
  loginUser,
  updateUser,
};
