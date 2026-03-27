#!/usr/bin/env node
// Proper WebSocket relay: terminates WS at relay, proxies to gateway
const { WebSocketServer } = require('ws');
const { WebSocket } = require('ws');

const LISTEN_PORT = 18790;
const TARGET_URL = 'ws://127.0.0.1:18789';

const wss = new WebSocketServer({ port: LISTEN_PORT, host: '0.0.0.0' });

wss.on('connection', (clientSocket, req) => {
  const remoteIp = clientSocket.remoteAddress;
  console.log(`[relay] WS connection from ${remoteIp}`);

  const target = new WebSocket(TARGET_URL);

  target.on('open', () => {
    console.log(`[relay] connected to gateway`);
    clientSocket.on('message', (msg) => {
      if (target.readyState === WebSocket.OPEN) {
        target.send(msg);
      }
    });
    target.on('message', (msg) => {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(msg);
      }
    });
    target.on('close', () => { clientSocket.close(); });
    target.on('error', (e) => { console.error('[relay] target error:', e.message); clientSocket.close(); });
    clientSocket.on('error', (e) => { console.error('[relay] client error:', e.message); target.close(); });
    clientSocket.on('close', () => { target.close(); });
  });

  target.on('error', (e) => {
    console.error('[relay] target connection error:', e.message);
    clientSocket.close();
  });
});

wss.on('error', (e) => { console.error('[relay] server error:', e.message); });

console.log(`[relay] WebSocket relay listening on 0.0.0.0:${LISTEN_PORT} -> ${TARGET_URL}`);
