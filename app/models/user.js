var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',

  initialize: function() {
    var salt = bcrypt.genSaltSync();

    this.on('creating', function(model, attr, options) {
      var password = model.get('password');
      var hashed_password = bcrypt.hashSync(password, salt);
      model.set('password', hashed_password);
    });
  },

   comparePassword: function(password, callback) {
     bcrypt.compare(password, this.get('password'), function(err, match){
       console.log(match)
       callback(err, match);
     })
   }
  //   var model = this;
  //   var salt = this.get('salt');
  //   console.log(salt);
  //   return bcrypt.hash(password, salt, function(data) {}, function(err, hashed) {
  //     if(err) throw err;
  //     console.log(hashed);
  //     return model.save({hashed_password: hashed})
  //   })
  // }
});

module.exports = User;
