const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Route for user registration
router.post('/register', userController.registerUser);

// // Route for user login
router.post('/login', userController.loginUser);
router.post('/updateUser', userController.updateUser);
router.post('/forgetPassword', userController.forgetPassword);

// // Route for email verification (using OTP)
// router.post('/verify', userController.verifyEmail);

// // Route for password change
// router.post('/changepassword', userController.changePassword);

// // Route for forgot password 
// router.post('/forgotpassword', userController.forgotPassword);

// // Route for reset password 
// router.post('/resetpassword', userController.resetPassword);

// // Route for user account deletion
// router.delete('/:id', userController.deleteUser);

module.exports = router;
