import { DataSource } from "typeorm";
import { Problem } from "./entities/Problem";
import { Submission } from "./entities/Submission";
import { User } from "./entities/User";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "database.sqlite",
  synchronize: true,
  logging: false,
  entities: [Problem, Submission, User],
});
