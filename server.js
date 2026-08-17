const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const rooms = new Map();

const COLORS = ["red", "yellow", "green", "blue"];
const SPECIAL = ["skip", "reverse", "draw2"];

function makeDeck() {
  const deck = [];
  let id = 1;

  const add = (color, value) => deck.push({ id: id++, color, value });

  for (const color of COLORS) {
    add(color, "0");

    for (let n = 1; n <= 9; n++) {
      add(color, String(n));
      add(color, String(n));
    }

    for (const s of SPECIAL) {
      add(color, s);
      add(color, s);
    }
  }

  for (let i = 0; i < 4; i++) {
    add("wild", "wild");
    add("wild", "draw4");
  }

  return deck;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function sendPlayer(p, data) {
  if (p) send(p.ws, data);
}

function broadcast(room, data) {
  room.players.forEach(p => sendPlayer(p, data));
}

function createCode() {
  let code;
  do {
    code = Math.random().toString(36).substring(2, 6).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function roomInfo(room) {
  return {
    type: "room",
    room: room.code,
    game: room.game,
    host: room.players[0]?.id || null,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name
    }))
  };
}

function lobby(room) {
  broadcast(room, roomInfo(room));
}

function next(room) {
  room.turn =
    (room.turn + room.direction + room.players.length) %
    room.players.length;
}

function draw(room, player, amount = 1) {
  for (let i = 0; i < amount; i++) {
    if (!room.deck.length && room.used.length) {
      room.deck = room.used;
      room.used = [];
      shuffle(room.deck);
    }

    if (room.deck.length) {
      player.hand.push(room.deck.pop());
    }
  }
}

function validCard(card, room) {
  if (!room.discard) return true;

  return (
    card.color === "wild" ||
    card.color === room.color ||
    card.color === room.discard.color ||
    card.value === room.discard.value
  );
}

function unoState(room, me) {
  return {
    room: room.code,
    game: "uno",
    me: me.id,
    turn: room.turn,
    color: room.color,
    awaitColor: room.awaitColor,
    discard: room.discard,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      hand: p.hand
    }))
  };
}

function sendUnoState(room) {
  room.players.forEach(p => {
    sendPlayer(p, {
      type: "state",
      state: unoState(room, p)
    });
  });
}

function unoEffects(room, card) {
  if (card.value === "reverse") room.direction *= -1;

  if (card.value === "skip") {
    next(room);
  }

  if (card.value === "draw2") {
    next(room);
    draw(room, room.players[room.turn], 2);
  }

  if (card.value === "draw4") {
    next(room);
    draw(room, room.players[room.turn], 4);
  }
}

function startUNO(room) {
  room.deck = makeDeck();
  shuffle(room.deck);
  room.used = [];
  room.turn = 0;
  room.direction = 1;
  room.color = null;
  room.awaitColor = false;

  room.players.forEach(p => p.hand = []);

  for (let i = 0; i < 7; i++) {
    room.players.forEach(p => draw(room, p));
  }

  do {
    room.discard = room.deck.pop();
  } while (room.discard.color === "wild");

  room.color = room.discard.color;
  room.started = true;

  room.players.forEach(p => {
    sendPlayer(p, {
      type: "started",
      state: unoState(room, p)
    });
  });
}

function playUNO(room, player, id) {
  if (!room.started) return;
  if (room.players[room.turn] !== player) return;
  if (room.awaitColor) return;

  const index = player.hand.findIndex(
    c => String(c.id) === String(id)
  );

  if (index < 0) return;

  const card = player.hand[index];

  if (!validCard(card, room)) {
    return sendPlayer(player, {
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
  }

  if (player.hand.length === 0) {
    broadcast(room, {
      type: "error",
      message: "🏆 " + player.name + " فاز في UNO!"
    });

    room.started = false;
    sendUnoState(room);
    return;
  }

  if (!room.awaitColor) {
    unoEffects(room, card);
    next(room);
  }

  sendUnoState(room);
}

function startXO(room) {
  room.started = true;
  room.xo = {
    board: Array(9).fill(""),
    turn: 0,
    winner: null,
    draw: false
  };

  broadcastGame(room);
}

function xoState(room) {
  return {
    game: "xo",
    room: room.code,
    board: room.xo.board,
    turn: room.xo.turn,
    winner: room.xo.winner,
    draw: room.xo.draw,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name
    }))
  };
}

function checkXO(board) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  for (const [a,b,c] of wins) {
    if (
      board[a] &&
      board[a] === board[b] &&
      board[a] === board[c]
    ) {
      return board[a];
    }
  }

  if (board.every(Boolean)) return "draw";
  return null;
}

