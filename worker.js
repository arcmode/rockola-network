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
    // TODO: validate presence data in handshake to avoid bad connections
    //       or just disconnect here
    if (hasPresenceData(socket)) {
      presenceConnection(exchange, socket);
    }
  });
};

const PresenceTypes = ['host', 'client'];

const hasPresenceData = (socket) => {
  const { type, name } = getPresenceData(socket);
  const validType = PresenceTypes.indexOf(type) >= 0;
  const validName = !!name.length;
  return (validType && validName);
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

const getPresenceData = (socket) => {
  const { query } = url.parse(socket.request.url, true);
  const { type, name } = query;
  return { type, name };
};

const presenceConnection = (exchange, socket) => {
  setPresence(exchange, socket);
  socket.on('disconnect', () => presenceDisconnect(exchange, socket));
};

const presenceDisconnect = (exchange, socket) => {
  removePresence(exchange, socket);
  clearEmptyPresences(exchange, socket);
};

const setPresence = (exchange, socket) => {
  const { type, name } = getPresenceData(socket);
  const path = ['presence'];
  exchange.set(['presence', type, name, socket.id], true);
};

const removePresence = (exchange, socket) => {
  const { type, name } = getPresenceData(socket);
  exchange.remove(['presence', type, name, socket.id]);
};

const clearEmptyPresences = (exchange, socket) => {
  const { type, name } = getPresenceData(socket);
  exchange.get(['presence', type, name], (err, value) => {
    if (err) {
      console.log('EXCHANGE ERR', err);
    } else {
      if (Object.keys(value).length === 0) {
        exchange.remove(['presence', type, name]);
      }
    }
  });
};


