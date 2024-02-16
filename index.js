const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const ReceivedData = require('./Schema/signup');
const userRoutes = require('./routes/userRoutes');
const UserActivity = require('./Schema/userActivity');
const FilteredData = require('./Schema/filteredUserDetails');
const port = process.env.PORT || 8080;
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const User = require('./Schema/user');
const UserData = require('./Schema/userPersonalDetails');
const Audiences = require('./Schema/audiences');
const https = require('https');
const { log } = require('console');
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

function httpGetAsync(url, callback) {
  https
    .get(url, (resp) => {
      let data = '';

      // A chunk of data has been received.
      resp.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        callback(data);
      });
    })
    .on('error', (err) => {
      console.log('Error: ' + err.message);
    });
}
async function enrichPerson(personId, apiKey, maxEmails, hemtype) {
  const url = 'https://api.fullcontact.com/v3/person.enrich';

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const body = JSON.stringify({
    personId: personId,
    maxEmails: maxEmails,
    hemType: hemtype,
  });
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body,
    });
    if (!response.ok) {
      throw new Error(
        `API call failed: ${response.status} - ${response.statusText}`
      );
    }
    const data = await response.json();
    const md5Emails = data.details.emails.map((email) => email.md5);
    const filteredData = await getEmailAddresses(md5Emails); // Call getEmailAddresses and await for its completion
    let email = filteredData[0].Email
    let flag1 = false;
    const Emailurl =
      'https://emailvalidation.abstractapi.com/v1/?api_key=13b15821e59f448c8fea9bfb9083189a&email=' +
      email;
    // console.log('1');
    // httpGetAsync(Emailurl, function (response) {
    //   const jsonResponse = JSON.parse(response);
    //   if (jsonResponse?.is_valid_format?.value == true) flag1 = true
    // });
    // if (flag1) return filteredData;

    const jsonResponse = await getEmailValidationResponse(email);
  
    if (jsonResponse?.is_valid_format?.value == true) {
      return filteredData;
    }
  }
  
  function getEmailValidationResponse(email) {
    const Emailurl =
      'https://emailvalidation.abstractapi.com/v1/?api_key=13b15821e59f448c8fea9bfb9083189a&email=' +
      email;
      
    return new Promise((resolve, reject) => {
      httpGetAsync(Emailurl, function (response) {
        try {
          const jsonResponse = JSON.parse(response);
          resolve(jsonResponse);
        } catch (error) {
          reject(error);
        }
      });
    });
  




  
}


async function getEmailAddresses(md5Emails) {
  try {
    const response = await fetch('https://secureapi.datazapp.com/Appendv2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer IYBTCNRIDM',
      },
      body: JSON.stringify({
        ApiKey: 'IYBTCNRIDM',
        AppendModule: 'EncryptedEmailAppendAPI',
        AppendType: 2, //2 - MD5 | 1 - SHA256
        Data: md5Emails.map((md5) => ({ emailMD5Lower: md5 })),
      }),
    });
    if (!response.ok) {
      throw new Error(
        `API call failed: ${response.status} - ${response.statusText}`
      );
    }
    const data = await response.json();

    const filteredData = data.ResponseDetail.Data.filter(
      (item) => item.Matched === true
    );
    // console.log('Filtered Data:', filteredData);
    return filteredData;
  } catch (error) {
    console.error('Error calling Email Append API:', error);
    throw error;
  }
}

