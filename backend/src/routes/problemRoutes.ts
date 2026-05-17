import { Router } from "express";
import { ProblemController } from "../controllers/ProblemController";
import { authenticate, authorizeAdmin } from "../middleware/auth";
import multer from "multer";

const upload = multer({ dest: "uploads/" });
const router = Router();

router.get("/", ProblemController.getAll);
router.get("/:id", ProblemController.getOne);
router.post("/", authenticate, authorizeAdmin, upload.single("testCasesFile"), ProblemController.create);
router.put("/:id", authenticate, authorizeAdmin, ProblemController.update);
router.delete("/:id", authenticate, authorizeAdmin, ProblemController.delete);
router.post("/:id/submit", ProblemController.submit);

export default router;
