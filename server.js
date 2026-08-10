const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  let url = (req.url || "/").split("?")[0];

  if (url === "/") url = "/index.html";

  // السماح فقط بالملفات الموجودة داخل مجلد المشروع
  const filePath = path.join(__dirname, url);

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    return res.end("Not Found");
  }

  const ext = path.extname(filePath).toLowerCase();

  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  };

  res.writeHead(200, {
    "Content-Type": mime[ext] || "application/octet-stream"
  });

  res.end(fs.readFileSync(filePath));
});

const wss = new WebSocket.Server({ server });
const rooms = new Map();

const COLORS = ["red", "yellow", "green", "blue"];
const SPECIAL = ["skip", "reverse", "draw2"];

function makeDeck() {
  const deck = [];
  let id = 1;

  const add = (color, value) => {
    deck.push({ id: id++, color, value });
  };

  for (const color of COLORS) {
    add(color, "0");

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
    add("wild", "wild");
    add("wild", "draw4");
  }

  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function send(player, data) {
  if (
    player &&
    player.ws &&
    player.ws.readyState === WebSocket.OPEN
  ) {
    player.ws.send(JSON.stringify(data));
  }
}

function broadcast(room, data) {
  room.players.forEach(player => send(player, data));
}

function createCode() {
  let code;

  do {
    code = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();
  } while (rooms.has(code));

  return code;
}

function roomInfo(room) {
  return {
    type: "room",
    room: room.code,
    host: room.players[0]?.id || null,
    players: room.players.map(player => ({
      id: player.id,
      name: player.name
    }))
  };
}

function broadcastLobby(room) {
  room.players.forEach(player => {
    send(player, roomInfo(room));
  });
}

function publicState(room, me) {
  return {
    room: room.code,
    me: me.id,
    turn: room.turn,
    color: room.color,
    discard: room.discard,
    awaitColor: room.awaitColor,

    players: room.players.map(player => ({
      id: player.id,
      name: player.name,
      hand: player.hand
    }))
  };
}

function update(room) {
  room.players.forEach(player => {
    send(player, {
      type: "state",
      state: publicState(room, player)
    });
  });
}

function refill(room) {
  if (room.deck.length === 0 && room.used.length > 0) {
    room.deck = room.used;
    room.used = [];
    shuffle(room.deck);
  }
}

function draw(room, player, amount = 1) {
  for (let i = 0; i < amount; i++) {
    refill(room);

    if (room.deck.length) {
      player.hand.push(room.deck.pop());
    }
  }
}

function next(room) {
  if (!room.players.length) return;

  room.turn =
    (room.turn + room.direction + room.players.length) %
    room.players.length;
}

function valid(card, room) {
  if (!room.discard) return true;

  return (
    card.color === "wild" ||
    card.color === room.color ||
    card.color === room.discard.color ||
    card.value === room.discard.value
  );
}

function effects(room, card) {
  if (card.value === "reverse") {
    room.direction *= -1;
  }

  if (card.value === "skip") {
    next(room);
  }

  if (card.value === "draw2") {
    const index =
      (room.turn +
        room.direction +
        room.players.length) %
      room.players.length;

    draw(room, room.players[index], 2);
    next(room);
  }

  if (card.value === "draw4") {
    const index =
      (room.turn +
        room.direction +
        room.players.length) %
      room.players.length;

    draw(room, room.players[index], 4);
    next(room);
  }
}

function play(room, player, id) {
  if (!room.started) return;
  if (room.players[room.turn] !== player) return;
  if (room.awaitColor) return;

  const index = player.hand.findIndex(
    card => String(card.id) === String(id)
  );

  if (index === -1) return;

  const card = player.hand[index];

  if (!valid(card, room)) {
    return send(player, {
      type: "error",
      message: "هذه الورقة غير صالحة الآن"
    });
  }

  player.hand.splice(index, 1);

  if (room.discard) {
    room.used.push(room.discard);
  }

  room.discard = card;

  if (card.color === "wild") {
    room.color = null;
    room.awaitColor = true;
  } else {
    room.color = card.color;
    room.awaitColor = false;
  }

  if (player.hand.length === 0) {
    broadcast(room, {
      type: "error",
      message: "🏆 " + player.name + " فاز!"
    });

    room.started = false;
    update(room);
    return;
  }

  if (!room.awaitColor) {
    effects(room, card);
    next(room);
  }

  update(room);
}

function startGame(room) {
  room.deck = makeDeck();
  shuffle(room.deck);

  room.used = [];
  room.turn = 0;
  room.direction = 1;
  room.color = null;
  room.awaitColor = false;

  room.players.forEach(player => {
    player.hand = [];
  });

  for (let i = 0; i < 7; i++) {
    room.players.forEach(player => {
      draw(room, player);
    });
  }

  do {
    room.discard = room.deck.pop();
  } while (room.discard.color === "wild");

  room.color = room.discard.color;
  room.started = true;

  room.players.forEach(player => {
    send(player, {
      type: "started",
      state: publicState(room, player)
    });
  });
}

wss.on("connection", ws => {
  let player = null;
  let room = null;

  ws.send(JSON.stringify({
    type: "connected"
  }));

  ws.on("message", raw => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // إنشاء غرفة
    if (message.type === "create") {
      if (player) return;

      const code = createCode();

      room = {
        code,
        players: [],
        deck: [],
        used: [],
        discard: null,
        turn: 0,
        direction: 1,
        color: null,
        awaitColor: false,
        started: false
      };

      player = {
        id: crypto.randomUUID(),
        name: String(message.name || "لاعب")
          .trim()
          .slice(0, 18),
        hand: [],
        ws
      };

      room.players.push(player);
      rooms.set(code, room);

      send(player, roomInfo(room));
      return;
    }

    // الانضمام
    if (message.type === "join") {
      const code = String(message.room || "")
        .trim()
        .toUpperCase();

      room = rooms.get(code);

      if (!room) {
        return ws.send(JSON.stringify({
          type: "error",
          message: "الغرفة غير موجودة"
        }));
      }

      if (room.started) {
        return ws.send(JSON.stringify({
          type: "error",
          message: "اللعبة بدأت بالفعل"
        }));
      }

      if (room.players.length >= 4) {
        return ws.send(JSON.stringify({
          type: "error",
          message: "الغرفة ممتلئة"
        }));
      }

      player = {
        id: crypto.randomUUID(),
        name: String(message.name || "لاعب")
          .trim()
          .slice(0, 18),
        hand: [],
        ws
      };

      room.players.push(player);

      broadcastLobby(room);
      return;
    }

    if (!player || !room) {
      return ws.send(JSON.stringify({
        type: "error",
        message: "أنشئ غرفة أو انضم لغرفة أولًا"
      }));
    }

    // بدء اللعبة
    if (message.type === "start") {
      if (room.players[0] !== player) {
        return send(player, {
          type: "error",
          message: "فقط المضيف يستطيع بدء اللعبة"
        });
      }

      startGame(room);
      return;
    }

    // لعب ورقة
    if (message.type === "play") {
      play(room, player, message.id);
      return;
    }

    // سحب
    if (message.type === "draw") {
      if (!room.started) return;
      if (room.players[room.turn] !== player) return;
      if (room.awaitColor) return;

      draw(room, player);
      next(room);
      update(room);
      return;
    }

    // اختيار اللون
    if (message.type === "color") {
      if (!room.started) return;
      if (room.players[room.turn] !== player) return;
      if (!room.awaitColor) return;

      if (!COLORS.includes(message.color)) return;

      room.color = message.color;
      room.awaitColor = false;

      effects(room, room.discard);
      next(room);

      update(room);
      return;
    }

    // UNO
    if (message.type === "uno") {
      if (room.started && player.hand.length === 1) {
        broadcast(room, {
          type: "error",
          message: "🔥 " + player.name + " قال UNO!"
        });
      }

      return;
    }

    // الدردشة
    if (message.type === "chat") {
      if (!room.started) return;

      const text = String(message.text || "")
        .trim()
        .slice(0, 180);

      if (!text) return;

      broadcast(room, {
        type: "chat",
        name: player.name,
        text
      });
    }
  });

  ws.on("close", () => {
    if (!player || !room) return;

    room.players = room.players.filter(
      p => p !== player
    );

    if (room.players.length === 0) {
      rooms.delete(room.code);
      return;
    }

    if (room.turn >= room.players.length) {
      room.turn = 0;
    }

    if (room.started) {
      room.started = false;

      broadcast(room, {
        type: "error",
        message: "⚠️ خرج أحد اللاعبين وتم إيقاف المباراة."
      });
    }

    broadcastLobby(room);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("UNO Online running on port " + PORT);
});
