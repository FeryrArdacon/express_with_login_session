const { v4: uuidv4 } = require("uuid");

// session with token, expireing time and username
class Session {
  constructor(username, expiresAt) {
    this.username = username;
    this.expiresAt = expiresAt;
    this.token = uuidv4();
  }

  getToken() {
    return this.token;
  }

  isExpired() {
    this.expiresAt < new Date();
  }
}

module.exports = Session;
