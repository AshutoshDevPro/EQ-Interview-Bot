import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { eq, or } from "drizzle-orm";
import axios from "axios";
import { db, dbError } from "./db";
import { interviewRecords, users, loginSchema, registerSchema } from "@shared/schema";
import {
  evaluateAnswerWithGemini,
  generateResumeQuestionsWithGemini,
  generateFollowupQuestionWithGemini,
  type ResumeQuestion,
} from "./geminiService";
import { hashPassword, verifyPassword } from "./auth";

const PYTHON_AI_BASE_URL = process.env.PYTHON_AI_URL ?? "http://127.0.0.1:8000";

interface AnalyzeFrameBody {
  imageBase64?: string;
  filename?: string;
  sessionId?: string;
}

interface AIDetection {
  emotion?: string;
  emotion_confidence?: number;
}

interface EvaluateAnswerBody {
  roleTitle?: string;
  question?: string;
  answer?: string;
}

interface ResumeQuestionsBody {
  fileName?: string;
  mimeType?: string;
  resumeBase64?: string;
  questionCount?: number;
}

interface FollowupQuestionBody {
  roleTitle?: string;
  originalQuestion?: string;
  userAnswer?: string;
  answerScore?: number;
}

function parseBase64Image(input: string): { mimeType: string; base64Data: string } {
  const trimmed = input.trim();
  const dataUrlMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i.exec(trimmed);

  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      base64Data: dataUrlMatch[2],
    };
  }

  return {
    mimeType: "image/jpeg",
    base64Data: trimmed,
  };
}

