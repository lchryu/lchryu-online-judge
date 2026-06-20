import axios from "axios";
import { Submission } from "../entities/Submission";
import { Problem } from "../entities/Problem";
import { AppDataSource } from "../data-source";

const JUDGE0_URL = process.env.JUDGE0_URL || "http://localhost:2358";
const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 90;
const JUDGE0_BATCH_SIZE = 20;

type TestCase = {
  input: string;
  output: string;
};

export type TestRunResult = {
  index: number;
  status: string;
  time: number | null;
  memory: number | null;
  stdout: string;
  stderr: string;
  compileOutput: string;
  message: string;
};

type Judge0Result = {
  stdout: string | null;
  time: string | null;
  memory: number | null;
  stderr: string | null;
  token: string;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isFinished = (result: Judge0Result) => result.status.id > 2;

const chunkWithStart = <T>(items: T[], size: number) => {
  const chunks: Array<{ start: number; items: T[] }> = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push({ start: index, items: items.slice(index, index + size) });
  }
  return chunks;
};

const createInitialResults = (testCases: TestCase[]): TestRunResult[] =>
  testCases.map((_, index) => ({
    index: index + 1,
    status: "Queued",
    time: null,
    memory: null,
    stdout: "",
    stderr: "",
    compileOutput: "",
    message: "",
  }));

const saveProgress = async (submission: Submission, testResults: TestRunResult[], status = "Judging") => {
  submission.status = status;
  submission.testResults = JSON.stringify(testResults);
  await AppDataSource.getRepository(Submission).save(submission);
};

export class JudgeService {
  static async submitToJudge(submission: Submission, problem: Problem) {
    const testCases = JSON.parse(problem.testCases) as TestCase[];
    const testResults = createInitialResults(testCases);

    try {
      if (!Array.isArray(testCases) || testCases.length === 0) {
        throw new Error("Problem has no test cases");
      }

      await saveProgress(submission, testResults);

      for (const batch of chunkWithStart(testCases, JUDGE0_BATCH_SIZE)) {
        batch.items.forEach((_, offset) => {
          testResults[batch.start + offset].status = "Running";
        });
        await saveProgress(submission, testResults);

        const createResponse = await axios.post(
          `${JUDGE0_URL}/submissions/batch?base64_encoded=false`,
          {
            submissions: batch.items.map((testCase) => ({
              source_code: submission.code,
              language_id: submission.languageId,
              stdin: testCase.input,
              expected_output: testCase.output,
              cpu_time_limit: problem.timeLimit,
              memory_limit: problem.memoryLimit * 1024,
              enable_per_process_and_thread_time_limit: true,
              enable_per_process_and_thread_memory_limit: true,
            })),
          },
          { timeout: 15000 },
        );

        const tokens = (createResponse.data as Array<{ token: string }>).map((item) => item.token);
        if (tokens.length === 0) {
          throw new Error("Judge0 did not return submission tokens");
        }

        let batchResults: Judge0Result[] = [];
        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
          const resultResponse = await axios.get<{ submissions: Judge0Result[] }>(
            `${JUDGE0_URL}/submissions/batch`,
            {
              params: {
                tokens: tokens.join(","),
                base64_encoded: "false",
              },
              timeout: 15000,
            },
          );

          batchResults = resultResponse.data.submissions;
          if (batchResults.length === tokens.length && batchResults.every(isFinished)) break;
          await sleep(POLL_INTERVAL_MS);
        }

        if (batchResults.length !== tokens.length || batchResults.some((result) => !isFinished(result))) {
          batch.items.forEach((_, offset) => {
            const testResult = testResults[batch.start + offset];
            if (testResult.status === "Running") {
              testResult.status = "Processing Timeout";
              testResult.message = "Judge did not finish this test in time.";
            }
          });
          await saveProgress(submission, testResults, "Processing Timeout");
          return submission;
        }

        batchResults.forEach((result, offset) => {
          testResults[batch.start + offset] = {
            index: batch.start + offset + 1,
            status: result.status.description,
            time: Number.parseFloat(result.time || "0"),
            memory: Number(result.memory || 0),
            stdout: result.stdout || "",
            stderr: result.stderr || "",
            compileOutput: result.compile_output || "",
            message: result.message || "",
          };
        });
        await saveProgress(submission, testResults);
      }

      let totalTime = 0;
      let maxMemory = 0;
      const failedResult = testResults.find((result) => result.status !== "Accepted");

      for (const result of testResults) {
        totalTime += result.time || 0;
        maxMemory = Math.max(maxMemory, result.memory || 0);
      }

      const finalResult = failedResult || testResults[testResults.length - 1];
      submission.status = failedResult ? failedResult.status : "Accepted";
      submission.time = failedResult ? failedResult.time ?? 0 : totalTime;
      submission.memory = failedResult ? failedResult.memory ?? 0 : maxMemory;
      submission.stdout = finalResult.stdout;
      submission.stderr = finalResult.stderr || finalResult.message;
      submission.compileOutput = finalResult.compileOutput;
      submission.testResults = JSON.stringify(testResults);

      await AppDataSource.getRepository(Submission).save(submission);
      return submission;
    } catch (error) {
      console.error("Judge0 Error:", error);
      testResults.forEach((result) => {
        if (result.status === "Queued" || result.status === "Running") {
          result.status = "Internal Error";
          result.message = error instanceof Error ? error.message : "Judge error";
        }
      });
      submission.status = "Internal Error";
      submission.testResults = JSON.stringify(testResults);
      await AppDataSource.getRepository(Submission).save(submission);
      throw error;
    }
  }
}