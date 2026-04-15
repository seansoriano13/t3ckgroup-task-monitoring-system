import { GoogleGenerativeAI } from "@google/generative-ai";

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
};
