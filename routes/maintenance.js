const { createReadStream } = require("fs");
const connector = require("../db/connector");

function createMaintenanceRoute(maintenancePagePath) {
  // route for maintenance
  async function maintenance(_req, res, next) {
    const oConnection = await connector();
    const isMaintenance = await oConnection.isMaintenance();
    await oConnection.end();

    if (isMaintenance) {
      createReadStream(maintenancePagePath).pipe(res);
      return;
    }

    next();
  }

  return { maintenance };
}

module.exports = createMaintenanceRoute;
