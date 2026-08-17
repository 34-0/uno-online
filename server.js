const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;
const ROOT = __dirname;
const rooms = new Map();

const COLORS = ['red', 'yellow', 'green', 'blue'];
const SPECIAL = ['skip', 'reverse', 'draw2'];
const GAMES = ['uno', 'xo', 'bowling', 'billiards'];

function send(player, data) {
  if (player && player.ws && player.ws.readyState === WebSocket.OPEN) {
    player.ws.send(JSON.stringify(data));
  }
}

function broadcast(room, data) {
  room.players.forEach((player) => send(player, data));
}

function makeCode() {
  let code;
  do {
    code = Math.random().toString(36).slice(2, 6).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function makeUnoDeck() {
  const deck = [];
  let id = 1;
  const add = (color, value) => deck.push({ id: id++, color, value });

  for (const color of COLORS) {
    add(color, '0');
    for (let n = 1; n <= 9; n++) {
      add(color, String(n));
      add(color, String(n));
    }
    for (const special of SPECIAL) {
      add(color, special);
      add(color, special);
    }
  }

  for (let i = 0; i < 4; i++) {
    add('wild', 'wild');
    add('wild', 'draw4');
  }

  return deck;
}

function drawCards(room, player, amount = 1) {
  for (let i = 0; i < amount; i++) {
    if (!room.deck.length && room.used.length) {
      room.deck = room.used.splice(0);
      shuffle(room.deck);
    }
    if (room.deck.length) player.hand.push(room.deck.pop());
  }
}

function nextTurn(room) {
  if (!room.players.length) return;
  room.turn = (room.turn + room.direction + room.players.length) % room.players.length;
}

function lobbyState(room) {
  return {
    type: 'room',
    room: room.code,
    game: room.game,
    host: room.players[0] ? room.players[0].id : null,
    players: room.players.map((p) => ({ id: p.id, name: p.name }))
  };
}

function unoState(room, me) {
  return {
    game: 'uno',
    room: room.code,
    me: me.id,
    turn: room.turn,
    color: room.color,
    awaitColor: room.awaitColor,
    discard: room.discard,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      hand: p.hand
    }))
  };
}

function validUnoCard(card, room) {
  if (!room.discard) return true;
  return (
    card.color === 'wild' ||
    card.color === room.color ||
    card.color === room.discard.color ||
    card.value === room.discard.value
  );
}

function applyUnoEffects(room, card) {
  if (card.value === 'reverse') room.direction *= -1;

  if (card.value === 'skip') {
    nextTurn(room);
  }

  if (card.value === 'draw2' || card.value === 'draw4') {
    const amount = card.value === 'draw2' ? 2 : 4;
    const targetIndex =
      (room.turn + room.direction + room.players.length) % room.players.length;
    const target = room.players[targetIndex];
    if (target) drawCards(room, target, amount);
    nextTurn(room);
  }
}

function startUno(room) {
  room.deck = makeUnoDeck();
  shuffle(room.deck);
  room.used = [];
  room.turn = 0;
  room.direction = 1;
  room.color = null;
  room.awaitColor = false;
  room.started = true;

  room.players.forEach((p) => { p.hand = []; });

  for (let i = 0; i < 7; i++) {
    room.players.forEach((p) => drawCards(room, p));
  }

  do {
    room.discard = room.deck.pop();
  } while (room.discard && room.discard.color === 'wild');

  room.color = room.discard.color;
  updateUno(room, 'started');
}

function updateUno(room, type = 'state') {
  room.players.forEach((p) => send(p, { type, state: unoState(room, p) }));
}

function playUno(room, player, cardId) {
  if (!room.started || room.players[room.turn] !== player || room.awaitColor) return;

  const index = player.hand.findIndex((card) => String(card.id) === String(cardId));
  if (index === -1) return;

  const card = player.hand[index];
  if (!validUnoCard(card, room)) {
    return send(player, { type: 'error', message: 'هذه الورقة غير صالحة الآن.' });
  }

  player.hand.splice(index, 1);
  if (room.discard) room.used.push(room.discard);
  room.discard = card;

  if (card.color === 'wild') {
    room.color = null;
    room.awaitColor = true;
  } else {
    room.color = card.color;
    room.awaitColor = false;
  }

  if (player.hand.length === 0) {
    room.started = false;
    broadcast(room, { type: 'win', message: `🏆 ${player.name} فاز في UNO!` });
    return updateUno(room);
  }

  if (!room.awaitColor) {
    applyUnoEffects(room, card);
    nextTurn(room);
  }

  updateUno(room);
}

