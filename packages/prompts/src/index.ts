// All prompts are versioned — version bump = new file
export { buildLifeReportPrompt, PROMPT_VERSION } from "./v2/lifeReport.js";
export { buildKarnchataChatPrompt } from "./v2/karnchataChat.js";
export { buildHoraNuChatPrompt } from "./v2/horaNuChat.js";

// Knowledge Base (RAG) exports
export {
  buildAtthakarnContext,
  buildAtthakarnContextShort,
  ATTHAKARN_CORE_PRINCIPLES,
  PLANET_BIRTH_YAM_MEANINGS,
  type AtthakarnBirthYamContext,
} from "./knowledge/atthakarn-kb.js";
