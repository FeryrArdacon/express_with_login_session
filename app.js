#!/usr/bin/env node
const https = require("https");
const fs = require("fs");
const express = require("express");
const { Router } = require("express");
const cookieParser = require("cookie-parser")
const path = require("path");
const { createReadStream } = require('fs');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');

require('dotenv').config();

class Session {
  constructor(username, expiresAt) {
    this.username = username;
    this.expiresAt = expiresAt;
  }

  // we'll use this method later to determine if the session has expired
  isExpired() {
    this.expiresAt < (new Date());
  }
}

// this object stores the users sessions. For larger scale applications, you can use a database or cache for this purpose
const sessions = {};

const authenticator = (req, res, next) => {
  if (req.cookies) {
    // We can obtain the session token from the requests cookies, which come with every request
    const sessionToken = req.cookies['session_token'];
    if (sessionToken && sessions[sessionToken] && !sessions[sessionToken].isExpired()) {
      next();
      return;
    }

    if (sessionToken && sessions[sessionToken] && sessions[sessionToken].isExpired()) {
      delete sessions[sessionToken];
    }
  }

  const usersFileContent = fs.readFileSync(process.env.USERS_FILE);
  const users = JSON.parse(usersFileContent);

  const { user, password } = req.body;

  const expectedPassword = users[user];

  if (!expectedPassword || expectedPassword !== password) {
    createReadStream('login-declined.html').pipe(res);
    return;
  }

  // generate a random UUID as the session token
  const sessionToken = uuidv4()

  // set the expiry time as 120s after the current time
  const now = new Date()
  const expiresAt = new Date(+now + 48 * 60 *  60 * 1000)

  // create a session containing information about the user and expiry time
  const session = new Session(user, expiresAt)
  // add the session information to the sessions map
  sessions[sessionToken] = session

  res.cookie("session_token", sessionToken, { expires: expiresAt })
  req.method = "GET";
  next();
};

const app = express();
const port = 2555;

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false })); // to parse the data sent by the client

app.use("/app", authenticator);
app.use("/app", express.static(path.join(process.env.STATIC_APP_SOURCE, "dist")));

app.get("/", (req, res) => {
  if (req.cookies) {
    // We can obtain the session token from the requests cookies, which come with every request
    const sessionToken = req.cookies['session_token'];
    if (sessionToken && sessions[sessionToken] && !sessions[sessionToken].isExpired()) {
      res.redirect("/app");
      return;
    }

    if (sessionToken && sessions[sessionToken] && sessions[sessionToken].isExpired()) {
      delete sessions[sessionToken];
    }
  }

  createReadStream('login.html').pipe(res);
});

app.get("/bootstrap.css", (req, res) => {
  createReadStream('bootstrap.css').pipe(res);
});

app.get("/impressum", (req, res) => {
  createReadStream('impressum.html').pipe(res);
});

https.createServer({
  key: fs.readFileSync("server.key"),
  cert: fs.readFileSync("server.cert")
}, app).listen(port, (err) => {
  if (err) {
    console.log("Error: ", err);
  } else {
    console.log("Server is up on port: ", port);
  }
});
