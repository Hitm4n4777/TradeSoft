
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('tradeSoft', {
  getAppName: () => 'TradeSoft'
});
