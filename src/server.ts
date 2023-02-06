import express from "express";
import http from "http";
import "dotenv/config";
import { Server } from "socket.io";
import QRCode from "qrcode";
import { QuizSocket } from "./interfaces/QuizSocket";
import { Quiz, Team } from "./types";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ORIGIN,
    methods: ["GET", "POST"],
  },
});
const port = process.env.PORT || 8080;
const quizes: Quiz[] = [];

/**
 * 
 * @param {*} text 
 * @returns 
 */
const generateQR = async (text: string) => {
  try {
    return await QRCode.toDataURL(text, {
      width: 500,
      color: {
        dark: "#eb213a",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error(err);
  }
};

io.on("connect", (socket: QuizSocket) => {
  socket.on("create", (quiz: Quiz) => {
    const quizID = quiz.id;
    const quizName = quiz.name;

    quiz.teams = [];
    quiz.started = false;
    socket.join(quizID);
    quizes.push(quiz);
    console.info(`Quiz "${quizName}" with ID ${quizID} has been created`);
    console.table(quizes);
  });

  socket.on("display-quiz", async (quizID: string, URL: string) => {
    const quizCode = await generateQR(URL);
    socket.join(quizID);
    quizes.find((quiz) => {
      if (quiz.id === quizID) {
        io.in(quizID).emit("quiz-infos", quiz, quizCode);
      }
    });
  });

  socket.on("check-quiz", (quizID: string) => {
    socket.join(quizID);

    if (!quizes.length) io.in(quizID).emit("check-quiz");
    else {
      const quizExists = quizes.filter((quiz) => quiz.id === quizID);
      if (quizExists.length) io.in(quizID).emit("check-quiz", quizExists[0]);
      else io.in(quizID).emit("check-quiz");
    }
  });

  socket.on("start-quiz", (quizID: string, quizName: string) => {
    console.log(`Quiz "${quizName}" has started`);
    quizes.find((quiz) => {
      if (quiz.id === quizID) quiz.started = true;
    });
    console.table(quizes);
    io.to(quizID).emit("quiz-started");
  });

  socket.on("add-team", (quizID, team: Team, role) => {
    socket.quizID = quizID;
    socket.teamName = team.name;
    quizes.find((quiz) => {
      if (quiz.id === quizID) {
        quiz.teams.push(team);
        if (role === "user") socket.join(quizID);
        io.to(quizID).emit("team-added", quiz.teams);
        console.log(`Team ${team.name} has entered quiz ${quiz.name}`);
      }
    });
  });

  socket.on("show-code", (quizID: string) => {
    quizes.find((quiz) => {
      if (quiz.id === quizID) {
        io.to(quizID).emit("show-code");
      }
    });
  });

  socket.on("toggle-buzz", (quizID: string, showBuzz: boolean) =>
    io.to(quizID).emit("toggle-buzz", showBuzz)
  );

  socket.on("buzz", (teamID: string, quizID: string) => {
    const firstTeams: Team[] = [];
    const currentQuiz = quizes.filter((quiz) => quiz.id === quizID);
    const winningTeam = currentQuiz[0].teams.filter((team) => team.id === teamID);

    firstTeams.push(winningTeam[0]);
    io.in(quizID).emit("buzz-win", firstTeams[0]);
    console.log(`l'équipe ${firstTeams[0].name} a buzzé sur le quiz ${quizID}`);
  });

  socket.on("raz-buzz", (quizID: string) => io.in(quizID).emit("raz-buzz"));

  socket.on("add-point", (quizID: string, teamName: string) => {
    quizes.find((quiz) => {
      if (quiz.id === quizID) {
        quiz.teams.find((team) => {
          if (team.name === teamName) {
            team.score += 1;
            io.in(quizID).emit("add-point", quiz.teams);
          }
        });
      }
    });
  });

  socket.on("remove-point", (quizID: string, teamName: string) => {
    quizes.find((quiz) => {
      if (quiz.id === quizID) {
        quiz.teams.find((team) => {
          if (team.name === teamName) {
            team.score -= 1;
            io.in(quizID).emit("remove-point", quiz.teams);
          }
        });
      }
    });
  });

  socket.on("win", (quizID: string) => io.in(quizID).emit("win"));

  socket.on("lose", (quizID: string) => io.in(quizID).emit("lose"));

  socket.on("raz", (quizID: string) => {
    console.table(quizes);
    let indexOfQuiz = -1;
    quizes.find((quiz) => {
      if (quiz.id === quizID) indexOfQuiz = quizes.indexOf(quiz);
    });
    quizes.splice(indexOfQuiz, 1);
    io.in(quizID).disconnectSockets();
    console.log(`Le quiz ${quizID} a été supprimé.`);
  });

  socket.on("disconnect", () => {
    if (socket.quizID && socket.teamName) {
      let disconnectedTeam: Team = {
        id: "",
        name: "",
        score: 0,
        active: false,
      };
      quizes.find((quiz) => {
        let teamIndex = -1;
        if (quiz.id === socket.quizID) {
          quiz.teams.find((team) => {
            if (team.name === socket.teamName) {
              teamIndex = quiz.teams.indexOf(team);
              disconnectedTeam = team;
            }
          });
        }
        quiz.teams.splice(teamIndex, 1);
      });
      io.to(socket.quizID).emit("remove-team", disconnectedTeam.name);
      console.log(`team ${disconnectedTeam.name} has been disconnected`);
    }
  });
});

server.listen(port, () => console.log(`Running server on port ${port}`));
