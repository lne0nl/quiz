import QRCode from "qrcode";
import { Quiz } from "../types";

export const generateQR = async (URL: string) =>
  QRCode.toDataURL(URL, {
    width: 500,
    color: {
      dark: "#eb213a",
      light: "#ffffff",
  },
});

export const getCurrentQuiz = (quizes: Quiz[], quizID: string) =>
  quizes.filter((quiz) => quiz.id === quizID)[0];
