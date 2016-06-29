var _ = require('lodash');
var FirebaseTokenGenerator = require("firebase-token-generator");
var tokenGenerator = new FirebaseTokenGenerator(process.env.FIREBASE_SECRET);
var Firebase = require('firebase');
var ref = new Firebase(process.env.FIREBASE_URL);

function createToken(config) {
  return tokenGenerator.createToken(config);
}

var workerToken = createToken({ uid: 'worker', admin: true });
var usersRef = ref.child("users");

var usersById = {};
var usersByToken = {};

ref.authWithCustomToken(workerToken, function(error, authData) {
  console.log('firebase worker connected');
  usersRef.on('value', function(snapshot) {
    var u = snapshot.val();
    var ubt = {};
    _.each(u ,function(user, id) {
      user.id = id;
      ubt[user.refresh_token] = user;
    });
    _.extend(usersById, u);
    _.extend(usersByToken, ubt);
  });

  usersRef.on('child_changed', function(snapshot) {
    var userUpdate = snapshot.val();
    var originalUser = _.find(usersById, { id: userUpdate.id });
    _.extend(originalUser, userUpdate);
  });

  usersRef.on('child_removed', function(snapshot) {
    var deletedUser = snapshot.val();
    delete usersById[deletedUser.id];
    delete usersByToken[deletedUser.refresh_token];
  });
});



module.exports = {
  getUser: function(id) {
    if (usersById[id]) {
      usersById[id].connection = usersRef.child(id);
      return usersById[id];
    }
    return null;
  },
  getUserByToken: function(token) {
    if (usersByToken[token]) {
      usersByToken[token].connection = usersRef.child(usersByToken[token].id);
      return usersByToken[token];
    }
    return null;
  },
  createUser: function(data) {
    usersRef.child(data.id).set(data);
  },
  createToken: createToken
};
