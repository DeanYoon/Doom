import express from "express";
import { Server } from "socket.io";
import http from "http";
import { instrument } from "@socket.io/admin-ui";

const app = express();

const PORT = 3000;

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});

instrument(wsServer, {
  auth: false,
  mode: "development",
});

function publicRooms() {
  const { rooms, sids } = wsServer.sockets.adapter;

  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push({
        room: key,
        roomUsers: countRoom(key),
      });
    }
  });
  return publicRooms;
}

function countRoom(roomName) {
  return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", (socket) => {
  wsServer.sockets.emit("room_change", publicRooms());
  socket.onAny((event) => {
    console.log(`Socket Event: ${event}`);
  });
  socket.on("enter_room", (roomName, nickName, done) => {
    socket.join(roomName);
    done(countRoom(roomName));
    socket["nickname"] = nickName;
    socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
    wsServer.sockets.emit("room_change", publicRooms());
  });
  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) =>
      socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1)
    );
  });
  socket.on("disconnect", () => {
    wsServer.sockets.emit("room_change", publicRooms());
  });

  socket.on("new_message", (msg, room, done) => {
    socket.to(room).emit("new_message", `${socket.nickname} : ${msg}`);
    done();
  });
});

//const wss = new WebSocket.Server({ server });
//WebSockets
// const sockets = [];

// wss.on("connection", (socket) => {
//   sockets.push(socket);
//   socket["nickname"] = "Anon";
//   console.log("Connect to Browser ???");
//   socket.on("close", () => console.log("Disconnect from the Browser ???"));
//   socket.on("message", (msg) => {
//     const message = JSON.parse(msg);
//     switch (message.type) {
//       case "new_message":
//         sockets.forEach((aSocket) => {
//           aSocket.send(`${socket.nickname}: ${message.payload}`);
//         });
//         break;
//       case "nickname":
//         socket["nickname"] = message.payload;
//         break;
//     }
//   });
// });

const handleListen = () => console.log(`Listening on http://localhost:${PORT}`);
httpServer.listen(PORT, handleListen);
