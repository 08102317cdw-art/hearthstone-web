'use strict';
/* ================================================================
   炉石网页版 · 局域网对战 WebSocket 服务器 (server.js)
   运行方式: node server.js
   ================================================================ */

const http = require('http');
const os = require('os');
const WebSocket = require('ws');

const PORT = 8080;

// 获取当前电脑的局域网 IP (如 192.168.1.100)
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    for (const iface of interfaces[devName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('⚔️ 炉石局域网对战服务器运行中...');
});

const wss = new WebSocket.Server({ server });
const rooms = {};

wss.on('connection', (ws) => {
  let currentRoomCode = null;
  let playerRole = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // 1. 创建房间 (房主 P1)
      if (data.type === 'CREATE_ROOM') {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        currentRoomCode = code;
        playerRole = 'p1';

        rooms[code] = {
          code,
          p1: { ws, deck: data.deck },
          p2: null,
          status: 'waiting'
        };

        ws.send(JSON.stringify({
          type: 'ROOM_CREATED',
          code,
          role: 'p1',
          localIP: getLocalIP()
        }));
        return;
      }

      // 2. 加入房间 (挑战者 P2)
      if (data.type === 'JOIN_ROOM') {
        const room = rooms[data.code];
        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: '未找到该房间码，请核对！' }));
          return;
        }
        if (room.p2) {
          ws.send(JSON.stringify({ type: 'ERROR', message: '该房间对战人数已满！' }));
          return;
        }

        currentRoomCode = data.code;
        playerRole = 'p2';
        room.p2 = { ws, deck: data.deck };
        room.status = 'playing';

        // 双方满员，通知双方开局！
        room.p1.ws.send(JSON.stringify({ type: 'GAME_START', role: 'p1', opponentDeck: room.p2.deck }));
        room.p2.ws.send(JSON.stringify({ type: 'GAME_START', role: 'p2', opponentDeck: room.p1.deck }));
        return;
      }

      // 3. 动作消息转发 (出牌/攻击/技能/结束回合)
      if (currentRoomCode && rooms[currentRoomCode]) {
        const room = rooms[currentRoomCode];
        const opponent = playerRole === 'p1' ? room.p2 : room.p1;
        if (opponent && opponent.ws && opponent.ws.readyState === WebSocket.OPEN) {
          opponent.ws.send(JSON.stringify({ ...data, fromRole: playerRole }));
        }
      }
    } catch(e) {
      console.error(e);
    }
  });

  ws.on('close', () => {
    if (currentRoomCode && rooms[currentRoomCode]) {
      const room = rooms[currentRoomCode];
      const opponent = playerRole === 'p1' ? (room.p2 ? room.p2 : null) : room.p1;
      if (opponent && opponent.ws && opponent.ws.readyState === WebSocket.OPEN) {
        opponent.ws.send(JSON.stringify({ type: 'OPPONENT_DISCONNECTED' }));
      }
      delete rooms[currentRoomCode];
    }
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`⚔️  炉石局域网对战服务器启动成功！`);
  console.log(`🌐  房主局域网 IP 地址: http://${getLocalIP()}:${PORT}`);
  console.log(`提示：请让你的好友输入该 IP 地址与 4 位房间码连入`);
  console.log(`====================================================`);
});
