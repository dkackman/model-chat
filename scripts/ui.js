import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import Chat from "./chat.js";

function scrollChatToBottom() {
  const chatBox = $("#chat-box");
  chatBox.scrollTop(chatBox[0].scrollHeight);
}

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const debouncedScrollChatToBottom = debounce(scrollChatToBottom, 100);

$(document).ready(function () {
  const availableModels = webllm.prebuiltAppConfig.model_list.map(
    (m) => m.model_id
  );

  // Populate model selection dropdowns
  availableModels.forEach((modelId) => {
    $("#model-selection-1").append(
      $("<option></option>").val(modelId).text(modelId)
    );
    $("#model-selection-2").append(
      $("<option></option>").val(modelId).text(modelId)
    );
  });

  // Restore saved selections and properties
  restoreSelections();

  // Save selections and properties when changed
  const selectors =
    "#model-selection-1, #model-selection-2, #agent-properties-1, #agent-properties-2, #agent-opening-message-1";
  $(selectors).on("change input", saveSelections);

  // Add click handlers for the buttons
  $("#start-chat").on("click", loadAndStartChat);
  $("#pause-chat").on("click", pauseChat);
  $("#abort-chat").on("click", abortChat);
  $("#copy-transcript").on("click", copyTranscript);
});

function saveSelections() {
  localStorage.setItem("model1", $("#model-selection-1").val());
  localStorage.setItem("model2", $("#model-selection-2").val());
  localStorage.setItem("properties1", $("#agent-properties-1").val());
  localStorage.setItem("properties2", $("#agent-properties-2").val());
  localStorage.setItem("openingMessage", $("#agent-opening-message-1").val());
}

function restoreSelections() {
  const model1 =
    localStorage.getItem("model1") ?? "Qwen2.5-3B-Instruct-q4f16_1-MLC";
  const model2 =
    localStorage.getItem("model2") ?? "Hermes-3-Llama-3.1-8B-q4f16_1-MLC";
  const properties1 = localStorage.getItem("properties1");
  const properties2 = localStorage.getItem("properties2");
  const openingMessage = localStorage.getItem("openingMessage");

  if (model1) $("#model-selection-1").val(model1);
  if (model2) $("#model-selection-2").val(model2);
  if (properties1) $("#agent-properties-1").val(properties1);
  if (properties2) $("#agent-properties-2").val(properties2);
  if (openingMessage) $("#agent-opening-message-1").val(openingMessage);
}

const MAX_PROGRESS_LINES = 10;

const initProgressCallback = (report) => {
  const chatBox = $("#chat-box");
  let consoleOutput = chatBox.find(".console-output").last();

  if (!consoleOutput.length) {
    consoleOutput = $("<div>").addClass("console-output");
    chatBox.append(consoleOutput);
  }

  // Split the existing content into lines
  let lines = consoleOutput
    .text()
    .split("\n")
    .filter((line) => line.trim() !== "");

  // Add the new line
  lines.push(report.text);

  // Keep only the last MAX_PROGRESS_LINES lines
  if (lines.length > MAX_PROGRESS_LINES) {
    lines = lines.slice(-MAX_PROGRESS_LINES);
  }

  // Join the lines back together and update the console output
  consoleOutput.text(lines.join("\n"));

  // Use the debounced scroll function
  debouncedScrollChatToBottom();
};

async function loadAndStartChat() {
  try {
    setButtonsState(false);
    $("#start-chat").prop("disabled", true);

    if (window.chat === undefined || !window.chat.initialized) {
      await loadModels();
    }
    startChat();
    setButtonsState(true);
  } catch (error) {
    console.error("Error starting chat:", error);
    setButtonsState(false);
  }
}

function setButtonsState(chatting) {
  $("#start-chat").prop("disabled", chatting);
  $("#pause-chat").prop("disabled", !chatting);
  $("#abort-chat").prop("disabled", !chatting);
}

async function loadModels() {
  if (window.chat !== undefined) {
    console.log("Pausing chat before loading models...");
    window.chat.pause();
    window.chat = undefined;
  }

  console.log("Loading models...");

  // Collapse the configuration section
  $("#configCollapse").collapse("hide");
  // Clear previous chat content
  $("#chat-box").empty();

  try {
    // create a new chat instance
    const chat = new Chat(
      $("#agent-properties-1").val(),
      $("#agent-properties-2").val(),
      insertMessage,
      streamingMessage,
      updateLastMessage
    );

    await chat.initialize(
      $("#model-selection-1").val(),
      $("#model-selection-2").val(),
      initProgressCallback
    );

    window.chat = chat;
    console.log("Chat engine initialized successfully");
  } catch (error) {
    $("#chat-box").append(
      $("<div>")
        .addClass("console-output")
        .text("Error: " + error)
    );

    throw error;
  }
}

function startChat() {
  if (window.chat === undefined || !window.chat.initialized) {
    console.log("Chat not initialized");
    return;
  }

  if (window.chat.paused) {
    console.log("Resuming chat...");
    window.chat.resume();
  } else {
    console.log("Starting chat...");
    // Collapse the configuration section
    $("#configCollapse").collapse("hide");

    // Clear the console output
    $("#chat-box").empty();

    // start the chat with the opening message
    window.chat.start($("#agent-opening-message-1").val());
  }
}

function pauseChat() {
  if (window.chat === undefined) {
    console.log("Chat not initialized");
    return;
  }

  console.log("Pausing chat...");

  setButtonsState(false);

  window.chat.pause();
}

function abortChat() {
  if (window.chat === undefined) {
    console.log("Chat not initialized");
    return;
  }

  console.log("Aborting chat...");

  setButtonsState(false);

  window.chat.abort();
  window.chat = undefined;
}

// Add this function after the existing functions
function insertMessage(agent, content) {
  content = content ?? "";
  const chatBox = $("#chat-box");
  const messageDiv = $("<div>").addClass(`message ${agent}`);
  const messageContent = $("<div>")
    .addClass("message-content")
    .html(content.replace(/\n/g, "<br>"));

  messageDiv.append(messageContent);
  chatBox.append(messageDiv);

  debouncedScrollChatToBottom();
}

function streamingMessage(agent, content) {
  content = content ?? "";
  const chatBox = $("#chat-box");
  const lastMessage = chatBox.find(`.message.${agent}`).last();
  let messageContent = lastMessage.find(".message-content");

  // If the last message text is "Thinking...", replace it with an empty string
  if (messageContent.text().trim() === "Thinking...") {
    messageContent.html("");
  }

  // Append the new content to the existing message, replacing newlines with <br>
  messageContent.html(messageContent.html() + content.replace(/\n/g, "<br>"));

  scrollChatToBottom();
}

function updateLastMessage(agent, content) {
  content = content ?? "";

  const chatBox = $("#chat-box");
  const lastMessage = chatBox.find(`.message.${agent}`).last();
  lastMessage.find(".message-content").html(content.replace(/\n/g, "<br>"));

  debouncedScrollChatToBottom();
}

function copyTranscript() {
  if (window.chat === undefined || !window.chat.initialized) {
    console.log("Chat not initialized. Nothing copied.");
    return;
  }

  const transcript = window.chat.chatState.getFullTranscript();
  const formattedTranscript = transcript
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n\n");

  navigator.clipboard.writeText(formattedTranscript).then(
    () => {
      console.log("Transcript copied to clipboard");

      // show a temporary message to the user
      const button = $("#copy-transcript");
      const originalText = button.text();
      button.text("Copied!");
      setTimeout(() => {
        button.text(originalText);
      }, 2000);
    },
    (err) => {
      console.error("Could not copy text: ", err);
    }
  );
}
