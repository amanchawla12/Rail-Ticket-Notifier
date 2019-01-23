/**
 * Created by amanchawla on 22/01/19.
 */
"use strict";
var Promise                             = require('bluebird');
var request                             = require('request');


exports.checkSeatAvailability           = checkSeatAvailability;

const accountSid                        = process.env.account_sid;
const authToken                         = process.env.auth_token;
const apiKey                            = process.env.api_key_rail;
const client                            = require('twilio')(accountSid, authToken);

function checkSeatAvailability(req, res) {
    var fromCode        = req.body.from_code;
    var toCode          = req.body.to_code;
    var quota           = req.body.quota;
    var trainNo         = req.body.train_no;
    var date            = req.body.date;
    var pref            = req.body.pref;

    var reqKeys = [fromCode, toCode, quota, trainNo, date, pref];

    if(checkBlank(reqKeys)) {
        return res.status(412).send({message: "Please send appropriate parameters"});
    }

    var url = `https://api.railwayapi.com/v2/check-seat/train/${trainNo}/source/${fromCode}/dest/${toCode}/date/${date}/pref/${pref}/quota/${quota}/apikey/${apiKey}/`;
    var options = {
        url: url,
        method: 'GET',
        json: true,
        gzip: true,
        rejectUnauthorized: false,
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        }
    };
    
    request(options, function(error, response, body){
        if(error) {
            console.error(error.message);
            return res.status(500).send({message: "Please try again after sometime"});
        }
        sendSMSIfThresholdReaches(body, 500).then((result) => {
            console.log(result);
            return res.send("OK");
        })
        .catch(error => {
            console.error(error.message);
            return res.status(400).send('Something went wrong');
        });
    });
}

function checkBlank(values) {
    var count = 0;
    for(var value of values) {
        if (value == '' || value == null || value == undefined) {
            console.error(count);
            return 1;
        }
        count++;
    }
    return 0;
}

function sendSMSIfThresholdReaches(railbody, threshold) {
    return new Promise((resolve, reject) => {
        if(railbody.response_code != 200) {
            return reject(new Error('bad response from rail API'));
        }
        if(railbody.availability[0].status) {
            var availability = railbody.availability[0].status.split(' ');
            if(availability.length != 2 && availability[0] != 'Available') {
                return reject(new Error('Ticket Not Available'));
            }
            var ticketLeft = availability[1];
            var threshold  = process.env.threshold || 50;
            if(ticketLeft < threshold) {
                client.messages
                    .create({
                        body: 'Only ' + ticketLeft + ' tickets left. Please Book ASAP for train ' + railbody.train.name + '.',
                        from: '+14693788424',
                        to: process.env.to_phone
                    })
                    .then(message => {
                        console.log(JSON.stringify(message))
                        return resolve('Message Sent');
                    })
                    .catch(error => {
                        console.error(JSON.stringify(error));
                        return reject(new Error('Error from twilio'));
                    })
            } else {
                return resolve('Everything is good');
            }
        } else {
            return reject(new Error('bad response from rail API'));
        }
    })
}