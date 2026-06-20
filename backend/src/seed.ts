import { AppDataSource } from "./data-source";
import { Problem } from "./entities/Problem";
import { User } from "./entities/User";
import bcrypt from "bcrypt";

interface GeneratedTestCase {
  input: string;
  output: string;
}

const seed = async () => {
  await AppDataSource.initialize();
  const problemRepository = AppDataSource.getRepository(Problem);
  const userRepository = AppDataSource.getRepository(User);

  // 1. Seed Admin Account
  const adminExists = await userRepository.findOne({
    where: [{ username: "admin" }, { email: "admin@vibejudge.com" }],
  });
  const hashedPassword = await bcrypt.hash("admin123", 10);
  if (adminExists) {
    adminExists.username = "admin";
    adminExists.email = "admin@vibejudge.com";
    adminExists.password = hashedPassword;
    adminExists.role = "admin";
    await userRepository.save(adminExists);
    console.log("Updated Admin User: admin / admin123");
  } else {
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
  const abTestCases: GeneratedTestCase[] = [];
  for (let i = 1; i <= 100; i++) {
    const a = Math.floor(Math.random() * 1000);
    const b = Math.floor(Math.random() * 1000);
    abTestCases.push({
      input: `${a} ${b}`,
      output: `${a + b}`,
    });
  }

  // Define problem generator helpers
  const generateSumOfN = () => {
    const cases: GeneratedTestCase[] = [];
    const Ns = [5, 10, 20, 50, 100, 250, 500, 1000, 5000, 10000];
    Ns.forEach(N => {
      let sum = 0;
      for (let i = 1; i <= N; i++) sum += i;
      cases.push({ input: `${N}`, output: `${sum}` });
    });
    return JSON.stringify(cases);
  };

  const generateFactorial = () => {
    const cases: GeneratedTestCase[] = [];
    const Ns = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];
    Ns.forEach(N => {
      let fact = 1;
      for (let i = 1; i <= N; i++) fact *= i;
      cases.push({ input: `${N}`, output: `${fact}` });
    });
    return JSON.stringify(cases);
  };

  const isPrime = (num: number) => {
    if (num <= 1) return false;
    for (let i = 2; i * i <= num; i++) {
      if (num % i === 0) return false;
    }
    return true;
  };

  const generatePrimeCheck = () => {
    const cases: GeneratedTestCase[] = [];
    const Ns = [2, 3, 4, 7, 10, 13, 17, 20, 29, 33, 97, 100, 103, 500, 997];
    Ns.forEach(N => {
      cases.push({ input: `${N}`, output: isPrime(N) ? "YES" : "NO" });
    });
    return JSON.stringify(cases);
  };

  const generateSumDigits = () => {
    const cases: GeneratedTestCase[] = [];
    const Ns = [9, 12, 123, 999, 1001, 87654, 999999, 1000000, 1234567, 987654321];
    Ns.forEach(N => {
      const sum = String(N).split("").reduce((acc, char) => acc + Number(char), 0);
      cases.push({ input: `${N}`, output: `${sum}` });
    });
    return JSON.stringify(cases);
  };

  const generateReverseNum = () => {
    const cases: GeneratedTestCase[] = [];
    const Ns = [123, 9876, 5, 100, 120, 5005, 90812, 123456789, 7000, 8009];
    Ns.forEach(N => {
      const rev = Number(String(N).split("").reverse().join(""));
      cases.push({ input: `${N}`, output: `${rev}` });
    });
    return JSON.stringify(cases);
  };

  const generateMaxArray = () => {
    const cases: GeneratedTestCase[] = [];
    const arrays = [
      [3, 1, 2],
      [10, 20, 30, 40, 50],
      [5, -1, -5, -3, -10, -2],
      [1, 99],
      [7, 15, 15, 12, 15, 9, 3],
      [10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [6, 123, 456, 789, 101, 202, 303],
      [4, -100, -200, -300, -400],
      [8, 1, 2, 3, 4, 5, 6, 7, 8],
      [5, 42, 42, 42, 42, 42]
    ];
    arrays.forEach(arr => {
      const N = arr.length;
      const elements = arr.join(" ");
      const max = Math.max(...arr);
      cases.push({ input: `${N}\n${elements}`, output: `${max}` });
    });
    return JSON.stringify(cases);
  };

  const generateFibonacci = () => {
    const cases: GeneratedTestCase[] = [];
    const Ns = [1, 2, 3, 4, 5, 6, 10, 15, 20, 30];
    const fib = (n: number): number => {
      if (n <= 2) return 1;
      let a = 1, b = 1;
      for (let i = 3; i <= n; i++) {
        const c = a + b;
        a = b;
        b = c;
      }
      return b;
    };
    Ns.forEach(N => {
      cases.push({ input: `${N}`, output: `${fib(N)}` });
    });
    return JSON.stringify(cases);
  };

  const generateGCD = () => {
    const cases: GeneratedTestCase[] = [];
    const pairs = [
      [12, 18], [24, 60], [7, 13], [10, 10], [100, 10], [35, 49], 
      [81, 27], [1000, 350], [9, 28], [144, 96]
    ];
    const gcd = (a: number, b: number): number => {
      while (b !== 0) {
        const r = a % b;
        a = b;
        b = r;
      }
      return a;
    };
    pairs.forEach(([a, b]) => {
      cases.push({ input: `${a} ${b}`, output: `${gcd(a, b)}` });
    });
    return JSON.stringify(cases);
  };

  const generateCountVowels = () => {
    const cases: GeneratedTestCase[] = [];
    const strings = [
      "hello", "world", "online judge", "aeiou", "bcdfgh", 
      "Vibe Coding", "TypeScript", "Google DeepMind", "A", "xyz"
    ];
    strings.forEach(str => {
      const count = (str.match(/[aeiouAEIOU]/g) || []).length;
      cases.push({ input: str, output: `${count}` });
    });
    return JSON.stringify(cases);
  };

  const generateMulTable = () => {
    const cases: GeneratedTestCase[] = [];
    const Ns = [2, 5, 7, 9, 12, 15, 20, 50, 99, 100];
    Ns.forEach(N => {
      const lines = [];
      for (let i = 1; i <= 10; i++) {
        lines.push(`${N} x ${i} = ${N * i}`);
      }
      cases.push({ input: `${N}`, output: lines.join("\n") });
    });
    return JSON.stringify(cases);
  };

  const problems = [
    {
      title: "A + B Problem",
      description: "Viết chương trình nhập vào hai số nguyên A và B, in ra tổng của chúng.\n\nInput:\n- Một dòng duy nhất chứa hai số nguyên A và B cách nhau bởi dấu cách.\n\nOutput:\n- Tổng của A và B.\n\nVí dụ:\nInput: 5 10\nOutput: 15",
      timeLimit: 1.0,
      memoryLimit: 256.0,
      testCases: JSON.stringify(abTestCases),
    },
    {
      title: "Hello World",
      description: "In ra dòng chữ 'Hello World'.",
      timeLimit: 1.0,
      memoryLimit: 128.0,
      testCases: JSON.stringify([
        { input: "", output: "Hello World" }
      ]),
    },
    {
      title: "Sum from 1 to N",
      description: "Nhập số nguyên dương N. Tính tổng các số nguyên liên tiếp từ 1 đến N.\n\nInput:\n- Một số nguyên dương N.\n\nOutput:\n- Tổng S = 1 + 2 + ... + N.\n\nVí dụ:\nInput: 5\nOutput: 15",
      timeLimit: 1.0,
      memoryLimit: 256.0,
      testCases: generateSumOfN(),
    },
    {
      title: "N Factorial",
      description: "Tính giai thừa của một số nguyên dương N (N!).\n\nInput:\n- Một số nguyên dương N.\n\nOutput:\n- Giá trị của N!.\n\nVí dụ:\nInput: 5\nOutput: 120",
      timeLimit: 1.0,
      memoryLimit: 256.0,
      testCases: generateFactorial(),
    },
    {
      title: "Prime Checker",
      description: "Nhập số nguyên dương N. Kiểm tra xem N có phải là số nguyên tố hay không.\n\nInput:\n- Một số nguyên dương N.\n\nOutput:\n- In ra 'YES' nếu N là số nguyên tố, ngược lại in ra 'NO'.\n\nVí dụ:\nInput: 7\nOutput: YES",
      timeLimit: 1.0,
      memoryLimit: 256.0,
      testCases: generatePrimeCheck(),
    },
    {
      title: "Sum of Digits",
      description: "Tính tổng các chữ số của một số nguyên dương N.\n\nInput:\n- Một số nguyên dương N.\n\nOutput:\n- Tổng các chữ số cấu thành N.\n\nVí dụ:\nInput: 123\nOutput: 6",
      timeLimit: 1.0,
      memoryLimit: 256.0,
      testCases: generateSumDigits(),
    },
    {
      title: "Reverse Integer",
      description: "Đảo ngược các chữ số của số nguyên dương N. Bỏ qua các chữ số 0 vô nghĩa ở đầu sau khi đảo.\n\nInput:\n- Một số nguyên dương N.\n\nOutput:\n- Số nguyên sau khi đảo ngược chữ số.\n\nVí dụ:\nInput: 120\nOutput: 21",
      timeLimit: 1.0,
      memoryLimit: 256.0,
      testCases: generateReverseNum(),
    },
    {
      title: "Find Maximum",
      description: "Cho một mảng gồm N số nguyên. Hãy tìm phần tử có giá trị lớn nhất trong mảng.\n\nInput:\n- Dòng đầu tiên chứa số nguyên dương N.\n- Dòng thứ hai chứa N số nguyên cách nhau bởi khoảng trắng.\n\nOutput:\n- Phần tử lớn nhất tìm được.\n\nVí dụ:\nInput:\n3\n1 99 2\nOutput: 99",
      timeLimit: 1.0,
      memoryLimit: 256.0,
      testCases: generateMaxArray(),
    },
    {
      title: "N-th Fibonacci",
      description: "Tìm số Fibonacci thứ N. Chuỗi Fibonacci được định nghĩa là F(1) = 1, F(2) = 1, F(N) = F(N-1) + F(N-2) với N >= 3.\n\nInput:\n- Số nguyên dương N.\n\nOutput:\n- Số Fibonacci thứ N.\n\nVí dụ:\nInput: 6\nOutput: 8",
      timeLimit: 1.0,
      memoryLimit: 256.0,
      testCases: generateFibonacci(),
    },
    {
      title: "GCD of Two Numbers",
      description: "Tìm ước chung lớn nhất (UCLN) của hai số nguyên dương A và B.\n\nInput:\n- Hai số nguyên dương A và B cách nhau bởi khoảng trắng.\n\nOutput:\n- UCLN của A và B.\n\nVí dụ:\nInput: 12 18\nOutput: 6",
      timeLimit: 1.0,
      memoryLimit: 256.0,
      testCases: generateGCD(),
    },
    {
      title: "Count Vowels",
      description: "Đếm số lượng nguyên âm (a, e, i, o, u, kể cả in hoa) trong một chuỗi ký tự.\n\nInput:\n- Một dòng văn bản chứa các ký tự.\n\nOutput:\n- Số lượng nguyên âm đếm được.\n\nVí dụ:\nInput: hello\nOutput: 2",
      timeLimit: 1.0,
      memoryLimit: 256.0,
      testCases: generateCountVowels(),
    },
    {
      title: "Multiplication Table",
      description: "In ra bảng nhân của số nguyên dương N từ 1 đến 10.\n\nInput:\n- Số nguyên dương N.\n\nOutput:\n- 10 dòng hiển thị phép nhân định dạng 'N x i = Result'.\n\nVí dụ:\nInput: 5\nOutput:\n5 x 1 = 5\n5 x 2 = 10\n5 x 3 = 15\n5 x 4 = 20\n5 x 5 = 25\n5 x 6 = 30\n5 x 7 = 35\n5 x 8 = 40\n5 x 9 = 45\n5 x 10 = 50",
      timeLimit: 1.0,
      memoryLimit: 256.0,
      testCases: generateMulTable(),
    }
  ];

  for (const p of problems) {
    let problem = await problemRepository.findOneBy({ title: p.title });
    if (problem) {
      problem.description = p.description;
      problem.timeLimit = p.timeLimit;
      problem.memoryLimit = p.memoryLimit;
      problem.testCases = p.testCases;
      await problemRepository.save(problem);
      console.log(`Updated problem: ${p.title} with ${JSON.parse(p.testCases).length} test cases.`);
    } else {
      problem = problemRepository.create(p);
      await problemRepository.save(problem);
      console.log(`Seeded problem: ${p.title} with ${JSON.parse(p.testCases).length} test cases.`);
    }
  }

  console.log("Seeding completed.");
  process.exit(0);
};

seed().catch(err => {
  console.error("Error seeding data:", err);
  process.exit(1);
});
