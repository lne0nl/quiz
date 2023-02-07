import express from "express";
import http from "http";
import "dotenv/config";
import { Server } from "socket.io";
import { QuizSocket } from "./interfaces/QuizSocket";
import * as quizHandler from "./quizHandler";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ORIGIN,
    methods: ["GET", "POST"],
  },
});
const port = process.env.PORT || 8080;

io.on("connect", (socket: QuizSocket) => {
  socket.on("create", (quiz) => quizHandler.createQuiz(socket, quiz));

  socket.on("display-quiz", async (quizID, URL) =>
    quizHandler.displayQuiz(io, socket, quizID, URL)
  );

  socket.on("check-quiz", (quizID, fromDisplay) =>
    quizHandler.checkQuiz(io, socket, quizID, fromDisplay)
  );

  socket.on("start-quiz", (quizID) => quizHandler.startQuiz(io, quizID));

  socket.on("add-team", (quizID, team, role) =>
    quizHandler.addTeam(io, socket, quizID, team, role)
  );

  socket.on("show-code", (quizID: string) => quizHandler.showCode(io, quizID));

  socket.on("toggle-buzz", (quizID: string, disableBuzz: boolean) =>
    quizHandler.toggleBuzz(io, quizID, disableBuzz)
  );

  socket.on("buzz", (teamID: string, quizID: string) =>
    quizHandler.buzz(io, teamID, quizID)
  );

  socket.on("raz-buzz", (quizID: string) => quizHandler.razBuzz(io, quizID));

  socket.on("add-point", (quizID: string, teamName: string) =>
    quizHandler.addPoint(io, quizID, teamName)
  );

  socket.on("remove-point", (quizID: string, teamName: string) =>
    quizHandler.removePoint(io, quizID, teamName)
  );

  socket.on("win", (quizID: string) => quizHandler.win(io, quizID));

  socket.on("lose", (quizID: string) => quizHandler.lose(io, quizID));

  socket.on("raz", (quizID: string) => quizHandler.raz(io, quizID));

  socket.on("disconnect", () => quizHandler.disconnect(io, socket));
});

server.listen(port, () => console.log(`Running server on port ${port}`));
