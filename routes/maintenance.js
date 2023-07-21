const fs = require("fs/promises");
const { createReadStream } = require("fs");

function createMaintenanceRoute(maintenanceFile, maintenancePagePath) {
  let maintenanceState = { maintenance: false };

  // function for loading maintenance state from file
  async function readMaintenanceState() {
    try {
      const maintenanceFileContent = await fs.readFile(maintenanceFile);
      maintenanceState = JSON.parse(maintenanceFileContent);
    } catch (error) {
      console.error(error);
    }
  }

  // read maintenance state and set re-reading every minutes
  readMaintenanceState();
  setInterval(readMaintenanceState, 1 * 60 * 1000);

  // route for authentication
  function maintenance(_req, res, next) {
    if (maintenanceState.isMaintenance) {
      createReadStream(maintenancePagePath).pipe(res);
      return;
    }

    next();
  }

  return { maintenance };
}

module.exports = createMaintenanceRoute;
