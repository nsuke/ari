"use strict";

var express = require("express");
var logfmt = require("logfmt");
var app = express();

app.use(logfmt.requestLogger());
app.set('views', __dirname + '/app');
app.use(express.static(__dirname + '/app'));
app.use('/bower_components',  express.static(__dirname + '/bower_components'));
app.engine('html', require('ejs').renderFile);
app.get('/', function(req, res) {
  res.render("index.html");
});

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});
