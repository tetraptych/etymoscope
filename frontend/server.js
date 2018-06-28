// server.js
'use strict';
const express = require('express');
const PORT = process.env.port || 8080;
const app = express();

app.use(express.static(__dirname + '/assets'));

app.get('*', function (req, res) {
  res.sendFile(__dirname + '/assets/index.html');
});

app.listen(PORT);