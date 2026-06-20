import { DataSource } from "typeorm";
import { Problem } from "./entities/Problem";
import { Submission } from "./entities/Submission";
import { User } from "./entities/User";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USER || "user",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "onlinejudge",
  synchronize: true,
  logging: false,
  entities: [Problem, Submission, User],
});
