import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Problem } from "../entities/Problem";
import { Submission } from "../entities/Submission";
import { JudgeService } from "../services/JudgeService";
import { judgeQueue } from "../queues/judgeQueue";
import AdmZip from "adm-zip";
import fs from "fs";

type TestCase = {
  input: string;
  output: string;
};

const getParamId = (id: string | string[] | undefined) => {
  const value = Array.isArray(id) ? id[0] : id;
  const parsed = Number.parseInt(value || "", 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const readTestCasesFromZip = (filePath: string) => {
  const zip = new AdmZip(filePath);
  const zipEntries = zip.getEntries();
  const extractedTestCases: TestCase[] = [];
  const inFiles = zipEntries
    .filter((entry) => entry.entryName.endsWith(".in"))
    .sort((a, b) => a.entryName.localeCompare(b.entryName));

  inFiles.forEach((inFile) => {
    const baseName = inFile.entryName.replace(/\.in$/, "");
    const outFile = zipEntries.find((entry) => entry.entryName === `${baseName}.out`);
    if (outFile) {
      extractedTestCases.push({
        input: inFile.getData().toString("utf8"),
        output: outFile.getData().toString("utf8"),
      });
    }
  });

  return extractedTestCases;
};

const removeUploadedFile = (filePath: string) => {
  fs.unlink(filePath, (error) => {
    if (error) console.error("Failed to remove uploaded file:", error);
  });
};

const parseJsonArray = <T>(value: string | null | undefined): T[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const serializeSubmission = (submission: Submission) => ({
  id: submission.id,
  status: submission.status,
  time: submission.time,
  memory: submission.memory,
  stdout: submission.stdout,
  stderr: submission.stderr,
  compileOutput: submission.compileOutput,
  testResults: parseJsonArray(submission.testResults),
  createdAt: submission.createdAt,
  languageId: submission.languageId,
  code: submission.code,
  problem: submission.problem ? {
    id: submission.problem.id,
    title: submission.problem.title,
  } : undefined,
});

const createQueuedResults = (testCases: TestCase[]) =>
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

export class ProblemController {
  static async getAll(req: Request, res: Response) {
    const problems = await AppDataSource.getRepository(Problem).find({
      order: { id: "ASC" },
    });
    res.json(problems);
  }

  static async getOne(req: Request, res: Response) {
    const id = getParamId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid problem id" });

    const problem = await AppDataSource.getRepository(Problem).findOneBy({
      id,
    });
    if (!problem) return res.status(404).json({ message: "Problem not found" });
    res.json(problem);
  }

  static async create(req: Request, res: Response) {
    try {
      const { title, description, timeLimit, memoryLimit } = req.body;
      let testCases = req.body.testCases;

      if (req.file) {
        const extractedTestCases = readTestCasesFromZip(req.file.path);

        if (extractedTestCases.length > 0) {
          testCases = JSON.stringify(extractedTestCases);
        } else {
          removeUploadedFile(req.file.path);
          return res.status(400).json({ message: "ZIP must contain matching .in and .out files" });
        }

        removeUploadedFile(req.file.path);
      }

      if (!testCases) {
        return res.status(400).json({ message: "Test cases are required" });
      }

      const problem = AppDataSource.getRepository(Problem).create({
        title,
        description,
        timeLimit: parseFloat(timeLimit),
        memoryLimit: parseFloat(memoryLimit),
        testCases,
      });

      const results = await AppDataSource.getRepository(Problem).save(problem);
      res.json(results);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error creating problem" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = getParamId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid problem id" });

      const problemRepository = AppDataSource.getRepository(Problem);
      const problem = await problemRepository.findOneBy({ id });
      
      if (!problem) return res.status(404).json({ message: "Problem not found" });

      const { title, description, timeLimit, memoryLimit } = req.body;
      let testCases = req.body.testCases;

      if (req.file) {
        const extractedTestCases = readTestCasesFromZip(req.file.path);
        if (extractedTestCases.length > 0) {
          testCases = JSON.stringify(extractedTestCases);
        } else {
          removeUploadedFile(req.file.path);
          return res.status(400).json({ message: "ZIP must contain matching .in and .out files" });
        }

        removeUploadedFile(req.file.path);
      }
      
      if (title) problem.title = title;
      if (description) problem.description = description;
      if (timeLimit) problem.timeLimit = parseFloat(timeLimit);
      if (memoryLimit) problem.memoryLimit = parseFloat(memoryLimit);
      if (testCases) problem.testCases = testCases;

      const updatedProblem = await problemRepository.save(problem);
      res.json(updatedProblem);
    } catch (error) {
      res.status(500).json({ message: "Error updating problem" });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = getParamId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid problem id" });

      const result = await AppDataSource.getRepository(Problem).delete(id);
      if (result.affected === 0) return res.status(404).json({ message: "Problem not found" });
      res.json({ message: "Problem deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting problem" });
    }
  }

  static async getSubmission(req: Request, res: Response) {
    const submissionId = getParamId(req.params.id);
    if (!submissionId) return res.status(400).json({ message: "Invalid submission id" });

    const submission = await AppDataSource.getRepository(Submission).findOne({
      where: { id: submissionId },
      relations: ["problem"],
    });
    if (!submission) return res.status(404).json({ message: "Submission not found" });

    res.json(serializeSubmission(submission));
  }

  static async getAllSubmissions(req: Request, res: Response) {
    try {
      const submissions = await AppDataSource.getRepository(Submission).find({
        relations: ["problem"],
        order: { createdAt: "DESC" },
        take: 50,
      });
      res.json(submissions.map(serializeSubmission));
    } catch (error) {
      console.error("Error in getAllSubmissions:", error);
      res.status(500).json({ message: "Error retrieving submissions" });
    }
  }

  static async getSubmissionsForProblem(req: Request, res: Response) {
    const problemId = getParamId(req.params.id);
    if (!problemId) return res.status(400).json({ message: "Invalid problem id" });

    const problem = await AppDataSource.getRepository(Problem).findOneBy({ id: problemId });
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const submissions = await AppDataSource.getRepository(Submission).find({
      where: { problem: { id: problemId } },
      order: { createdAt: "DESC" },
      take: 20,
    });

    res.json(submissions.map(serializeSubmission));
  }

  static async submit(req: Request, res: Response) {
    const { code, languageId } = req.body;
    const problemId = getParamId(req.params.id);
    if (!problemId) return res.status(400).json({ message: "Invalid problem id" });

    const problem = await AppDataSource.getRepository(Problem).findOneBy({
      id: problemId,
    });
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const testCases = parseJsonArray<TestCase>(problem.testCases);
    const submission = AppDataSource.getRepository(Submission).create({
      code,
      languageId,
      problem,
      status: "Pending",
      testResults: JSON.stringify(createQueuedResults(testCases)),
    });

    await AppDataSource.getRepository(Submission).save(submission);

    await judgeQueue.add("judge-job", {
      submissionId: submission.id,
      problemId: problem.id,
    });

    res.status(202).json(serializeSubmission(submission));
  }
}