function playXO(room, player, index) {
  if (!room.started) return;
  if (room.players.length < 2) return;
  if (room.players[room.xo.turn] !== player) return;
  if (room.xo.board[index]) return;
  if (room.xo.winner) return;

  const symbol = room.xo.turn === 0 ? "X" : "O";
  room.xo.board[index] = symbol;

  const result = checkXO(room.xo.board);

  if (result === "X" || result === "O") {
    room.xo.winner = result;
    broadcastGame(room);
    return;
  }

  if (result === "draw") {
    room.xo.draw = true;
    broadcastGame(room);
    return;
  }

  room.xo.turn = room.xo.turn === 0 ? 1 : 0;
  broadcastGame(room);
}

function startBowling(room) {
  room.started = true;
  room.bowling = {
    turn: 0,
    frame: 1,
    rolls: room.players.map(() => []),
    scores: room.players.map(() => 0)
  };

  broadcastGame(room);
}

function bowlingState(room) {
  return {
    game: "bowling",
    room: room.code,
    turn: room.bowling.turn,
    frame: room.bowling.frame,
    scores: room.bowling.scores,
    rolls: room.bowling.rolls,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name
    }))
  };
}

function playBowling(room, player, power) {
  if (!room.started || !room.bowling) return;
  if (room.players[room.bowling.turn] !== player) return;

  const pins = Math.max(
    0,
    Math.min(
      10,
      Math.floor(Number(power) || 0)
    )
  );

  const rolls = room.bowling.rolls[room.bowling.turn];

  rolls.push(pins);

  room.bowling.scores[room.bowling.turn] += pins;

  if (
    rolls.length >= 2 ||
    pins === 10
  ) {
    room.bowling.turn++;

    if (room.bowling.turn >= room.players.length) {
      room.bowling.turn = 0;
      room.bowling.frame++;

      if (room.bowling.frame > 10) {
        const best = Math.max(...room.bowling.scores);
        const winner =
          room.players[room.bowling.scores.indexOf(best)];

        broadcast(room, {
          type: "error",
          message:
            "🏆 فاز " +
            winner.name +
            " في البولنق!"
        });

        room.started = false;
      }
    }
  }

  broadcastGame(room);
}

function startBilliards(room) {
  room.started = true;

  room.billiards = {
    turn: 0,
    scores: room.players.map(() => 0),
    balls: [
      { id: 1, x: 50, y: 50, color: "white" },
      { id: 2, x: 65, y: 45, color: "red" },
      { id: 3, x: 68, y: 50, color: "yellow" },
      { id: 4, x: 65, y: 55, color: "blue" },
      { id: 5, x: 71, y: 47, color: "green" },
      { id: 6, x: 71, y: 53, color: "purple" }
    ]
  };

  broadcastGame(room);
}

function billiardsState(room) {
  return {
    game: "billiards",
    room: room.code,
    turn: room.billiards.turn,
    scores: room.billiards.scores,
    balls: room.billiards.balls,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name
    }))
  };
}

function playBilliards(room, player, data) {
  if (!room.started || !room.billiards) return;
  if (room.players[room.billiards.turn] !== player) return;

  const ball = room.billiards.balls.find(
    b => b.id === 1
  );

  if (!ball) return;

  ball.x = Math.max(
    5,
    Math.min(95, Number(data.x) || 50)
  );

  ball.y = Math.max(
    8,
    Math.min(92, Number(data.y) || 50)
  );

  room.billiards.scores[room.billiards.turn]++;

  room.billiards.turn =
    room.billiards.turn === 0 ? 1 : 0;

  broadcastGame(room);
}

function broadcastGame(room) {
  if (!room) return;

  let state;

  if (room.game === "xo") {
    state = xoState(room);
  }

  if (room.game === "bowling") {
    state = bowlingState(room);
  }

  if (room.game === "billiards") {
    state = billiardsState(room);
  }

  if (!state) return;

  broadcast(room, {
    type: "gameState",
    state
  });
}

