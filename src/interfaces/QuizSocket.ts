import { Socket } from "socket.io";

export interface QuizSocket extends Socket {
  name?: string;
  quizID?: string;
  teamName?: string;
}
