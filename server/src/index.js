const { WebSocketServer } = require("ws");
const { execFile } = require("node:child_process");
const { randomInt } = require("node:crypto");
const os = require("node:os");

const PORT = 8080;
const PIN = String(randomInt(100000, 1000000));

let pendingX = 0;
let pendingY = 0;
let movementRunning = false;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function runYdotool(args) {
  execFile("ydotool", args, (error) => {
    if (error) {
      console.error("ydotool error:", error.message);
    }
  });
}

function flushMovement() {
  if (movementRunning || (pendingX === 0 && pendingY === 0)) {
    return;
  }

  const dx = clamp(Math.trunc(pendingX), -200, 200);
  const dy = clamp(Math.trunc(pendingY), -200, 200);

  pendingX -= dx;
  pendingY -= dy;
  movementRunning = true;

  execFile(
    "ydotool",
    ["mousemove", "-x", String(dx), "-y", String(dy)],
    (error) => {
      movementRunning = false;

      if (error) {
        console.error("Mouse movement failed:", error.message);
      }
    }
  );
}

setInterval(flushMovement, 16);

const server = new WebSocketServer({
  host: "0.0.0.0",
  port: PORT,
});

server.on("connection", (socket, request) => {
  const requestUrl = new URL(
    request.url,
    `http://${request.headers.host}`
  );

  if (requestUrl.searchParams.get("pin") !== PIN) {
    socket.close(1008, "Incorrect PIN");
    return;
  }

  console.log("Phone connected");

  socket.send(
    JSON.stringify({
      type: "connected",
      message: "Laptop connected",
    })
  );

  socket.on("message", (rawMessage) => {
    try {
      const message = JSON.parse(rawMessage.toString());

      if (message.type === "move") {
        const dx = Number(message.dx);
        const dy = Number(message.dy);

        if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
          return;
        }

        pendingX = clamp(pendingX + dx, -1000, 1000);
        pendingY = clamp(pendingY + dy, -1000, 1000);
      }

      if (message.type === "leftClick") {
        runYdotool(["click", "0xC0"]);
      }

      if (message.type === "rightClick") {
        runYdotool(["click", "0xC1"]);
      }
    } catch {
      console.log("Ignored invalid message");
    }
  });

  socket.on("close", () => {
    console.log("Phone disconnected");
  });
});

console.log("\nWireless Trackpad Server");
console.log(`Port: ${PORT}`);
console.log(`PIN: ${PIN}`);
console.log("\nLaptop addresses:");

for (const addresses of Object.values(os.networkInterfaces())) {
  for (const address of addresses ?? []) {
    if (address.family === "IPv4" && !address.internal) {
      console.log(`ws://${address.address}:${PORT}?pin=${PIN}`);
    }
  }
}