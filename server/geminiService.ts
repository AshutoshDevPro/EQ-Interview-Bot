import axios from "axios";
import * as pdf from "pdf-parse";

export interface AIAnswerEvaluation {
  score: number;
  feedback: string;
  correctness: "correct" | "partially-correct" | "incorrect" | "unknown";
  reason: string;
}

export interface AIAnswerEvaluationResult {
  evaluation: AIAnswerEvaluation | null;
  source?: string;
  error?: string;
}

export interface ResumeQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface ResumeQuestionGenerationResult {
  questions: ResumeQuestion[];
  source?: string;
  error?: string;
}

export interface FollowupQuestionResult {
  followupQuestion: string;
  source?: string;
  error?: string;
}

interface GeminiEvalResult {
  score?: number;
  feedback?: string;
  correctness?: "correct" | "partially-correct" | "incorrect" | "unknown";
  reason?: string;
}

function shouldOverrideGeminiError(current: string, incoming: string): boolean {
  if (!current || current === "Unknown Gemini error.") return true;

  const currentText = current.toLowerCase();
  const incomingText = incoming.toLowerCase();

  const currentIsImportant =
    currentText.includes("resource_exhausted") ||
    currentText.includes("quota") ||
    currentText.includes("api_key_invalid") ||
    currentText.includes("api key");

  const incomingIsImportant =
    incomingText.includes("resource_exhausted") ||
    incomingText.includes("quota") ||
    incomingText.includes("api_key_invalid") ||
    incomingText.includes("api key");

  // Keep quota/API key issues once found; they are the true blocker.
  if (currentIsImportant && !incomingIsImportant) return false;
  if (!currentIsImportant && incomingIsImportant) return true;

  return true;
}

function clampScore(value: unknown): number {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(10, Math.round(score)));
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function hasValidContent(parsed: GeminiEvalResult): boolean {
  const feedback = cleanText(parsed.feedback);
  const reason = cleanText(parsed.reason);

  // Both feedback and reason must be present and meaningful
  if (!feedback || isPlaceholderText(feedback)) return false;
  if (!reason || isPlaceholderText(reason)) return false;

  // Minimum length checks to ensure meaningful content
  if (feedback.length < 10) return false;
  if (reason.length < 8) return false;

  return true;
}

function isPlaceholderText(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower === "no feedback." ||
    lower === "no reason provided." ||
    lower === "no feedback" ||
    lower === "no reason" ||
    lower === "n/a" ||
    lower === "pending" ||
    lower === "to be determined" ||
    lower === "tbd"
  );
}

async function extractResumeText(resumeBase64: string, mimeType: string): Promise<string> {
  const normalizedType = String(mimeType ?? "").toLowerCase();
  if (!normalizedType.includes("pdf")) {
    return "";
  }

  try {
    const buffer = Buffer.from(resumeBase64, "base64");
    const parser = ((pdf as any).default ?? pdf) as (data: Buffer) => Promise<{ text: string }>;
    const data = await parser(buffer);
    return String(data.text ?? "").trim().replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n\n");
  } catch (error) {
    console.warn("[resume] PDF text extraction failed:", error);
    return "";
  }
}

function summarizeResumeText(text: string, maxLength = 11000): string {
  const cleaned = text.trim();
  if (cleaned.length <= maxLength) return cleaned;
  const half = Math.floor(maxLength / 2);
  return `${cleaned.slice(0, half)}\n\n...[truncated resume text]...\n\n${cleaned.slice(-half)}`;
}

function normalizeQuestionText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractSkills(text: string): string[] {
  const skills = new Set<string>();
  const knownSkills = [
    "JavaScript",
    "TypeScript",
    "Python",
    "React",
    "Node.js",
    "Node",
    "Express",
    "Django",
    "Flask",
    "SQL",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "AWS",
    "GCP",
    "Azure",
    "Docker",
    "Kubernetes",
    "GraphQL",
    "REST",
    "Git",
    "CI/CD",
    "TensorFlow",
    "PyTorch",
    "Machine Learning",
    "Data Analysis",
    "Java",
    "C#",
    "C++",
    "Go",
    "Rust",
    "HTML",
    "CSS",
    "Kotlin",
    "Swift",
    "Agile",
    "Scrum",
  ];

  const lower = text.toLowerCase();
  for (const skill of knownSkills) {
    if (lower.includes(skill.toLowerCase())) {
      skills.add(skill);
    }
  }

  return Array.from(skills).slice(0, 8);
}

