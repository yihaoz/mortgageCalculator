var express = require("express"),
    app = express(),
    port = process.env.PORT || 8080
    bodyParser = require("body-parser"),
    mongoose = require("mongoose");

const url = 'mongodb://localhost:27017'
mongoose.connect(url, (err, client) => {
    if (err) {
      console.error(err)
      return
    }
})

// for deployment
// app.use((req, res, next) => {
//     console.log("use for mongoose callback");
//     if (mongoose.connect.readyState) {
//         console.log("if (mongoose.connection.readyState)");
//         next();
//     }
//     else {
//         console.log("else (mongoose.connection.readyState)");
//         require("./mongo")().then(() => next());
//         console.log("else (mongoose.connection.readyState)")
//     }
// });

var mortgageSchema = mongoose.Schema({
    type: String, 
    rate: Number
});
var Mortgage = mongoose.model("Mortgage", mortgageSchema);
// Mortgage.create(
//     {
//         type :"interest rate",
//         rate : 0.0025
//     }, { unique: true }, function(err, newlyCreated) {
//         if (err) {
//             console.log(err);
//         }
//         else {
//             console.log("New interest created");
//             console.log(newlyCreated);
//         }
//     }
// )

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var curInterest = 0;

// convert period interest rate and payment numbers by payment schedule
function convertByPaymentSchedule(paymentSchedule, curInterest, amortizationPeriod) {
    var numPayments = 0;
    var periodRate = 0;
    if (paymentSchedule.toLowerCase() === "weekly") {
        numPayments = Math.ceil(365 * amortizationPeriod / 7);
        periodRate = Math.pow((1 + curInterest), (1 / numPayments)) - 1;
    }
    else if (paymentSchedule.toLowerCase() === "biweekly") {
        numPayments = Math.ceil(365 * amortizationPeriod / 14);
        periodRate = Math.pow((1 + curInterest), (1 / numPayments)) - 1;
    }
    else {
        numPayments = Math.ceil(365 * amortizationPeriod / 30);
        periodRate = Math.pow((1 + curInterest), (1 / numPayments)) - 1;
    }
    return {
        numPayments: numPayments,
        periodRate: periodRate
    };
}

// Get the recurring payment amount of a mortgage
app.get("/payment-amount", function(req, res) {
    // validate inputs
    if (!req.body.hasOwnProperty("askingPrice" )) {
        return res.status(422).json({ errors: "Missing askingPrice"});
    }
    if (!req.body.hasOwnProperty("downPayment")) {
        return res.status(422).json({ errors: "Missing downPayment"});
    }
    if (!req.body.hasOwnProperty("paymentSchedule")) {
        return res.status(422).json({ errors: "Missing paymentSchedule"});
    }
    if (!req.body.hasOwnProperty("amortizationPeriod")) {
        return res.status(422).json({ errors: "Missing amortizationPeriod"});
    }

    var askingPrice = req.body.askingPrice,
        downPayment = req.body.downPayment,
        paymentSchedule = req.body.paymentSchedule,
        amortizationPeriod = req.body.amortizationPeriod;

    if (isNaN(askingPrice) || askingPrice < 0) {
        return res.status(422).json({errors: "Invalid askingPrice"});
    }
    
    // minimum downpayment
    var minDownPayment = 0;
    if (askingPrice <= 50000) {
        minDownPayment = askingPrice * 0.05;
    }
    else {
        minDownPayment = 50000 * 0.05 + (askingPrice - 50000) * 0.1;
    }

    var paymentScheduleOptions = ["biweekly", "weekly", "monthly"];
    if (isNaN(downPayment) || downPayment < minDownPayment || downPayment >= askingPrice) {
        return res.status(422).json({errors: "Invalid downPayment"});
    }
    if (typeof(paymentSchedule) != "string" || !paymentScheduleOptions.includes(paymentSchedule.toLowerCase())) {
        return res.status(422).json({errors: "Invalid paymentSchedule"});
    }
    if (isNaN(amortizationPeriod) || amortizationPeriod < 5 || amortizationPeriod > 25) {
        return res.status(422).json({error: "Invalid amortizationPeriod"});
    }

    var insurance = 0;
    var downPaymentRatio = downPayment / (askingPrice + downPayment);
    if (downPaymentRatio < 0.1) {
        insurance = 0.0315;
    }
    else if (downPaymentRatio < 0.15) {
        insurance = 0.024;
    }
    else if (downPaymentRatio < 0.2) {
        insurance = 0.018;
    }

    // query interest
    Mortgage.find({type: "interest rate"}, function(err, interests) {
        if (err) {
            console.log(err);
        }
        
        curInterest = interests[0].rate;
        var result = convertByPaymentSchedule(paymentSchedule, curInterest, amortizationPeriod);
        var numPayments = result.numPayments;
        var periodRate = result.periodRate;

        var paymentAmount = askingPrice * (insurance + 1) * (periodRate * Math.pow((1 + periodRate), numPayments)) / (Math.pow((1 + periodRate), numPayments) - 1);

        res.json({
            "paymentAmount": paymentAmount
        });
    })    
})