app.post('/pixeltrack', async (req, res) => {
  const receivedData = req.body;

  const user = await User.findOne({ _id: receivedData.userId });
  // let   personId = 'g95SnE0av8hRrVm73l8W6X1wFBLMtF_Ml1vnpBJrL7k077ON';

  // let   personId = 'D3AELj1W3QUEmSAD1nna9CRdHdiU8Sb9EYu7esfR613Z3NAZ';
  let personId = receivedData?.personId;
  // let personId = 'QEh5F5RZGKeJ6cPMjkqdsqW7ovX5iqJGHwrV8ihNNKG51kCp';
  const apiKey = 'z5cKCDKiBCemphHQ84fDX9FpnowUXGrd';
  const maxEmails = 2;
  const hemtype = 'md5';
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
        if (personId) {
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
          const filteredDataMain = await FilteredData.find({
            personId: personId,
          });
          // console.log('filteredDataMain'  , filteredDataMain)
          if (filteredDataMain.length > 0) {
            receivedData.Enriched = [filteredDataMain[0]];
            let ReceivedDatatoShow = await ReceivedData.create(receivedData);
            console.log('ReceivedDatatoShow', ReceivedDatatoShow);
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
          } else {
            const filteredData = await enrichPerson(
              personId,
              apiKey,
              maxEmails,
              hemtype
            );
            console.log('filteredData:', filteredData);
            let xool = [{ Data: [filteredData] }];
            receivedData.Enriched = filteredData;
            ReceivedData.create(receivedData);
            const Peel = await FilteredData({
              Data: filteredData,
              personId: personId,
            }).save();
            console.log('Peel:', Peel);
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
        console.log('newData', newData);
        newData.subscription.totalLeads =
          user[0]?.subscription?.totalLeads + 1000;
        newData.subscription.leads = user[0]?.subscription?.leads + 1000;
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

app.post('/audiences', async (req, res) => {
  if (req.body.userId && req.body.filters.length > 0) {
    const userId = req.body.userId;
    const filters = req.body.filters;
    const filterName = req.body.filterName;
    const audiences = new Audiences({ userId, filters, filterName });
    await audiences.save();
    res
      .status(200)
      .json({ success: true, message: 'Audience created successfully' });
  } else {
    res.status(200).json({ success: false, message: 'Invalid request' });
  }
});
app.get('/audiences', async (req, res) => {
  if (req.query.userId) {
    const userId = req.query.userId;
    const audiences = await Audiences.find({ userId });
    if (audiences) {
      res.status(200).json({
        success: true,
        message: 'Audience Found successfully',
        data: audiences,
      });
    } else {
      res
        .status(200)
        .json({ success: false, message: 'No Audience Found', data: [] });
    }
  } else {
    res
      .status(200)
      .json({ success: false, message: 'UserId Not Available', data: null });
  }
});
app.get('/leadsAvailability', async (req, res) => {
  if (req.query.userId) {
    const userId = req.query.userId;
    const audiences = await User.findById( userId );
    console.log('audiences:', audiences);
    if (audiences && audiences?.subscription?.leads > 0) {
      res.status(200).json({
        success: true,
        id:"Gluw20BaIF7ocNtwGyZEDHCkRaiE4HX7"
      });
    } else {
      res
        .status(200)
        .json({ success: false, });
    }
  } else {
    res
      .status(200)
      .json({ success: false, });
  }
});

app.get('/testme', async (req, res) => {
  res.send('Hello, World! Zoop');
});

app.get('/pixelCode.js', (req, res) => {
  let query = req.query;
  console.log('query', query);
  let data = ` 
  var CookieHolder ;

 fetch('https://fast-anchorage-52648-37ea5d9b7bab.herokuapp.com/leadsAvailability?userId='${query.userId}, {
    method: "GET",
    headers: {
        'userId': userId
    }
})
.then(response => response.json())
.then(data => {
    if(data.success == true){
        function getCookieValue(name) {
            let matches = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
            return matches ? matches[2] : null;
          }
          
          function waitForCookie(name, timeout = 5000) {
            return new Promise((resolve, reject) => {
                let elapsed = 0;
                const interval = 100;
          
                const checkCookie = setInterval(() => {
                    const cookieValue = getCookieValue(name);
                    if (cookieValue !== null) {
                        clearInterval(checkCookie);
                        resolve(cookieValue);
                    } else if (elapsed > timeout) {
                        clearInterval(checkCookie);
                        reject(new Error('Cookie was not found within the timeout period'));
                    }
                    elapsed += interval;
                }, interval);
            });
          }
          
          var config = {
            storageKey: "iw_id",
          };
          
          //////****Initialization for FC */
        //   fc('init', "Gluw20BaIF7ocNtwGyZEDHCkRaiE4HX7", config);
          fc('init', data.id, config);
          //////****Initialization for FC */
          
          async function callback_function(pid) {
            const endpoint = 'https://pid-list-saver-dc1b3ad9db69.herokuapp.com/pid/' //send IW_ID to your endpoint with this
            const data = {pid: pid};
          
            const body = JSON.stringify(data);
            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
            })
            .catch(error => {
            });
          }
          
          waitForCookie('iw_id')
            .then(async cookieValue => {
                console.log('iw_id cookie value:', cookieValue);
                  cookieValue = CookieHolder;
                await callback_function(cookieValue)
            })
            .catch(error => {
                console.error(error.message);
          });
          
          
          
          (() => {
            var t, e, n = {
                    228: t => {
                        t.exports = function(t, e) {
                            (null == e || e > t.length) && (e = t.length);
                            for (var n = 0, r = new Array(e); n < e; n++) r[n] = t[n];
                            return r
                        }
                    },
                    858: t => {
                        t.exports = function(t) {
                            if (Array.isArray(t)) return t
                        }
                    },
                    646: (t, e, n) => {
                        var r = n(228);
                        t.exports = function(t) {
                            if (Array.isArray(t)) return r(t)
                        }
                    },
                    926: t => {
                        function e(t, e, n, r, o, i, a) {
                            try {
                                var c = t[i](a),
                                    u = c.value
                            } catch (t) {
                                return void n(t)
                            }
                            c.done ? e(u) : Promise.resolve(u).then(r, o)
                        }
                        t.exports = function(t) {
                            return function() {
                                var n = this,
                                    r = arguments;
                                return new Promise((function(o, i) {
                                    var a = t.apply(n, r);
          
                                    function c(t) {
                                        e(a, o, i, c, u, "next", t)
                                    }
          
                                    function u(t) {
                                        e(a, o, i, c, u, "throw", t)
                                    }
                                    c(void 0)
                                }))
                            }
                        }
                    },
                    713: t => {
                        t.exports = function(t, e, n) {
                            return e in t ? Object.defineProperty(t, e, {
                                value: n,
                                enumerable: !0,
                                configurable: !0,
                                writable: !0
                            }) : t[e] = n, t
                        }
                    },
                    860: t => {
                        t.exports = function(t) {
                            if ("undefined" != typeof Symbol && Symbol.iterator in Object(t)) return Array.from(t)
                        }
                    },
                    884: t => {
                        t.exports = function(t, e) {
                            if ("undefined" != typeof Symbol && Symbol.iterator in Object(t)) {
                                var n = [],
                                    r = !0,
                                    o = !1,
                                    i = void 0;
                                try {
                                    for (var a, c = t[Symbol.iterator](); !(r = (a = c.next()).done) && (n.push(a.value), !e || n.length !== e); r = !0);
                                } catch (t) {
                                    o = !0, i = t
                                } finally {
                                    try {
                                        r || null == c.return || c.return()
                                    } finally {
                                        if (o) throw i
                                    }
                                }
                                return n
                            }
                        }
                    },
                    521: t => {
                        t.exports = function() {
                            throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                        }
                    },
                    206: t => {
                        t.exports = function() {
                            throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                        }
                    },
                    38: (t, e, n) => {
                        var r = n(858),
                            o = n(884),
                            i = n(379),
                            a = n(521);
                        t.exports = function(t, e) {
                            return r(t) || o(t, e) || i(t, e) || a()
                        }
                    },
                    551: (t, e, n) => {
                        var r = n(858),
                            o = n(860),
                            i = n(379),
                            a = n(521);
                        t.exports = function(t) {
                            return r(t) || o(t) || i(t) || a()
                        }
                    },
                    319: (t, e, n) => {
                        var r = n(646),
                            o = n(860),
                            i = n(379),
                            a = n(206);
                        t.exports = function(t) {
                            return r(t) || o(t) || i(t) || a()
                        }
                    },
                    379: (t, e, n) => {
                        var r = n(228);
                        t.exports = function(t, e) {
                            if (t) {
                                if ("string" == typeof t) return r(t, e);
                                var n = Object.prototype.toString.call(t).slice(8, -1);
                                return "Object" === n && t.constructor && (n = t.constructor.name), "Map" === n || "Set" === n ? Array.from(t) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? r(t, e) : void 0
                            }
                        }
                    },
                    757: (t, e, n) => {
                        t.exports = n(666)
                    },
                    687: (t, e, n) => {
                        "use strict";
                        n.d(e, {
                            h: () => kt
                        });
                        var r = {};
                        n.r(r), n.d(r, {
                            ajaxGet: () => k,
                            pixelGet: () => S
                        });
                        var o = {};
                        n.r(o), n.d(o, {
                            findSimilarCookies: () => T,
                            getCookie: () => O,
                            getDataFromLocalStorage: () => j,
                            localStorageIsEnabled: () => E,
                            removeDataFromLocalStorage: () => P,
                            setCookie: () => L,
                            setDataInLocalStorage: () => R
                        });
                        var i = n(319),
                            a = n.n(i),
                            c = n(551),
                            u = n.n(c),
                            s = n(757),
                            l = n.n(s),
                            f = n(926),
                            d = n.n(f),
                            p = n(38),
                            h = n.n(p),
                            v = n(713),
                            g = n.n(v);
          
                        function m(t, e) {
                            var n = Object.keys(t);
                            if (Object.getOwnPropertySymbols) {
                                var r = Object.getOwnPropertySymbols(t);
                                e && (r = r.filter((function(e) {
                                    return Object.getOwnPropertyDescriptor(t, e).enumerable
                                }))), n.push.apply(n, r)
                            }
                            return n
                        }
          
                        function y(t) {
                            for (var e = 1; e < arguments.length; e++) {
                                var n = null != arguments[e] ? arguments[e] : {};
                                e % 2 ? m(Object(n), !0).forEach((function(e) {
                                    g()(t, e, n[e])
                                })) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : m(Object(n)).forEach((function(e) {
                                    Object.defineProperty(t, e, Object.getOwnPropertyDescriptor(n, e))
                                }))
                            }
                            return t
                        }
          
                        function w(t) {
                            var e = function() {
                                    var e = d()(l().mark((function e(n, r) {
                                        var o;
                                        return l().wrap((function(e) {
                                            for (;;) switch (e.prev = e.next) {
                                                case 0:
                                                    return e.next = 2, fetch("".concat("https://api.fullcontact.com/v3", "/").concat(n, "?webtagKey=").concat(t), y(y({}, r), {}, {
                                                        headers: y({
                                                            "Content-Type": "application/json"
                                                        }, null == r ? void 0 : r.headers)
                                                    }));
                                                case 2:
                                                    if (200 !== (o = e.sent).status) {
                                                        e.next = 5;
                                                        break
                                                    }
                                                    return e.abrupt("return", null == o ? void 0 : o.json());
                                                case 5:
                                                    return e.abrupt("return", null);
                                                case 6:
                                                case "end":
                                                    return e.stop()
                                            }
                                        }), e)
                                    })));
                                    return function(t, n) {
                                        return e.apply(this, arguments)
                                    }
                                }(),
                                n = function() {
                                    var e = d()(l().mark((function e(n) {
                                        var r;
                                        return l().wrap((function(e) {
                                            for (;;) switch (e.prev = e.next) {
                                                case 0:
                                                    return e.next = 2, fetch("".concat("https://api.fullcontact.com/v3/webtag.rtp", "?webtagKey=").concat(t), y(y({}, n), {}, {
                                                        headers: y({
                                                            "Content-Type": "application/x-www-form-urlencoded"
                                                        }, null == n ? void 0 : n.headers)
                                                    }));
                                                case 2:
                                                    if (200 !== (r = e.sent).status) {
                                                        e.next = 5;
                                                        break
                                                    }
                                                    return e.abrupt("return", null == r ? void 0 : r.json());
                                                case 5:
                                                    return e.abrupt("return", null);
                                                case 6:
                                                case "end":
                                                    return e.stop()
                                            }
                                        }), e)
                                    })));
                                    return function(t) {
                                        return e.apply(this, arguments)
                                    }
                                }(),
                                r = function() {
                                    var t = d()(l().mark((function t(n) {
                                        var r;
                                        return l().wrap((function(t) {
                                            for (;;) switch (t.prev = t.next) {
                                                case 0:
                                                    return t.next = 2, e("webtag.resolve", {
                                                        method: "POST",
                                                        body: JSON.stringify(n)
                                                    });
                                                case 2:
                                                    if (!(r = t.sent)) {
                                                        t.next = 5;
                                                        break
                                                    }
                                                    return t.abrupt("return", r.personIds[0]);
                                                case 5:
                                                    return t.abrupt("return", null);
                                                case 6:
                                                case "end":
                                                    return t.stop()
                                            }
                                        }), t)
                                    })));
                                    return function(e) {
                                        return t.apply(this, arguments)
                                    }
                                }();
                            return {
                                token: t,
                                fcRequest: e,
                                webtagResolve: r,
                                webtagInsights: function() {
                                    var t = d()(l().mark((function t(e) {
                                        var r, o, i;
                                        return l().wrap((function(t) {
                                            for (;;) switch (t.prev = t.next) {
                                                case 0:
                                                    return r = {
                                                        li_nonid: e.li_nonId,
                                                        panoramaId: e.panoramaId
                                                    }, (o = function(t) {
                                                        return Object.keys(t).map((function(e) {
                                                            return encodeURIComponent(e) + "=" + encodeURIComponent(t[e])
                                                        })).join("&")
                                                    })(r), t.next = 5, n({
                                                        method: "POST",
                                                        body: o(r)
                                                    });
                                                case 5:
                                                    if (null == (i = t.sent) || !i.i) {
                                                        t.next = 8;
                                                        break
                                                    }
                                                    return t.abrupt("return", i.i);
                                                case 8:
                                                    return t.abrupt("return", null);
                                                case 9:
                                                case "end":
                                                    return t.stop()
                                            }
                                        }), t)
                                    })));
                                    return function(e) {
                                        return t.apply(this, arguments)
                                    }
                                }()
                            }
                        }
                        var b = function() {
                                var t = d()(l().mark((function t(e, n) {
                                    return l().wrap((function(t) {
                                        for (;;) switch (t.prev = t.next) {
                                            case 0:
                                                return t.next = 2, fetch("https://api.fullcontact.com/platformweb/api/developers/recognition/webtag.verify.ping?webtagKey=" + n, {
                                                    method: "POST",
                                                    headers: {
                                                        "Content-Type": "application/x-www-form-urlencoded"
                                                    },
                                                    body: "verifyUuid=" + encodeURIComponent(e)
                                                });
                                            case 2:
                                                200 === t.sent.status && window.close();
                                            case 4:
                                            case "end":
                                                return t.stop()
                                        }
                                    }), t)
                                })));
                                return function(e, n) {
                                    return t.apply(this, arguments)
                                }
                            }(),
                            x = n(607);
          
                        function k(t, e) {
                            var n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : function() {},
                                r = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : 0,
                                o = !1;
          
                            function i(t) {
                                var e = o ? "Timeout after ".concat(r, ". ") : "",
                                    i = new Error("".concat(e).concat(t));
                                n(i)
                            }
          
                            function a() {
                                var n = new XMLHttpRequest;
                                return n.onreadystatechange = function() {
                                    if (4 === n.readyState) {
                                        var r = n.status;
                                        r >= 200 && r < 300 || 304 === r ? e(n.responseText, n) : i("XHR Error received: ".concat(r, ", url: ").concat(t))
                                    }
                                }, n
                            }
          
                            function c() {
                                var n = new window.XDomainRequest;
                                return n.onprogress = function() {}, n.onerror = function() {
                                    i("XDR Error received: ".concat(n.responseText, ", url: ").concat(t))
                                }, n.onload = function() {
                                    return e(n.responseText, n)
                                }, n
                            }
                            try {
                                var u = window && window.XMLHttpRequest ? a() : c();
                                u.ontimeout = function() {
                                    o = !0
                                }, u.open("GET", t, !0), u.timeout = r, u.withCredentials = !0, u.send()
                            } catch (t) {
                                n(t)
                            }
                        }
          
                        function S(t, e) {
                            var n = new window.Image;
                            (0, x.mf)(e) && (n.onload = e), n.src = t
                        }
                        var I = n(389),
                            _ = n(167),
                            C = null;
          
                        function E() {
                            return null == C && (C = function() {
                                var t = !1;
                                try {
                                    if (window && window.localStorage) {
                                        var e = Math.random().toString();
                                        window.localStorage.setItem(e, e), t = window.localStorage.getItem(e) === e, window.localStorage.removeItem(e)
                                    }
                                } catch (t) {
                                    _.vU("LSCheckError", t.message, t)
                                }
                                return t
                            }()), C
                        }
          
                        function O(t) {
                            return I.get(t)
                        }
          
                        function j(t) {
                            var e = null;
                            return E() && (e = function(t) {
                                return window.localStorage.getItem(t)
                            }(t)), e
                        }
          
                        function T(t) {
                            var e = [];
                            try {
                                var n = I.all();
                                for (var r in n) n[r] && r.indexOf(t) >= 0 && e.push(I.get(r))
                            } catch (t) {
                                _.vU("CookieFindSimilarInJar", "Failed fetching from a cookie jar", t)
                            }
                            return e
                        }
          
                        function L(t, e, n, r, o) {
                            I.set(t, e, {
                                domain: o,
                                expires: n,
                                samesite: r
                            })
                        }
          
                        function P(t) {
                            E() && window.localStorage.removeItem(t)
                        }
          
                        function R(t, e) {
                            E() && window.localStorage.setItem(t, e)
                        }
          
                        function A(t, e) {
                            return {
                                push: function(e) {
                                    return new Promise((function(i, a) {
                                        n.e(19).then(n.bind(n, 990)).then((function(n) {
                                            var c = (0, n.StandardLiveConnect)({
                                                storageStrategy: t
                                            }, o, r);
                                            c.ready ? (c.push(e), i()) : a(new Error("lcInstance was not ready"))
                                        }))
                                    }))
                                },
                                resolveNonId: function() {
                                    return new Promise((function(i, a) {
                                        var c = function(t) {
                                            t.unifiedId ? i(t.unifiedId) : a(new Error("Unable to resolve non id"))
                                        };
                                        n.e(19).then(n.bind(n, 990)).then((function(n) {
                                            var i = (0, n.StandardLiveConnect)({
                                                storageStrategy: t
                                            }, o, r);
                                            if (i.ready) {
                                                var u = e ? {
                                                    qf: e
                                                } : {};
                                                i.resolve(c, (function() {
                                                    a(new Error("Unable to resolve non id"))
                                                }), u)
                                            }
                                        }))
                                    }))
                                }
                            }
                        }
                        var B = function() {
                            var t = window.location.hostname.split(".").reverse();
                            return ".".concat(t[1], ".").concat(t[0])
                        };
          
                        function U(t) {
                            return {
                                sync: function() {
                                    return new Promise((function(e) {
                                        var n, r = {
                                                config: {
                                                    onProfileReady: function(t) {
                                                        var n = t.getProfileId(),
                                                            r = t.getPanoramaId();
                                                        e([r, n])
                                                    }
                                                }
                                            }.config || {},
                                            o = window["lotame_sync_" + t] = {};
                                        o.config = r, o.data = {}, o.cmd = o.cmd || [], (n = function(t) {
                                            return "https://tags.crwdcntrl.net/lt/c/".concat(t, "/sync.min.js")
                                        }(t), new Promise((function(t) {
                                            var e = document.createElement("script");
                                            e.async = !0, e.readyState ? e.onreadystatechange = function() {
                                                "loaded" != e.readyState && "complete" != e.readyState || (e.onreadystatechange = null, t())
                                            } : e.onload = function() {
                                                t()
                                            }, e.src = n, document.getElementsByTagName("body")[0].appendChild(e)
                                        }))).then((function() {
                                            window["lotame_sync_" + t].sync()
                                        }))
                                    }))
                                }
                            }
                        }
                        const M = {
                            save: function(t, e) {
                                localStorage.setItem(t, e)
                            },
                            get: function(t) {
                                return localStorage.getItem(t)
                            }
                        };
                        var D = new Date(Date.now() + 315576e6).toUTCString(),
                            N = function(t, e) {
                                var n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : D;
                                window.document.cookie = "".concat(t, "=").concat(e, "; expires=").concat(n, "; domain=").concat(B(), "; path=/;")
                            };
                        const F = {
                            save: N,
                            get: function(t) {
                                var e = window.decodeURIComponent(window.document.cookie).match(new RegExp("(^|;)\\s*" + t + "\\s*=\\s*([^;]*)\\s*(;|$)"));
                                return e ? e[2] : null
                            },
                            remove: function(t) {
                                N(t, "", "Expires=Thu, 01 Jan 1970 00:00:01 GMT;")
                            }
                        };
                        var H = function(t) {
                                if ("ls" === t) return M;
                                if ("cookie" === t) return F;
                                throw Error("Invalid storage key")
                            },
                            z = function(t, e, n) {
                                var r, o = e;
                                switch (t) {
                                    case "adobe":
                                        r = function() {
                                            if (window._satellite) {
                                                var t, e, n, r = null === (t = window._satellite) || void 0 === t || null === (e = t.getVisitorId) || void 0 === e || null === (n = e.call(t)) || void 0 === n ? void 0 : n.cookieName,
                                                    o = F.get(r);
                                                if (o) return /MCMID\|([\d]+)\|/g.exec(o)[1]
                                            }
                                            return null
                                        }(), o = "ecid";
                                        break;
                                    case "ga":
                                        r = F.get("_ga"), o = "gaid";
                                        break;
                                    default:
                                        r = H(t).get(n)
                                }
                                return r ? g()({}, o, r) : null
                            },
                            G = function(t) {
                                var e = {};
                                return t.forEach((function(t) {
                                    var n = h()(t, 3),
                                        r = n[0],
                                        o = n[1],
                                        i = n[2],
                                        a = z(r, o, i);
                                    Object.assign(e, a)
                                })), e
                            },
                            $ = "fc_anon",
                            q = "fc_session",
                            K = "fc_nl",
                            J = "fc_nl_session",
                            Y = "fc_pid",
                            W = "fc_consent",
                            X = "li",
                            Z = "lotame",
                            V = "panoramaId",
                            Q = "__li_idex_cache_e30",
                            tt = function() {
                                if ("allow" === F.get(W)) return !0
                            },
                            et = function() {
                                var t = F.get(W);
                                if ("allow" === t || "disable" === t) return !0
                            },
                            nt = function() {
                                var t = document.getElementById("fcSimpleConsent");
                                t && t.remove()
                            },
                            rt = function() {
                                F.save(W, "disable"), nt()
                            },
                            ot = function() {
                                F.save(W, "allow"), nt();
                                var t = window.fcToken,
                                    e = window.fcConfig;
                                kt(window).init(t, e)
                            },
                            it = function() {
                                var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
                                    e = t.bgColor,
                                    n = void 0 === e ? "#1E1C39" : e,
                                    r = t.textColor,
                                    o = void 0 === r ? "white" : r,
                                    i = t.buttonColor,
                                    a = void 0 === i ? "rgb(77, 198, 231)" : i,
                                    c = document.getElementsByTagName("body")[0],
                                    u = "div.simpleConsent { display: flex; \n         flex-wrap: wrap; \n         justify-content: flex-end; \n         background-color: ".concat(n, "; \n         color: ").concat(o, "; \n         font-family:  Arial; \n         font-size: .95em; \n         padding: 20px; \n         width: 100%; \n         position: fixed;\n         bottom: 0; \n         left: 0; \n         z-index: 9999; \n        } \n     .paddingDiv { flex: 65%; \n     }   \n     button.simpleConsentButton { flex: 10%; \n         cursor: pointer; \n         line-height: 20px; \n         box-sizing: border-box; \n         align-items: center; \n         box-shadow: rgba(0, 0, 0, 0.12) 0px 1px 2px 0px; \n         text-align: center; \n         font-size: 13px; \n         transition: all 0.2s ease 0s; \n         font-weight: 800; \n         padding: 0px; \n         justify-content: center; \n         outline: none; \n         text-decoration: none; \n         float: right; \n         margin-right: 15px; \n         border: 1px solid rgb(77, 198, 231); \n         border-radius: 0px; \n         font-family:  Arial; \n         height: 50px; \n         min-width: 100px; \n     } \n     button.allowConsent { \n         background-color: ").concat(a, "; \n         hover:background-color: rgb(100, 230, 255); width: 200px; \n         color: rgb(255, 255, 255); \n         margin-right: 50px; \n     } \n     .allowConsent:hover { background-color: rgb(168, 233, 253); }"),
                                    s = document.head || document.getElementsByTagName("head")[0],
                                    l = document.createElement("style");
                                s.appendChild(l), l.type = "text/css", l.styleSheet ? l.styleSheet.cssText = u : l.appendChild(document.createTextNode(u));
                                var f = document.createElement("div");
                                f.id = "fcSimpleConsent", f.className = "simpleConsent", f.innerHTML = "<div style='flex-basis: 100%'><h3>Your Privacy Settings</h3></div><p style='flex: 80%;'>We may use a third-party pixel tag on our website to collect and share information about you in accordance with our privacy policy. By accepting, you agree to our use of such tag.</p><div style='flex:20%'>&nbsp;</div>";
                                var d = document.createElement("button");
                                d.className = "simpleConsentButton allowConsent", d.innerHTML = "Accept", d.onclick = ot;
                                var p = document.createElement("button");
                                p.className = "simpleConsentButton", p.innerHTML = "Decline", p.onclick = rt;
                                var h = document.createElement("div");
                                h.className = "paddingDiv", h.innerHTML = "&nbsp;", f.appendChild(p), f.appendChild(d), f.appendChild(h), c.appendChild(f)
                            },
                            at = function(t) {
                                var e = new Date(Date.now() + 18e5).toUTCString();
                                F.save(q, t, e)
                            },
                            ct = function() {
                                return F.get(q)
                            },
                            ut = function(t) {
                                var e = new Date(Date.now() + 18e5).toUTCString();
                                F.save(J, t, e)
                            },
                            st = function() {
                                return F.get(J)
                            },
                            lt = n(214),
                            ft = n.n(lt);
          
                        function dt(t, e) {
                            var n;
                            if ("undefined" == typeof Symbol || null == t[Symbol.iterator]) {
                                if (Array.isArray(t) || (n = function(t, e) {
                                        if (!t) return;
                                        if ("string" == typeof t) return pt(t, e);
                                        var n = Object.prototype.toString.call(t).slice(8, -1);
                                        "Object" === n && t.constructor && (n = t.constructor.name);
                                        if ("Map" === n || "Set" === n) return Array.from(t);
                                        if ("Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return pt(t, e)
                                    }(t)) || e && t && "number" == typeof t.length) {
                                    n && (t = n);
                                    var r = 0,
                                        o = function() {};
                                    return {
                                        s: o,
                                        n: function() {
                                            return r >= t.length ? {
                                                done: !0
                                            } : {
                                                done: !1,
                                                value: t[r++]
                                            }
                                        },
                                        e: function(t) {
                                            throw t
                                        },
                                        f: o
                                    }
                                }
                                throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                            }
                            var i, a = !0,
                                c = !1;
                            return {
                                s: function() {
                                    n = t[Symbol.iterator]()
                                },
                                n: function() {
                                    var t = n.next();
                                    return a = t.done, t
                                },
                                e: function(t) {
                                    c = !0, i = t
                                },
                                f: function() {
                                    try {
                                        a || null == n.return || n.return()
                                    } finally {
                                        if (c) throw i
                                    }
                                }
                            }
                        }
          
                        function pt(t, e) {
                            (null == e || e > t.length) && (e = t.length);
                            for (var n = 0, r = new Array(e); n < e; n++) r[n] = t[n];
                            return r
                        }
                        var ht = function() {
                                var t = d()(l().mark((function t(e, n, r, o) {
                                    return l().wrap((function(t) {
                                        for (;;) switch (t.prev = t.next) {
                                            case 0:
                                                return n || (n = A(r, o)), t.next = 4, n.push({
                                                    event: "conversion",
                                                    name: "email_signup",
                                                    emailHash: e
                                                });
                                            case 4:
                                            case "end":
                                                return t.stop()
                                        }
                                    }), t)
                                })));
                                return function(e, n, r, o) {
                                    return t.apply(this, arguments)
                                }
                            }(),
                            vt = function(t) {
                                return /^[a-f0-9]{32}$/i.test(t)
                            },
                            gt = function() {
                                var t = d()(l().mark((function t(e, n) {
                                    var r, o, i, a, c, u, s;
                                    return l().wrap((function(t) {
                                        for (;;) switch (t.prev = t.next) {
                                            case 0:
                                                r = A(e, n), o = window.location.search, i = new URLSearchParams(o), (a = Array.from(i.entries()).filter((function(t) {
                                                    var e = h()(t, 2),
                                                        n = (e[0], e[1]);
                                                    return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(n) || vt(n)
                                                })).map((function(t) {
                                                    var e = h()(t, 2),
                                                        n = (e[0], e[1]);
                                                    return vt(n) ? n : ft()(n).toString()
                                                }))).length, c = dt(a), t.prev = 6, c.s();
                                            case 8:
                                                if ((u = c.n()).done) {
                                                    t.next = 14;
                                                    break
                                                }
                                                return s = u.value, t.next = 12, ht(s, r, n);
                                            case 12:
                                                t.next = 8;
                                                break;
                                            case 14:
                                                t.next = 19;
                                                break;
                                            case 16:
                                                t.prev = 16, t.t0 = t.catch(6), c.e(t.t0);
                                            case 19:
                                                return t.prev = 19, c.f(), t.finish(19);
                                            case 22:
                                                return F.save("fc_1pe", a.length > 0), t.abrupt("return", r);
                                            case 24:
                                            case "end":
                                                return t.stop()
                                        }
                                    }), t, null, [
                                        [6, 16, 19, 22]
                                    ])
                                })));
                                return function(e, n) {
                                    return t.apply(this, arguments)
                                }
                            }(),
                            mt = function() {
                                var t = d()(l().mark((function t(e) {
                                    var n, r, o;
                                    return l().wrap((function(t) {
                                        for (;;) switch (t.prev = t.next) {
                                            case 0:
                                                if (n = window.location.search, r = new URLSearchParams(n), null === (o = r.get("fcverifytag"))) {
                                                    t.next = 6;
                                                    break
                                                }
                                                return t.next = 6, b(o, e);
                                            case 6:
                                            case "end":
                                                return t.stop()
                                        }
                                    }), t)
                                })));
                                return function(e) {
                                    return t.apply(this, arguments)
                                }
                            }(),
                            yt = function(t) {
                                return t && !F.get("fc_1pe")
                            },
                            wt = function() {
                                var t = d()(l().mark((function t() {
                                    var e, n, r, o, i, a, c, u, s, f, d, p, v, g, m, y, w, b, x, k, S, I, _, C, E, O, j, T, L, P, R, B, M, D = arguments;
                                    return l().wrap((function(t) {
                                        for (;;) switch (t.prev = t.next) {
                                            case 0:
                                                return e = D.length > 0 && void 0 !== D[0] ? D[0] : {}, n = e.storageStrategy, r = void 0 === n ? "cookie" : n, o = e.storageKey, i = void 0 === o ? "fc_pid" : o, a = e._1pidy, c = void 0 !== a && a, u = e.idProviders, s = void 0 === u ? [X, Z] : u, f = e.forceCallback, d = void 0 !== f && f, p = e.liQf, v = e.isInsightsOn, g = void 0 !== v && v, m = e.isRecognitionOn, y = void 0 === m || m, w = e.collectSimpleConsent, b = void 0 !== w && w, x = e.simpleConsentStyle, k = void 0 === x ? {} : x, S = D.length > 1 ? D[1] : void 0, t.next = 4, mt(S);
                                            case 4:
                                                if (I = H(r), _ = ct() || st(), !b) {
                                                    t.next = 10;
                                                    break
                                                }
                                                if (et() || it(k), tt()) {
                                                    t.next = 10;
                                                    break
                                                }
                                                return t.abrupt("return", {});
                                            case 10:
                                                if (!_) {
                                                    t.next = 29;
                                                    break
                                                }
                                                if (d) {
                                                    t.next = 16;
                                                    break
                                                }
                                                return at(_), t.abrupt("return", {});
                                            case 16:
                                                C = {}, t.prev = 17, O = decodeURIComponent(I.get(Q)), j = null === (E = JSON.parse(O)) || void 0 === E ? void 0 : E.unifiedId, st() && (C.isSameInsightsSession = !0, C.insights = I.get(K), C.insightsIdentifierMap = {
                                                    insights: I.get(K),
                                                    panoramaId: I.get(V),
                                                    li_nonid: j
                                                }), ct() && (C.isSameRecongnitonSession = !0, C.pid = I.get(i), C.recognitionIdentifierMap = {
                                                    pid: I.get($),
                                                    panoramaId: I.get(V),
                                                    li_nonid: j
                                                }), t.next = 26;
                                                break;
                                            case 24:
                                                t.prev = 24, t.t0 = t.catch(17);
                                            case 26:
                                                return t.prev = 26, t.abrupt("return", C);
                                            case 29:
                                                if (T = null, L = null, !s.includes(X)) {
                                                    t.next = 49;
                                                    break
                                                }
                                                if (t.prev = 32, P = null, !yt(c)) {
                                                    t.next = 40;
                                                    break
                                                }
                                                return t.next = 37, gt(r, p);
                                            case 37:
                                                P = t.sent, t.next = 41;
                                                break;
                                            case 40:
                                                P = A(r, p);
                                            case 41:
                                                return t.next = 43, P.resolveNonId();
                                            case 43:
                                                T = t.sent, t.next = 49;
                                                break;
                                            case 46:
                                                t.prev = 46, t.t1 = t.catch(32);
                                            case 49:
                                                if (!s.includes(Z)) {
                                                    t.next = 63;
                                                    break
                                                }
                                                return t.prev = 50, R = U("16115"), t.next = 54, R.sync();
                                            case 54:
                                                B = t.sent, M = h()(B, 2), L = M[0], profileId = M[1], t.next = 63;
                                                break;
                                            case 60:
                                                t.prev = 60, t.t2 = t.catch(50);
                                            case 63:
                                                return t.abrupt("return", {
                                                    nonId: T,
                                                    panoramaId: L,
                                                    isRecognitionOn: y,
                                                    isInsightsOn: g
                                                });
                                            case 64:
                                            case "end":
                                                return t.stop()
                                        }
                                    }), t, null, [
                                        [17, 24, 26, 29],
                                        [32, 46],
                                        [50, 60]
                                    ])
                                })));
                                return function() {
                                    return t.apply(this, arguments)
                                }
                            }(),
                            bt = function() {
                                var t = d()(l().mark((function t(e) {
                                    var n, r, o, i, a, c, u, s, f, d, p, h = arguments;
                                    return l().wrap((function(t) {
                                        for (;;) switch (t.prev = t.next) {
                                            case 0:
                                                return n = h.length > 1 && void 0 !== h[1] ? h[1] : {}, r = n.storageStrategy, o = void 0 === r ? "cookie" : r, i = n.insightsStorageKey, a = void 0 === i ? K : i, c = h.length > 2 ? h[2] : void 0, u = w(e), s = H(o), f = null, t.next = 7, u.webtagInsights({
                                                    li_nonId: c.nonId,
                                                    panoramaId: c.panoramaId
                                                });
                                            case 7:
                                                return f = t.sent, d = {
                                                    li_nonId: c.nonId,
                                                    panoramaId: c.panoramaId
                                                }, (p = {
                                                    insights: f,
                                                    insightsIdentifierMap: d
                                                }).insights ? (s.save(a, f), ut("insights")) : ut("no i"), t.abrupt("return", p);
                                            case 12:
                                            case "end":
                                                return t.stop()
                                        }
                                    }), t)
                                })));
                                return function(e) {
                                    return t.apply(this, arguments)
                                }
                            }(),
                            xt = function() {
                                var t = d()(l().mark((function t(e) {
                                    var n, r, o, i, a, c, u, s, f, d, p, h, v = arguments;
                                    return l().wrap((function(t) {
                                        for (;;) switch (t.prev = t.next) {
                                            case 0:
                                                return n = v.length > 1 && void 0 !== v[1] ? v[1] : {}, r = n.storageStrategy, o = void 0 === r ? "cookie" : r, i = n.storageKey, a = void 0 === i ? Y : i, c = n.pk, u = v.length > 2 ? v[2] : void 0, s = w(e), f = H(o), d = null, t.next = 7, s.webtagResolve({
                                                    li_nonid: u.nonId,
                                                    panoramaId: u.panoramaId,
                                                    partnerKeys: c ? G(c) : {}
                                                });
                                            case 7:
                                                return d = t.sent, p = {
                                                    li_nonid: u.nonId,
                                                    panoramaId: u.panoramaId,
                                                    pid: d
                                                }, (h = {
                                                    pid: d,
                                                    recognitonIdentifierMap: p
                                                }).pid ? (at("pid"), f.save(a, d), F.save($, d)) : at("nopid"), t.abrupt("return", h);
                                            case 12:
                                            case "end":
                                                return t.stop()
                                        }
                                    }), t)
                                })));
                                return function(e) {
                                    return t.apply(this, arguments)
                                }
                            }(),
                            kt = function() {
                                return {
                                    init: (t = d()(l().mark((function t(e) {
                                        var n, r, o, i, a, c, u, s, f, d, p, h, v = arguments;
                                        return l().wrap((function(t) {
                                            for (;;) switch (t.prev = t.next) {
                                                case 0:
                                                    return n = v.length > 1 && void 0 !== v[1] ? v[1] : {}, t.prev = 1, window.fcToken = e, window.fcConfig = n, t.next = 6, wt(n, e);
                                                case 6:
                                                    if ((r = t.sent).isSameInsightsSession && (null === (o = n.insightsCallback) || void 0 === o || o.call(n, r.insights), null === (i = n.insightsIdentifierCallBack) || void 0 === i || i.call(n, r.insights, r.insightsIdentifierMap)), r.isSameRecongnitonSession && (null === (a = n.callback) || void 0 === a || a.call(n, r.pid), null === (c = n.identifierCallback) || void 0 === c || c.call(n, r.pid, r.recognitionIdentifierMap)), !r.isInsightsOn) {
                                                        t.next = 15;
                                                        break
                                                    }
                                                    return t.next = 12, bt(e, n, r);
                                                case 12:
                                                    null != (u = t.sent) && u.insights && (null === (s = n.insightsCallback) || void 0 === s || s.call(n, u.insights)), null != u && u.insightsIdentifierMap && (null === (f = n.insightsIdentifierCallBack) || void 0 === f || f.call(n, u.insights, u.insightsIdentifierMap));
                                                case 15:
                                                    if (!r.isRecognitionOn) {
                                                        t.next = 21;
                                                        break
                                                    }
                                                    return t.next = 18, xt(e, n, r);
                                                case 18:
                                                    null != (d = t.sent) && d.pid && (null === (p = n.callback) || void 0 === p || p.call(n, d.pid)), null != d && d.recognitonIdentifierMap && (null === (h = n.identifierCallback) || void 0 === h || h.call(n, d.pid, d.recognitonIdentifierMap));
                                                case 21:
                                                    t.next = 26;
                                                    break;
                                                case 23:
                                                    t.prev = 23, t.t0 = t.catch(1);
                                                case 26:
                                                case "end":
                                                    return t.stop()
                                            }
                                        }), t, null, [
                                            [1, 23]
                                        ])
                                    }))), function(e) {
                                        return t.apply(this, arguments)
                                    }),
                                    liConversionEvent: function(t, e) {
                                        return ht(t, e)
                                    }
                                };
                                var t
                            },
                            St = function(t) {
                                var e = u()(t),
                                    n = e[0],
                                    r = e.slice(1);
                                kt(window)[n].apply(void 0, a()(r))
                            };
                        ! function(t) {
                            var e = t[t.FCObject];
                            t.Fullcontact = {
                                init: wt,
                                liConversionEvent: ht
                            };
                            var n = null == e ? void 0 : e.q;
                            n && n.forEach((function(t) {
                                St(t)
                            }))
                        }(window)
                    },
                    389: (t, e) => {
                        e.defaults = {}, e.set = function(t, n, r) {
                            var o = r || {},
                                i = e.defaults,
                                a = o.expires || i.expires,
                                c = o.domain || i.domain,
                                u = void 0 !== o.path ? o.path : void 0 !== i.path ? i.path : "/",
                                s = void 0 !== o.secure ? o.secure : i.secure,
                                l = void 0 !== o.httponly ? o.httponly : i.httponly,
                                f = void 0 !== o.samesite ? o.samesite : i.samesite,
                                d = a ? new Date("number" == typeof a ? (new Date).getTime() + 864e5 * a : a) : 0;
                            document.cookie = t.replace(/[^+#$&^|]/g, encodeURIComponent).replace("(", "%28").replace(")", "%29") + "=" + n.replace(/[^+#$&/:<-\[\]-}]/g, encodeURIComponent) + (d && d.getTime() >= 0 ? ";expires=" + d.toUTCString() : "") + (c ? ";domain=" + c : "") + (u ? ";path=" + u : "") + (s ? ";secure" : "") + (l ? ";httponly" : "") + (f ? ";samesite=" + f : "")
                        }, e.get = function(t) {
                            for (var e = document.cookie.split(";"); e.length;) {
                                var n = e.pop(),
                                    r = n.indexOf("=");
                                if (r = r < 0 ? n.length : r, decodeURIComponent(n.slice(0, r).replace(/^\s+/, "")) === t) return decodeURIComponent(n.slice(r + 1))
                            }
                            return null
                        }, e.erase = function(t, n) {
                            e.set(t, "", {
                                expires: -1,
                                domain: n && n.domain,
                                path: n && n.path,
                                secure: 0,
                                httponly: 0
                            })
                        }, e.all = function() {
                            for (var t = {}, e = document.cookie.split(";"); e.length;) {
                                var n = e.pop(),
                                    r = n.indexOf("=");
                                r = r < 0 ? n.length : r, t[decodeURIComponent(n.slice(0, r).replace(/^\s+/, ""))] = decodeURIComponent(n.slice(r + 1))
                            }
                            return t
                        }
                    },
                    249: function(t, e, n) {
                        var r;
                        t.exports = (r = r || function(t, e) {
                            var r;
                            if ("undefined" != typeof window && window.crypto && (r = window.crypto), "undefined" != typeof self && self.crypto && (r = self.crypto), "undefined" != typeof globalThis && globalThis.crypto && (r = globalThis.crypto), !r && "undefined" != typeof window && window.msCrypto && (r = window.msCrypto), !r && void 0 !== n.g && n.g.crypto && (r = n.g.crypto), !r) try {
                                r = n(906)
                            } catch (t) {}
                            var o = function() {
                                    if (r) {
                                        if ("function" == typeof r.getRandomValues) try {
                                            return r.getRandomValues(new Uint32Array(1))[0]
                                        } catch (t) {}
                                        if ("function" == typeof r.randomBytes) try {
                                            return r.randomBytes(4).readInt32LE()
                                        } catch (t) {}
                                    }
                                    throw new Error("Native crypto module could not be used to get secure random number.")
                                },
                                i = Object.create || function() {
                                    function t() {}
                                    return function(e) {
                                        var n;
                                        return t.prototype = e, n = new t, t.prototype = null, n
                                    }
                                }(),
                                a = {},
                                c = a.lib = {},
                                u = c.Base = {
                                    extend: function(t) {
                                        var e = i(this);
                                        return t && e.mixIn(t), e.hasOwnProperty("init") && this.init !== e.init || (e.init = function() {
                                            e.$super.init.apply(this, arguments)
                                        }), e.init.prototype = e, e.$super = this, e
                                    },
                                    create: function() {
                                        var t = this.extend();
                                        return t.init.apply(t, arguments), t
                                    },
                                    init: function() {},
                                    mixIn: function(t) {
                                        for (var e in t) t.hasOwnProperty(e) && (this[e] = t[e]);
                                        t.hasOwnProperty("toString") && (this.toString = t.toString)
                                    },
                                    clone: function() {
                                        return this.init.prototype.extend(this)
                                    }
                                },
                                s = c.WordArray = u.extend({
                                    init: function(t, n) {
                                        t = this.words = t || [], this.sigBytes = n != e ? n : 4 * t.length
                                    },
                                    toString: function(t) {
                                        return (t || f).stringify(this)
                                    },
                                    concat: function(t) {
                                        var e = this.words,
                                            n = t.words,
                                            r = this.sigBytes,
                                            o = t.sigBytes;
                                        if (this.clamp(), r % 4)
                                            for (var i = 0; i < o; i++) {
                                                var a = n[i >>> 2] >>> 24 - i % 4 * 8 & 255;
                                                e[r + i >>> 2] |= a << 24 - (r + i) % 4 * 8
                                            } else
                                                for (var c = 0; c < o; c += 4) e[r + c >>> 2] = n[c >>> 2];
                                        return this.sigBytes += o, this
                                    },
                                    clamp: function() {
                                        var e = this.words,
                                            n = this.sigBytes;
                                        e[n >>> 2] &= 4294967295 << 32 - n % 4 * 8, e.length = t.ceil(n / 4)
                                    },
                                    clone: function() {
                                        var t = u.clone.call(this);
                                        return t.words = this.words.slice(0), t
                                    },
                                    random: function(t) {
                                        for (var e = [], n = 0; n < t; n += 4) e.push(o());
                                        return new s.init(e, t)
                                    }
                                }),
                                l = a.enc = {},
                                f = l.Hex = {
                                    stringify: function(t) {
                                        for (var e = t.words, n = t.sigBytes, r = [], o = 0; o < n; o++) {
                                            var i = e[o >>> 2] >>> 24 - o % 4 * 8 & 255;
                                            r.push((i >>> 4).toString(16)), r.push((15 & i).toString(16))
                                        }
                                        return r.join("")
                                    },
                                    parse: function(t) {
                                        for (var e = t.length, n = [], r = 0; r < e; r += 2) n[r >>> 3] |= parseInt(t.substr(r, 2), 16) << 24 - r % 8 * 4;
                                        return new s.init(n, e / 2)
                                    }
                                },
                                d = l.Latin1 = {
                                    stringify: function(t) {
                                        for (var e = t.words, n = t.sigBytes, r = [], o = 0; o < n; o++) {
                                            var i = e[o >>> 2] >>> 24 - o % 4 * 8 & 255;
                                            r.push(String.fromCharCode(i))
                                        }
                                        return r.join("")
                                    },
                                    parse: function(t) {
                                        for (var e = t.length, n = [], r = 0; r < e; r++) n[r >>> 2] |= (255 & t.charCodeAt(r)) << 24 - r % 4 * 8;
                                        return new s.init(n, e)
                                    }
                                },
                                p = l.Utf8 = {
                                    stringify: function(t) {
                                        try {
                                            return decodeURIComponent(escape(d.stringify(t)))
                                        } catch (t) {
                                            throw new Error("Malformed UTF-8 data")
                                        }
                                    },
                                    parse: function(t) {
                                        return d.parse(unescape(encodeURIComponent(t)))
                                    }
                                },
                                h = c.BufferedBlockAlgorithm = u.extend({
                                    reset: function() {
                                        this._data = new s.init, this._nDataBytes = 0
                                    },
                                    _append: function(t) {
                                        "string" == typeof t && (t = p.parse(t)), this._data.concat(t), this._nDataBytes += t.sigBytes
                                    },
                                    _process: function(e) {
                                        var n, r = this._data,
                                            o = r.words,
                                            i = r.sigBytes,
                                            a = this.blockSize,
                                            c = i / (4 * a),
                                            u = (c = e ? t.ceil(c) : t.max((0 | c) - this._minBufferSize, 0)) * a,
                                            l = t.min(4 * u, i);
                                        if (u) {
                                            for (var f = 0; f < u; f += a) this._doProcessBlock(o, f);
                                            n = o.splice(0, u), r.sigBytes -= l
                                        }
                                        return new s.init(n, l)
                                    },
                                    clone: function() {
                                        var t = u.clone.call(this);
                                        return t._data = this._data.clone(), t
                                    },
                                    _minBufferSize: 0
                                }),
                                v = (c.Hasher = h.extend({
                                    cfg: u.extend(),
                                    init: function(t) {
                                        this.cfg = this.cfg.extend(t), this.reset()
                                    },
                                    reset: function() {
                                        h.reset.call(this), this._doReset()
                                    },
                                    update: function(t) {
                                        return this._append(t), this._process(), this
                                    },
                                    finalize: function(t) {
                                        return t && this._append(t), this._doFinalize()
                                    },
                                    blockSize: 16,
                                    _createHelper: function(t) {
                                        return function(e, n) {
                                            return new t.init(n).finalize(e)
                                        }
                                    },
                                    _createHmacHelper: function(t) {
                                        return function(e, n) {
                                            return new v.HMAC.init(t, n).finalize(e)
                                        }
                                    }
                                }), a.algo = {});
                            return a
                        }(Math), r)
                    },
                    214: function(t, e, n) {
                        var r;
                        t.exports = (r = n(249), function(t) {
                            var e = r,
                                n = e.lib,
                                o = n.WordArray,
                                i = n.Hasher,
                                a = e.algo,
                                c = [];
                            ! function() {
                                for (var e = 0; e < 64; e++) c[e] = 4294967296 * t.abs(t.sin(e + 1)) | 0
                            }();
                            var u = a.MD5 = i.extend({
                                _doReset: function() {
                                    this._hash = new o.init([1732584193, 4023233417, 2562383102, 271733878])
                                },
                                _doProcessBlock: function(t, e) {
                                    for (var n = 0; n < 16; n++) {
                                        var r = e + n,
                                            o = t[r];
                                        t[r] = 16711935 & (o << 8 | o >>> 24) | 4278255360 & (o << 24 | o >>> 8)
                                    }
                                    var i = this._hash.words,
                                        a = t[e + 0],
                                        u = t[e + 1],
                                        p = t[e + 2],
                                        h = t[e + 3],
                                        v = t[e + 4],
                                        g = t[e + 5],
                                        m = t[e + 6],
                                        y = t[e + 7],
                                        w = t[e + 8],
                                        b = t[e + 9],
                                        x = t[e + 10],
                                        k = t[e + 11],
                                        S = t[e + 12],
                                        I = t[e + 13],
                                        _ = t[e + 14],
                                        C = t[e + 15],
                                        E = i[0],
                                        O = i[1],
                                        j = i[2],
                                        T = i[3];
                                    E = s(E, O, j, T, a, 7, c[0]), T = s(T, E, O, j, u, 12, c[1]), j = s(j, T, E, O, p, 17, c[2]), O = s(O, j, T, E, h, 22, c[3]), E = s(E, O, j, T, v, 7, c[4]), T = s(T, E, O, j, g, 12, c[5]), j = s(j, T, E, O, m, 17, c[6]), O = s(O, j, T, E, y, 22, c[7]), E = s(E, O, j, T, w, 7, c[8]), T = s(T, E, O, j, b, 12, c[9]), j = s(j, T, E, O, x, 17, c[10]), O = s(O, j, T, E, k, 22, c[11]), E = s(E, O, j, T, S, 7, c[12]), T = s(T, E, O, j, I, 12, c[13]), j = s(j, T, E, O, _, 17, c[14]), E = l(E, O = s(O, j, T, E, C, 22, c[15]), j, T, u, 5, c[16]), T = l(T, E, O, j, m, 9, c[17]), j = l(j, T, E, O, k, 14, c[18]), O = l(O, j, T, E, a, 20, c[19]), E = l(E, O, j, T, g, 5, c[20]), T = l(T, E, O, j, x, 9, c[21]), j = l(j, T, E, O, C, 14, c[22]), O = l(O, j, T, E, v, 20, c[23]), E = l(E, O, j, T, b, 5, c[24]), T = l(T, E, O, j, _, 9, c[25]), j = l(j, T, E, O, h, 14, c[26]), O = l(O, j, T, E, w, 20, c[27]), E = l(E, O, j, T, I, 5, c[28]), T = l(T, E, O, j, p, 9, c[29]), j = l(j, T, E, O, y, 14, c[30]), E = f(E, O = l(O, j, T, E, S, 20, c[31]), j, T, g, 4, c[32]), T = f(T, E, O, j, w, 11, c[33]), j = f(j, T, E, O, k, 16, c[34]), O = f(O, j, T, E, _, 23, c[35]), E = f(E, O, j, T, u, 4, c[36]), T = f(T, E, O, j, v, 11, c[37]), j = f(j, T, E, O, y, 16, c[38]), O = f(O, j, T, E, x, 23, c[39]), E = f(E, O, j, T, I, 4, c[40]), T = f(T, E, O, j, a, 11, c[41]), j = f(j, T, E, O, h, 16, c[42]), O = f(O, j, T, E, m, 23, c[43]), E = f(E, O, j, T, b, 4, c[44]), T = f(T, E, O, j, S, 11, c[45]), j = f(j, T, E, O, C, 16, c[46]), E = d(E, O = f(O, j, T, E, p, 23, c[47]), j, T, a, 6, c[48]), T = d(T, E, O, j, y, 10, c[49]), j = d(j, T, E, O, _, 15, c[50]), O = d(O, j, T, E, g, 21, c[51]), E = d(E, O, j, T, S, 6, c[52]), T = d(T, E, O, j, h, 10, c[53]), j = d(j, T, E, O, x, 15, c[54]), O = d(O, j, T, E, u, 21, c[55]), E = d(E, O, j, T, w, 6, c[56]), T = d(T, E, O, j, C, 10, c[57]), j = d(j, T, E, O, m, 15, c[58]), O = d(O, j, T, E, I, 21, c[59]), E = d(E, O, j, T, v, 6, c[60]), T = d(T, E, O, j, k, 10, c[61]), j = d(j, T, E, O, p, 15, c[62]), O = d(O, j, T, E, b, 21, c[63]), i[0] = i[0] + E | 0, i[1] = i[1] + O | 0, i[2] = i[2] + j | 0, i[3] = i[3] + T | 0
                                },
                                _doFinalize: function() {
                                    var e = this._data,
                                        n = e.words,
                                        r = 8 * this._nDataBytes,
                                        o = 8 * e.sigBytes;
                                    n[o >>> 5] |= 128 << 24 - o % 32;
                                    var i = t.floor(r / 4294967296),
                                        a = r;
                                    n[15 + (o + 64 >>> 9 << 4)] = 16711935 & (i << 8 | i >>> 24) | 4278255360 & (i << 24 | i >>> 8), n[14 + (o + 64 >>> 9 << 4)] = 16711935 & (a << 8 | a >>> 24) | 4278255360 & (a << 24 | a >>> 8), e.sigBytes = 4 * (n.length + 1), this._process();
                                    for (var c = this._hash, u = c.words, s = 0; s < 4; s++) {
                                        var l = u[s];
                                        u[s] = 16711935 & (l << 8 | l >>> 24) | 4278255360 & (l << 24 | l >>> 8)
                                    }
                                    return c
                                },
                                clone: function() {
                                    var t = i.clone.call(this);
                                    return t._hash = this._hash.clone(), t
                                }
                            });
          
                            function s(t, e, n, r, o, i, a) {
                                var c = t + (e & n | ~e & r) + o + a;
                                return (c << i | c >>> 32 - i) + e
                            }
          
                            function l(t, e, n, r, o, i, a) {
                                var c = t + (e & r | n & ~r) + o + a;
                                return (c << i | c >>> 32 - i) + e
                            }
          
                            function f(t, e, n, r, o, i, a) {
                                var c = t + (e ^ n ^ r) + o + a;
                                return (c << i | c >>> 32 - i) + e
                            }
          
                            function d(t, e, n, r, o, i, a) {
                                var c = t + (n ^ (e | ~r)) + o + a;
                                return (c << i | c >>> 32 - i) + e
                            }
                            e.MD5 = i._createHelper(u), e.HmacMD5 = i._createHmacHelper(u)
                        }(Math), r.MD5)
                    },
                    204: (t, e, n) => {
                        "use strict";
                        n.d(e, {
                            xp: () => r,
                            Zg: () => o,
                            YY: () => i,
                            DH: () => a,
                            Jq: () => c,
                            g4: () => u,
                            Y6: () => s,
                            BF: () => l
                        });
                        const r = "__li__evt_bus",
                            o = "li_errors",
                            i = "lips",
                            a = "pre_lips",
                            c = "_li_duid",
                            u = 1,
                            s = 5e3,
                            l = "https://idx.liadm.com/idex"
                    },
                    167: (t, e, n) => {
                        "use strict";
                        n.d(e, {
                            lW: () => i,
                            Qc: () => a,
                            vU: () => c
                        });
                        var r = n(204);
          
                        function o(t, e) {
                            window && window[r.xp] && window[r.xp].emit(t, e)
                        }
          
                        function i(t, e) {
                            o(t, e)
                        }
          
                        function a(t, e) {
                            c(t, e.message, e)
                        }
          
                        function c(t, e, n = {}) {
                            const i = new Error(e || n.message);
                            i.stack = n.stack, i.name = t || "unknown error", i.lineNumber = n.lineNumber, i.columnNumber = n.columnNumber, o(r.Zg, i)
                        }
                    },
                    607: (t, e, n) => {
                        "use strict";
                        n.d(e, {
                            pv: () => o,
                            t: () => i,
                            kJ: () => a,
                            fy: () => u,
                            HD: () => s,
                            mz: () => l,
                            Kn: () => f,
                            mf: () => d,
                            RH: () => p,
                            hg: () => v,
                            O4: () => g,
                            eY: () => m,
                            cW: () => y,
                            kS: () => w,
                            TS: () => b
                        });
                        const r = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", "i");
          
                        function o(t) {
                            return "object" == typeof t ? JSON.stringify(t) : "" + t
                        }
          
                        function i(t) {
                            return t && r.test(u(t))
                        }
          
                        function a(t) {
                            return "[object Array]" === Object.prototype.toString.call(t)
                        }
                        const c = !!String.prototype.trim;
          
                        function u(t) {
                            return c ? ("" + t).trim() : ("" + t).replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "")
                        }
          
                        function s(t) {
                            return "string" == typeof t
                        }
          
                        function l(t, e) {
                            return s(t) && s(e) && u(t.toLowerCase()) === u(e.toLowerCase())
                        }
          
                        function f(t) {
                            return !!t && "object" == typeof t && !a(t)
                        }
          
                        function d(t) {
                            return t && "function" == typeof t
                        }
          
                        function p(t) {
                            return h(t, 864e5)
                        }
          
                        function h(t, e) {
                            return new Date((new Date).getTime() + t * e)
                        }
          
                        function v(t) {
                            return h(t, 36e5)
                        }
          
                        function g(t, e, n) {
                            return function(t) {
                                return null != t && u(t).length > 0
                            }(e) ? [t, d(n) ? n(e) : e] : []
                        }
          
                        function m(t, e) {
                            return g(t, e, (t => encodeURIComponent(t)))
                        }
          
                        function y(t, e, n) {
                            return g(t, e, (t => encodeURIComponent(n(t))))
                        }
          
                        function w(t) {
                            if (t && f(t)) {
                                const e = [];
                                return Object.keys(t).forEach((n => {
                                    const r = t[n];
                                    r && !f(r) && r.length && e.push([encodeURIComponent(n), encodeURIComponent(r)])
                                })), e
                            }
                            return []
                        }
          
                        function b(t, e) {
                            const n = {},
                                r = t => f(t) ? t : {},
                                o = r(t),
                                i = r(e);
                            return Object.keys(o).forEach((function(t) {
                                n[t] = o[t]
                            })), Object.keys(i).forEach((function(t) {
                                n[t] = i[t]
                            })), n
                        }
                    },
                    666: t => {
                        var e = function(t) {
                            "use strict";
                            var e, n = Object.prototype,
                                r = n.hasOwnProperty,
                                o = "function" == typeof Symbol ? Symbol : {},
                                i = o.iterator || "@@iterator",
                                a = o.asyncIterator || "@@asyncIterator",
                                c = o.toStringTag || "@@toStringTag";
          
                            function u(t, e, n) {
                                return Object.defineProperty(t, e, {
                                    value: n,
                                    enumerable: !0,
                                    configurable: !0,
                                    writable: !0
                                }), t[e]
                            }
                            try {
                                u({}, "")
                            } catch (t) {
                                u = function(t, e, n) {
                                    return t[e] = n
                                }
                            }
          
                            function s(t, e, n, r) {
                                var o = e && e.prototype instanceof g ? e : g,
                                    i = Object.create(o.prototype),
                                    a = new O(r || []);
                                return i._invoke = function(t, e, n) {
                                    var r = f;
                                    return function(o, i) {
                                        if (r === p) throw new Error("Generator is already running");
                                        if (r === h) {
                                            if ("throw" === o) throw i;
                                            return T()
                                        }
                                        for (n.method = o, n.arg = i;;) {
                                            var a = n.delegate;
                                            if (a) {
                                                var c = _(a, n);
                                                if (c) {
                                                    if (c === v) continue;
                                                    return c
                                                }
                                            }
                                            if ("next" === n.method) n.sent = n._sent = n.arg;
                                            else if ("throw" === n.method) {
                                                if (r === f) throw r = h, n.arg;
                                                n.dispatchException(n.arg)
                                            } else "return" === n.method && n.abrupt("return", n.arg);
                                            r = p;
                                            var u = l(t, e, n);
                                            if ("normal" === u.type) {
                                                if (r = n.done ? h : d, u.arg === v) continue;
                                                return {
                                                    value: u.arg,
                                                    done: n.done
                                                }
                                            }
                                            "throw" === u.type && (r = h, n.method = "throw", n.arg = u.arg)
                                        }
                                    }
                                }(t, n, a), i
                            }
          
                            function l(t, e, n) {
                                try {
                                    return {
                                        type: "normal",
                                        arg: t.call(e, n)
                                    }
                                } catch (t) {
                                    return {
                                        type: "throw",
                                        arg: t
                                    }
                                }
                            }
                            t.wrap = s;
                            var f = "suspendedStart",
                                d = "suspendedYield",
                                p = "executing",
                                h = "completed",
                                v = {};
          
                            function g() {}
          
                            function m() {}
          
                            function y() {}
                            var w = {};
                            w[i] = function() {
                                return this
                            };
                            var b = Object.getPrototypeOf,
                                x = b && b(b(j([])));
                            x && x !== n && r.call(x, i) && (w = x);
                            var k = y.prototype = g.prototype = Object.create(w);
          
                            function S(t) {
                                ["next", "throw", "return"].forEach((function(e) {
                                    u(t, e, (function(t) {
                                        return this._invoke(e, t)
                                    }))
                                }))
                            }
          
                            function I(t, e) {
                                function n(o, i, a, c) {
                                    var u = l(t[o], t, i);
                                    if ("throw" !== u.type) {
                                        var s = u.arg,
                                            f = s.value;
                                        return f && "object" == typeof f && r.call(f, "__await") ? e.resolve(f.__await).then((function(t) {
                                            n("next", t, a, c)
                                        }), (function(t) {
                                            n("throw", t, a, c)
                                        })) : e.resolve(f).then((function(t) {
                                            s.value = t, a(s)
                                        }), (function(t) {
                                            return n("throw", t, a, c)
                                        }))
                                    }
                                    c(u.arg)
                                }
                                var o;
                                this._invoke = function(t, r) {
                                    function i() {
                                        return new e((function(e, o) {
                                            n(t, r, e, o)
                                        }))
                                    }
                                    return o = o ? o.then(i, i) : i()
                                }
                            }
          
                            function _(t, n) {
                                var r = t.iterator[n.method];
                                if (r === e) {
                                    if (n.delegate = null, "throw" === n.method) {
                                        if (t.iterator.return && (n.method = "return", n.arg = e, _(t, n), "throw" === n.method)) return v;
                                        n.method = "throw", n.arg = new TypeError("The iterator does not provide a 'throw' method")
                                    }
                                    return v
                                }
                                var o = l(r, t.iterator, n.arg);
                                if ("throw" === o.type) return n.method = "throw", n.arg = o.arg, n.delegate = null, v;
                                var i = o.arg;
                                return i ? i.done ? (n[t.resultName] = i.value, n.next = t.nextLoc, "return" !== n.method && (n.method = "next", n.arg = e), n.delegate = null, v) : i : (n.method = "throw", n.arg = new TypeError("iterator result is not an object"), n.delegate = null, v)
                            }
          
                            function C(t) {
                                var e = {
                                    tryLoc: t[0]
                                };
                                1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e)
                            }
          
                            function E(t) {
                                var e = t.completion || {};
                                e.type = "normal", delete e.arg, t.completion = e
                            }
          
                            function O(t) {
                                this.tryEntries = [{
                                    tryLoc: "root"
                                }], t.forEach(C, this), this.reset(!0)
                            }
          
                            function j(t) {
                                if (t) {
                                    var n = t[i];
                                    if (n) return n.call(t);
                                    if ("function" == typeof t.next) return t;
                                    if (!isNaN(t.length)) {
                                        var o = -1,
                                            a = function n() {
                                                for (; ++o < t.length;)
                                                    if (r.call(t, o)) return n.value = t[o], n.done = !1, n;
                                                return n.value = e, n.done = !0, n
                                            };
                                        return a.next = a
                                    }
                                }
                                return {
                                    next: T
                                }
                            }
          
                            function T() {
                                return {
                                    value: e,
                                    done: !0
                                }
                            }
                            return m.prototype = k.constructor = y, y.constructor = m, m.displayName = u(y, c, "GeneratorFunction"), t.isGeneratorFunction = function(t) {
                                var e = "function" == typeof t && t.constructor;
                                return !!e && (e === m || "GeneratorFunction" === (e.displayName || e.name))
                            }, t.mark = function(t) {
                                return Object.setPrototypeOf ? Object.setPrototypeOf(t, y) : (t.__proto__ = y, u(t, c, "GeneratorFunction")), t.prototype = Object.create(k), t
                            }, t.awrap = function(t) {
                                return {
                                    __await: t
                                }
                            }, S(I.prototype), I.prototype[a] = function() {
                                return this
                            }, t.AsyncIterator = I, t.async = function(e, n, r, o, i) {
                                void 0 === i && (i = Promise);
                                var a = new I(s(e, n, r, o), i);
                                return t.isGeneratorFunction(n) ? a : a.next().then((function(t) {
                                    return t.done ? t.value : a.next()
                                }))
                            }, S(k), u(k, c, "Generator"), k[i] = function() {
                                return this
                            }, k.toString = function() {
                                return "[object Generator]"
                            }, t.keys = function(t) {
                                var e = [];
                                for (var n in t) e.push(n);
                                return e.reverse(),
                                    function n() {
                                        for (; e.length;) {
                                            var r = e.pop();
                                            if (r in t) return n.value = r, n.done = !1, n
                                        }
                                        return n.done = !0, n
                                    }
                            }, t.values = j, O.prototype = {
                                constructor: O,
                                reset: function(t) {
                                    if (this.prev = 0, this.next = 0, this.sent = this._sent = e, this.done = !1, this.delegate = null, this.method = "next", this.arg = e, this.tryEntries.forEach(E), !t)
                                        for (var n in this) "t" === n.charAt(0) && r.call(this, n) && !isNaN(+n.slice(1)) && (this[n] = e)
                                },
                                stop: function() {
                                    this.done = !0;
                                    var t = this.tryEntries[0].completion;
                                    if ("throw" === t.type) throw t.arg;
                                    return this.rval
                                },
                                dispatchException: function(t) {
                                    if (this.done) throw t;
                                    var n = this;
          
                                    function o(r, o) {
                                        return c.type = "throw", c.arg = t, n.next = r, o && (n.method = "next", n.arg = e), !!o
                                    }
                                    for (var i = this.tryEntries.length - 1; i >= 0; --i) {
                                        var a = this.tryEntries[i],
                                            c = a.completion;
                                        if ("root" === a.tryLoc) return o("end");
                                        if (a.tryLoc <= this.prev) {
                                            var u = r.call(a, "catchLoc"),
                                                s = r.call(a, "finallyLoc");
                                            if (u && s) {
                                                if (this.prev < a.catchLoc) return o(a.catchLoc, !0);
                                                if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                            } else if (u) {
                                                if (this.prev < a.catchLoc) return o(a.catchLoc, !0)
                                            } else {
                                                if (!s) throw new Error("try statement without catch or finally");
                                                if (this.prev < a.finallyLoc) return o(a.finallyLoc)
                                            }
                                        }
                                    }
                                },
                                abrupt: function(t, e) {
                                    for (var n = this.tryEntries.length - 1; n >= 0; --n) {
                                        var o = this.tryEntries[n];
                                        if (o.tryLoc <= this.prev && r.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
                                            var i = o;
                                            break
                                        }
                                    }
                                    i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
                                    var a = i ? i.completion : {};
                                    return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, v) : this.complete(a)
                                },
                                complete: function(t, e) {
                                    if ("throw" === t.type) throw t.arg;
                                    return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), v
                                },
                                finish: function(t) {
                                    for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                                        var n = this.tryEntries[e];
                                        if (n.finallyLoc === t) return this.complete(n.completion, n.afterLoc), E(n), v
                                    }
                                },
                                catch: function(t) {
                                    for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                                        var n = this.tryEntries[e];
                                        if (n.tryLoc === t) {
                                            var r = n.completion;
                                            if ("throw" === r.type) {
                                                var o = r.arg;
                                                E(n)
                                            }
                                            return o
                                        }
                                    }
                                    throw new Error("illegal catch attempt")
                                },
                                delegateYield: function(t, n, r) {
                                    return this.delegate = {
                                        iterator: j(t),
                                        resultName: n,
                                        nextLoc: r
                                    }, "next" === this.method && (this.arg = e), v
                                }
                            }, t
                        }(t.exports);
                        try {
                            regeneratorRuntime = e
                        } catch (t) {
                            Function("r", "regeneratorRuntime = r")(e)
                        }
                    },
                    906: () => {}
                },
                r = {};
          
            function o(t) {
                if (r[t]) return r[t].exports;
                var e = r[t] = {
                    exports: {}
                };
                return n[t].call(e.exports, e, e.exports, o), e.exports
            }
            o.m = n, o.n = t => {
                var e = t && t.__esModule ? () => t.default : () => t;
                return o.d(e, {
                    a: e
                }), e
            }, o.d = (t, e) => {
                for (var n in e) o.o(e, n) && !o.o(t, n) && Object.defineProperty(t, n, {
                    enumerable: !0,
                    get: e[n]
                })
            }, o.f = {}, o.e = t => Promise.all(Object.keys(o.f).reduce(((e, n) => (o.f[n](t, e), e)), [])), o.u = t => "fc-li.js", o.g = function() {
                if ("object" == typeof globalThis) return globalThis;
                try {
                    return this || new Function("return this")()
                } catch (t) {
                    if ("object" == typeof window) return window
                }
            }(), o.o = (t, e) => Object.prototype.hasOwnProperty.call(t, e), t = {}, e = "fctag:", o.l = (n, r, i, a) => {
                if (t[n]) t[n].push(r);
                else {
                    var c, u;
                    if (void 0 !== i)
                        for (var s = document.getElementsByTagName("script"), l = 0; l < s.length; l++) {
                            var f = s[l];
                            if (f.getAttribute("src") == n || f.getAttribute("data-webpack") == e + i) {
                                c = f;
                                break
                            }
                        }
                    c || (u = !0, (c = document.createElement("script")).charset = "utf-8", c.timeout = 120, o.nc && c.setAttribute("nonce", o.nc), c.setAttribute("data-webpack", e + i), c.src = n), t[n] = [r];
                    var d = (e, r) => {
                            c.onerror = c.onload = null, clearTimeout(p);
                            var o = t[n];
                            if (delete t[n], c.parentNode && c.parentNode.removeChild(c), o && o.forEach((t => t(r))), e) return e(r)
                        },
                        p = setTimeout(d.bind(null, void 0, {
                            type: "timeout",
                            target: c
                        }), 12e4);
                    c.onerror = d.bind(null, c.onerror), c.onload = d.bind(null, c.onload), u && document.head.appendChild(c)
                }
            }, o.r = t => {
                "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t, Symbol.toStringTag, {
                    value: "Module"
                }), Object.defineProperty(t, "__esModule", {
                    value: !0
                })
            }, o.p = "https://tags.fullcontact.com/anon/", (() => {
                var t = {
                    179: 0
                };
                o.f.j = (e, n) => {
                    var r = o.o(t, e) ? t[e] : void 0;
                    if (0 !== r)
                        if (r) n.push(r[2]);
                        else {
                            var i = new Promise(((n, o) => {
                                r = t[e] = [n, o]
                            }));
                            n.push(r[2] = i);
                            var a = o.p + o.u(e),
                                c = new Error;
                            o.l(a, (n => {
                                if (o.o(t, e) && (0 !== (r = t[e]) && (t[e] = void 0), r)) {
                                    var i = n && ("load" === n.type ? "missing" : n.type),
                                        a = n && n.target && n.target.src;
                                    c.message = "Loading chunk " + e + " failed.\n(" + i + ": " + a + ")", c.name = "ChunkLoadError", c.type = i, c.request = a, r[1](c)
                                }
                            }), "chunk-" + e, e)
                        }
                };
                var e = (e, n) => {
                        for (var r, i, [a, c, u] = n, s = 0, l = []; s < a.length; s++) i = a[s], o.o(t, i) && t[i] && l.push(t[i][0]), t[i] = 0;
                        for (r in c) o.o(c, r) && (o.m[r] = c[r]);
                        for (u && u(o), e && e(n); l.length;) l.shift()()
                    },
                    n = self.webpackChunkfctag = self.webpackChunkfctag || [];
                n.forEach(e.bind(null, 0)), n.push = e.bind(null, n.push.bind(n))
            })(), o(687)
          })();
    }
})


  
  let firstTime=Date.now(),sepratecode=Math.floor(1e6+9e6*Math.random()),usercode=sessionStorage.getItem("t-d-labs-u-id")||Math.floor(1e6+9e6*Math.random()),ip;async function startTrackingTime(){ip=await fetch("https://pro.ip-api.com/json/?key=USQge8VrB9jwQXl").then((e=>e.json())).then((e=>e))}function stopTrackingTime(){sessionStorage.setItem("t-d-labs-u-id",usercode),fetch("https://fast-anchorage-52648-37ea5d9b7bab.herokuapp.com/pixeltrack",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ personId : CookieHolder,  firstTime:firstTime,endTime:Date.now(),timeSpent:Date.now()-firstTime,date:(new Date).toUTCString(),domain:new URL(window.location.href).hostname,pageName:new URL(window.location.href).pathname,sepratecode:sepratecode,ip:ip,userId:"${query.userId}",referrer:document.referrer,browser:navigator.userAgent.includes("Chrome")?"Chrome":"Safari",agent:/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)?"Mobile":"Desktop",usercode:Number(usercode)})})}startTrackingTime(),document.addEventListener("visibilitychange",()=>{"hidden"===document.visibilityState&&stopTrackingTime()}),window.addEventListener("blur",()=>{stopTrackingTime()}),window.addEventListener("beforeunload",()=>{stopTrackingTime(),console.log("Total time spent on page: "+totalTime/1e3+" seconds")})`;
  res.type('application/javascript');
  res.send(data);
});

//AddUser@gmail.com
//newTestingU@gmail.com
//AliKhan@gmail.com

// app.post('/pixeltrack', async (req, res) => {
//   const receivedData = req.body;

//   const user = await User.findOne({ _id: receivedData.userId });

//   // const personId = 'SgTATw3FRibensz7kTumB8VVZlGAh8rs6udQu8MXze183iPI'; // Replace with actual personId
//    const maxEmails = 2;
//     const hemtype = "md5";
//   let personId = 'SgTATw3FRibensz7kTumB8VVZlGAh8rs6udQu8MXze183iPI';
//   const apiKey = 'z5cKCDKiBCemphHQ84fDX9FpnowUXGrd';
//   if (user && user?.subscription.expires_at > Date.now()) {
//     ReceivedData.find({
//       userId: `${receivedData.userId}`,
//       firstTime: {
//         $gte: Number(user.subscription.created_at),
//       },
//     }).then(async (data) => {
//       let uniqueKeys = [];
//       data.forEach((data) => {
//         if (!uniqueKeys.includes(data.usercode)) {
//           uniqueKeys.push(data.usercode);
//         }
//       });
//       if (user.subscription.leads > 0) {
//         //cookie Id wali API jissay data ayga
//         // receivedData.iwid = receivedData.iwid || receivedData.fc_session;
//         if (personId) {

//           // ReceivedData.create(receivedData);
//           // if (!uniqueKeys.includes(receivedData.usercode)) {
//           //   let newLeads = user.subscription?.leads - 1;
//           //   console.log('newLeads', newLeads);

//           //   let updatedUser = await User.findByIdAndUpdate(
//           //     receivedData.userId,
//           //     {
//           //       $set: {
//           //         'subscription.leads': newLeads,
//           //       },
//           //     },
//           //     {
//           //       new: true,
//           //     }
//           //   );

//           //   console.log('updatedUser', updatedUser);
//           // }

//           try {
//             const  filteredData  = await enrichPerson(personId, apiKey , maxEmails, hemtype);

//         console.log('filteredData:', filteredData);
//           receivedData.Enriched = filteredData;
//          await ReceivedData.create(receivedData);
//             if (!uniqueKeys.includes(receivedData.usercode)) {
//                 let newLeads = user.subscription?.leads - 1;
//                 console.log('newLeads', newLeads);
//                 let updatedUser = await User.findByIdAndUpdate(
//                     receivedData.userId,
//                     {
//                         $set: {
//                             'subscription.leads': newLeads,
//                         },
//                     },
//                     {
//                         new: true,
//                     }
//                 );

//                 console.log('updatedUser', updatedUser);
//             }
//         } catch (error) {
//             console.error('Error in enriching person data:', error);
//         }

//         }
//       }
//     });
//   }

//   res.status(200).json({ message: 'Success' });
// });