function extractRole(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rolePatterns = [
    /software engineer/i,
    /frontend engineer/i,
    /backend engineer/i,
    /full[- ]stack engineer/i,
    /data scientist/i,
    /product manager/i,
    /project manager/i,
    /devops engineer/i,
    /machine learning engineer/i,
    /analyst/i,
    /consultant/i,
    /intern/i,
  ];

  for (const line of lines.slice(0, 20)) {
    for (const pattern of rolePatterns) {
      if (pattern.test(line)) {
        return line;
      }
    }
  }

  return lines[0] ?? "your most recent role";
}

function extractProjectLines(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => Boolean(line));

  return lines
    .filter((line) => /\b(project|built|developed|designed|launched|implemented|optimized|led|created|deployed|engineered)\b/i.test(line))
    .slice(0, 4)
    .map((line) => normalizeQuestionText(line));
}

function generateLocalResumeQuestions(text: string, count: number): ResumeQuestion[] {
  const resumeText = text.trim();
  const skills = extractSkills(resumeText);
  const role = extractRole(resumeText);
  const projectLines = extractProjectLines(resumeText);

  const questions: ResumeQuestion[] = [];

  questions.push({
    id: "1",
    question: `Tell me about your most impactful project from your resume, including the problem, your role, and the result.`,
    category: "Projects",
    difficulty: "medium",
  });

  if (skills.length > 0) {
    questions.push({
      id: String(questions.length + 1),
      question: `How did you apply ${skills[0]} in a project from your resume, and what impact did it create?`,
      category: "Skills",
      difficulty: "easy",
    });
  }

  if (projectLines.length > 0) {
    questions.push({
      id: String(questions.length + 1),
      question: `Describe one challenge from this project: ${projectLines[0]}. How did you resolve it?`,
      category: "Problem Solving",
      difficulty: "hard",
    });
  }

  questions.push({
    id: String(questions.length + 1),
    question: `What measurable outcome or business result did you achieve in ${role}?`,
    category: "Outcome",
    difficulty: "medium",
  });

  if (skills.length > 1) {
    questions.push({
      id: String(questions.length + 1),
      question: `Compare two skills from your resume, ${skills[0]} and ${skills[1]}, and explain when you used each one.`,
      category: "Skills",
      difficulty: "medium",
    });
  }

  questions.push({
    id: String(questions.length + 1),
    question: `Describe a time you collaborated with others to deliver a resume-listed project successfully.`,
    category: "Behavioral",
    difficulty: "easy",
  });

  if (questions.length > count) {
    return questions.slice(0, count);
  }

  while (questions.length < count) {
    questions.push({
      id: String(questions.length + 1),
      question: `What is one technical decision from your resume you would make differently today, and why?`,
      category: "Reflection",
      difficulty: "hard",
    });
  }

  return questions;
}

function buildEvaluationReason(parsed: GeminiEvalResult): string {
  const reason = cleanText(parsed.reason);
  if (reason && !isPlaceholderText(reason)) return reason;

  const feedback = cleanText(parsed.feedback);
  const score = clampScore(parsed.score);
  const correctness = String(parsed.correctness ?? "unknown").trim().toLowerCase();

  if (feedback && !isPlaceholderText(feedback)) {
    return `Based on feedback: ${feedback}`;
  }

  if (correctness !== "unknown") {
    return `Assessment: ${correctness} result with score ${score}/10.`;
  }

  return `Score: ${score}/10.`;
}

function buildEvaluationFeedback(parsed: GeminiEvalResult): string {
  const feedback = cleanText(parsed.feedback);
  if (feedback && !isPlaceholderText(feedback)) return feedback;

  const score = clampScore(parsed.score);
  const correctness = String(parsed.correctness ?? "unknown").trim().toLowerCase();

  if (correctness === "correct") {
    return score >= 8
      ? "Answer looks correct and well supported."
      : "Answer looks correct, but the model gave only a modest score."
  }

  if (correctness === "partially-correct") {
    return "Answer is partially correct and needs more detail or precision.";
  }

  if (correctness === "incorrect") {
    return "Answer does not fully address the question.";
  }

  if (score >= 7) return "Answer appears strong based on the score."
  if (score >= 4) return "Answer is mixed and needs more support."
  return "Answer needs improvement."
}

