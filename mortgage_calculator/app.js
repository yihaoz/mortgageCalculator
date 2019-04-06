var express = require("express"),
    app = express(),
    port = process.env.PORT || 8080
    bodyParser = require("body-parser"),
    mongoose = require("mongoose"),
    Mortgage = require("./models/mortgageCalculator");
    
// Requiring routes
var calculatorRoutes = require("./routes/calculator");

const url = 'mongodb://localhost:27017'
mongoose.connect(url, (err, client) => {
    if (err) {
        return console.error('Cannot connect to MongoDB');
    } 
    console.log("Connected to MongoDB");
})

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use("/", calculatorRoutes);

global.curInterest = 0;
app.listen(port, function() {
    console.log("Running ITGlue Mortgage Calculator on port " + port);
    // Assume there is a default interest rate stored in database, if not, create the default with 0.025
    Mortgage.find({type: "interest rate"}, function(err, interests) {
        if (err) {
            console.log("database has no interest rate, creating new one");
            Mortgage.create(
                {
                    type :"interest rate",
                    rate : 0.0025
                }, { unique: true }, function(err, newlyCreated) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        console.log("New interest created" + newlyCreated);
                    }
                }
            )
        }
        curInterest = interests[0].rate;
    });
})