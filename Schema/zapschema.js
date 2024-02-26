const mongoose = require('mongoose');

const ZapDataSchema = new mongoose.Schema({
    ZapName: { type: String },
    ZapAudience: { type: String },
    ZapSelectedFields: { type: Array },
    Zapwebhook: { type: String },
    filterName : { type: Object },
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString(),
      },
});

const ZapData = mongoose.model('ZapData', ZapDataSchema);

module.exports = ZapData;
