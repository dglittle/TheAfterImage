var mongoose = require("mongoose");
var mongo_url = process.env.MONGOHQ_URL || 'mongodb://localhost/test';
var db = mongoose.createConnection(mongo_url);

var userSchema = new mongoose.Schema({
  OpenId: {type: String, index: {unique: true, dropDups: true}}
});

var taskSchema = new mongoose.Schema({
  title: { type: String }
});

var User = db.model("User", userSchema);
var Task = db.model("Task", taskSchema);

exports.User = User;
exports.Task = Task;