 import express from "express";
import http from "http";
import "dotenv/config";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ORIGIN,
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 8080;
const teams = [];
const buzzes = [];

io.on("connect", (socket) => {
  console.log(`user ${socket.id} connected`);

  io.emit("team-added", teams);

  socket.on("add-team", (team) => {
    teams.push(team);
    io.emit("team-added", teams);
    console.log("New team added => ", teams);
  });

  socket.on("buzz", (teamName) => {
    if (!buzzes.includes(teamName)) buzzes.push(teamName);
    if (buzzes.length >= 1) io.emit("buzz-win", buzzes[0]);
    console.log(buzzes.length)

    console.log(`l'équipe ${teamName} a buzzé !`)
    console.log(buzzes)
  })
});

server.listen(port, () => console.log(`Running server on port ${port} with origin ${process.env.ORIGIN}`));
