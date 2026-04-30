export class GitHubClient {
  constructor({ apiBaseUrl, owner, repo, token }) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, '');
    this.owner = owner;
    this.repo = repo;
    this.token = token;
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub API Fehler ${response.status}: ${text}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async findIssueByTitle(title) {
    const issues = await this.request(
      `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/issues?state=open&per_page=100`
    );

    return issues.find((issue) => issue.title === title) ?? null;
  }

  async createIssue(title, body) {
    return this.request(`/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title, body })
    });
  }

  async ensureIssue(title) {
    const existing = await this.findIssueByTitle(title);
    if (existing) {
      return existing;
    }

    return this.createIssue(title, 'Tages-Issue für Presence Board Events. Bitte nicht manuell bearbeiten.');
  }

  async listComments(issueNumber) {
    const comments = [];
    let page = 1;

    while (true) {
      const pageItems = await this.request(
        `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/issues/${issueNumber}/comments?per_page=100&page=${page}`
      );
      comments.push(...pageItems);

      if (pageItems.length < 100) {
        return comments;
      }

      page += 1;
    }
  }

  async createComment(issueNumber, body) {
    return this.request(
      `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ body })
      }
    );
  }
}