const server = http.createServer((req, res) => {
  let url = (req.url || "/").split("?")[0];

  if (url === "/") {
    url = "/index.html";
  }

  const safe = path
    .normalize(url)
    .replace(/^(\.\.[/\\])+/, "");

  const filePath = path.join(__dirname, safe);

  if (
    !fs.existsSync(filePath) ||
    !fs.statSync(filePath).isFile()
  ) {
    res.writeHead(404, {
      "Content-Type":
        "text/plain; charset=utf-8"
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
    "Content-Type":
      mime[ext] ||
      "application/octet-stream"
  });

  fs.createReadStream(filePath).pipe(res);
});

const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
  let player = null;
  let room = null;

  send(ws, {
    type: "connected"
  });

  ws.on("message", raw => {
    let m;

    try {
      m = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (m.type === "create") {
      if (player) return;

      const code = createCode();

      room = {
        code,
        game: m.game || "uno",
        players: [],
        started: false,
        deck: [],
        used: [],
        discard: null,
        turn: 0,
        direction: 1,
        color: null,
        awaitColor: false
      };

      player = {
        id: crypto.randomUUID(),
        name:
          String(m.name || "لاعب")
            .trim()
            .slice(0, 18),
        hand: [],
        ws
      };

      room.players.push(player);
      rooms.set(code, room);

      sendPlayer(player, roomInfo(room));
      return;
    }

    if (m.type === "join") {
      const code =
        String(m.room || "")
          .trim()
          .toUpperCase();

      room = rooms.get(code);

      if (!room) {
        return send(ws, {
          type: "error",
          message: "الغرفة غير موجودة"
        });
      }

      if (room.started) {
        return send(ws, {
          type: "error",
          message: "اللعبة بدأت بالفعل"
        });
      }

      if (room.players.length >= 4) {
        return send(ws, {
          type: "error",
          message: "الغرفة ممتلئة"
        });
      }

      if (
        m.game &&
        m.game !== room.game
      ) {
        return send(ws, {
          type: "error",
          message: "هذه الغرفة للعبة أخرى"
        });
      }

      player = {
        id: crypto.randomUUID(),
        name:
          String(m.name || "لاعب")
            .trim()
            .slice(0, 18),
        hand: [],
        ws
      };

      room.players.push(player);

      lobby(room);
      return;
    }

    if (!player || !room) {
      return send(ws, {
        type: "error",
        message:
          "أنشئ غرفة أو انضم لغرفة أولًا"
      });
    }

    if (m.type === "start") {
      if (room.players[0] !== player) {
        return sendPlayer(player, {
          type: "error",
          message:
            "فقط المضيف يستطيع بدء اللعبة"
        });
      }

      if (room.game === "uno") {
        startUNO(room);
      } else if (room.game === "xo") {
        if (room.players.length < 2) {
          return sendPlayer(player, {
            type: "error",
            message:
              "XO تحتاج لاعبين على الأقل"
          });
        }

        startXO(room);
      } else if (room.game === "bowling") {
        startBowling(room);
      } else if (room.game === "billiards") {
        if (room.players.length < 2) {
          return sendPlayer(player, {
            type: "error",
            message:
              "البلياردو تحتاج لاعبين"
          });
        }

        startBilliards(room);
      }

      return;
    }

    if (room.game === "uno") {
      if (m.type === "play") {
        playUNO(room, player, m.id);
      }

      if (m.type === "draw") {
        if (
          room.started &&
          room.players[room.turn] === player &&
          !room.awaitColor
        ) {
          draw(room, player);
          next(room);
          sendUnoState(room);
        }
      }

      if (m.type === "color") {
        if (
          room.started &&
          room.players[room.turn] === player &&
          room.awaitColor &&
          COLORS.includes(m.color)
        ) {
          room.color = m.color;
          room.awaitColor = false;

          unoEffects(
            room,
            room.discard
          );

          next(room);
          sendUnoState(room);
        }
      }

      if (m.type === "uno") {
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
      }
    }

    if (room.game === "xo") {
      if (m.type === "xoMove") {
        playXO(
          room,
          player,
          Number(m.index)
        );
      }

      if (m.type === "xoRestart") {
        if (room.players[0] === player) {
          startXO(room);
        }
      }
    }

    if (room.game === "bowling") {
      if (m.type === "bowl") {
        playBowling(
          room,
          player,
          Number(m.power)
        );
      }

      if (m.type === "bowlingRestart") {
        if (room.players[0] === player) {
          startBowling(room);
        }
      }
    }

    if (room.game === "billiards") {
      if (m.type === "shoot") {
        playBilliards(
          room,
          player,
          m
        );
      }

      if (m.type === "billiardsRestart") {
        if (room.players[0] === player) {
          startBilliards(room);
        }
      }
    }

    if (m.type === "chat") {
      const text =
        String(m.text || "")
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

    room.players =
      room.players.filter(
        p => p !== player
      );

    if (!room.players.length) {
      rooms.delete(room.code);
      return;
    }

    room.started = false;

    broadcast(room, {
      type: "error",
      message:
        "⚠️ خرج لاعب من الغرفة."
    });

    lobby(room);
  });
});

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "UNO Online running on port " +
      PORT
    );
  }
);
