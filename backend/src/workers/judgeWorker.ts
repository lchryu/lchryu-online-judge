import { Worker } from "bullmq";
import { AppDataSource } from "../data-source";
import { Submission } from "../entities/Submission";
import { Problem } from "../entities/Problem";
import { JudgeService } from "../services/JudgeService";

export const startJudgeWorker = () => {
  const worker = new Worker(
    "judge-queue",
    async (job) => {
      const { submissionId, problemId } = job.data;
      console.log(`Processing judge job for submission #${submissionId}`);
      
      const submissionRepo = AppDataSource.getRepository(Submission);
      const problemRepo = AppDataSource.getRepository(Problem);

      const submission = await submissionRepo.findOne({
        where: { id: submissionId },
        relations: ["problem"],
      });
      const problem = await problemRepo.findOne({
        where: { id: problemId },
      });

      if (!submission || !problem) {
        console.error(`Submission #${submissionId} or Problem #${problemId} not found`);
        return;
      }

      try {
        await JudgeService.submitToJudge(submission, problem);
        console.log(`Successfully completed judging for submission #${submissionId}`);
      } catch (error) {
        console.error(`Error judging submission #${submissionId}:`, error);
        throw error;
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
      },
      concurrency: 2,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed with error: ${err.message}`);
  });

  console.log("Judge worker started successfully");
};
