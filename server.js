import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 8080;
app.use(cors({ origin: process.env.ORIGIN }));

app.listen(port, () => {
  console.log(`Running server on port ${port}`);
})