function extractJson(text: string): GeminiEvalResult | null {
  const cleaned = text.trim();

  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : cleaned;

  try {
    return JSON.parse(candidate) as GeminiEvalResult;
  } catch {
    const loose = cleaned.match(/\{[\s\S]*\}/);
    if (!loose) return null;
    try {
      return JSON.parse(loose[0]) as GeminiEvalResult;
    } catch {
      return null;
    }
  }
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : cleaned;

  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    const loose = cleaned.match(/\{[\s\S]*\}/);
    if (!loose) return null;
    try {
      return JSON.parse(loose[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function normalizeDifficulty(value: unknown): "easy" | "medium" | "hard" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "easy" || normalized === "medium" || normalized === "hard") {
    return normalized;
  }
  return "medium";
}

function parseResumeQuestions(text: string, questionCount: number): ResumeQuestion[] {
  const parsed = extractJsonObject(text);
  if (!parsed) return [];

  const rawQuestions = Array.isArray(parsed.questions)
    ? parsed.questions
    : Array.isArray(parsed.items)
      ? parsed.items
      : Array.isArray(parsed)
        ? parsed
        : [];

  const questions = rawQuestions
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;

      const question = String(row.question ?? "").trim();
      if (!question) return null;

      const category = String(row.category ?? "General").trim() || "General";

      return {
        id: String(index + 1),
        question,
        category,
        difficulty: normalizeDifficulty(row.difficulty),
      } as ResumeQuestion;
    })
    .filter((item): item is ResumeQuestion => Boolean(item));

  return questions.slice(0, Math.max(1, questionCount));
}

function extractJsonByFields(text: string): GeminiEvalResult | null {
  const cleaned = text.trim();
  const scoreMatch = cleaned.match(/"score"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i);
  const correctnessMatch = cleaned.match(
    /"correctness"\s*:\s*"?(correct|partially-correct|incorrect|unknown)"?/i,
  );
  const feedbackMatch = cleaned.match(/"feedback"\s*:\s*"([^"]*)"/i);
  const reasonMatch = cleaned.match(/"reason"\s*:\s*"([^"]*)"/i);

  if (!scoreMatch && !correctnessMatch && !feedbackMatch && !reasonMatch) {
    return null;
  }

  return {
    score: scoreMatch ? Number(scoreMatch[1]) : 0,
    correctness: correctnessMatch
      ? (correctnessMatch[1].toLowerCase() as
          | "correct"
          | "partially-correct"
          | "incorrect"
          | "unknown")
      : "unknown",
    feedback: feedbackMatch ? feedbackMatch[1] : "No feedback.",
    reason: reasonMatch ? reasonMatch[1] : "",
  };
}

