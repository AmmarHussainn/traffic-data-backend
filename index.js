const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const ReceivedData = require('./Schema/signup');
const userRoutes = require('./routes/userRoutes');
const UserActivity = require('./Schema/userActivity');
const port = process.env.PORT || 8080;
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const User = require('./Schema/user');
const UserData = require('./Schema/userPersonalDetails');
const mongoURI =
  //  process.env.MONGODB_URI ||
  // 'mongodb+srv://ammarhussain0315:1234@cluster0.um7zey5.mongodb.net/?retryWrites=true&w=majority';
  // ' mongodb+srv://johncamran28:aDawEwWvdmuOOEyG@cluster0.olbxhxo.mongodb.net/'
  'mongodb+srv://johncamran28:aDawEwWvdmuOOEyG@cluster0.olbxhxo.mongodb.net/?retryWrites=true&w=majority';
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


async function enrichPerson(personId, apiKey) {
  const url = 'https://api.fullcontact.com/v3/person.enrich';

  const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
  };

  const body = JSON.stringify({
      "personId": personId
  });
  try {
      const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: body
      });
      if (!response.ok) {
          throw new Error(`API call failed: ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();
            const md5Emails = data.details.emails.map(email => email.md5);         
              getEmailAddresses(md5Emails);
            return data; // Return the data for further processing       
  } catch (error) {
      console.error('Error calling FullContact Enrich API:', error);
      throw error; // Rethrow or handle error as needed
  }

}
async function getEmailAddresses(md5Emails) {
  try {
      const response = await fetch('https://secureapi.datazapp.com/Appendv2', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer IYBTCNRIDM' // or any other way your API requires the API key to be passed
          },
          body: JSON.stringify({
              ApiKey: "IYBTCNRIDM",
              AppendModule: "EncryptedEmailAppendAPI",
              AppendType: 2,  //2 - MD5 | 1 - SHA256
              Data: md5Emails.map(md5 => ({ emailMD5Lower: md5 })) // map MD5 emails to the required format
          })
      });
      if (!response.ok) {
          throw new Error(`API call failed: ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();       
      const filteredData = data.ResponseDetail.Data.filter(item => item.Matched === true);
      //  console.log('Filtered Data:', filteredData);
      return filteredData;
  } catch (error) {
      console.error('Error calling Email Append API:', error);
      throw error;
  }
}

// const personId = 'g95SnE0av8hRrVm73l8W6X1wFBLMtF_Ml1vnpBJrL7k077ON'; // Replace with actual personId

// enrichPerson(personId, apiKey)
app.post('/pixeltrack', async (req, res) => {
  const receivedData = req.body;
 
  const user = await User.findOne({ _id: receivedData.userId });
  let   iwid = 'g95SnE0av8hRrVm73l8W6X1wFBLMtF_Ml1vnpBJrL7k077ON';
  const apiKey = 'z5cKCDKiBCemphHQ84fDX9FpnowUXGrd';
  if (user && user?.subscription.expires_at > Date.now()) {
    ReceivedData.find({
      userId: `${receivedData.userId}`,
      firstTime: {
        $gte: Number(user.subscription.created_at),
      },
    }).then(async (data) => {
      let uniqueKeys = [];
      data.forEach((data) => {
        if (!uniqueKeys.includes(data.usercode)) {
          uniqueKeys.push(data.usercode);
        }
      });
      if (user.subscription.leads > 0) {
     
        //cookie Id wali API jissay data ayga
        // receivedData.iwid = receivedData.iwid || receivedData.fc_session;
        
      
        if (iwid) {
         




          // ReceivedData.create(receivedData);
          // if (!uniqueKeys.includes(receivedData.usercode)) {
          //   let newLeads = user.subscription?.leads - 1;
          //   console.log('newLeads', newLeads);
  
          //   let updatedUser = await User.findByIdAndUpdate(
          //     receivedData.userId,
          //     {
          //       $set: {
          //         'subscription.leads': newLeads,
          //       },
          //     },
          //     {
          //       new: true,
          //     }
          //   );
  
          //   console.log('updatedUser', updatedUser);
          // }
          try {
            const  filteredData  = await enrichPerson(iwid, apiKey); 
            
        console.log('filteredData:', filteredData); 
        ReceivedData.Enriched = filteredData;
            ReceivedData.create(receivedData);
            if (!uniqueKeys.includes(receivedData.usercode)) {
                let newLeads = user.subscription?.leads - 1;
                console.log('newLeads', newLeads);
                let updatedUser = await User.findByIdAndUpdate(
                    receivedData.userId,
                    {
                        $set: {
                            'subscription.leads': newLeads,
                        },
                    },
                    {
                        new: true,
                    }
                );

                console.log('updatedUser', updatedUser);
            }
        } catch (error) {
            console.error('Error in enriching person data:', error);
        }

        }
      }
    });
  }

  res.status(200).json({ message: 'Success' });
});

app.get('/userDetals', async (req, res) => {
  const userId = req.query.userId;
  console.log('UserID:', userId);
  const firstData = await ReceivedData.find({ userId: `${userId}` });
  const secondData = await UserData.find({ primary_number: `${userId}` });
  if (firstData || secondData) {
    return res.status(200).json({
      success: true,
      data: { firstData: firstData, secondData: secondData },
    });
  } else {
    return res.status(401).json({ success: false, data: null });
  }
});

