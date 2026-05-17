import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Problem } from "../entities/Problem";
import { Submission } from "../entities/Submission";
import { JudgeService } from "../services/JudgeService";
import AdmZip from "adm-zip";
import fs from "fs";

export class ProblemController {
  static async getAll(req: Request, res: Response) {
    const problems = await AppDataSource.getRepository(Problem).find();
    res.json(problems);
  }

  static async getOne(req: Request, res: Response) {
    const problem = await AppDataSource.getRepository(Problem).findOneBy({
      id: parseInt(req.params.id),
    });
    if (!problem) return res.status(404).json({ message: "Problem not found" });
    res.json(problem);
  }

  static async create(req: Request, res: Response) {
    try {
      const { title, description, timeLimit, memoryLimit } = req.body;
      let testCases = req.body.testCases;

      // Handle ZIP upload if present
      if (req.file) {
        const zip = new AdmZip(req.file.path);
        const zipEntries = zip.getEntries();
        const extractedTestCases: any[] = [];
        
        // Match .in and .out files
        const inFiles = zipEntries.filter(e => e.entryName.endsWith(".in"));
        inFiles.forEach(inFile => {
          const baseName = inFile.entryName.replace(".in", "");
          const outFile = zipEntries.find(e => e.entryName === baseName + ".out");
          if (outFile) {
            extractedTestCases.push({
              input: inFile.getData().toString("utf8"),
              output: outFile.getData().toString("utf8")
            });
          }
        });

        if (extractedTestCases.length > 0) {
          testCases = JSON.stringify(extractedTestCases);
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
      }

      const problem = AppDataSource.getRepository(Problem).create({
        title,
        description,
        timeLimit: parseFloat(timeLimit),
        memoryLimit: parseFloat(memoryLimit),
        testCases
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
      const id = parseInt(req.params.id);
      const problemRepository = AppDataSource.getRepository(Problem);
      let problem = await problemRepository.findOneBy({ id });
      
      if (!problem) return res.status(404).json({ message: "Problem not found" });

      const { title, description, timeLimit, memoryLimit, testCases } = req.body;
      
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
      const id = parseInt(req.params.id);
      const result = await AppDataSource.getRepository(Problem).delete(id);
      if (result.affected === 0) return res.status(404).json({ message: "Problem not found" });
      res.json({ message: "Problem deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting problem" });
    }
  }

  static async submit(req: Request, res: Response) {
    const { code, languageId } = req.body;
    const problemId = parseInt(req.params.id);

    const problem = await AppDataSource.getRepository(Problem).findOneBy({
      id: problemId,
    });
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const submission = AppDataSource.getRepository(Submission).create({
      code,
      languageId,
      problem,
      status: "Pending",
    });

    await AppDataSource.getRepository(Submission).save(submission);

    // Synchronous for PoC (using ?wait=true in service)
    try {
      const result = await JudgeService.submitToJudge(submission, problem);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Error processing submission" });
    }
  }
}
