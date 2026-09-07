const { WebSocketServer } = require("ws");
const { spawn } = require("node:child_process");
const { randomInt } = require("node:crypto");
const path = require("node:path");
const os = require("node:os");

const PORT = 8080;
const PIN = String(randomInt(100000, 1000000));

const allowedMessages = new Set([
  "move",
  "leftClick",
  "rightClick",
  "middleClick",
  "leftDown",
  "leftUp",
  "scroll",
  "zoom",
  "overview",
  "applications",
  "exitOverview",
  "workspaceLeft",
  "workspaceRight",
  "volumeUp",
  "volumeDown",
  "previousMedia",
  "nextMedia",
  "releaseAll",
]);

const workerPath = path.join(
  __dirname,
  "mouse_worker.py"
);

const mouseWorker = spawn(
  "python3",
  ["-u", workerPath],
  {
    stdio: ["pipe", "pipe", "inherit"],
  }
);

let workerReady = false;

mouseWorker.stdout.on("data", (data) => {
  const output = data.toString().trim();

  if (output) {
    console.log(output);
  }

  if (output.includes("Mouse worker ready")) {
    workerReady = true;
  }
});

mouseWorker.on("error", (error) => {
  console.error(
    "Failed to start mouse worker:",
    error.message
  );
});

mouseWorker.on("exit", (code) => {
  workerReady = false;
  console.error(`Mouse worker stopped with code ${code}`);
});

function sendToMouse(message) {
  if (!workerReady || !mouseWorker.stdin.writable) {
    return;
  }

  mouseWorker.stdin.write(
    `${JSON.stringify(message)}\n`
  );
}

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
      const message = JSON.parse(
        rawMessage.toString()
      );

      if (
        typeof message !== "object" ||
        message === null ||
        !allowedMessages.has(message.type)
      ) {
        return;
      }

      sendToMouse(message);
    } catch {
      console.log("Ignored invalid message");
    }
  });

  socket.on("close", () => {
    sendToMouse({ type: "releaseAll" });
    console.log("Phone disconnected");
  });
});

server.on("listening", () => {
  console.log("\nWireless Trackpad Server");
  console.log(`Port: ${PORT}`);
  console.log(`PIN: ${PIN}`);
  console.log("\nLaptop addresses:");

  for (const addresses of Object.values(
    os.networkInterfaces()
  )) {
    for (const address of addresses ?? []) {
      if (
        address.family === "IPv4" &&
        !address.internal
      ) {
        console.log(
          `ws://${address.address}:${PORT}?pin=${PIN}`
        );
      }
    }
  }
});

process.on("SIGINT", () => {
  sendToMouse({ type: "releaseAll" });
  mouseWorker.kill();
  server.close(() => process.exit(0));
});