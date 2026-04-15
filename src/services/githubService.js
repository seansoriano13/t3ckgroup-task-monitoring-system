/**
 * Generic GitHub API service to fetch commits
 */

const GITHUB_API_URL = "https://api.github.com";

export const githubService = {
  /**
   * Fetch recent commits from the repository configured in the environment.
   * @param {number} limit Number of commits to fetch
   * @returns {Promise<Array>} Array of commit objects
   */
  async getRecentCommits(limit = 15) {
    const pat = import.meta.env.VITE_GITHUB_PAT;
    const repo = import.meta.env.VITE_GITHUB_REPO;

    if (!pat || !repo) {
      throw new Error("GitHub integration is not properly configured. Missing VITE_GITHUB_PAT or VITE_GITHUB_REPO.");
    }

    try {
      const response = await fetch(`${GITHUB_API_URL}/repos/${repo}/commits?per_page=${limit}`, {
        headers: {
          "Authorization": `Bearer ${pat}`,
          "Accept": "application/vnd.github.v3+json"
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.map(item => ({
        sha: item.sha.substring(0, 7),
        message: item.commit.message,
        author: item.commit.author.name,
        date: item.commit.author.date,
        url: item.html_url
      }));
    } catch (error) {
      console.error("Error fetching github commits:", error);
      throw error;
    }
  }
};