function startXO(room) {
  room.board = Array(9).fill(null);
  room.turn = 0;
  room.winner = null;
  room.started = true;
  room.players.forEach((p, i) => { p.symbol = i === 0 ? 'X' : 'O'; });
  broadcast(room, { type: 'started', state: xoState(room) });
}

function xoWinner(board) {
  const lines = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? 'draw' : null;
}

function xoState(room) {
  return {
    game: 'xo',
    room: room.code,
    turn: room.turn,
    board: room.board,
    winner: room.winner,
    players: room.players.map((p) => ({ id: p.id, name: p.name, symbol: p.symbol }))
  };
}

function playXO(room, player, pos) {
  if (!room.started || room.players[room.turn] !== player) return;
  if (!Number.isInteger(pos) || pos < 0 || pos > 8 || room.board[pos]) return;

  room.board[pos] = player.symbol;
  room.winner = xoWinner(room.board);
  if (room.winner) {
    room.started = false;
  } else {
    room.turn = (room.turn + 1) % room.players.length;
  }
  broadcast(room, { type: 'state', state: xoState(room) });
}

function bowlingState(room) {
  return {
    game: 'bowling',
    room: room.code,
    turn: room.turn,
    frame: room.frame,
    roll: room.roll,
    pins: room.pins,
    scores: room.players.map((p) => ({ id: p.id, name: p.name, score: p.score || 0 }))
  };
}

function startBowling(room) {
  room.turn = 0;
  room.frame = 1;
  room.roll = 0;
  room.pins = 10;
  room.started = true;
  room.players.forEach((p) => { p.score = 0; });
  broadcast(room, { type: 'started', state: bowlingState(room) });
}

function playBowling(room, player, power) {
  if (!room.started || room.players[room.turn] !== player) return;

  const value = Math.max(0.1, Math.min(1, Number(power) || 0.75));
  const knocked = Math.min(room.pins, Math.max(0, Math.round((0.35 * Math.random() + 0.65 * value) * room.pins)));
  room.pins -= knocked;
  player.score = (player.score || 0) + knocked;

  if (room.pins > 0 && room.roll === 0) {
    room.roll = 1;
  } else {
    room.roll = 0;
    room.pins = 10;
    room.turn = (room.turn + 1) % room.players.length;
    if (room.turn === 0) room.frame++;
  }

  if (room.frame > 10) {
    room.started = false;
    const winner = [...room.players].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    broadcast(room, { type: 'win', message: `🎳 انتهت المباراة! الفائز: ${winner.name}` });
  }

  broadcast(room, { type: 'state', state: bowlingState(room) });
}

function billiardsState(room) {
  return {
    game: 'billiards',
    room: room.code,
    turn: room.turn,
    balls: room.balls,
    scores: room.players.map((p) => ({ id: p.id, name: p.name, score: p.score || 0 }))
  };
}

function startBilliards(room) {
  room.turn = 0;
  room.started = true;
  room.balls = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, on: true }));
  room.players.forEach((p) => { p.score = 0; });
  broadcast(room, { type: 'started', state: billiardsState(room) });
}

function playBilliards(room, player, aim) {
  if (!room.started || room.players[room.turn] !== player) return;

  const target = Math.max(0, Math.min(100, Number(aim) || 50));
  const accuracy = 1 - Math.abs(50 - target) / 50;
  const live = room.balls.filter((b) => b.on);

  if (live.length && Math.random() < 0.25 + 0.65 * accuracy) {
    const hit = live[Math.floor(Math.random() * live.length)];
    hit.on = false;
    player.score = (player.score || 0) + 1;
  }

  if (room.balls.some((b) => b.on)) {
    room.turn = (room.turn + 1) % room.players.length;
  } else {
    room.started = false;
    const winner = [...room.players].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    broadcast(room, { type: 'win', message: `🎱 انتهت المباراة! الفائز: ${winner.name}` });
  }

  broadcast(room, { type: 'state', state: billiardsState(room) });
}

function newRoom(game) {
  return {
    code: makeCode(),
    game,
    players: [],
    started: false,
    deck: [],
    used: [],
    discard: null,
    turn: 0,
    direction: 1,
    color: null,
    awaitColor: false,
    board: Array(9).fill(null),
    winner: null,
    frame: 1,
    roll: 0,
    pins: 10,
    balls: []
  };
}

