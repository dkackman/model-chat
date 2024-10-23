import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import ChatState from "./chatState.js";

class Chat extends EventTarget {
  constructor(agentProperties1, agentProperties2) {
    super();
    this.chatState = new ChatState(agentProperties1, agentProperties2);
    this.isPaused = false;
  }

  #onNewMessage(agent, message) {
    this.dispatchEvent(
      new CustomEvent("newMessage", { detail: { agent, message } })
    );
  }
  #onStreamingMessage(agent, message) {
    this.dispatchEvent(
      new CustomEvent("streamingMessage", { detail: { agent, message } })
    );
  }
  #onUpdateLastMessage(agent, message) {
    this.dispatchEvent(
      new CustomEvent("updateLastMessage", { detail: { agent, message } })
    );
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
      attention_sink_size: 4094,
    }; //ChatOptions

    // if both models are the same only load it once
    const models = model1 === model2 ? [model1] : [model1, model2];
    // there has to be one opts per model
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
    this.#onNewMessage("agent-1", firstMessage);

    this.isPaused = false;

    await this.chatLoop();
  }

  abort() {
    this.reset();

    this.#onNewMessage(
      "error",
      "Chat was reset. Press Start to reload the LLMs and begin again."
    );
  }

  reset() {
    if (this.engine) {
      this.engine.interruptGenerate();
      this.engine.unload();
    }

    this.isPaused = true;
  }

  pause() {
    this.isPaused = true;
  }

  async resume() {
    this.isPaused = false;
    await this.chatLoop();
  }

  get paused() {
    return this.isPaused;
  }

  async chatLoop() {
    while (!this.isPaused) {
      const agentLabel = this.agent1IsUser ? "agent-2" : "agent-1";
      const userLabel = this.agent1IsUser ? "agent-1" : "agent-2";

      this.#onNewMessage(agentLabel, "Thinking...");

      const request = {
        stream: true,
        stream_options: { include_usage: false },
        messages: this.chatState.getTranscriptForAgent(agentLabel, userLabel),
        model: this.agent1IsUser ? this.model2 : this.model1,
        frequency_penalty: 0.75,
        presence_penalty: 1,
        temperature: 0.1,
        top_p: 0.5,
        max_tokens: 512,
      };

      try {
        const asyncChunkGenerator = await this.engine.chat.completions.create(
          request
        );

        // this streams the response to the ui
        for await (const chunk of asyncChunkGenerator) {
          const messagePart = chunk.choices[0]?.delta?.content;
          this.#onStreamingMessage(agentLabel, messagePart);
        }

        // this gets the final message and adds it to the chat state
        const message = this.agent1IsUser
          ? await this.engine.getMessage(this.model2)
          : await this.engine.getMessage(this.model1);

        this.chatState.addMessage(agentLabel, message);
        this.#onUpdateLastMessage(agentLabel, message);
      } catch (error) {
        console.error("Error generating response:", error);
        this.onNewMessage("error", "Error generating response: " + error);
        this.pause();
      }

      // flip to the other agent
      this.agent1IsUser = !this.agent1IsUser;
    }
  }
}

export default Chat;
