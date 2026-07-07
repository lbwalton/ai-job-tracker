import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "JobTrackr",
    description:
      "One-click job capture and application autofill for your JobTrackr tracker.",
    permissions: ["activeTab", "storage", "tabs"],
    host_permissions: ["<all_urls>"],
  },
});