async function callGemini(
  apiKey: string,
  modelName: string,
  prompt: string,
): Promise<AIAnswerEvaluationResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  try {
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 220,
          responseMimeType: "application/json",
        },
      },
      {
        timeout: 15000,
      },
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = extractJson(text) ?? extractJsonByFields(text);
    if (!parsed || !hasValidContent(parsed)) {
      // Retry once with a stricter formatting instruction.
      const repairPrompt = [
        prompt,
        "",
        "IMPORTANT: Respond with one minified JSON object only.",
        "No markdown, no code fences, no extra commentary.",
        "feedback and reason must BOTH be meaningful, specific, and non-empty.",
        "Avoid generic phrases. Provide concrete analysis.",
      ].join("\n");

      const repair = await axios.post(
        url,
        {
          contents: [{ parts: [{ text: repairPrompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 200,
          },
        },
        {
          timeout: 15000,
        },
      );

      const repairText = repair.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const repairedParsed = extractJson(repairText) ?? extractJsonByFields(repairText);
      if (!repairedParsed || !hasValidContent(repairedParsed)) {
        return {
          evaluation: null,
          error: `Model ${modelName} returned invalid or placeholder content.`,
        };
      }

      const repairedCorrectness = ["correct", "partially-correct", "incorrect"].includes(
        String(repairedParsed.correctness),
      )
        ? (repairedParsed.correctness as "correct" | "partially-correct" | "incorrect")
        : "unknown";

      return {
        evaluation: {
          score: clampScore(repairedParsed.score),
          feedback: buildEvaluationFeedback(repairedParsed),
          correctness: repairedCorrectness,
          reason: buildEvaluationReason(repairedParsed),
        },
        source: modelName,
      };
    }

    const correctness = ["correct", "partially-correct", "incorrect"].includes(
      String(parsed.correctness),
    )
      ? (parsed.correctness as "correct" | "partially-correct" | "incorrect")
      : "unknown";

    return {
      evaluation: {
        score: clampScore(parsed.score),
        feedback: buildEvaluationFeedback(parsed),
        correctness,
        reason: buildEvaluationReason(parsed),
      },
      source: modelName,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const detail = JSON.stringify(error.response?.data ?? error.message);
      return {
        evaluation: null,
        error: `Model ${modelName} failed (${status ?? "no-status"}): ${detail}`,
      };
    }
    return {
      evaluation: null,
      error: `Model ${modelName} failed: ${String(error)}`,
    };
  }
}

export async function evaluateAnswerWithGemini(params: {
  roleTitle: string;
  question: string;
  answer: string;
}): Promise<AIAnswerEvaluationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return {
      evaluation: null,
      error: "GEMINI_API_KEY is missing or still set to placeholder.",
    };
  }

  const prompt = [
    "You are an expert interview evaluator assessing candidate responses.",
    "Analyze the answer and provide concrete, specific feedback.",
    "",
    "CRITICAL: Return ONLY a valid JSON object (no markdown, no code fences).",
    "Required fields: score (0-10 integer), feedback, correctness, reason.",
    "correctness: must be EXACTLY one of: correct, partially-correct, incorrect.",
    "",
    "MUST NOT use placeholder text. Examples of FORBIDDEN text:",
    "  'No feedback.' 'No reason provided.' 'TBD' 'N/A' 'pending'",
    "",
    "REQUIREMENTS:",
    "  1. feedback: 15-35 words, specific to this answer, actionable",
    "  2. reason: 10-25 words, explain the score and correctness rating",
    "  3. Both feedback and reason MUST contain concrete details",
    "  4. No filler, no generic phrases",
    "",
    `Role: ${params.roleTitle}`,
    `Question: ${params.question}`,
    `Candidate's Answer: ${params.answer}`,
    "",
    "Return valid JSON only. Example format:",
    '{"score": 7, "feedback": "Strong grasp of core concepts; could elaborate more on implementation details.", "correctness": "correct", "reason": "Answer demonstrates solid understanding with specific examples, though some technical depth is missing."}',
  ].join("\n");

  const preferred = process.env.GEMINI_MODEL?.trim();
  const models = [
    preferred,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
  ].filter((name): name is string => Boolean(name && name.trim()));

  const uniqueModels = Array.from(new Set(models));
  let lastError = "Unknown Gemini error.";

  for (const modelName of uniqueModels) {
    const result = await callGemini(apiKey, modelName, prompt);
    if (result.evaluation) {
      return result;
    }
    if (result.error) {
      if (shouldOverrideGeminiError(lastError, result.error)) {
        lastError = result.error;
      }
      console.warn(`[gemini] ${result.error}`);
    }
  }

  return {
    evaluation: null,
    error: lastError,
  };
}

