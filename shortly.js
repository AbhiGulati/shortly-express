var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var uuid = require('node-uuid');
var bcrypt = require('bcrypt-nodejs');


var db = require('./app/config');
//var knex = require('knex');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var Session = require('./app/models/session')

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
// Cookies!
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res) {
  new Session({apiKey: req.cookies.apiKey}).fetch().then(function(found){
    if (found) {
      Links.reset().fetch().then(function(links) {
        res.render('index');
      });
    } else {
      res.redirect("/login");
    }
  });
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.get('/create', function(req, res) {
  res.render('index');
});



app.get('/links', function(req, res) {
  new Session({apiKey: req.cookies.apiKey}).fetch().then(function(found){
    if (found) {
      Links.reset().fetch().then(function(links) {
        res.send(200, links.models);
      });
    } else {
      res.redirect("/login");
    }
  });
});

app.post('/links', function(req, res) {
  var uri = req.body.url;
  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

/*
function setCookie(name, value, expires, path, domain, secure) {
    document.cookie = name + "=" + escape(value) +
        ((expires) ? "; expires=" + expires : "") +
        ((path) ? "; path=" + path : "") +
        ((domain) ? "; domain=" + domain : "") +
        ((secure) ? "; secure" : "");
}

var expires = new Date(new Date().getTime()+30*24*60*60*1000).toGMTString();
setCookie("username", "id", expires);
*/

app.post('/signup', function(req, res) {
  var username = req.body.username;
  new User({username: username}).fetch().then(function(found) {
    if(found) {
      res.status(422).send({error: "this username already exists"});
    } else {
      var user = new User(req.body);
      user.save()
        .then(function(newUser) {
          Users.add(newUser);
          var apiKey = uuid.v1();
          res.cookie("apiKey", apiKey, { HttpOnly: true })
          var session = new Session({apiKey : apiKey, user_id: newUser.get('id')});
          session.save().then(function(data) {console.log(data) })
          res.redirect('/')
        });
    }
  })
});

app.post('/login', function(req, res) {
  console.log(req.body);
  var username = req.body.username;
  new User({username: username}).fetch().then(function(found) {
    if(found) {
      // check if the password is correct
      found.comparePassword(req.body.password, function(err, match) {
        if(match) {
          // give the user an apiKey
          var apiKey = uuid.v1();
          res.cookie("apiKey", apiKey, { HttpOnly: true });
          console.log("right password");
          var session = new Session({apiKey : apiKey, user_id: found.get('id')});
          session.save().then(function(data) {console.log(data) })
          res.redirect('/');
        } else {
          console.log("wrong password");
          res.send(401, "You are not authorized");
        }
      });
    } else {
      res.send(400, "That username does not exist");
    }
  })
});

app.get('/logout', function(req, res){
  new Session({apiKey: req.cookies.apiKey}).fetch().then(function(session){
    if(session) {
      console.log("apiKey",session.get('apiKey'));
      session.destroy();
    }
  })

  res.redirect("/login");
})

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.status(404);
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
