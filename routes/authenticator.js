const { createReadStream } = require("fs");
const Session = require("../session/session");
const connector = require("../db/connector");

function createAuthenticator(failedLoginPagePath) {
  async function processSessionValid(sessionToken) {
    if (!sessionToken) {
      return false;
    }

    let bSessionValid = false;

    const oConnection = await connector();
    const oSession = await oConnection.getSession(sessionToken);

    if (oSession && !oSession.isExpired()) {
      bSessionValid = true;
    } else if (oSession) {
      await oConnection.deleteSession(sessionToken);
    }

    oConnection.end();
    return bSessionValid;
  }

  // route for authentication
  async function authenticator(req, res, next) {
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
    const oConnection = await connector();

    // check if password is valid for user
    if (!oConnection.authenticateUser(user, password)) {
      oConnection.end();
      createReadStream(failedLoginPagePath).pipe(res);
      return;
    }

    // set the expiry time as 90 days or 3 hours after the current time
    const now = new Date();
    const sessionDuration = savesession
      ? 90 * 24 * 60 * 60 * 1000
      : 3 * 60 * 60 * 1000;
    const expiresAt = new Date(now.getTime() + sessionDuration);

    // create a session containing information about the user and expiry time
    const session = new Session(user, expiresAt);
    oConnection.createSession(session);
    oConnection.end();

    res.cookie("session_token", session.getToken(), {
      expires: expiresAt,
      sameSite: "strict",
      secure: true,
      httpOnly: true,
    });
    req.method = "GET";
    next();
  }

  // route for redirecting if sessions is valid
  function redirectOnAuthOk(req, res, next) {
    if (!req.cookies) {
      next();
      return;
    }

    if (req.originalUrl.includes("/app")) {
      next();
      return;
    }

    const sessionToken = req.cookies["session_token"];

    // redirect if session is valid
    if (processSessionValid(sessionToken)) {
      res.redirect("/app");
      return;
    }

    next();
  }

  return { authenticator, redirectOnAuthOk };
}

module.exports = createAuthenticator;
