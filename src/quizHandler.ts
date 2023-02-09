import { Server } from "socket.io";
import { QuizSocket } from "./interfaces/QuizSocket";
import { Quiz, Team } from "./types";
import { generateQR, getCurrentQuiz } from "./utils";

const quizes: Quiz[] = [];

export const createQuiz = (socket: QuizSocket, quiz: Quiz) => {
  quiz.teams = [];
  quiz.started = false;
  socket.join(quiz.id);
  quizes.push(quiz);
  console.info(`Quiz "${quiz.name}" with ID ${quiz.id} has been created`);
  console.table(quizes);
};

export const displayQuiz = async (
  io: Server,
  socket: QuizSocket,
  quizID: string,
  URL: string
) => {
  const quizQRCode = await generateQR(URL);
  socket.join(quizID);
  io.in(quizID).emit("quiz-infos", getCurrentQuiz(quizes, quizID), quizQRCode);
};

export const checkQuiz = (
  io: Server,
  socket: QuizSocket,
  quizID: string,
  fromDisplay: boolean
) => {
  socket.join(quizID);

  if (!quizes.length) io.in(quizID).emit("check-quiz");
  else {
    const quizExists = getCurrentQuiz(quizes, quizID);
    if (quizExists) io.in(quizID).emit("check-quiz", quizExists, fromDisplay);
    else io.in(quizID).emit("check-quiz");
  }
};

export const startQuiz = (io: Server, quizID: string) => {
  const quizToStart = quizes.filter((quiz) => quiz.id === quizID)[0];
  if (quizToStart) {
    io.to(quizID).emit("quiz-started");
    console.log(`Quiz ${quizToStart.name} has started.`);
  }
};

export const addTeam = (
  io: Server,
  socket: QuizSocket,
  quizID: string,
  team: Team,
  role: string
) => {
  socket.quizID = quizID;
  socket.teamName = team.name;
  const currentQuiz = quizes.filter((quiz) => quiz.id === quizID)[0];
  currentQuiz.teams.push(team);
  if (role === "user") socket.join(quizID);
  io.to(quizID).emit("team-added", currentQuiz.teams);
  console.log(`Team ${team.name} has entered quiz ${currentQuiz.name}`);
};

export const showCode = (io: Server, quizID: string) =>
  io.to(quizID).emit("show-code");

export const toggleBuzz = (io: Server, quizID: string, disableBuzz: boolean) =>
  io.to(quizID).emit("toggle-buzz", disableBuzz);

export const buzz = (io: Server, teamID: string, quizID: string) => {
  const buzzingTeams: Team[] = [];
  const winningTeam = getCurrentQuiz(quizes, quizID).teams.filter(
    (team) => team.id === teamID
  )[0];
  winningTeam.active = true;
  buzzingTeams.push(winningTeam);
  io.in(quizID).emit("buzz-win", buzzingTeams[0]);
  console.log(`l'équipe ${buzzingTeams[0].name} a buzzé sur le quiz ${quizID}`);
};

export const razBuzz = (io: Server, quizID: string) => {
  getCurrentQuiz(quizes, quizID).teams.forEach((team) => team.active = false);
  io.in(quizID).emit("raz-buzz");
}

export const addPoint = (io: Server, quizID: string, teamName: string) => {
  const currentQuiz = getCurrentQuiz(quizes, quizID);
  const team = currentQuiz.teams.filter((team) => team.name === teamName)[0];
  team.score += 1;
  io.in(quizID).emit("add-point", currentQuiz.teams);
  console.log(`L'équipe ${team.name} marque un point !`);
};

export const removePoint = (io: Server, quizID: string, teamName: string) => {
  const currentQuiz = getCurrentQuiz(quizes, quizID);
  const team = currentQuiz.teams.filter((team) => team.name === teamName)[0];
  team.score -= 1;
  io.in(quizID).emit("remove-point", currentQuiz.teams);
};

export const win = (io: Server, quizID: string) => io.in(quizID).emit("win");

export const lose = (io: Server, quizID: string) => io.in(quizID).emit("lose");

export const raz = (io: Server, quizID: string) => {
  quizes.splice(quizes.indexOf(getCurrentQuiz(quizes, quizID)), 1);
  io.in(quizID).disconnectSockets();
  console.log(`Le quiz ${quizID} a été supprimé`);
};

export const disconnect = (io: Server, socket: QuizSocket) => {
  if (socket.quizID && socket.teamName) {
    console.log(`team ${socket.teamName} has been disconnected`);
    const currentQuiz = getCurrentQuiz(quizes, socket.quizID);
    if (currentQuiz) {
      currentQuiz.teams.splice(
        currentQuiz.teams.indexOf(
          currentQuiz.teams.filter((team) => team.name === socket.teamName)[0]
        ),
        1
      );
    }
    io.to(socket.quizID).emit("remove-team", socket.teamName);
  }
};
