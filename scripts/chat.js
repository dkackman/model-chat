import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import ChatState from "./chatState.js";

class Chat {
  constructor(agentProperties1, agentProperties2, onNewMessage) {
    this.chatState = new ChatState(agentProperties1, agentProperties2);
    this.isStopped = false;
    this.onNewMessage = onNewMessage;
  }

  get initialized() {
    return this.engine !== undefined;
  }

  async initialize(model1, model2, initProgressCallback) {
    this.model1 = model1;
    this.model2 = model2;

    // if both models are the same only load it once
    const models = model1 === model2 ? [model1] : [model1, model2];
    this.engine = await webllm.CreateWebWorkerMLCEngine(
      new Worker(new URL("./worker.js", import.meta.url), { type: "module" }),
      models,
      { initProgressCallback: initProgressCallback }
    );
  }

  async start(firstMessage) {
    // agent 1 always starts the conversation
    this.agent1IsUser = true;
    this.chatState.addMessage("agent-1", firstMessage);
    this.onNewMessage("agent-1", firstMessage);

    this.isStopped = false;

    await this.chatLoop();
  }

  stop() {
    this.isStopped = true;
  }

  async resume() {
    this.isStopped = false;
    await this.chatLoop();
  }

  get stopped() {
    return this.isStopped;
  }

  async chatLoop() {
    while (!this.isStopped) {
      const transcript = this.agent1IsUser
        ? this.chatState.getTranscriptForAgent2()
        : this.chatState.getTranscriptForAgent1();
      const request = {
        stream: false,
        //stream_options: { include_usage: false },
        messages: transcript,
        model: this.agent1IsUser ? this.model2 : this.model1, // agent2 is the user so pass agent1's model
        //: 128,
      };
      const asyncChunkGenerator = await this.engine.chat.completions.create(
        request
      );

      const message = this.agent1IsUser
        ? await this.engine.getMessage(this.model2)
        : await this.engine.getMessage(this.model1);
      const agentLabel = this.agent1IsUser ? "agent-2" : "agent-1";
      this.chatState.addMessage(agentLabel, message);
      this.onNewMessage(agentLabel, message);

      // flip to the other agent
      this.agent1IsUser = !this.agent1IsUser;
    }
  }
}

export default Chat;