const { v4: uuidv4 } = require("uuid");

// session with token, expireing time and username
class Session {
  constructor(username, expiresAt, token) {
    this.username = username;
    this.expiresAt = expiresAt;
    this.token = token || uuidv4();
  }

  getToken() {
    return this.token;
  }

  isExpired() {
    this.expiresAt.getTime() < new Date().getTime();
  }
}

module.exports = Session;
