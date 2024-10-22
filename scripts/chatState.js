// maintains the state of the chat, including the transcript and the agent properties
// transposes the chat transcript appropriately for each agent so that it views the
// conversation from its perspective as assistant and the other as user

class ChatState {
  constructor(agentProperties1, agentProperties2) {
    this.agentProperties = new Map();
    this.agentProperties.set("agent-1", {
      role: "system",
      content: agentProperties1 ? agentProperties1.trim() : "",
    });
    this.agentProperties.set("agent-2", {
      role: "system",
      content: agentProperties2 ? agentProperties2.trim() : "",
    });
    this.transcript = [];
  }

  getFullTranscript() {
    // prepend the agent properties to the transcript
    return [
      { ...this.agentProperties.get("agent-1"), role: "agent-1" },
      { ...this.agentProperties.get("agent-2"), role: "agent-2" },
      ...this.transcript,
    ];
  }

  getTranscriptForAgent(assistantAgent, userAgent) {
    const modifiedTranscript = this.transcript.map((message) => {
      if (message.role === assistantAgent) {
        return { ...message, role: "assistant" };
      }

      if (message.role === userAgent) {
        return { ...message, role: "user" };
      }

      return message;
    });

    return [this.agentProperties.get(assistantAgent), ...modifiedTranscript];
  }

  addMessage(agent, content) {
    this.transcript.push({
      role: agent,
      content: content ? content.trim() : "",
    });
  }
}

export default ChatState;
