console.log("Electron test"); const e = require("electron"); console.log("app:", typeof e.app); if(e.app) { e.app.whenReady().then(() => { console.log("Ready!"); e.app.quit(); }); }
