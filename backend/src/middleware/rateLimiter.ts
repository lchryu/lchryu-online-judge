import { Request, Response, NextFunction } from "express";

const lastSubmitTime = new Map<string, number>();
const SUBMIT_COOLDOWN_MS = 5000; // 5 seconds cooldown

export const submitRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
  const now = Date.now();

  const lastTime = lastSubmitTime.get(ip);
  if (lastTime && now - lastTime < SUBMIT_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((SUBMIT_COOLDOWN_MS - (now - lastTime)) / 1000);
    return res.status(429).json({
      message: `You are submitting too fast. Please wait ${remainingSeconds} second(s) before trying again.`,
    });
  }

  lastSubmitTime.set(ip, now);
  next();
};
