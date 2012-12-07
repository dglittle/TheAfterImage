var mongoose = require("mongoose");
var mongo_url = process.env.MONGOHQ_URL || 'mongodb://localhost/test';
var db = mongoose.createConnection(mongo_url);

var schema = new mongoose.Schema({
  OpenId: {type: String, index: {unique: true, dropDups: true}}
});
var User = db.model("User", schema);

exports.User = User;