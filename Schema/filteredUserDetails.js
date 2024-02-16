const mongoose = require('mongoose');

const filteredDataSchema = new mongoose.Schema({
   
    Data: { type: Array },
    personId: { type: String }
});
// const filteredDataSchema = new mongoose.Schema([{
//     Matched: { type: Boolean },
//     FirstName: { type: String },
//     LastName: { type: String },
//     Address: { type: String },
//     City: { type: String },
//     State: { type: String },
//     ZIP: { type: String },
//     Country: { type: String },
//     Email: { type: String },
//     emailHash: { type: String },
//     Cell: { type: String },
//     CellDNC: { type: String },
//     Phone: { type: String },
//     PhoneDNC: { type: String }
// }]);

const FilteredData = mongoose.model('FilteredData', filteredDataSchema);

module.exports = FilteredData;
