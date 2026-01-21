const { randomUUID } = require("crypto");
const Session = require("./Session");

class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  createSession() {
    const sessionId = randomUUID();
    const session = new Session(sessionId);
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
  }
}

module.exports = SessionManager;