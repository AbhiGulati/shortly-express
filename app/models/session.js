var db = require('../config');

var Session = db.Model.extend({
  tableName: 'sessions'

  // initialize: function() {
  //   var salt = bcrypt.genSaltSync();

  //   this.on('creating', function(model, attr, options) {
  //     var password = model.get('password');
  //     var hashed_password = bcrypt.hashSync(password, salt);
  //     model.set('password', hashed_password);
  //   });
  // },
});

module.exports = Session;
