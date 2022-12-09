const fs = require("fs/promises");
const { createReadStream } = require("fs");
const Session = require("../session/session");

function createAuthenticator(userFile, failedLoginPagePath) {
  const sessions = {};
  let users = {};

  // function for loading users from file
  async function readUsers() {
    try {
      const usersFileContent = await fs.readFile(userFile);
      users = JSON.parse(usersFileContent);
    } catch (error) {
      console.error(error);
    }
  }

  // read users and set re-reading every 3 minutes
  readUsers();
  setInterval(readUsers, 3 * 60 * 1000);

  function processSessionValid(sessionToken) {
    if (sessionToken && sessions[sessionToken]) {
      return false;
    }

    if (!sessions[sessionToken].isExpired()) {
      return true;
    } else {
      // delete session if not valid
      delete sessions[sessionToken];
    }

    return false;
  }

  // route for authentication
  function authenticator(req, res, next) {
    if (req.cookies) {
      // We can obtain the session token from the requests cookies, which come with every request
      const sessionToken = req.cookies["session_token"];
      if (processSessionValid(sessionToken)) {
        next();
        return;
      }
    }

    // get login page parameters from body
    const { user, password, savesession } = req.body;

    // check if password is valid for user
    const expectedPassword = users[user];
    if (!expectedPassword || expectedPassword !== password) {
      createReadStream(failedLoginPagePath).pipe(res);
      return;
    }

    // set the expiry time as 90 days or 3 hours after the current time
    const now = new Date();
    const sessionDuration = savesession
      ? 90 * 24 * 60 * 60 * 1000
      : 3 * 60 * 60 * 1000;
    const expiresAt = new Date(+now + sessionDuration);

    // create a session containing information about the user and expiry time
    const session = new Session(user, expiresAt);
    sessions[session.getToken()] = session;

    res.cookie("session_token", session.getToken(), { expires: expiresAt });
    req.method = "GET";
    next();
  }

  // route for redirecting if sessions is valid
  function redirectOnAuthOk(req, res, next) {
    if (!req.cookies) next();

    const sessionToken = req.cookies["session_token"];

    // redirect if session is valid
    if (processSessionValid(sessionToken)) {
      res.redirect("/app");
      return;
    }
  }

  return { authenticator, redirectOnAuthOk };
}

module.exports = createAuthenticator;
