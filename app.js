#!/usr/bin/env node
// Server
const http2 = require("http2");
const http2Express = require("http2-express-bridge");
const express = require("express");

// Middleware
const helmet = require("helmet");
const compression = require("http-compression");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

// Filesystem handling
const fs = require("fs");
const { createReadStream } = require("fs");
const path = require("path");

// Routes
const createAuthenticator = require("./routes/authenticator");
const createMaintenanceRoute = require("./routes/maintenance");

// Read environment variables from .env-file
require("dotenv").config();

const { authenticator, redirectOnAuthOk } = createAuthenticator(
  process.env.USERS_FILE,
  "static/login-declined.html"
);

const { maintenance } = createMaintenanceRoute("static/maintenance.html");

const app = http2Express(express);
const port = 2555;

// Set global middleware

// Helmet-Konfiguration
app.use(
  helmet({
    contentSecurityPolicy: false, // Deaktiviere standardmäßige Content Security Policy (CSP)
    noSniff: false, // Deaktiviere 'X-Content-Type-Options: nosniff'
    noCache: false, // Deaktiviere 'Cache-Control' und 'Pragma' Header
  })
);

app.use(compression({ level: 2 }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false })); // to parse the data sent by the client
app.use(redirectOnAuthOk);
app.use(maintenance);

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
const options = {
  key: fs.readFileSync("server.key"),
  cert: fs.readFileSync("server.cert"),
  allowHTTP1: true,
};

http2.createSecureServer(options, app).listen(port, (error) => {
  if (error) console.log("Error: ", error);
  else console.log("Server is up on port: ", port);
});
