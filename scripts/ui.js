import * as webllm from "https://esm.run/@mlc-ai/web-llm";

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
  $(
    "#model-selection-1, #model-selection-2, #agent-properties-1, #agent-properties-2"
  ).on("change input", saveSelections);

  // Add click handlers for the buttons
  $("#load-models").on("click", loadModels);
  $("#start-chat").on("click", startChat);
  $("#stop-chat").on("click", stopChat);
});

function saveSelections() {
  localStorage.setItem("model1", $("#model-selection-1").val());
  localStorage.setItem("model2", $("#model-selection-2").val());
  localStorage.setItem("properties1", $("#agent-properties-1").val());
  localStorage.setItem("properties2", $("#agent-properties-2").val());
}

function restoreSelections() {
  const model1 = localStorage.getItem("model1");
  const model2 = localStorage.getItem("model2");
  const properties1 = localStorage.getItem("properties1");
  const properties2 = localStorage.getItem("properties2");

  if (model1) $("#model-selection-1").val(model1);
  if (model2) $("#model-selection-2").val(model2);
  if (properties1) $("#agent-properties-1").val(properties1);
  if (properties2) $("#agent-properties-2").val(properties2);
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

async function loadModels() {
  console.log("Loading models...");

  // Disable the Load button
  $("#load-models").prop("disabled", true);
  // Collapse the configuration section
  $("#configCollapse").collapse("hide");
  // Clear previous chat content
  $("#chat-box").empty();

  // Get the selected models
  const selectedModel1 = $("#model-selection-1").val();
  const selectedModel2 = $("#model-selection-2").val();

  // Create an array with the selected models
  const selectedModels = [selectedModel1, selectedModel2];

  try {
    window.engine = await webllm.CreateWebWorkerMLCEngine(
      new Worker(new URL("./worker.js", import.meta.url), { type: "module" }),
      selectedModels,
      { initProgressCallback: initProgressCallback }
    );
    console.log("Chat engine initialized successfully");

    // Enable the Chat button
    $("#start-chat").prop("disabled", false);
  } catch (error) {
    console.error("Error initializing chat engine:", error);
    $("#chat-box").append(
      $("<div>")
        .addClass("console-output")
        .text("Error: " + error.message)
    );

    // Re-enable the Load button if there's an error
    $("#load-models").prop("disabled", false);
  }
}

function startChat() {
  console.log("Starting chat...");

  // Disable the Chat button and enable the Stop button
  $("#start-chat").prop("disabled", true);
  $("#stop-chat").prop("disabled", false);

  // Collapse the configuration section
  $("#configCollapse").collapse("hide");

  // Clear the console output
  $("#chat-box").empty();

  // Add a status message
  $("#chat-box").append(
    $("<div>").addClass("status-message").text("Models loaded. Chat is ready.")
  );

  // Scroll to the bottom
  scrollChatToBottom();

  // Add your chat initialization logic here
}

function stopChat() {
  console.log("Stopping chat...");

  // Disable the Stop button and enable the Chat button
  $("#stop-chat").prop("disabled", true);
  $("#start-chat").prop("disabled", false);

  // Expand the configuration section
  $("#configCollapse").collapse("show");

  // Add your chat stopping logic here
}

function scrollChatToBottom() {
  const chatBox = $("#chat-box");
  chatBox.scrollTop(chatBox[0].scrollHeight);
}

function addChatMessage(message, isUser = false) {
  const chatBox = $("#chat-box");
  const messageDiv = $("<div>")
    .addClass("message")
    .addClass(isUser ? "sent" : "received");
  const contentDiv = $("<div>").addClass("message-content").text(message);
  messageDiv.append(contentDiv);
  chatBox.append(messageDiv);

  // Scroll to the bottom after adding a new message
  scrollChatToBottom();
}
