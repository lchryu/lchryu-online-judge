import axios from "axios";
import { Submission } from "../entities/Submission";
import { Problem } from "../entities/Problem";
import { AppDataSource } from "../data-source";

const JUDGE0_URL = process.env.JUDGE0_URL || "http://localhost:2358";

export class JudgeService {
  static async submitToJudge(submission: Submission, problem: Problem) {
    try {
      // For PoC, we assume simple single test case comparison
      // In a real system, we would loop through test cases or use a batch submission
      const testCases = JSON.parse(problem.testCases);
      const input = testCases[0].input;
      const expectedOutput = testCases[0].output;

      const response = await axios.post(`${JUDGE0_URL}/submissions?wait=true`, {
        source_code: submission.code,
        language_id: submission.languageId,
        stdin: input,
        expected_output: expectedOutput,
        cpu_time_limit: problem.timeLimit,
        memory_limit: problem.memoryLimit * 1024, // KB
      });

      const result = response.data;
      
      submission.status = result.status.description;
      submission.time = result.time;
      submission.memory = result.memory;
      submission.stdout = result.stdout;
      submission.stderr = result.stderr;
      submission.compileOutput = result.compile_output;

      await AppDataSource.getRepository(Submission).save(submission);
      return submission;
    } catch (error) {
      console.error("Judge0 Error:", error);
      submission.status = "Internal Error";
      await AppDataSource.getRepository(Submission).save(submission);
      throw error;
    }
  }
}
