import * as webllm from "https://esm.run/@mlc-ai/web-llm";

let selectedModel1 = "Llama-3.1-8B-Instruct-q4f32_1-1k";
let selectedModel2 = "Llama-3.1-8B-Instruct-q4f32_1-1k";

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
