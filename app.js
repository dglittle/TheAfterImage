var express = require('express');
var mongoStore = require('connect-mongodb');
var openid = require('openid');
var url = require('url');
var $ = require('mongous').Mongous;
var ObjectID = require('mongous/bson/bson.js').ObjectID;

var base_url = 'http://hidden-fjord-4892.herokuapp.com'; // aplication url

var mongo_url = url.parse(process.env.MONGOHQ_URL || 'mongodb://localhost/test');
var db = mongo_url.pathname.split('/')[1];
var mongo_port = mongo_url.port || 27017;
var mongo_host = mongo_url.hostname;

var port  = process.env.PORT || 3000;

var relyingParty = new openid.RelyingParty(base_url + '/verify', 
                                           null,
                                           false,
                                           false,
                                           []);

$().open(mongo_host, mongo_port);
if (mongo_url.auth) {
    var mongo_auth = mongo_url.auth.split(':');
    var mongo_user = mongo_auth[0];
    var mongo_pass = mongo_auth[1];
}
$(db + '.$cmd').auth(mongo_user, mongo_pass, function(r){});

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


function callbackShow(res) {
  return function(result) { 
      if (!result.documents) 
          res.json(500, { error: result.error_message() });
      else
          res.json(200, result.documents);
  }
}

function apiCall(req, res) {
  var c = JSON.parse(req.param('q'));
  var currentUser = req.session.currentUser;
  switch (c.command) {
    case 'add task':
      if (currentUser) {
          $(db + '.Task').insert({ title: c.title, user: ObjectID(currentUser._id) });
          res.json(200, { message: 'Success' });
      } else
          res.json(403, { error: 'Must be logged in to use this command' });
      break;
    case 'add message':
      if (currentUser) {
          if (!c.task) {
              res.json(400, { error: 'You need to specify the task for the message' });
              break
          }
          $(db + '.Message').insert({ text: c.text, task: ObjectID(c.task), user: ObjectID(currentUser._id) });
          res.json(200, { message: 'Success' });
      } else
          res.json(403, { error: 'Must be logged in to use this command' });
      break;
    case 'get tasks':
      $(db + '.Task').find({}, callbackShow(res));
      break;
    case 'get messages':
      $(db + '.Message').find({ task: new ObjectID(c.task) }, callbackShow(res));
      break;
    default:
      res.json(400, { error: 'Invalid request to API' });
  }
}

app.post('/api', apiCall);
app.get('/api', apiCall);

app.get('/', function(req, res){
  res.redirect('/index.html');
});

app.get('/index.html', function(req, res){
  if (req.session.currentUser) {
    res.render('userinfo.ejs', { user: req.session.currentUser });
  } else {
    res.render('index.ejs');
  }
});

app.get('/login.html', function(req, res) {
  if (req.session.currentUser) {
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
      $(db + '.User').find({OpenId: result.claimedIdentifier}, function(reply) {
        var user = reply.documents[0];
        if (user) {
          req.session.currentUser = user;
          res.redirect('/');
        } else {
          user = { _id: new ObjectID(), OpenId: result.claimedIdentifier };
          req.session.currentUser = user;
          $(db + '.User').insert(user);
          res.redirect('/');
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