// maintains the state of the chat, including the transcript and the agent properties
// transposes the chat transcript appropriately for each agent so that it views the
// conversation from its perspective as assistant and the other as user

class ChatState {
  constructor(agentProperties1, agentProperties2) {
    this.agentProperties1 = {
      role: "system",
      content: agentProperties1 ? agentProperties1.trim() : "",
    };
    this.agentProperties2 = {
      role: "system",
      content: agentProperties2 ? agentProperties2.trim() : "",
    };

    this.transcript = [];
  }

  getFullTranscript() {
    return this.transcript;
  }

  getTranscriptForAgent1() {
    const modifiedTranscript = this.transcript.map((message) => {
      if (message.role === "agent-1") {
        return { ...message, role: "assistant" };
      }

      if (message.role === "agent-2") {
        return { ...message, role: "user" };
      }

      return message;
    });

    return [this.agentProperties1, ...modifiedTranscript];
  }

  getTranscriptForAgent2() {
    const modifiedTranscript = this.transcript.map((message) => {
      if (message.role === "agent-2") {
        return { ...message, role: "assistant" };
      }

      if (message.role === "agent-1") {
        return { ...message, role: "user" };
      }

      return message;
    });

    return [this.agentProperties2, ...modifiedTranscript];
  }

  addMessage(agent, content) {
    this.transcript.push({
      role: agent,
      content: content ? content.trim() : "",
    });
  }
}

export default ChatState;
