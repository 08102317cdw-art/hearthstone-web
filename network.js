'use strict';
/* ================================================================
   炉石网页版 · 局域网联机驱动模块 (network.js)
   ================================================================ */

const Network = {
  ws: null,
  role: null,        // 'p1' | 'p2'
  roomCode: null,

  // 连接局域网服务器
  connect(ip, callback) {
    const serverIP = ip || '127.0.0.1';
    const url = `ws://${serverIP}:8080`;

    try {
      this.ws = new WebSocket(url);
    } catch(e) {
      showShopNotice('连接失败', '无法建立 Socket 连接！');
      return;
    }

    this.ws.onopen = () => {
      console.log('[Network] 已连入局域网服务器');
      if (callback) callback();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(JSON.parse(event.data));
    };

    this.ws.onerror = () => {
      showShopNotice('连接失败', '局域网服务器未启动或 IP 地址填写错误！');
    };

    this.ws.onclose = () => {
      if (state.isMultiplayer && state.started) {
        showShopNotice('连接断开', '与局域网对手的连接已断开！');
        backToMenu();
      }
    };
  },

  // 创建房间 (房主)
  createRoom(ip) {
    this.connect(ip, () => {
      const deck = getSelectedLobbyDeck();
      this.ws.send(JSON.stringify({ type: 'CREATE_ROOM', deck }));
    });
  },

  // 加入房间 (好友)
  joinRoom(ip, code) {
    this.connect(ip, () => {
      const deck = getSelectedLobbyDeck();
      this.ws.send(JSON.stringify({ type: 'JOIN_ROOM', code, deck }));
    });
  },

  // 广播动作 (出牌/攻击/结束回合)
  sendAction(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  },

  // 处理对端发送的网络消息
  handleMessage(data) {
    switch (data.type) {
      case 'ROOM_CREATED':
        this.role = 'p1';
        this.roomCode = data.code;
        if ($('netRoomCodeTxt')) $('netRoomCodeTxt').textContent = data.code;
        if ($('netServerIPTxt')) $('netServerIPTxt').textContent = data.localIP;
        if ($('netWaitingBox')) $('netWaitingBox').style.display = 'block';
        if ($('netJoinForm')) $('netJoinForm').style.display = 'none';
        break;

      case 'GAME_START':
        $('networkModal').style.display = 'none';
        $('matchLobbyModal').style.display = 'none';
        $('intro').style.display = 'none';

        // 启动双人局域网对决
        startMultiplayerGame(data);
        break;

      case 'NET_PLAY_CARD':
        handleRemotePlayCard(data);
        break;

      case 'NET_ATTACK':
        handleRemoteAttack(data);
        break;

      case 'NET_HERO_POWER':
        handleRemoteHeroPower(data);
        break;

      case 'NET_END_TURN':
        handleRemoteEndTurn();
        break;

      case 'OPPONENT_DISCONNECTED':
        showShopNotice('对手离开', '对方退出了局域网对战！');
        backToMenu();
        break;

      case 'ERROR':
        showShopNotice('提示', data.message);
        break;
    }
  }
};

/* 获取当前准备大厅选中的套牌卡牌列表 */
function getSelectedLobbyDeck() {
  let myDeckCards = null;
  if (typeof selectedLobbyDeckId !== 'undefined' && selectedLobbyDeckId && selectedLobbyDeckId !== 'default') {
    try {
      const dd = JSON.parse(localStorage.getItem('hs_decks') || '{}');
      const dk = dd.decks && dd.decks.find(d => d.id === selectedLobbyDeckId);
      if (dk && dk.cards) {
        myDeckCards = Object.entries(dk.cards).flatMap(([k, v]) => Array(v).fill(k));
      }
    } catch(e){}
  }
  return myDeckCards;
}
