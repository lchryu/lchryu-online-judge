import { Router } from "express";
import { ProblemController } from "../controllers/ProblemController";
import { authenticate, authorizeAdmin } from "../middleware/auth";
import { submitRateLimiter } from "../middleware/rateLimiter";
import multer from "multer";

const upload = multer({ dest: "uploads/" });
const router = Router();

router.get("/", ProblemController.getAll);
router.get("/submissions", ProblemController.getAllSubmissions);
router.get("/submissions/:id", ProblemController.getSubmission);
router.get("/:id/submissions", ProblemController.getSubmissionsForProblem);
router.get("/:id", ProblemController.getOne);
router.post("/", authenticate, authorizeAdmin, upload.single("testCasesFile"), ProblemController.create);
router.put("/:id", authenticate, authorizeAdmin, upload.single("testCasesFile"), ProblemController.update);
router.delete("/:id", authenticate, authorizeAdmin, ProblemController.delete);
router.post("/:id/submit", submitRateLimiter, ProblemController.submit);

export default router;
