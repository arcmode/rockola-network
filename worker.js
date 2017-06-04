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
  const { type, channel } = getPresenceData(socket);
  const validType = PresenceTypes.indexOf(type) >= 0;
  const validName = !!channel.length;
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
    const jsonData = JSON.stringify(data);
    response.writeHead(200, jsonHeaders(jsonData));
    return response.end(jsonData);
  });
};

const getPresenceData = (socket) => {
  const { query } = url.parse(socket.request.url, true);
  const { channel, type } = query;
  return { channel, type };
};

const presenceConnection = (exchange, socket) => {
  setPresence(exchange, socket);
  socket.on('disconnect', () => presenceDisconnect(exchange, socket));
};

const presenceDisconnect = (exchange, socket) => {
  removePresence(exchange, socket, () => clearEmptyPresences(exchange, socket));
};

const setPresence = (exchange, socket) => {
  const { channel, type } = getPresenceData(socket);
  const path = ['presence'];
  exchange.set(['presence', channel, type, socket.id], true);
};

const removePresence = (exchange, socket, callback) => {
  const { channel, type } = getPresenceData(socket);
  exchange.remove(['presence', channel, type, socket.id], callback);
};

const clearEmptyPresences = (exchange, socket) => {
  const { channel, type } = getPresenceData(socket);
  exchange.get(['presence', channel, type], (err, value) => {
    if (err) {
      console.log('EXCHANGE ERR', err);
    } else {
      if (Object.keys(value).length === 0) {
        exchange.remove(['presence', type, name]);
      }
    }
  });
};


