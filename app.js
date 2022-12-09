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

// Set global middleware
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false })); // to parse the data sent by the client
app.use(redirectOnAuthOk);

// Set specific middleware
app.use("/app", authenticator);
app.use(
  "/app",
  express.static(path.join(process.env.STATIC_APP_SOURCE, "dist"))
);

// Set static routes
app.get("/", (_, res) => {
  createReadStream("static/login.html").pipe(res);
});

app.get("/bootstrap.css", (_, res) => {
  createReadStream("static/bootstrap.css").pipe(res);
});

app.get("/impressum", (_, res) => {
  createReadStream("static/impressum.html").pipe(res);
});

// Create and start server
const key = fs.readFileSync("server.key");
const cert = fs.readFileSync("server.cert");
https.createServer({ key, cert }, app).listen(port, (error) => {
  if (error) console.log("Error: ", error);
  else console.log("Server is up on port: ", port);
});
