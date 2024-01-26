const express = require('express');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const ReceivedData = require('./Schema/signup');
const userRoutes = require('./routes/userRoutes');
const UserActivity = require('./Schema/userActivity');
const port = process.env.PORT || 8080;
const mongoURI =
  //  process.env.MONGODB_URI ||
  // 'mongodb+srv://ammarhussain0315:1234@cluster0.um7zey5.mongodb.net/?retryWrites=true&w=majority';
  // ' mongodb+srv://johncamran28:aDawEwWvdmuOOEyG@cluster0.olbxhxo.mongodb.net/'
  'mongodb+srv://johncamran28:aDawEwWvdmuOOEyG@cluster0.olbxhxo.mongodb.net/?retryWrites=true&w=majority';
const bodyParser = require('body-parser');
const User = require('./Schema/user');
const UserData = require('./Schema/userPersonalDetails');
const stripe = require('stripe')(
  'sk_test_51OSccqJ7ffyJlYAYkKUQKNXIZwdMJYK9xLJZ2AWNMQSUPprAlORUfeztKC7Of9UoiD76sw4ptWAPtmWBnDEuAUFH00Nu2zJJdg'
);
app.use(bodyParser.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use((req, res, next) => {
  req.startTime = new Date();
  next();
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

app.use('/users', userRoutes);

app.post('/pixeltrack', async (req, res) => {
  const receivedData = req.body;
  const user = await User.findById(receivedData.userId);

  if (user && user?.subscription.expires_at > Date.now()) {
       ReceivedData.find({
        userId: `${receivedData.userId}`,
        firstTime: {
          $gte: Number(user.subscription.created_at),
        },
      }).then((data) => {
        let uniqueKeys = [];
        data.forEach((data) => {
          if (!uniqueKeys.includes(data.usercode)) {
            uniqueKeys.push(data.usercode);
          }
        });
        if (user.subscription.amount === 0) {
          ReceivedData.create(receivedData);
        } else if (
          user.subscription.amount == 39900 &&
          uniqueKeys.length <= 2000
        ) {
          ReceivedData.create(receivedData);
        } else if (
          user.subscription.amount == 99900 &&
          uniqueKeys.length <= 6000
        ) {
          ReceivedData.create(receivedData);
        } else if (
          user.subscription.amount == 190000 &&
          uniqueKeys.length <= 12000
        ) {
          ReceivedData.create(receivedData);
        }
      });
    
  }

  res.status(200).json({ message: 'Success' });
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

app.get('/getUser', async (req, res) => {
  const UserId = await User.findById(req.query.userId);
  console.log('UserId:', UserId);

  if (UserId) {
    return res.status(200).json({ success: true, data: UserId });
  }
});

app.get('/installationCheck', async (req, res) => {
  const domain = req.query.domain;

  // Check if the domain contains a dot
  if (!domain || !domain.includes('.')) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid domain format' });
  }

  console.log('domain', domain);

  try {
    const UserId = await ReceivedData.find({
      domain: { $regex: new RegExp(domain, 'i') },
    });

    console.log('UserId:', UserId);

    if (UserId.length) {
      return res.status(200).json({ success: true, data: UserId });
    } else {
      return res.status(200).json({ success: false, data: UserId });
    }
  } catch (error) {
    console.error('Error:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Internal Server Error' });
  }
});

app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (request, response) => {
    const sig = request.headers['stripe-signature'];

    if (request.body.type === 'checkout.session.completed') {
      console.log(
        'Checkout Session Completed',
        request.body.data.object.client_reference_id
      );

      const user = await User.find({
        _id: request.body.data.object.client_reference_id,
      });

      const timeInSeconds = request.body.data.object.created;
      const timeInMilliseconds = timeInSeconds * 1000; // Convert seconds to milliseconds
      const thirtyDaysInMilliseconds = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      const newTimeInMilliseconds =
        timeInMilliseconds + thirtyDaysInMilliseconds;

      let newData = {
        ...user._doc,
        subscription: {
          amount: request.body.data.object.amount_total,
          created_at: request.body.data.object.created * 1000,
          expires_at: newTimeInMilliseconds,
          id: request.body.id,
          invoice: request.body.data.object.invoice,
          customerDetails: request.body.data.object.customer_details,
          payment_status: request.body.data.object.payment_status,
        },
      };
      let updatedUser = await User.findByIdAndUpdate(
        request.body.data.object.client_reference_id,
        newData,
        {
          new: true,
        }
      );
      console.log('updatedUser', updatedUser);
    }
  }
);

app.post('/api/store-data', async (req, res) => {
  try {
    const newData = new UserData(req.body);
    await newData.save();
    res.status(201).json({ message: 'Data stored successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