function simplifyGeminiError(reason: string | undefined): string {
  const text = String(reason ?? "").toLowerCase();
  if (!text) return "Gemini unavailable. Local evaluation used.";
  if (text.includes("document has no pages") || text.includes("invalid_argument")) {
    return "Uploaded resume could not be parsed by Gemini. Please upload a text-based PDF.";
  }
  if (text.includes("resource_exhausted") || text.includes("quota")) {
    return "Gemini quota exceeded temporarily. Local evaluation used.";
  }
  if (text.includes("api_key_invalid") || text.includes("api key")) {
    return "Gemini API key invalid. Local evaluation used.";
  }
  if (text.includes("not found") && text.includes("model")) {
    return "Configured Gemini model is unavailable. Local evaluation used.";
  }
  return "Gemini unavailable. Local evaluation used.";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  if (dbError) {
    console.warn(`[db] ${dbError}`);
  }

  const analyzeFrameHandler = async (
    req: Request<unknown, unknown, AnalyzeFrameBody>,
    res: Response,
  ) => {
    const { imageBase64, filename, sessionId } = req.body ?? {};

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({
        message: "imageBase64 is required and must be a base64 string",
      });
    }

    try {
      const { mimeType, base64Data } = parseBase64Image(imageBase64);
      const imageBuffer = Buffer.from(base64Data, "base64");

      if (!imageBuffer.length) {
        return res.status(400).json({ message: "Invalid base64 image data" });
      }

      const extension = mimeType.split("/")[1] || "jpg";
      const uploadName =
        filename && filename.trim()
          ? filename.trim()
          : `frame-${Date.now()}.${extension}`;

      const formData = new FormData();
      formData.append(
        "file",
        new Blob([imageBuffer], { type: mimeType }),
        uploadName,
      );
      if (sessionId && typeof sessionId === "string") {
        formData.append("tracker_id", sessionId);
      }

      const aiResponse = await axios.post(`${PYTHON_AI_BASE_URL}/detect`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 15000,
      });

      const detections: AIDetection[] = Array.isArray(aiResponse.data?.detections)
        ? aiResponse.data.detections
        : [];

      const rowsToInsert = detections
        .filter((detection) => typeof detection.emotion === "string")
        .map((detection) => ({
          emotionLabel: detection.emotion as string,
          confidenceScore: Number(detection.emotion_confidence ?? 0),
          detectedAt: new Date(),
        }));

      if (db && rowsToInsert.length > 0) {
        await db.insert(interviewRecords).values(rowsToInsert);
      }

      return res.json({
        ...aiResponse.data,
        stored_records: db ? rowsToInsert.length : 0,
        db_persisted: Boolean(db),
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status ?? 502;
        const detail = error.response?.data ?? error.message;

        return res.status(statusCode).json({
          message: "AI service request failed",
          detail,
        });
      }

      return res.status(500).json({
        message: "Unexpected error while analyzing frame",
      });
    }
  };

  app.post("/analyze-frame", analyzeFrameHandler);
  app.post("/api/analyze-frame", analyzeFrameHandler);

  app.post(
    "/api/resume-questions",
    async (req: Request<unknown, unknown, ResumeQuestionsBody>, res: Response) => {
      const fileName = String(req.body?.fileName ?? "resume.pdf").trim() || "resume.pdf";
      const mimeType = String(req.body?.mimeType ?? "application/pdf").trim() || "application/pdf";
      const resumeBase64 = String(req.body?.resumeBase64 ?? "").trim();
      const questionCount = Number(req.body?.questionCount ?? 10);

      if (!resumeBase64) {
        return res.status(400).json({
          message: "resumeBase64 is required",
        });
      }

      const result = await generateResumeQuestionsWithGemini({
        fileName,
        mimeType,
        resumeBase64,
        questionCount,
      });

      if (!result.questions.length) {
        const fallback: ResumeQuestion[] = [
          {
            id: "1",
            question: "Walk me through your most impactful project from your resume and the measurable business outcome.",
            category: "Projects",
            difficulty: "medium",
          },
          {
            id: "2",
            question: "Which listed skill are you strongest at, and where did you apply it in production?",
            category: "Skills",
            difficulty: "easy",
          },
          {
            id: "3",
            question: "Describe one technical trade-off you made in a past project and why you chose that direction.",
            category: "System Design",
            difficulty: "hard",
          },
        ];

        return res.json({
          source: "fallback",
          reason: simplifyGeminiError(result.error),
          questions: fallback,
        });
      }

      return res.json({
        source: result.source ?? "gemini",
        questions: result.questions,
      });
    },
  );

  app.post(
    "/api/evaluate-answer",
    async (req: Request<unknown, unknown, EvaluateAnswerBody>, res: Response) => {
      const roleTitle = String(req.body?.roleTitle ?? "").trim();
      const question = String(req.body?.question ?? "").trim();
      const answer = String(req.body?.answer ?? "").trim();

      if (!question || !answer) {
        return res.status(400).json({
          message: "question and answer are required",
        });
      }

      const result = await evaluateAnswerWithGemini({
        roleTitle: roleTitle || "General Interview",
        question,
        answer,
      });

      if (!result.evaluation) {
        return res.json({
          source: "fallback",
          score: 0,
          feedback: "AI evaluator unavailable. Using local scoring fallback.",
          correctness: "unknown",
          reason: simplifyGeminiError(result.error),
        });
      }

      return res.json({
        source: result.source ?? "gemini",
        ...result.evaluation,
      });
    },
  );

  app.post(
    "/api/generate-followup",
    async (req: Request<unknown, unknown, FollowupQuestionBody>, res: Response) => {
      const roleTitle = String(req.body?.roleTitle ?? "").trim();
      const originalQuestion = String(req.body?.originalQuestion ?? "").trim();
      const userAnswer = String(req.body?.userAnswer ?? "").trim();
      const answerScore = Number(req.body?.answerScore ?? 0);

      if (!originalQuestion || !userAnswer) {
        return res.status(400).json({
          message: "originalQuestion and userAnswer are required",
        });
      }

      const result = await generateFollowupQuestionWithGemini({
        roleTitle: roleTitle || "General Interview",
        originalQuestion,
        userAnswer,
        answerScore: answerScore > 0 ? answerScore : undefined,
      });

      if (!result.followupQuestion) {
        // Fallback to a generic follow-up
        const fallbackQuestions = [
          "Can you elaborate on that point?",
          "How would you handle a scenario where that approach failed?",
          "What was the most challenging aspect of what you just described?",
          "How did you measure the success of that solution?",
          "What would you do differently if you could do it again?",
        ];
        const random = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];

        return res.json({
          source: "fallback",
          followupQuestion: random,
          reason: simplifyGeminiError(result.error),
        });
      }

      return res.json({
        source: result.source ?? "gemini",
        followupQuestion: result.followupQuestion,
      });
    },
  );

  // Authentication Routes
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const result = registerSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.errors,
        });
      }

      if (!db) {
        return res.status(500).json({ message: "Database connection unavailable" });
      }

      const { username, email, password, firstName, lastName } = result.data;

      // Check if user already exists
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(or(eq(users.username, username), eq(users.email, email)))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(409).json({
          message: "Username or email already exists",
        });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);

      const newUser = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
        })
        .returning({ id: users.id, username: users.username, email: users.email });

      if (newUser[0]) {
        // Set session user
        (req.session as any).userId = newUser[0].id;
        (req.session as any).username = newUser[0].username;

        return res.status(201).json({
          message: "User registered successfully",
          user: {
            id: newUser[0].id,
            username: newUser[0].username,
            email: newUser[0].email,
          },
        });
      }

      return res.status(500).json({ message: "Failed to create user" });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const result = loginSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.errors,
        });
      }

      if (!db) {
        return res.status(500).json({ message: "Database connection unavailable" });
      }

      const { username, password } = result.data;

      // Find user
      const foundUsers = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      const user = foundUsers[0];

      if (!user) {
        return res.status(401).json({
          message: "Invalid username or password",
        });
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          message: "Invalid username or password",
        });
      }

      // Set session
      (req.session as any).userId = user.id;
      (req.session as any).username = user.username;

      return res.json({
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      return res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (!(req.session as any)?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    return res.json({
      user: {
        id: (req.session as any).userId,
        username: (req.session as any).username,
      },
    });
  });

  return httpServer;
}
