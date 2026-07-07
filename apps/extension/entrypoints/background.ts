import { defineBackground } from "#imports";

export default defineBackground(() => {
  // All work happens in the popup and content script; the background worker
  // exists so the extension stays a standard MV3 shape for future features
  // (e.g. alarms-based reminders).
});
