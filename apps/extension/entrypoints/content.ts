import { browser, defineContentScript } from "#imports";
import { extractPage } from "../lib/extract";
import { autofillPage, type AutofillProfile, type ResumePayload } from "../lib/autofill";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    browser.runtime.onMessage.addListener(
      (
        message: { type: string; profile?: AutofillProfile; resume?: ResumePayload },
        _sender,
        sendResponse,
      ) => {
        if (message.type === "EXTRACT_PAGE") {
          sendResponse(extractPage());
        } else if (message.type === "AUTOFILL" && message.profile) {
          sendResponse(autofillPage(message.profile, message.resume));
        }
        return false;
      },
    );
  },
});
