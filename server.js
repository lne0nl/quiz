import express from "express";
import http from "http";
import "dotenv/config";
import { Server } from "socket.io";
import QRCode from "qrcode";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ORIGIN,
    methods: ["GET", "POST"],
  },
});

const generateQR = async (text) => {
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

const port = process.env.PORT || 8080;
const quizes = [];

io.on("connect", (socket) => {
  // Create quiz room with client admin page.
  socket.on("create", (quiz) => {
    const quizID = quiz.id;
    const quizName = quiz.name;
    quiz.teams = [];
    quiz.started = false;
    socket.join(quizID);
    quizes.push(quiz);
    console.info(`Quiz "${quizName}" with ID ${quizID} has been created`);
    console.table(quizes);
  });

  socket.on("display-quiz", async (quizID, URL) => {
    const quizCode = await generateQR(URL);
    socket.join(quizID);
    console.log(quizID);
    console.log(quizes);
    quizes.find((quiz) => {
      if (quiz.id === quizID) {
        io.in(quizID).emit("quiz-infos", quiz, quizCode);
      }
    });
  });

  socket.on("check-quiz", (quizID) => {
    socket.join(quizID);

    if (!quizes.length) io.in(quizID).emit("check-quiz");
    else {
      const quizExists = quizes.filter((quiz) => quiz.id === quizID);
      if (quizExists.length) io.in(quizID).emit("check-quiz", quizExists[0]);
      else io.in(quizID).emit("check-quiz");
    }
  });

  socket.on("start-quiz", (quizID, quizName) => {
    console.log(`Quiz "${quizName}" has started`);
    quizes.find((quiz) => {
      if (quiz.id === quizID) quiz.started = true;
    });
    console.table(quizes);
    io.to(quizID).emit("quiz-started");
  });

  socket.on("add-team", (quizID, team, role) => {
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

  socket.on("show-code", (quizID) => {
    quizes.find((quiz) => {
      if (quiz.id === quizID) {
        io.to(quizID).emit("show-code");
      }
    });
  });

  socket.on("toggle-buzz", (quizID, showBuzz) =>
    io.to(quizID).emit("toggle-buzz", showBuzz)
  );

  socket.on("buzz", (teamName, quizID) => {
    io.in(quizID).emit("buzz-win", teamName);
    console.log(`l'équipe ${teamName} a buzzé !`);
  });

  socket.on("raz-buzz", (quizID) => (io.in(quizID).emit("raz-buzz")));

  socket.on("add-point", (quizID, teamName) => {
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

  socket.on("remove-point", (quizID, teamName) => {
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

  socket.on("win", (quizID) => {
    io.in(quizID).emit("win");
  });

  socket.on("lose", (quizID) => {
    io.in(quizID).emit("lose");
  });

  socket.on("raz", (quizID) => {
    console.log("quizID => ", quizID);
    console.table(quizes);
    let indexOfQuiz = -1;
    quizes.find((quiz) => {
      console.log("quiz.id =>", quiz.id);
      if (quiz.id === quizID) {
        indexOfQuiz = quizes.indexOf(quiz);
        // quizes.splice(quizes.indexOf(quiz), 1);
      }
    });
    quizes.splice(indexOfQuiz, 1);
    io.in(quizID).disconnectSockets();
  });

  socket.on("disconnect", () => {
    if (socket.quizID && socket.teamName) {
      let disconnectedTeam = {};
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
