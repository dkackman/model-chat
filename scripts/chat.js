import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import ChatState from "./chatState.js";

class Chat {
  constructor(agentProperties1, agentProperties2) {
    this.chatState = new ChatState(agentProperties1, agentProperties2);
    this.isStopped = false;
  }

  get initialized() {
    return this.engine !== undefined;
  }

  async initialize(model1, model2, initProgressCallback) {
    this.engine = await webllm.CreateWebWorkerMLCEngine(
      new Worker(new URL("./worker.js", import.meta.url), { type: "module" }),
      [model1, model2],
      { initProgressCallback: initProgressCallback }
    );
  }

  start(firstMessage) {
    // agent 1 always starts the conversation
    this.chatState.addMessageForAgent1(firstMessage);

    // now get the transcript to pass to agent 2 where 1 is the user and 2 is the assistant
    const transcript = this.chatState.getTranscriptForAgent2();
    console.log(transcript);
    this.isStopped = false;
  }

  stop() {
    this.isStopped = true;
  }

  resume() {
    this.isStopped = false;
  }

  get stopped() {
    return this.isStopped;
  }
}

export default Chat;
