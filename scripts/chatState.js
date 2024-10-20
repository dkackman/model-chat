// maintains the state of the chat, including the transcript and the agent properties
// transposes the chat transcript appropriately for each agent so that it views the
// conversation from their perspective as assistant and the other as user

class ChatState {
  constructor(agentProperties1, agentProperties2) {
    this.agentProperties1 = {
      Role: "system",
      Content: agentProperties1 ? agentProperties1.trim() : "",
    };
    this.agentProperties2 = {
      Role: "system",
      Content: agentProperties2 ? agentProperties2.trim() : "",
    };

    this.transcript = [];
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

  addMessageForAgent1(content) {
    this.transcript.push({
      role: "agent-1",
      content: content ? content.trim() : "",
    });
  }

  addMessageForAgent2(content) {
    this.transcript.push({
      role: "agent-2",
      content: content ? content.trim() : "",
    });
  }
}

export default ChatState;
