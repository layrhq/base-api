var _ = require('lodash');
var express = require('express');
var router = express.Router();
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var firebase = require('../services/firebase');
var request = require('request');

var oauth2Client = new OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);

router.get('/', function(req, res, next) {
  res.send('Layr API');
});

router.get('/status', function(req, res, next) {
  res.send({ status: 'online' });
});

router.post('/authenticate_user', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Credentials", true);

  if (!req.body.code) {
    return res.status(400).send('missing :code body param');
  }

  oauth2Client.getToken(req.body.code, function(err, tokens) {
    if(!err) {
      oauth2Client.setCredentials(tokens);
      request('https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + tokens.access_token, function(err, response, body) {
        var data;
        if (!err) {
          data = JSON.parse(body);
        } else {
          return res.status(500).send('google access_token invalid');
        }
        if (data.hd !== 'layrconsulting.com') {
          return res.status(403).send('email host invalid');
        }

        console.log('google data:', data);

        var resData = {
          firebaseToken: firebase.createToken({ uid: data.id }),
          access_token: tokens.access_token
        };

        var user = firebase.getUser(data.id);

        if (user) {
          var update = { last_login: new Date() };
          if (tokens.refresh_token) {
            update.refresh_token = tokens.refresh_token;
            resData.token = tokens.refresh_token;
          } else {
            resData.token = user.refresh_token;
          }
          user.connection.update(update);
          delete user.connection;
        } else {
          if (!tokens.refresh_token) {
            return res.status(500).send('user account was deleted, but layr app is still has authorization');
          }
          user = {
            id: data.id,
            name: data.name,
            email: data.email,
            picture: data.picture,
            refresh_token: tokens.refresh_token
          };
          resData.token = tokens.refresh_token;
          firebase.createUser(user);
        }

        resData.userData = user;

        res.send(resData);
      });
    } else {
      res.status(500).send({
        error: err,
        code: req.body.code
      });
    }
  });
});

router.post('/refresh_user_token', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Credentials", true);

  if (!req.body.token) {
    return res.status(400).send('missing :token bodyparam');
  }

  oauth2Client.setCredentials({
    refresh_token: req.body.token
  });
  oauth2Client.refreshAccessToken(function(err, tokens) {
    if (err) {
      return res.status(500).send(err);
    }
    var user = firebase.getUserByToken(req.body.token);
    if (user) {
      user.connection.update({ last_login: new Date() });
      delete user.connection;
      tokens.userData = user;
      res.send(tokens);
    } else {
      res.status(404).send('user not found');
    }
  });
});

router.get('/authenticate_github', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Credentials", true);

  if (!req.query.code || !req.query.id) {
    return res.status(400).send('missing :id or :code queryparam');
  }

  request({
    method: 'POST',
    url: 'https://github.com/login/oauth/access_token',
    body: {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: req.query.code,
      redirect_uri: process.env.GITHUB_REDIRECT_URI
    },
    json: true
  }, function(err, response, body) {
    var access_token = body.access_token;

    request({
      method: 'GET',
      headers: { 'User-Agent': 'node.js' },
      url: 'https://api.github.com/user?access_token=' + access_token,
      json: true
    }, function(err, response, body) {
      var user = firebase.getUser(req.query.id);
      user.connection.update({ github_username: body.login, github_token: access_token });
      res.send(body);
    });
  });
});

module.exports = router;
