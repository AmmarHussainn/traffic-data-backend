const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const receivedDataSchema = new mongoose.Schema(
  {
    timeSpent: { type: Number },
    date: { type: Date },
    domain: { type: String },
    pageName: { type: String },
    sepratecode: { type: Number },
    usercode: { type: Number },
    firstTime: { type: Number },
    endTime: { type: Number },
    ip: {
      status: { type: String },
      country: { type: String },
      countryCode: { type: String },
      region: { type: String },
      regionName: { type: String },
      city: { type: String },
      zip: { type: String },
      lat: { type: Number },
      lon: { type: Number },
      timezone: { type: String },
      isp: { type: String },
      org: { type: String },
      as: { type: String },
      query: { type: String },
    },
    userId: { type: String },
    referrer: { type: String },
    agent: { type: String },
    browser: { type: String },
  }
);

const ReceivedData = mongoose.model('ReceivedData', receivedDataSchema);


module.exports = ReceivedData;
