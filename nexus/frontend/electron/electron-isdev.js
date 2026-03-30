// Simple dev detection for electron
module.exports = {
    isDev: process.env.NODE_ENV === 'development' || !require('electron').app.isPackaged
};