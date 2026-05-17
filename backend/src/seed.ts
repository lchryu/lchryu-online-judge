import { AppDataSource } from "./data-source";
import { Problem } from "./entities/Problem";
import { User } from "./entities/User";
import bcrypt from "bcrypt";

const seed = async () => {
  await AppDataSource.initialize();
  const problemRepository = AppDataSource.getRepository(Problem);
  const userRepository = AppDataSource.getRepository(User);

  // 1. Seed Admin Account
  const adminExists = await userRepository.findOneBy({ username: "admin" });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const admin = userRepository.create({
      username: "admin",
      email: "admin@vibejudge.com",
      password: hashedPassword,
      role: "admin",
    });
    await userRepository.save(admin);
    console.log("Seeded Admin User: admin / admin123");
  }

  // 2. Seed Problems
  const problems = [
    {
      title: "A + B Problem",
      description: "Viết chương trình nhập vào hai số nguyên A và B, in ra tổng của chúng.\n\nInput:\n- Một dòng duy nhất chứa hai số nguyên A và B cách nhau bởi dấu cách.\n\nOutput:\n- Tổng của A và B.\n\nVí dụ:\nInput: 5 10\nOutput: 15",
      timeLimit: 1.0,
      memoryLimit: 256.0,
      testCases: JSON.stringify([
        { input: "5 10", output: "15" }
      ]),
    },
    {
      title: "Hello World",
      description: "In ra dòng chữ 'Hello World'.",
      timeLimit: 1.0,
      memoryLimit: 128.0,
      testCases: JSON.stringify([
        { input: "", output: "Hello World" }
      ]),
    }
  ];

  for (const p of problems) {
    const exists = await problemRepository.findOneBy({ title: p.title });
    if (!exists) {
      const problem = problemRepository.create(p);
      await problemRepository.save(problem);
      console.log(`Seeded problem: ${p.title}`);
    }
  }

  console.log("Seeding completed.");
  process.exit(0);
};

seed().catch(err => {
  console.error("Error seeding data:", err);
  process.exit(1);
});
