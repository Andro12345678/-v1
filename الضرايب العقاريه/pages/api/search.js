import { answerFromKnowledgeBase } from "../../lib/gemini";
import { getKnowledgeBase } from "../../lib/sheets";

const MAX_QUERY_LENGTH = 500;
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;
const requestLog = new Map();

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  requestLog.set(ip, recent);
  return false;
}

function emptyAnswer(error) {
  return {
    matchedQuestion: "",
    legalAnswer: "",
    aiExplanation: "",
    message: "",
    category: "",
    source: "",
    ...(error ? { error } : {}),
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json(emptyAnswer("Method not allowed"));
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json(emptyAnswer("Too many requests"));
  }

  const query = String(req.body?.query || "").trim();
  if (!query) {
    return res.status(400).json(emptyAnswer("query is required"));
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return res.status(400).json(emptyAnswer("query is too long"));
  }

  try {
    const knowledgeBase = await getKnowledgeBase();
    const answer = await answerFromKnowledgeBase(query, knowledgeBase.items);
    return res.status(200).json(answer);
  } catch (error) {
    if (!String(error?.message || "").includes("is required")) {
      console.error("[api/search]", error);
    }
    const message =
      error?.message === "GEMINI_API_KEY is required"
        ? "GEMINI_API_KEY is missing"
        : "Search service is not configured correctly";
    return res.status(500).json(emptyAnswer(message));
  }
}
