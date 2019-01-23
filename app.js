/**
 * Created by amanchawla on 22/01/19.
 */
const express               = require('express');
const app                   = express();

const bodyParser            = require('body-parser');

const seatAvailability      = require('./seat_availability');



app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({limit: '100mb'}));


app.get('/ping', function(req, res) {
    return res.send('pong');
});

app.post('/check_availability',                  seatAvailability.checkSeatAvailability);

app.listen(process.env.PORT || 9100, function() {
    console.log('server listening on ' + process.env.PORT || 9100);
});