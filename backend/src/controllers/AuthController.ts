import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "vibe_judge_secret_key_123";

export class AuthController {
  static async register(req: Request, res: Response) {
    const { username, email, password } = req.body;
    const userRepository = AppDataSource.getRepository(User);

    try {
      const existingUser = await userRepository.findOne({ where: [{ username }, { email }] });
      if (existingUser) {
        return res.status(400).json({ message: "Username or email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = userRepository.create({
        username,
        email,
        password: hashedPassword,
        role: "user" // Default role
      });

      await userRepository.save(user);
      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async login(req: Request, res: Response) {
    const { username, password } = req.body;
    const userRepository = AppDataSource.getRepository(User);

    try {
      const user = await userRepository.findOneBy({ username });
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        token,
        user: { id: user.id, username: user.username, role: user.role, avatarUrl: user.avatarUrl }
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getMe(req: any, res: Response) {
    try {
      const user = await AppDataSource.getRepository(User).findOneBy({ id: req.user.userId });
      if (!user) return res.status(404).json({ message: "User not found" });
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async updateProfile(req: any, res: Response) {
    const { username, email, password, avatarUrl } = req.body;
    const userRepository = AppDataSource.getRepository(User);

    try {
      const user = await userRepository.findOneBy({ id: req.user.userId });
      if (!user) return res.status(404).json({ message: "User not found" });

      if (username) user.username = username;
      if (email) user.email = email;
      if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
      if (password) {
        user.password = await bcrypt.hash(password, 10);
      }

      await userRepository.save(user);
      res.json({ 
        message: "Profile updated successfully",
        user: { id: user.id, username: user.username, role: user.role, avatarUrl: user.avatarUrl }
      });
    } catch (error) {
      res.status(500).json({ message: "Error updating profile" });
    }
  }

  static async uploadAvatar(req: any, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOneBy({ id: req.user.userId });
      if (!user) return res.status(404).json({ message: "User not found" });

      const avatarUrl = `http://localhost:5000/uploads/avatars/${req.file.filename}`;
      user.avatarUrl = avatarUrl;
      await userRepository.save(user);

      res.json({ 
        message: "Avatar uploaded successfully", 
        avatarUrl,
        user: { id: user.id, username: user.username, role: user.role, avatarUrl: user.avatarUrl }
      });
    } catch (error) {
      res.status(500).json({ message: "Error uploading avatar" });
    }
  }
}
