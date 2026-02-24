import express from "express";
import http from "http";
import cors from "cors";
import db from "./config/db.config";
import "dotenv/config";

import AgentRoutes from "./routes/agen.routes";
import HttpStatus from "./utils/http-status";

const PORT: number = parseInt(process.env.PORT);

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(
  cors({
    origin: process.env.API_GATEWAY_URL,
    credentials: true,
  }),
);

app.get("/", (_, res) => {
  res.status(HttpStatus.OK).json({
    message: "🟢 Server is running...",
  });
});

app.use("/api/v1/agent", AgentRoutes);

server.listen(PORT, () => {
  console.log("🟢 Server is running...");
  if (db) {
    console.log("🟢 Database is healthy...");
  } else {
    console.log("🔴 Error with the Database...");
  }
});
