const express = require('express');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const ReceivedData = require('./Schema/signup');
const userRoutes = require('./routes/userRoutes'); // Import your user routes.
const port = process.env.PORT || 8080;
const mongoURI =
//  process.env.MONGODB_URI ||
 // 'mongodb+srv://ammarhussain0315:1234@cluster0.um7zey5.mongodb.net/?retryWrites=true&w=majority';
// ' mongodb+srv://johncamran28:aDawEwWvdmuOOEyG@cluster0.olbxhxo.mongodb.net/'
'mongodb+srv://johncamran28:aDawEwWvdmuOOEyG@cluster0.olbxhxo.mongodb.net/?retryWrites=true&w=majority'
const bodyParser = require('body-parser');
const stripe = require('stripe')('sk_test_51OSccqJ7ffyJlYAYkKUQKNXIZwdMJYK9xLJZ2AWNMQSUPprAlORUfeztKC7Of9UoiD76sw4ptWAPtmWBnDEuAUFH00Nu2zJJdg');
app.use(bodyParser.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// app.get('/ipapi', async (req, res) => {
//   try {
//     const response = await fetch('https://ipapi.co/json');
//     const data = await response.json();
//     res.json(data);
//   } catch (error) {
//     console.error('Error fetching data from ipapi.co:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });

// app.get('/ipapi', async (req, res) => {
//   try {
//     const response = await fetch('https://ipapi.co/json/');
//     const contentType = response.headers.get('content-type');

//     if (contentType && contentType.includes('application/json')) {
//       const data = await response.json();
//       console.log('data',data)
//       res.json(data);
//     } else {
//       console.error('Unexpected response format:', contentType);
//       res.status(500).send('Unexpected response format');
//     }
//   } catch (error) {
//     console.error('Error fetching data from ipapi.co:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });

// app.post('/users', async (req, res) => {
//   try {
//     const users = await MyModel.find({ email: req.body.email });

//     if (users.length > 0) {
//       return res.status(401).send('User with this email already exists.');
//     }

//     const hashedPassword = await bcrypt.hash(req.body.password, 10);

//     const newUser = new MyModel({
//       name: req.body.name,
//       email: req.body.email,
//       password: hashedPassword,
//       confirmPassword: hashedPassword, // You may adjust this as needed
//     });

//     const result = await newUser.save();
//     res.status(200).send(result);
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });

// app.get('/remove-duplicate-users', async (req, res) => {
//   try {
//     const users = await MyModel.find({});
//     const duplicateNames = {};
//     const usersToRemove = [];

//     users.forEach((user) => {
//       if (duplicateNames[user.name]) {
//         usersToRemove.push(user._id);
//       } else {
//         duplicateNames[user.name] = true;
//       }
//     });

//     await MyModel.deleteMany({ _id: { $in: usersToRemove } });

//     res
//       .status(200)
//       .json({ message: 'Users with duplicate names removed successfully.' });
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// app.post('/login', async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     const user = await MyModel.find({ email: email });
//     console.log('user:', user);
//     if (!user) {
//       return res.status(401).json({ message: 'Invalid email or password' });
//     }

//     const passwordMatch = bcrypt.compareSync(req.body.password, user.password);
//    console.log('passwordMatch:', passwordMatch);

//     if (!passwordMatch) {
//       console.log('passwordMatch:', passwordMatch);
//       return res.status(401).json({ message: 'Invalid email or password' });
//     }

//     const token = jwt.sign({ userId: user._id }, secretKey);
//     console.log('token:', token);
//     console.log('user.password:', user.password);
//     console.log('req.body.password:', req.body.password);
//     res.status(200).json({ token });
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// const verifyToken = (req, res, next) => {
//   const token = req.headers.authorization;

//   if (!token) {
//     return res.status(401).json({ message: 'Unauthorized' });
//   }

//   try {
//     const decoded = jwt.verify(token, secretKey);
//     req.userId = decoded.userId;
//     next();
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(401).json({ message: 'Invalid token' });
//   }
// };

// app.get('/dashboard', verifyToken, (req, res) => {
//   res.json({ message: 'This is a protected route' });
// });
app.use((req, res, next) => {
  req.startTime = new Date();
  next();
});

// Use your user routes
app.use('/users', userRoutes);
// Route for tracking user activity
// const endTime = new Date();
// const timeSpent = endTime - req.startTime;
// const date = new Intl.DateTimeFormat('en-US').format(endTime);

// console.log('User Activity:', {
//   timeSpent,
//   date,

// app.post('/pixeltrack', (req, res) => {
//   const receivedData = req.body;
//   console.log('receivedData',receivedData);

//   // try {
//   //   console.log('req.body:', req.body);
//   //   console.log('req.data:', req.params);
//   //   res.status(200).json({ message: 'Success' });
//   // } catch (error) {
//   //   console.error('Error in pixeltrack route:', error);
//   //   res.status(500).json({ error: 'Internal Server Error' });
//   // }

// });

app.post('/pixeltrack', async (req, res) => {
  const receivedData = req.body;
  console.log('receivedData', receivedData);

  try {
    // Save the received data to MongoDB
    const savedData = await ReceivedData.create(receivedData);
    console.log('Data saved to MongoDB:', savedData);

    res.status(200).json({ message: 'Success' });
  } catch (error) {
    console.error('Error in pixeltrack route:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/userDetals', async (req, res) => {
  const userId = req.query.userId;
  console.log('UserID:', userId); 
  const UserId = await ReceivedData.find({ userId: `${userId}` });
  if (UserId) {
    return res.status(200).json({ success: true, data: UserId });
  }
  console.log('UserId:', UserId);
});

// app.post('/webhook', async (req, res) => {
//   const sig = req.headers['stripe-signature'];
//   let event;
//   try {
//     event = stripe.webhooks.constructEvent(req.rawBody, sig, 'whsec_5f330fe8069619ff806a8aa3bf7d244e48ec321bda1519fa770aab27e29764d0');
//   } catch (err) {
//     console.error('Webhook error:', err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // Handle the event
//   if (event.type === 'checkout.session.completed') {
//     const session = event.data.object;
//     // Now you can update your database or take any other necessary actions
//     console.log('Payment succeeded:', session);
//   }

//   res.json({ received: true });
// });


app.post('/webhook', express.raw({type: 'application/json'}), (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      console.log('PaymentIntent was successful!');
      // Then define and call a function to handle the event payment_intent.succeeded
      break;
    case 'payment_intent.payment_failed':
      const paymentIntentFailed = event.data.object;
      console.log('PaymentIntent failed:', paymentIntentFailed);
      // Then define and call a function to handle the event payment_intent.payment_failed
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});
const run = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to the database');
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
};

run();