export async function generateResumeQuestionsWithGemini(params: {
  resumeBase64: string;
  mimeType?: string;
  fileName?: string;
  questionCount?: number;
}): Promise<ResumeQuestionGenerationResult> {
  const mimeType = String(params.mimeType || "application/pdf").trim() || "application/pdf";
  const questionCount = Math.min(15, Math.max(5, Number(params.questionCount ?? 10)));
  const resumeText = await extractResumeText(params.resumeBase64, mimeType);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    const localQuestions = generateLocalResumeQuestions(resumeText, questionCount);
    return {
      questions: localQuestions,
      source: "local-fallback",
      error: "GEMINI_API_KEY is missing or still set to placeholder.",
    };
  }

  const promptBase = [
    "You are an interview coach.",
    `Read the uploaded resume and generate exactly ${questionCount} tailored interview questions.`,
    "Output JSON only with shape: {\"questions\":[{\"question\":string,\"category\":string,\"difficulty\":\"easy\"|\"medium\"|\"hard\"}]}",
    "Rules:",
    "- Make questions specific to the candidate's projects, skills, and work history.",
    "- Keep each question under 35 words.",
    "- Use a balanced mix of easy/medium/hard.",
    "- No markdown, no explanation text.",
    params.fileName ? `Resume filename: ${params.fileName}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const promptText = resumeText
    ? `${promptBase}\n\nResume Text:\n${summarizeResumeText(resumeText)}`
    : `${promptBase}\n\nResume text could not be extracted from the file. Use the uploaded document metadata to create tailored questions.`;

  const preferred = process.env.GEMINI_MODEL?.trim();
  const models = [
    preferred,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
  ].filter((name): name is string => Boolean(name && name.trim()));

  let lastError = "Unknown Gemini error.";

  for (const modelName of Array.from(new Set(models))) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
      const payload: any = {
        contents: [
          {
            parts: [{ text: promptText }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
        },
      };

      if (!resumeText) {
        payload.contents[0].parts.push({
          inline_data: {
            mime_type: mimeType,
            data: params.resumeBase64,
          },
        });
      }

      const response = await axios.post(url, payload, { timeout: 25000 });

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const questions = parseResumeQuestions(text, questionCount);

      if (questions.length > 0) {
        return {
          questions,
          source: modelName,
        };
      }

      const errorMessage = `Model ${modelName} returned unparsable resume questions.`;
      if (shouldOverrideGeminiError(lastError, errorMessage)) {
        lastError = errorMessage;
      }
      console.warn(`[gemini] ${errorMessage}`);
    } catch (error) {
      let incomingError = "";
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const detail = JSON.stringify(error.response?.data ?? error.message);
        incomingError = `Model ${modelName} failed (${status ?? "no-status"}): ${detail}`;
      } else {
        incomingError = `Model ${modelName} failed: ${String(error)}`;
      }

      if (shouldOverrideGeminiError(lastError, incomingError)) {
        lastError = incomingError;
      }
      console.warn(`[gemini] ${incomingError}`);
    }
  }

  const localQuestions = generateLocalResumeQuestions(resumeText, questionCount);
  return {
    questions: localQuestions,
    source: resumeText ? "local-fallback" : "fallback",
    error: lastError,
  };
}

export async function generateFollowupQuestionWithGemini(params: {
  roleTitle: string;
  originalQuestion: string;
  userAnswer: string;
  answerScore?: number;
}): Promise<FollowupQuestionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return {
      followupQuestion: "",
      error: "GEMINI_API_KEY is missing or still set to placeholder.",
    };
  }

  const preferred = process.env.GEMINI_MODEL?.trim();
  const models = [
    preferred,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
  ].filter((name): name is string => Boolean(name && name.trim()));

  let lastError = "Unknown Gemini error.";

  for (const modelName of Array.from(new Set(models))) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const scoreContext = params.answerScore
      ? `The answer scored ${params.answerScore}/10.`
      : "";

    const prompt = [
      "You are an experienced interview coach for a technical interview.",
      `Position: ${params.roleTitle}`,
      "",
      "Original Question:",
      params.originalQuestion,
      "",
      "Candidate's Answer:",
      params.userAnswer,
      "",
      scoreContext,
      "",
      "Generate ONE thoughtful follow-up question that:",
      "- Digs deeper into their experience or understanding",
      "- Is specific to their answer (not generic)",
      "- Remains under 30 words",
      "- Maintains professional interview tone",
      "",
      "Respond with ONLY the follow-up question text. No explanations, no JSON, no markdown.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const response = await axios.post(
        url,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 150,
          },
        },
        {
          timeout: 15000,
        },
      );

      const followupQuestion =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (followupQuestion && followupQuestion.trim().length > 5) {
        return {
          followupQuestion: followupQuestion.trim(),
          source: modelName,
        };
      }

      const errorMessage = `Model ${modelName} returned empty follow-up question.`;
      if (shouldOverrideGeminiError(lastError, errorMessage)) {
        lastError = errorMessage;
      }
      console.warn(`[gemini] ${errorMessage}`);
    } catch (error) {
      let incomingError = "";
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const detail = JSON.stringify(error.response?.data ?? error.message);
        incomingError = `Model ${modelName} failed (${status ?? "no-status"}): ${detail}`;
      } else {
        incomingError = `Model ${modelName} failed: ${String(error)}`;
      }

      if (shouldOverrideGeminiError(lastError, incomingError)) {
        lastError = incomingError;
      }
      console.warn(`[gemini] ${incomingError}`);
    }
  }

  return {
    followupQuestion: "",
    error: lastError,
  };
}
