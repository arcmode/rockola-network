'use strict';

var SocketCluster = require('socketcluster').SocketCluster;

var start = function(options, onReady, onFail) {
  var authKey = options.authKey;
  var appName = options.name || 'Rockola';

  var socketCluster = new SocketCluster({
    workers: 1,
    brokers: 1,
    port: options && options.port || 8000,
    appName: appName,
    workerController: __dirname + '/worker.js',
    brokerController: __dirname + '/broker.js'
  });

  socketCluster.on('ready', onReady);

  socketCluster.on('fail', onFail);

  return socketCluster;
};

module.exports = {
  start: start
};
