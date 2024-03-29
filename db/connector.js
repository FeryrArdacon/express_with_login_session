const mysql = require("mysql2/promise");
const Session = require("../session/session");

class Connection {
  constructor(mysqlConnection) {
    this.mysqlConnection = mysqlConnection;
  }

  async end() {
    if (this.mysqlConnection === null) return;

    await this.mysqlConnection.end();
    this.mysqlConnection = null;
  }

  async authenticateUser(sUser, sPassword) {
    if (this.mysqlConnection === null)
      throw new Error("DB connection is closed");

    const sQuery = `select name from user where name = ? and password = sha2(?,256);`;
    const [aUsers, _] = await this.mysqlConnection.query(sQuery, [
      sUser,
      sPassword,
    ]);

    return aUsers.length > 0;
  }

  async createSession(oSession) {
    if (this.mysqlConnection === null)
      throw new Error("DB connection is closed");

    const oDateTime = oSession.expiresAt;
    const aDateTimeParts = oDateTime.toISOString().split(/(T|\.)/);
    const sDate = aDateTimeParts[0];
    const sTime = aDateTimeParts[2];
    const sQuery = `insert into session values(?, ?, ?);`;
    await this.mysqlConnection.query(sQuery, [
      oSession.token,
      `${sDate} ${sTime}`,
      oSession.username,
    ]);
  }

  async getSession(sRequestedToken) {
    if (this.mysqlConnection === null)
      throw new Error("DB connection is closed");

    const sQuery = `select * from session where id = ?;`;
    const [aSessions, _] = await this.mysqlConnection.query(sQuery, [
      sRequestedToken,
    ]);

    if (aSessions.length > 0) {
      const oSession = aSessions[0];
      const sToken = oSession.id;
      const oExpiresAt = new Date(oSession.expires_at);
      const sUser = oSession.user_name;

      return new Session(sUser, oExpiresAt, sToken);
    } else {
      return null;
    }
  }

  async deleteSession(sRequestedToken) {
    if (this.mysqlConnection === null)
      throw new Error("DB connection is closed");

    const sQuery = `delete from session where id = ?;`;
    await this.mysqlConnection.query(sQuery, [sRequestedToken]);
  }

  async isMaintenance() {
    if (this.mysqlConnection === null)
      throw new Error("DB connection is closed");

    const sQuery = `select value from config where property = ?;`;
    const [aMaintenance, _] = await this.mysqlConnection.query(sQuery, [
      "maintenance",
    ]);

    if (aMaintenance.length > 0) {
      return aMaintenance[0].value === "X" ? true : false;
    } else {
      return false;
    }
  }
}

async function connector() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DATABASE,
  });

  return new Connection(connection);
}

module.exports = connector;
