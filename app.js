#!/usr/bin/env node
// Server
const https = require("https");
const express = require("express");

// Middleware
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

// Filesystem handling
const fs = require("fs");
const { createReadStream } = require("fs");
const path = require("path");

// Routes
const createAuthenticator = require("./routes/authenticator");

// Read environment variables from .env-file
require("dotenv").config();

const { authenticator, redirectOnAuthOk } = createAuthenticator(
  process.env.USERS_FILE,
  "static/login-declined.html"
);

const app = express();
const port = 2555;

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false })); // to parse the data sent by the client

app.use("/app", authenticator);
app.use(
  "/app",
  express.static(path.join(process.env.STATIC_APP_SOURCE, "dist"))
);

app.use("/", redirectOnAuthOk);
app.get("/", (_, res) => {
  createReadStream("static/login.html").pipe(res);
});

app.get("/bootstrap.css", (_, res) => {
  createReadStream("static/bootstrap.css").pipe(res);
});

app.get("/impressum", (_, res) => {
  createReadStream("static/impressum.html").pipe(res);
});

https
  .createServer(
    {
      key: fs.readFileSync("server.key"),
      cert: fs.readFileSync("server.cert"),
    },
    app
  )
  .listen(port, (err) => {
    if (err) {
      console.log("Error: ", err);
    } else {
      console.log("Server is up on port: ", port);
    }
  });
