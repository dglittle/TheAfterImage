var express = require('express');
var mongoStore = require('connect-mongodb');
var openid = require('openid');
var User = require('./db.js').User;

var base_url = 'http://hidden-fjord-4892.herokuapp.com'; // aplication url
var mongo_url = process.env.MONGOHQ_URL || 'mongodb://localhost/test';
var port  = process.env.PORT || 3000;

var relyingParty = new openid.RelyingParty(base_url + '/verify', 
                                           null,
                                           false,
                                           false,
                                           []
                                          );

var app = express();

app.configure(function(){
    app.set('views', 'views');
    app.set('view_engine', 'ejs');
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({
      store: mongoStore({url: mongo_url}),
      secret: 'somerandomsecret',
      key: 'express.sid'
    }));
    app.use(express.methodOverride());
    app.use(app.router);
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.use(express.logger({ format: ':method :url' }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

function loadUser(req, res, next) {
  if (req.session.user_id) {
    User.findOne({OpenId: req.session.user_id}, function(err, user) {
      if (user && !err) {
        req.currentUser = user;
        next();
      } else {
        next();
      }
    });
  } else {
    next();
  }
}

function apiCall(req, res) {
  var qStr = req.param('q').replace(/\b([a-zA-Z]+)\b/g, '"$1"'); // Convert query str to json
  var q = JSON.parse(qStr);
  var a = q.a;
  var b = q.b;
  res.send(JSON.stringify({answer: a + b}));
}

app.post('/api', apiCall);
app.get('/api', apiCall);

app.get('/', function(req, res){
  res.redirect('/index.html');
});

app.get('/index.html', loadUser, function(req, res){
  if (req.currentUser) {
    res.render('userinfo.ejs', { user: req.currentUser });
  } else {
    res.render('index.ejs');
  }
});

app.get('/login.html', loadUser, function(req, res) {
  if (req.currentUser) {
    res.redirect('/');
  } else {
    res.render('login.ejs');
  }
});

app.get('/logout.html', function(req, res) {
  if (req.session) {
    req.session.destroy(function() {});
  }
  res.redirect('/');
});

app.post('/login.html', function(req, res) {
  var id = req.body.openid;
  relyingParty.authenticate(id, false, function(err, url){
    if (err) {
      res.send('Authentication failed: ' + err.message);
    } else if (!url) {
      res.send('Authentication failed');
    } else {
      res.redirect(url);
    }
  });
});

app.get('/verify', function(req, res){
  relyingParty.verifyAssertion(req, function(err, result){
    if (!err && result.authenticated) {
      req.session.user_id = result.claimedIdentifier;
      User.findOne({OpenId: result.claimedIdentifier}, function(err, user) {
        if (user && !err) {
          req.currentUser = user;
          res.redirect('/');
        } else {
          User.create({OpenId: result.claimedIdentifier}, function(err, user){
            console.log('here');
            if (err)
              console.log(err);
            else
              req.currentUser = user;
            res.redirect('/');
          });
        }
      });
    } else {
      console.log(err);
      res.redirect('/login.html');
    }
  });
});

app.listen(port);
console.log('Listening on port ' + port);