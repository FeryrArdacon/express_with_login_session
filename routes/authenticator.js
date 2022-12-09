const fs = require("fs/promises");
const { createReadStream } = require("fs");
const Session = require("../session/session");

function createAuthenticator(userFile, failedLoginPagePath) {
  // this object stores the users sessions. For larger scale applications, you can use a database or cache for this purpose
  const sessions = {};
  let users = {};

  async function readUsers() {
    try {
      const usersFileContent = await fs.readFile(userFile);
      users = JSON.parse(usersFileContent);
    } catch (error) {
      console.error(error);
    }
  }

  readUsers();
  setInterval(readUsers, 3 * 60 * 1000);

  function authenticator(req, res, next) {
    if (req.cookies) {
      // We can obtain the session token from the requests cookies, which come with every request
      const sessionToken = req.cookies["session_token"];
      if (
        sessionToken &&
        sessions[sessionToken] &&
        !sessions[sessionToken].isExpired()
      ) {
        next();
        return;
      }

      if (
        sessionToken &&
        sessions[sessionToken] &&
        sessions[sessionToken].isExpired()
      ) {
        delete sessions[sessionToken];
      }
    }

    const { user, password, savesession } = req.body;

    const expectedPassword = users[user];

    if (!expectedPassword || expectedPassword !== password) {
      createReadStream(failedLoginPagePath).pipe(res);
      return;
    }

    // set the expiry time as 120s after the current time
    const now = new Date();
    const sessionDuration = savesession
      ? 90 * 24 * 60 * 60 * 1000
      : 3 * 60 * 60 * 1000;
    const expiresAt = new Date(+now + sessionDuration);

    // create a session containing information about the user and expiry time
    const session = new Session(user, expiresAt);
    // add the session information to the sessions map
    sessions[session.getToken()] = session;

    res.cookie("session_token", session.getToken(), { expires: expiresAt });
    req.method = "GET";
    next();
  }

  function redirectOnAuthOk(req, res, next) {
    if (req.cookies) {
      // We can obtain the session token from the requests cookies, which come with every request
      const sessionToken = req.cookies["session_token"];
      if (
        sessionToken &&
        sessions[sessionToken] &&
        !sessions[sessionToken].isExpired()
      ) {
        res.redirect("/app");
        return;
      }

      if (
        sessionToken &&
        sessions[sessionToken] &&
        sessions[sessionToken].isExpired()
      ) {
        delete sessions[sessionToken];
      }
    }

    next();
  }

  return { authenticator, redirectOnAuthOk };
}

module.exports = createAuthenticator;