const server = http.createServer((req, res) => {
  let url = (req.url || '/').split('?')[0];
  if (url === '/') url = '/index.html';

  const safe = path.normalize(url).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(ROOT, safe);

  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not Found');
  }

  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  res.writeHead(200, {
    'Content-Type': mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache'
  });
  res.end(fs.readFileSync(filePath));
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  let player = null;
  let room = null;

  send({ ws }, { type: 'connected' });

  ws.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === 'create') {
      if (player) return;
      const game = GAMES.includes(message.game) ? message.game : 'uno';
      room = newRoom(game);
      player = {
        id: crypto.randomUUID(),
        name: String(message.name || 'لاعب').trim().slice(0, 18) || 'لاعب',
        hand: [],
        symbol: null,
        score: 0,
        ws
      };
      room.players.push(player);
      rooms.set(room.code, room);
      return send(player, lobbyState(room));
    }

    if (message.type === 'join') {
      if (player) return;
      const roomCode = String(message.room || '').trim().toUpperCase();
      room = rooms.get(roomCode);

      if (!room) return send({ ws }, { type: 'error', message: 'الغرفة غير موجودة.' });
      if (room.started) return send({ ws }, { type: 'error', message: 'اللعبة بدأت بالفعل.' });
      if (room.players.length >= 4) return send({ ws }, { type: 'error', message: 'الغرفة ممتلئة.' });
      if (message.game && message.game !== room.game) {
        return send({ ws }, { type: 'error', message: 'هذه الغرفة مخصصة للعبة مختلفة.' });
      }

      player = {
        id: crypto.randomUUID(),
        name: String(message.name || 'لاعب').trim().slice(0, 18) || 'لاعب',
        hand: [],
        symbol: null,
        score: 0,
        ws
      };
      room.players.push(player);
      return broadcast(room, lobbyState(room));
    }

    if (!player || !room) {
      return send({ ws }, { type: 'error', message: 'أنشئ غرفة أو انضم إلى غرفة أولاً.' });
    }

    if (message.type === 'start') {
      if (room.players[0] !== player) return send(player, { type: 'error', message: 'فقط المضيف يستطيع بدء اللعبة.' });
      if (room.game === 'xo' && room.players.length < 2) return send(player, { type: 'error', message: 'XO أونلاين تحتاج لاعبين. أو استخدم اللعب مع بوت.' });
      if (room.game === 'bowling' && room.players.length < 2) return send(player, { type: 'error', message: 'البولنق أونلاين يحتاج لاعبين. أو استخدم اللعب مع بوت.' });
      if (room.game === 'billiards' && room.players.length < 2) return send(player, { type: 'error', message: 'البلياردو أونلاين يحتاج لاعبين. أو استخدم اللعب مع بوت.' });

      if (room.game === 'uno') startUno(room);
      else if (room.game === 'xo') startXO(room);
      else if (room.game === 'bowling') startBowling(room);
      else startBilliards(room);
      return;
    }

    if (message.type === 'play' && room.game === 'uno') return playUno(room, player, message.id);

    if (message.type === 'draw' && room.game === 'uno') {
      if (!room.started || room.players[room.turn] !== player || room.awaitColor) return;
      drawCards(room, player);
      nextTurn(room);
      return updateUno(room);
    }

    if (message.type === 'color' && room.game === 'uno') {
      if (!room.started || room.players[room.turn] !== player || !room.awaitColor) return;
      if (!COLORS.includes(message.color)) return;
      room.color = message.color;
      room.awaitColor = false;
      applyUnoEffects(room, room.discard);
      nextTurn(room);
      return updateUno(room);
    }

    if (message.type === 'uno' && room.game === 'uno') {
      if (room.started && player.hand.length === 1) {
        return broadcast(room, { type: 'toast', message: `🔥 ${player.name} قال UNO!` });
      }
      return;
    }

    if (message.type === 'xo' && room.game === 'xo') return playXO(room, player, Number(message.pos));
    if (message.type === 'bowl' && room.game === 'bowling') return playBowling(room, player, message.power);
    if (message.type === 'billiards' && room.game === 'billiards') return playBilliards(room, player, message.aim);

    if (message.type === 'chat') {
      const text = String(message.text || '').trim().slice(0, 180);
      if (text) broadcast(room, { type: 'chat', name: player.name, text });
    }
  });

  ws.on('close', () => {
    if (!player || !room) return;

    room.players = room.players.filter((p) => p !== player);

    if (!room.players.length) {
      rooms.delete(room.code);
      return;
    }

    if (room.started) {
      room.started = false;
      broadcast(room, { type: 'error', message: '⚠️ خرج أحد اللاعبين وتم إيقاف المباراة.' });
    }

    if (room.turn >= room.players.length) room.turn = 0;
    broadcast(room, lobbyState(room));
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`UNO Arcade running on port ${PORT}`);
});
