var mongoose = require("mongoose");
var mongo_url = process.env.MONGOHQ_URL || 'mongodb://localhost/test';
var db = mongoose.createConnection(mongo_url);

var userSchema = new mongoose.Schema({
  OpenId: {type: String, index: {unique: true, dropDups: true}}
});

var taskSchema = new mongoose.Schema({
  title: { type: String, index: {unique: true, dropDups: true}},
  user: { type: String, required: true }  
});

var messageSchema = new mongoose.Schema({
  text: { type: String },
  task: { type: String, index: {} },
  user: { type: String, required: true }  
});

var User = db.model("User", userSchema);
var Task = db.model("Task", taskSchema);
var Message = db.model("Message", messageSchema);

exports.User = User;
exports.Task = Task;
exports.Message = Message;