// Get the maximum mortgage amount
app.get("/mortgage-amount", function(req, res) {
    // validate inputs
    if (!req.body.hasOwnProperty("paymentAmount" )) {
        return res.status(422).json({ errors: "Missing paymentAmount"});
    }
    if (!req.body.hasOwnProperty("paymentSchedule")) {
        return res.status(422).json({ errors: "Missing paymentSchedule"});
    }
    if (!req.body.hasOwnProperty("amortizationPeriod")) {
        return res.status(422).json({ errors: "Missing amortizationPeriod"});
    }

    var downPayment = 0;
    if (req.body.hasOwnProperty("downPayment")) {
        downPayment = req.body.downPayment;
    }
    
    var paymentAmount = req.body.paymentAmount,
        paymentSchedule = req.body.paymentSchedule,
        amortizationPeriod = req.body.amortizationPeriod;
    var paymentScheduleOptions = ["biweekly", "weekly", "monthly"];

    if (isNaN(paymentAmount) || paymentAmount < 0) {
        return res.status(422).json({errors: "Invalid paymentAmount"});
    }
    if (typeof(paymentSchedule) != "string" || !paymentScheduleOptions.includes(paymentSchedule.toLowerCase())) {
        return res.status(422).json({errors: "Invalid paymentSchedule"});
    }
    if (isNaN(amortizationPeriod) || amortizationPeriod < 5 || amortizationPeriod > 25) {
        return res.status(422).json({error: "Invalid amortizationPeriod"});
    }
    
    // query interest
    Mortgage.find({type: "interest rate"}, function(err, interests) {
        if (err) {
            console.log(err);
        }
        curInterest = interests[0].rate;

        var result = convertByPaymentSchedule(paymentSchedule, curInterest, amortizationPeriod);
        var numPayments = result.numPayments;
        var periodRate = result.periodRate;

        var mortgageAmount = paymentAmount / (periodRate * Math.pow((1 + periodRate), numPayments)) * (Math.pow((1 + periodRate), numPayments) - 1);
        mortgageAmount += downPayment;
        console.log(mortgageAmount);
        res.json({
            "mortgageAmount": mortgageAmount
        });
    }) 
})

// Change the interest rate used by the application
app.patch("/interest-rate", function(req, res) {
    if (!req.body.hasOwnProperty("interestRate" )) {
        return res.status(422).json({ errors: "Missing interestRate"});
    }
    var interestRate = req.body.interestRate;
    if (isNaN(interestRate) || interestRate < 0 || interestRate > 1) {
        return res.status(422).json({errors: "Invalid interest rate"});
    }

    // update the interest rate in the database
    Mortgage.updateOne({type: "interest rate"}, {rate: interestRate}, function(err, result) {
        if (err) {
            console.log(err);
        }
        Mortgage.find({type: "interest rate"}, function(err, interests) {
            if (err) {
                console.log(err);
            }
            res.json({
                "updatedInterestRate": interests[0].rate,
                "oldInterestRate":curInterest
            });
            curInterest = interests[0].rate;
        });
    })
})

app.listen(port, function() {
    console.log("Running ITGlue Mortgage Calculator on port " + port);
    Mortgage.find({type: "interest rate"}, function(err, interests) {
        if (err) {
            console.log(err);
        }
        curInterest = interests[0].rate;
    });
})