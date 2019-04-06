var mongoose = require("mongoose");

var mortgageSchema = mongoose.Schema({
    type: String, 
    rate: Number
});

module.exports = mongoose.model("Mortgage", mortgageSchema);