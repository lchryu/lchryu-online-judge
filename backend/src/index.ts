import "reflect-metadata";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AppDataSource } from "./data-source";
import problemRoutes from "./routes/problemRoutes";
import authRoutes from "./routes/authRoutes";

import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

AppDataSource.initialize()
  .then(() => {
    console.log("Database connection established");
    
    app.use("/api/problems", problemRoutes);
    app.use("/api/auth", authRoutes);

    app.get("/", (req, res) => {
      res.send("Online Judge API is running!");
    });

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => console.log("Database connection error: ", error));
