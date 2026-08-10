const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const WebSocket = require("ws");

const PORT = Number(process.env.PORT) || 10000;

const server = http.createServer((req, res) => {
  let urlPath = (req.url || "/").split("?")[0];

  if (urlPath === "/") {
    urlPath = "/index.html";
  }

  // منع الخروج من مجلد المشروع
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(__dirname, safePath);

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }

  const ext = path.extname(filePath).toLowerCase();

  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  };

  res.writeHead(200, {
    "Content-Type": types[ext] || "application/octet-stream"
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

  function add(color, value) {
    deck.push({
      id: id++,
      color,
      value
    });
  }

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

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
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
  if (!room) return;

  for (const player of room.players) {
    send(player, data);
  }
}

function makeRoomCode() {
  let code;

  do {
    code = Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase();
  } while (rooms.has(code));

  return code;
}

function lobby(room) {
  return {
    type: "room",
    room: room.code,
    host: room.players[0] ? room.players[0].id : null,
    players: room.players.map(player => ({
      id: player.id,
      name: player.name
    }))
  };
}

function broadcastLobby(room) {
  for (const player of room.players) {
    send(player, lobby(room));
  }
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

function pushState(room) {
  for (const player of room.players) {
    send(player, {
      type: "state",
      state: publicState(room, player)
    });
  }
}

function refill(room) {
  if (room.deck.length === 0 && room.used.length > 0) {
    room.deck = room.used;
    room.used = [];
    shuffle(room.deck);
  }
}

function drawCards(room, player, count = 1) {
  for (let i = 0; i < count; i++) {
    refill(room);

    if (room.deck.length > 0) {
      player.hand.push(room.deck.pop());
    }
  }
}

function nextTurn(room) {
  if (!room.players.length) return;

  room.turn =
    (room.turn + room.direction + room.players.length) %
    room.players.length;
}

function canPlay(card, room) {
  if (!room.discard) return true;

  return (
    card.color === "wild" ||
    card.color === room.color ||
    card.color === room.discard.color ||
    card.value === room.discard.value
  );
}

function applyCardEffect(room, card) {
  if (card.value === "reverse") {
    room.direction *= -1;
  }

  if (card.value === "skip") {
    nextTurn(room);
  }

  if (card.value === "draw2") {
    const targetIndex =
      (room.turn +
        room.direction +
        room.players.length) %
      room.players.length;

    drawCards(room, room.players[targetIndex], 2);
    nextTurn(room);
  }

  if (card.value === "draw4") {
    const targetIndex =
      (room.turn +
        room.direction +
        room.players.length) %
      room.players.length;

    drawCards(room, room.players[targetIndex], 4);
    nextTurn(room);
  }
}

function playCard(room, player, cardId) {
  if (!room.started) return;
  if (room.players[room.turn] !== player) return;
  if (room.awaitColor) return;

  const index = player.hand.findIndex(
    card => String(card.id) === String(cardId)
  );

  if (index === -1) return;

  const card = player.hand[index];

  if (!canPlay(card, room)) {
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
    pushState(room);
    return;
  }

  if (!room.awaitColor) {
    applyCardEffect(room, card);
    nextTurn(room);
  }

  pushState(room);
}

function startGame(room) {
  room.deck = makeDeck();
  shuffle(room.deck);

  room.used = [];
  room.turn = 0;
  room.direction = 1;
  room.color = null;
  room.awaitColor = false;
  room.started = true;

  for (const player of room.players) {
    player.hand = [];
  }

  // توزيع 7 أوراق لكل لاعب
  for (let i = 0; i < 7; i++) {
    for (const player of room.players) {
      drawCards(room, player, 1);
    }
  }

  // أول ورقة يجب ألا تكون Wild
  do {
    room.discard = room.deck.pop();
  } while (
    room.discard &&
    room.discard.color === "wild"
  );

  room.color = room.discard.color;

  for (const player of room.players) {
    send(player, {
      type: "started",
      state: publicState(room, player)
    });
  }
}

wss.on("connection", ws => {
  let player = null;
  let room = null;

  send(player, {
    type: "connected"
  });

  ws.on("message", raw => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    /*
      إنشاء غرفة
    */
    if (message.type === "create") {
      if (player) return;

      const roomCode = makeRoomCode();

      room = {
        code: roomCode,
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
      rooms.set(roomCode, room);

      send(player, lobby(room));
      return;
    }

    /*
      الانضمام لغرفة
    */
    if (message.type === "join") {
      const roomCode = String(
        message.room || ""
      )
        .trim()
        .toUpperCase();

      room = rooms.get(roomCode);

      if (!room) {
        return send(wsPlayer(ws), {
          type: "error",
          message: "الغرفة غير موجودة"
        });
      }

      if (room.started) {
        return send(wsPlayer(ws), {
          type: "error",
          message: "اللعبة بدأت بالفعل"
        });
      }

      if (room.players.length >= 4) {
        return send(wsPlayer(ws), {
          type: "error",
          message: "الغرفة ممتلئة"
        });
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
      return send(wsPlayer(ws), {
        type: "error",
        message: "أنشئ غرفة أو انضم إلى غرفة أولًا"
      });
    }

    /*
      بدء اللعبة
    */
    if (message.type === "start") {
      if (room.players[0] !== player) {
        return send(player, {
          type: "error",
          message: "فقط المضيف يستطيع بدء اللعبة"
        });
      }

      if (room.players.length < 1) {
        return;
      }

      startGame(room);
      return;
    }

    /*
      لعب ورقة
    */
    if (message.type === "play") {
      playCard(room, player, message.id);
      return;
    }

    /*
      سحب ورقة
    */
    if (message.type === "draw") {
      if (!room.started) return;
      if (room.players[room.turn] !== player) return;
      if (room.awaitColor) return;

      drawCards(room, player, 1);

      nextTurn(room);
      pushState(room);
      return;
    }

    /*
      اختيار اللون
    */
    if (message.type === "color") {
      if (!room.started) return;
      if (room.players[room.turn] !== player) return;
      if (!room.awaitColor) return;

      const color = String(message.color || "");

      if (!COLORS.includes(color)) {
        return;
      }

      room.color = color;
      room.awaitColor = false;

      applyCardEffect(room, room.discard);
      nextTurn(room);

      pushState(room);
      return;
    }

    /*
      UNO
    */
    if (message.type === "uno") {
      if (
        room.started &&
        player.hand.length === 1
      ) {
        broadcast(room, {
          type: "error",
          message:
            "🔥 " +
            player.name +
            " قال UNO!"
        });
      }

      return;
    }

    /*
      الدردشة
    */
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

      return;
    }
  });

  ws.on("close", () => {
    if (!player || !room) return;

    const index = room.players.indexOf(player);

    if (index !== -1) {
      room.players.splice(index, 1);
    }

    if (room.players.length === 0) {
      rooms.delete(room.code);
      return;
    }

    if (room.turn >= room.players.length) {
      room.turn = 0;
    }

    // إذا خرج اللاعب أثناء اللعب
    if (room.started) {
      room.started = false;

      broadcast(room, {
        type: "error",
        message:
          "⚠️ خرج أحد اللاعبين، وتم إيقاف المباراة."
      });
    }

    broadcastLobby(room);
  });
});

/*
  تحويل WebSocket إلى شكل player للإخطاء
*/
function wsPlayer(ws) {
  return {
    ws
  };
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    "UNO Online server running on port " + PORT
  );
});
