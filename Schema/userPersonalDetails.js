const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    street: {
        street_name: { type: String },
        street_suffix: { type: String },
        pre_directional: { type: String },
        post_directional: { type: String },
    },
    unit: {
        unit_designator: { type: String },
        unit_number: { type: Number, default: null },
    },
    city: { type: String },
    state: { type: String },
    zip: {
        zip_5: { type: Number },
        zip_4: { type: Number },
    },
});

const nameSchema = new mongoose.Schema({
    first_name: { type: String },
    last_name: { type: String },
});

const dataSchema = new mongoose.Schema({
    md5_email: { type: String },
    sha1_email: { type: String },
    sha256_email: { type: String },
    email: { type: String,  },
    first_seen: { type: Date, default: Date.now },
    last_seen: { type: Date },
    user_agent: { type: String },
    user_ip: { type: String },
    link_referrer: { type: String },
    name: nameSchema,
    primary_number: { type: String },
    address: addressSchema,
    phone_number: { type: String },
    maid: { type: String },
    value: { type: Number },
    custom_field: { type: String }, 
});

const UserData = mongoose.model('UserData', dataSchema);

module.exports = UserData;
