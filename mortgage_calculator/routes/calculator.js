const express = require("express");
const router  = express.Router();

Mortgage = require("../models/mortgageCalculator");

const   askingPriceReq = "askingPrice", 
        downPaymentReq = "downPayment",
        paymentScheduleReq = "paymentSchedule",
        amortizationPeriodReq = "amortizationPeriod",
        paymentAmountReq = "paymentAmount",
        interestRateReq = "interestRate",
        paymentScheduleOptions = ["biweekly", "weekly", "monthly"];

// convert period interest rate and payment numbers by payment schedule
function convertByPaymentSchedule(paymentSchedule, amortizationPeriod) {
    let numPayments = 0, periodRate = 0;
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
router.get("/payment-amount", function(req, res) {
    // validate inputs
    if (!req.body.hasOwnProperty(askingPriceReq)) {
        return res.status(400).json({ errors: "Missing askingPrice"});
    }
    if (!req.body.hasOwnProperty(downPaymentReq)) {
        return res.status(400).json({ errors: "Missing downPayment"});
    }
    if (!req.body.hasOwnProperty(paymentScheduleReq)) {
        return res.status(400).json({ errors: "Missing paymentSchedule"});
    }
    if (!req.body.hasOwnProperty(amortizationPeriodReq)) {
        return res.status(400).json({ errors: "Missing amortizationPeriod"});
    }
    let askingPrice, downPayment, paymentSchedule, amortizationPeriod;
    
    // when the input is empty string, it is converted to zero. 
    // This conversion might be changed based on requirement
    if (typeof req.body.askingPrice === "string") {
        askingPrice = Number(req.body.askingPrice);
    }
    else {
        askingPrice = req.body.askingPrice;
    }
    if (typeof req.body.downPayment === "string") {
        downPayment = Number(req.body.downPayment);
    }
    else {
        downPayment = req.body.downPayment;
    }

    if (typeof req.body.amortizationPeriod === "string") {
        amortizationPeriod = Number(req.body.amortizationPeriod);
    }
    else {
        amortizationPeriod = req.body.amortizationPeriod;
    }
    paymentSchedule = req.body.paymentSchedule;

    // if by requirements there is required supported range for each input, it also needs to be 
    // verified here
    if (isNaN(askingPrice) || askingPrice < 0) {
        return res.status(422).json({errors: "Invalid askingPrice"});
    }
    if (typeof(paymentSchedule) != "string" || !paymentScheduleOptions.includes(paymentSchedule.toLowerCase())) {
        return res.status(422).json({errors: "Invalid paymentSchedule"});
    }
    if (isNaN(amortizationPeriod) || !Number.isInteger(amortizationPeriod) || amortizationPeriod < 5 || amortizationPeriod > 25) {
        return res.status(422).json({error: "Invalid amortizationPeriod"});
    }
    
    // minimum downpayment
    let minDownPayment = 0;
    if (askingPrice <= 50000) {
        minDownPayment = askingPrice * 0.05;
    }
    else {
        minDownPayment = 50000 * 0.05 + (askingPrice - 50000) * 0.1;
    }
    if (isNaN(downPayment) || downPayment < minDownPayment || downPayment >= askingPrice) {
        return res.status(422).json({errors: "Invalid downPayment"});
    }

    let insurance = 0;
    let downPaymentRatio = downPayment / askingPrice;
    if (askingPrice > 1000000) {
        insurance = 0;
    }
    else if (downPaymentRatio < 0.1) {
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
            throw err;
        }
        curInterest = interests[0].rate;
        let result = convertByPaymentSchedule(paymentSchedule, amortizationPeriod),
            numPayments = result.numPayments,
            periodRate = result.periodRate;

        let paymentAmount = (askingPrice - downPayment) * (insurance + 1) * (periodRate * Math.pow((1 + periodRate), numPayments)) / (Math.pow((1 + periodRate), numPayments) - 1);

        res.json({
            "paymentAmount": paymentAmount
        });
    })    
})

