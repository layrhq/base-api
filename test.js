var FirebaseTokenGenerator = require("firebase-token-generator");
var tokenGenerator = new FirebaseTokenGenerator('Vl6yzO9oqByrWd8A3hrY8zmy0wj3Ua9oASCRrcg3');
var Firebase = require('firebase');
var ref = new Firebase('https://base-layr242.firebaseio.com/');

var workerToken = tokenGenerator.createToken({ uid: 'worker', admin: true });
var usersRef = ref.child("users");
ref.authWithCustomToken(workerToken, function(error, authData) {
  usersRef.once('value', function(snapshot) {
    console.log(snapshot.val());
  });
});
