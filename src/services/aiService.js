import { GoogleGenerativeAI } from "@google/generative-ai";

const FALLBACK_QUOTES = [
  "Start strong today and finish with purpose.",
  "Small steps daily build remarkable future success.",
  "Your consistency today creates tomorrow's breakthroughs now.",
  "Discipline today unlocks freedom in your future.",
  "Progress beats perfection when effort stays consistent.",
  "Show up focused and results will follow.",
  "Your best work starts with one action.",
  "Own this moment and elevate your craft.",
  "Energy grows when purpose leads your actions.",
  "Stay curious, stay kind, keep moving forward.",
  "Today you build the momentum you need.",
  "Focused minds turn ordinary tasks into wins.",
  "Your habits quietly shape extraordinary long-term outcomes.",
  "Courage begins when comfort stops leading choices.",
  "Great teams rise by lifting each other.",
];

function toSevenWordQuote(rawText) {
  const cleaned = (rawText || "")
    .replace(/[“”"]/g, "")
    .replace(/[^\w\s'.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter(Boolean).slice(0, 7);
  if (words.length < 7) return null;
  return words.join(" ").slice(0, 72);
}

export const aiService = {
  /**
   * Summarize git commits into a user-friendly system update message.
   * @param {Array} commits Array of commit objects from githubService
   * @returns {Promise<string>} Markdown formatted summary
   */
  async summarizeCommits(commits) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing VITE_GEMINI_API_KEY in environment variables. Please configure a valid Gemini API Key to use this feature.",
      );
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      // Ensure we use the correct model name available in v1beta
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      });

      const commitText = commits
        .map((c) => `- ${c.author}: ${c.message}`)
        .join("\n");

      const prompt = `
You are a technical communicator writing a "What's New" or "System Updates" banner for an internal business web application (Task monitoring system).
Below is a list of recent technical git commit messages. 
Summarize the most important user-facing changes (features, bug fixes, improvements) into a short, upbeat, and easy-to-understand list or paragraph.

Rules:
1. Ignore trivial commits like "fix typos" or "merge branch".
2. Focus on the actual value added to the system.
3. Don't mention specific code elements or developer names, just what the system now does better.
4. Keep it relatively brief, no more than 3-4 bullet points. DO NOT use ANY emojis.
5. Provide ONLY the final summarized text, no introductions or meta-commentary.

Here are the recent commits:
${commitText}
`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("AI Summarization failed:", error);
      throw error;
    }
  },

  async getRandomMotivationalQuote(name = "team") {
    const fallbackQuote = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    // Intentionally disabled AI requests for quote generation.
    // This returns a random hardcoded quote to preserve API quota.
    const personalized = fallbackQuote.replace(/\bteam\b/i, name || "team");
    return toSevenWordQuote(personalized) || fallbackQuote;
  },

  // Backward-compatible alias for existing callers.
  async generateMotivationalQuote(name = "team") {
    return this.getRandomMotivationalQuote(name);
  },
};
