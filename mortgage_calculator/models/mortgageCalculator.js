const mongoose = require("mongoose");

const mortgageSchema = mongoose.Schema({
    type: String, 
    rate: Number
});

module.exports = mongoose.model("Mortgage", mortgageSchema);