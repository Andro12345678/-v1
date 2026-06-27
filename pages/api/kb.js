import { getKnowledgeBase, publicKnowledgeSummary } from "../../lib/sheets";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = await getKnowledgeBase({ forceRefresh: req.query?.refresh === "1" });
    return res.status(200).json(publicKnowledgeSummary(data));
  } catch (error) {
    console.error("[api/kb]", error);
    return res.status(500).json({
      total: 0,
      categories: 0,
      suggestions: [],
      error: "Google Sheets is not configured correctly",
    });
  }
}
