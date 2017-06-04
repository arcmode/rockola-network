'use strict';

const url = require('url');

module.exports.run = (worker) => {
  console.log('   >> Worker PID:', process.pid);

  attach(worker);
};

const attach = (worker) => {
  const httpServer = worker.httpServer;
  const exchange = worker.exchange;

  httpServer.on('request', (request, response) => {
    return presenceResponse(exchange, request, response);
  });

  worker.scServer.on('connection', (socket) => {
    presenceConnection(exchange, socket);
  });
};

const jsonHeaders = (jsonStr) => {
  return {
    'Content-Type': 'application/json',
    'Content-Length': jsonStr.length
  };
};

const presenceResponse = (exchange, request, response) => {
  return exchange.get(['presence'], (err, data = {}) => {
    if (err) {
      const jsonError = JSON.stringify(err);
      response.writeHead(500, jsonHeaders(jsonError));
      return response.end(jsonError);
    }
    const jsonData = JSON.stringify(Object.keys(data));
    response.writeHead(200, jsonHeaders(jsonData));
    return response.end(jsonData);
  });
};

const getPresenceName = (socket) => {
  const { query } = url.parse(socket.request.url, true);
  const { serviceName } = query;
  return serviceName;
};

const presenceConnection = (exchange, socket) => {
  setPresence(exchange, socket);
  socket.on('disconnect', function () {
    presenceDisconnect(exchange, socket);
  });
};

const presenceDisconnect = (exchange, socket) => {
  removePresence(exchange, socket);
  clearEmptyPresences(exchange, socket);
};

const setPresence = (exchange, socket) => {
  const presenceName = getPresenceName(socket);
  const path = ['presence'];
  exchange.set(['presence', presenceName, socket.id], true);
};

const removePresence = (exchange, socket) => {
  const presenceName = getPresenceName(socket);
  exchange.remove(['presence', presenceName, socket.id]);
};

const clearEmptyPresences = (exchange, socket) => {
  const presenceName = getPresenceName(socket);
  exchange.get(['presence', presenceName], (err, value) => {
    if (err) {
      console.log('EXCHANGE ERR', err);
    } else {
      if (Object.keys(value).length === 0) {
        exchange.remove(['presence', presenceName]);
      }
    }
  });
};


