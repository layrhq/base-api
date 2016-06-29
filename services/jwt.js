var jwt = require('jsonwebtoken');
var path = require('path');
var fs = require('fs');

var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../config/key.json')).toString());

module.exports = {
  sign: function(uid, callback) {
    var now = Date.now() / 1000;
    var token = jwt.sign({
      iss: config.client_email,
      sub: config.client_email,
      aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
      iat: now,
      exp: now + 3600,
      uid: uid,
      debug: true
    }, config.private_key, { algorithm: 'RS256'}, callback);
  }
};