// Get the maximum mortgage amount
router.get("/mortgage-amount", function(req, res) {
    // validate inputs
    if (!req.body.hasOwnProperty(paymentAmountReq)) {
        return res.status(400).json({ errors: "Missing paymentAmount"});
    }
    if (!req.body.hasOwnProperty(paymentScheduleReq)) {
        return res.status(400).json({ errors: "Missing paymentSchedule"});
    }
    if (!req.body.hasOwnProperty(amortizationPeriodReq)) {
        return res.status(400).json({ errors: "Missing amortizationPeriod"});
    }
    let downPayment = 0;
    if (req.body.hasOwnProperty(downPaymentReq)) {
        if (typeof req.body.downPayment === "string") {
            downPayment = Number(req.body.downPayment);
        }
        else {
            downPayment = req.body.downPayment;
        }
    }
    if (isNaN(downPayment) || downPayment < 0) {
        return res.status(422).json({errors: "Invalid downPayment"});
    }

    // when the input is empty string, it is converted to zero. 
    // This conversion might be changed based on requirement
    let paymentAmount, paymentSchedule, amortizationPeriod;
    if (typeof req.body.paymentAmount === "string") {
        paymentAmount = Number(req.body.paymentAmount);
    }
    else {
        paymentAmount = req.body.paymentAmount;
    }
    if (typeof req.body.amortizationPeriod === "string") {
        amortizationPeriod = Number(req.body.amortizationPeriod);
    }
    else {
        amortizationPeriod = req.body.amortizationPeriod;
    }

    paymentSchedule = req.body.paymentSchedule;
    // if by requirements there is required supported range for each input, it also needs to be 
    // verified here
    if (isNaN(paymentAmount) || paymentAmount < 0) {
        return res.status(422).json({errors: "Invalid paymentAmount"});
    }
    if (typeof(paymentSchedule) != "string" || !paymentScheduleOptions.includes(paymentSchedule.toLowerCase())) {
        return res.status(422).json({errors: "Invalid paymentSchedule"});
    }
    if (isNaN(amortizationPeriod) || !Number.isInteger(amortizationPeriod) || amortizationPeriod < 5 || amortizationPeriod > 25) {
        return res.status(422).json({error: "Invalid amortizationPeriod"});
    }
    
    // query interest
    Mortgage.find({type: "interest rate"}, function(err, interests) {
        if (err) {
            throw err;
        }
        curInterest = interests[0].rate;

        let result = convertByPaymentSchedule(paymentSchedule, amortizationPeriod),
            numPayments = result.numPayments,
            periodRate = result.periodRate;
        
        let mortgageAmount = paymentAmount / (periodRate * Math.pow((1 + periodRate), numPayments)) * (Math.pow((1 + periodRate), numPayments) - 1);
        // not sure why I need to add down payment into mortgage amount but the document said it should be added to the maximum morrgage returned
        mortgageAmount += downPayment;
        // Since down payment is optional for this request, I think we don't need to consider insurance for this case
        // The mortgageAmount I calculated is Loan Principal with possible insurance + downpayment(if present)
        res.json({
            "mortgageAmount": mortgageAmount
        });
    }) 
})

// Change the interest rate used by the application
router.patch("/interest-rate", function(req, res) {
    if (!req.body.hasOwnProperty(interestRateReq)) {
        return res.status(422).json({ errors: "Missing interestRate"});
    }
    let interestRate = req.body.interestRate;
    if (typeof interestRate === "string") {
        interestRate = Number(interestRate)
    }
    // if requirement has supported range for interest rate, it should also be verified here.
    if (isNaN(interestRate) || interestRate < 0 || interestRate > 1) {
        return res.status(422).json({errors: "Invalid interest rate"});
    }

    // update the interest rate in the database
    Mortgage.updateOne({type: "interest rate"}, {rate: interestRate}, function(err, result) {
        if (err) {
            throw err;
        }
        Mortgage.find({type: "interest rate"}, function(err, interests) {
            if (err) {
                throw err;
            }
            res.json({
                "updatedInterestRate": interests[0].rate,
                "oldInterestRate":curInterest
            });
            curInterest = interests[0].rate;
        });
    })
})

module.exports = router;