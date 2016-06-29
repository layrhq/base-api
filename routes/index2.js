var express = require('express');
var router = express.Router();
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var firebase = require('firebase');
var request = require('request');
var jwt = require('../services/jwt');

var oauth2Client = new OAuth2('325090524652-aebb5udlfc91gc8n5lcf74vbr93sf2is.apps.googleusercontent.com', '4Nzrupvj0Qs-NV7an-nHF34H', 'http://localhost:4200/oauth2callback');
firebase.initializeApp({
  serviceAccount: './config/key.json',
  databaseURL: 'https://layr.firebaseio.com/'
});

/* GET home page. */
router.get('/authenticate_google_user', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Credentials", true);

  oauth2Client.getToken(req.query.code, function(err, tokens) {
    if(!err) {
      oauth2Client.setCredentials(tokens);
      request('https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + tokens.access_token, function(err, response, body) {
        var data;
        if (!err) {
          data = JSON.parse(body);
        }
        // var token = firebase.auth().createCustomToken(data.id, { admin: true });
        var token = jwt.sign(data.id, (err, token) => {
          console.log('verifying token');
          firebase.auth().verifyIdToken(token).then((decodedToken) => {
            console.log('token verified');
            var uid = decodedToken.sub;
            console.log(uid);
            res.send({
              token: token,
              userData: data,
              accessToken: tokens.access_token
            });
          }).catch((err) => {
            console.log(err);
          });
        });
      });
    }
  });
});

module.exports = router;
