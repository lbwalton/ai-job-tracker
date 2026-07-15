import { browser } from "#imports";
import { apiFetch, getSettings, saveSettings } from "../../lib/settings";
import type { ExtractedPage } from "../../lib/extract";
import type { AutofillProfile, AutofillResult, ResumePayload } from "../../lib/autofill";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const statusEl = $("status");
const connEl = $("conn");
const captureBtn = $<HTMLButtonElement>("capture");
const autofillBtn = $<HTMLButtonElement>("autofill");
const hintEl = $("hint");

function setStatus(kind: "ok" | "err", text: string) {
  statusEl.className = `status ${kind}`;
  statusEl.textContent = text;
}

async function activeTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function extract(tabId: number): Promise<ExtractedPage | null> {
  try {
    return (await browser.tabs.sendMessage(tabId, { type: "EXTRACT_PAGE" })) as ExtractedPage;
  } catch {
    return null; // content script not available (chrome:// pages, store pages, etc.)
  }
}

/** The stored resume as a message-safe payload; null when none is uploaded. */
async function fetchResume(): Promise<ResumePayload | null> {
  try {
    const { serverUrl, token } = await getSettings();
    const res = await fetch(`${serverUrl}/api/extension/resume`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) {
      bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    }
    return {
      name: decodeURIComponent(res.headers.get("x-resume-name") ?? "resume.pdf"),
      mime: res.headers.get("content-type") ?? "application/pdf",
      b64: btoa(bin),
    };
  } catch {
    return null; // resume attach is best-effort — autofill proceeds without it
  }
}

async function testConnection(): Promise<boolean> {
  try {
    await apiFetch("/api/extension/ping");
    connEl.className = "dot ok";
    return true;
  } catch {
    connEl.className = "dot err";
    return false;
  }
}

async function init() {
  const settings = await getSettings();
  $<HTMLInputElement>("serverUrl").value = settings.serverUrl;
  $<HTMLInputElement>("token").value = settings.token;
  $<HTMLAnchorElement>("openApp").href = settings.serverUrl;
  $<HTMLAnchorElement>("getResume").href = `${settings.serverUrl}/api/profile/resume?download`;

  const connected = await testConnection();
  if (!connected) {
    hintEl.textContent = settings.token
      ? "Can't reach the tracker — is it running?"
      : "Open Settings below and paste your server URL + token.";
  }

  const tab = await activeTab();
  if (tab?.id) {
    const page = await extract(tab.id);
    if (page?.looksLikeJob) {
      hintEl.textContent = page.jsonLd
        ? "Job posting detected (structured data found)."
        : "This looks like a job page.";
    } else if (connected) {
      hintEl.textContent = "No job posting detected here — capture works anyway via AI.";
    }
  }
}

captureBtn.addEventListener("click", async () => {
  captureBtn.disabled = true;
  captureBtn.textContent = "Saving…";
  try {
    const tab = await activeTab();
    if (!tab?.id) throw new Error("No active tab");
    const page = await extract(tab.id);
    if (!page) throw new Error("Can't read this page (try a normal website tab)");

    const save = (allowDuplicate: boolean) =>
      apiFetch<{ job: { id: number; company: string; jobTitle: string } }>(
        "/api/extension/capture",
        {
          method: "POST",
          json: {
            url: page.url,
            title: page.title,
            jsonLd: page.jsonLd,
            pageText: page.pageText,
            allowDuplicate,
          },
        },
      );

    let data;
    try {
      data = await save(false);
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 409 && confirm("Already tracked. Save anyway?")) {
        data = await save(true);
      } else {
        throw e;
      }
    }
    setStatus("ok", `Saved: ${data.job.company} — ${data.job.jobTitle}`);
  } catch (err) {
    setStatus("err", err instanceof Error ? err.message : "Capture failed");
  } finally {
    captureBtn.disabled = false;
    captureBtn.textContent = "Save this job to tracker";
  }
});

autofillBtn.addEventListener("click", async () => {
  autofillBtn.disabled = true;
  autofillBtn.textContent = "Filling…";
  try {
    const tab = await activeTab();
    if (!tab?.id) throw new Error("No active tab");
    const [{ profile }, resume] = await Promise.all([
      apiFetch<{ profile: AutofillProfile }>("/api/extension/profile"),
      fetchResume(),
    ]);
    const result = (await browser.tabs.sendMessage(tab.id, {
      type: "AUTOFILL",
      profile,
      resume: resume ?? undefined,
    })) as AutofillResult;
    const resumeNote = result.resumeAttached
      ? " Resume attached —"
      : resume
        ? " Attach your resume (this form's upload widget refused it), then"
        : " Attach your resume, then";
    setStatus(
      result.filled || result.resumeAttached
        ? "ok"
        : "err",
      result.filled || result.resumeAttached
        ? `Filled ${result.filled} field(s).${resumeNote} review and submit.`
        : "No fillable fields matched — fill your profile in the web app first?",
    );
  } catch (err) {
    setStatus("err", err instanceof Error ? err.message : "Autofill failed");
  } finally {
    autofillBtn.disabled = false;
    autofillBtn.textContent = "Autofill application form";
  }
});

$("save").addEventListener("click", async () => {
  await saveSettings({
    serverUrl: $<HTMLInputElement>("serverUrl").value.trim() || "http://localhost:3000",
    token: $<HTMLInputElement>("token").value.trim(),
  });
  $<HTMLAnchorElement>("openApp").href = (await getSettings()).serverUrl;
  const ok = await testConnection();
  setStatus(ok ? "ok" : "err", ok ? "Connected!" : "Connection failed — check URL and token.");
});

init();