app.get('/getUser', async (req, res) => {
  const UserId = await User.findById(req.query.userId);
  console.log('UserId:', UserId);

  if (UserId) {
    return res.status(200).json({ success: true, data: UserId });
  } else {
    return res.status(400).json({ success: false, data: null });
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
    console.log('request.body.data.object', request.body.data.object);

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
      const YearInMilliseconds = 365 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      let newTimeInMilliseconds;
      if (request.body.data.object.amount_total > 149900) {
        newTimeInMilliseconds = timeInMilliseconds + YearInMilliseconds;
      } else {
        newTimeInMilliseconds = timeInMilliseconds + thirtyDaysInMilliseconds;
      }

      let leads = 0;
      if (request.body.data.object.amount_total == 24900) {
        leads = 1000;
      } else if (request.body.data.object.amount_total == 39900) {
        leads = 3000;
      } else if (request.body.data.object.amount_total == 96000) {
        leads = 6000;
      } else if (request.body.data.object.amount_total == 149900) {
        leads = 10000;
      } else if (request.body.data.object.amount_total == 370000) {
        leads = 500;
      } else if (request.body.data.object.amount_total == 431000) {
        leads = 2000;
      } else if (request.body.data.object.amount_total == 919800) {
        leads = 5000;
      } else if (request.body.data.object.amount_total == 1618900) {
        leads = 10000;
      }
      if (
        user[0]?.subscription &&
        user[0]?.subscription?.leads > 0 &&
        request.body.data.object.amount_total !== 14000
      ) {
        totalLeads = user[0]?.subscription?.totalLeads + leads;
        leads = user[0]?.subscription?.leads + leads;
      }

      let newData = {
        ...user[0]._doc,
      };
      if (request.body.data.object.amount_total == 14000) {
        console.log('newData',newData)
        newData.subscription.totalLeads = user[0]?.subscription?.totalLeads +1000
        newData.subscription.leads = user[0]?.subscription?.leads +1000
      } else {
        newData.subscription = {
          amount: request.body.data.object.amount_total,
          created_at: request.body.data.object.created * 1000,
          expires_at: newTimeInMilliseconds,
          id: request.body.id,
          invoice: request.body.data.object.invoice,
          customerDetails: request.body.data.object.customer_details,
          payment_status: request.body.data.object.payment_status,
          customer: request.body.data.object,
          subscriptionId: request.body.data.object.subscription,
          leads: leads,
          totalLeads: leads,
        };
      }
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

app.get('/testme', async (req, res) => {
  res.send('Hello, World! Zoop');
});

app.get('/pixelCode.js', (req, res) => {
  let query = req.query;
  console.log('query', query);
  let data = `
  (function (w, d, s, o, f, js, fjs) {
    w['FCObject'] = o;
    w[o] =
      w[o] ||
      function () {
        (w[o].q = w[o].q || []).push(arguments);
      };
    (js = d.createElement(s)), (fjs = d.getElementsByTagName(s)[0]);
    js.id = o;
    js.src = f;
    js.async = 1;
    fjs.parentNode.insertBefore(js, fjs);
  })(
    window,
    document,
    'script',
    'fc',
    'https://tags.fullcontact.com/anon/fullcontact.js'
  );
  fc('init', 'WjKCaqyOzbF5E8RURfB2HVGXBRhRmYD5');
  function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(name + '=')) {
        return cookie.substring(name.length + 1);
      }
    }
    return null;
  }

  
  window.onload = function () {
   
    let iwid = getCookie('iw_id');
    if (iwid) {
      console.log('iw_id:', iwid);
    
    } else {
      console.log('iw_id cookie not found');
     
      let fcSession = getCookie('fc_session');
      if (fcSession) {
        console.log('fc_session:', fcSession);
      
      } else {
        console.log('fc_session cookie not found either');
      }
    }
  };
  let firstTime=Date.now(),sepratecode=Math.floor(1e6+9e6*Math.random()),usercode=sessionStorage.getItem("t-d-labs-u-id")||Math.floor(1e6+9e6*Math.random()),ip;async function startTrackingTime(){ip=await fetch("http://ip-api.com/json").then((e=>e.json())).then((e=>e))}function stopTrackingTime(){sessionStorage.setItem("t-d-labs-u-id",usercode),fetch("http://localhost:8080/pixeltrack",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ firstTime:firstTime,endTime:Date.now(),timeSpent:Date.now()-firstTime,date:(new Date).toUTCString(),domain:new URL(window.location.href).hostname,pageName:new URL(window.location.href).pathname,sepratecode:sepratecode,ip:ip,userId:"${query.userId}",referrer:document.referrer,browser:navigator.userAgent.includes("Chrome")?"Chrome":"Safari",agent:/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)?"Mobile":"Desktop",usercode:Number(usercode)})})}startTrackingTime(),document.addEventListener("visibilitychange",()=>{"hidden"===document.visibilityState&&stopTrackingTime()}),window.addEventListener("blur",()=>{stopTrackingTime()}),window.addEventListener("beforeunload",()=>{stopTrackingTime(),console.log("Total time spent on page: "+totalTime/1e3+" seconds")})`;
  res.type('application/javascript');
  res.send(data);
});


//AddUser@gmail.com
//newTestingU@gmail.com
//AliKhan@gmail.com