import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import ChatState from "./chatState.js";

class Chat {
  constructor(
    agentProperties1,
    agentProperties2,
    onNewMessage,
    onStreamingMessage,
    onUpdateLastMessage,
    onThinking
  ) {
    this.chatState = new ChatState(agentProperties1, agentProperties2);
    this.isStopped = false;
    this.onNewMessage = onNewMessage;
    this.onStreamingMessage = onStreamingMessage;
    this.onUpdateLastMessage = onUpdateLastMessage;
    this.onThinking = onThinking;
  }

  get initialized() {
    return this.engine !== undefined;
  }

  async initialize(model1, model2, initProgressCallback) {
    this.model1 = model1;
    this.model2 = model2;

    const opts = {
      context_window_size: -1,
      sliding_window_size: 4096,
      attention_sink_size: 1024,
    }; //ChatOptions

    // if both models are the same only load it once
    const models = model1 === model2 ? [model1] : [model1, model2];
    const chatOpts = model1 === model2 ? opts : [opts, opts];
    this.engine = await webllm.CreateWebWorkerMLCEngine(
      new Worker(new URL("./worker.js", import.meta.url), { type: "module" }),
      models,
      { initProgressCallback: initProgressCallback }, // MLCEngineConfig
      chatOpts
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

  abort() {
    if (this.engine) {
      this.engine.interruptGenerate();
    }
    this.isStopped = true;
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
      const agentLabel = this.agent1IsUser ? "agent-2" : "agent-1";

      this.onThinking(agentLabel);

      const transcript = this.agent1IsUser
        ? this.chatState.getTranscriptForAgent2()
        : this.chatState.getTranscriptForAgent1();
      const request = {
        stream: true,
        stream_options: { include_usage: false },
        messages: transcript,
        model: this.agent1IsUser ? this.model2 : this.model1,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
        temperature: 0.4,
      };

      try {
        const asyncChunkGenerator = await this.engine.chat.completions.create(
          request
        );

        // this streams the response to the ui
        for await (const chunk of asyncChunkGenerator) {
          const messagePart = chunk.choices[0]?.delta?.content;
          this.onStreamingMessage(agentLabel, messagePart);
        }

        // this gets the final message and adds it to the chat state
        const message = this.agent1IsUser
          ? await this.engine.getMessage(this.model2)
          : await this.engine.getMessage(this.model1);

        this.chatState.addMessage(agentLabel, message);
        this.onUpdateLastMessage(agentLabel, message);
      } catch (error) {
        console.error("Error generating response:", error);
        this.onUpdateLastMessage(agentLabel, "Error generating response");
        this.stop();
      }

      // flip to the other agent
      this.agent1IsUser = !this.agent1IsUser;
    }
  }
}

export default Chat;
