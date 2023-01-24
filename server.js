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
let teams = [];
let buzzes = [];
let title = "";

io.on("connect", (socket) => {
  const id = socket.id;
  console.log(`user ${id} connected`);

  io.emit("team-added", teams);
  if (title) io.emit("title", title);

  socket.on("add-team", (team) => {
    team.id = id;
    teams.push(team);
    io.emit("team-added", teams);
    console.log("New team added => ", teams);
  });

  socket.on("buzz", (teamName) => {
    if (!buzzes.includes(teamName)) buzzes.push(teamName);
    if (buzzes.length >= 1) io.emit("buzz-win", buzzes[0]);
    console.log(`l'équipe ${teamName} a buzzé !`)
  });

  socket.on("raz-buzz", () => {
    buzzes = [];
    io.emit("raz-buzz");
  });

  socket.on("add-point", (teamName) => {
    teams.find((o) => {
      if (o.name === teamName) o.score += 1;
    });
    io.emit("add-point", teamName);
  });

  socket.on("remove-point", (teamName) => {
    teams.find((o) => {
      if (o.name === teamName) o.score -= 1;
    });
    io.emit("remove-point", teamName);
  });

  socket.on("quiz-name", (quizName) => {
    title = quizName;
    io.emit("quiz-name", quizName);
  });

  socket.on("raz", () => {
    teams = [];
    title = "";
    buzzes = [];
    io.emit("raz");
  });
  
  socket.on("disconnect", () => {
    let disconnectedTeam = "";
    let teamIndex = -1;
    teams.find((o) => {
      if (o.id === id) {
        disconnectedTeam = o.name;
        teamIndex = teams.indexOf(o);
      }
    });
    console.log("disconnected team => ", disconnectedTeam);
    if (disconnectedTeam) {
      teams.splice(teamIndex, 1);
      io.emit("remove-team", disconnectedTeam);
      console.log(`team ${disconnectedTeam} has been disconnected`);
    }
  })
});

server.listen(port, () => console.log(`Running server on port ${port}`));
