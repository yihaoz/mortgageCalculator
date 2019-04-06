var mongoose = require("mongoose");
var mortgageSchema = mongoose.Schema({
    interest: Number
});

var Mortgage = module.exports = mongoose.model("mortgage", mortgageSchema);

module.exports.get = function(callback, limit) {
    Mortgage.find(callback).limit(limit);
}