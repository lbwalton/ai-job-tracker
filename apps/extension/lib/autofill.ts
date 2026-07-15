/**
 * Runs inside the page: fill application-form fields from the user's saved
 * profile. Works on Greenhouse, Lever, Ashby, Workable and most custom forms
 * by matching each field's label/name/placeholder against keyword rules.
 * Nothing is submitted — the user reviews and clicks Submit themselves.
 */

export interface AutofillProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  currentCompany: string;
  currentTitle: string;
  yearsOfExperience: string;
  workAuthorization: string;
  requiresSponsorship: string;
  desiredSalary: string;
  noticePeriod: string;
  coverLetterTemplate: string;
  customAnswers: Array<{ question: string; answer: string }>;
}

export interface ResumePayload {
  name: string;
  mime: string;
  /** base64-encoded file bytes (message args must be JSON-serializable) */
  b64: string;
}

export interface AutofillResult {
  filled: number;
  skipped: number;
  fields: string[];
  resumeAttached: boolean;
}

type Fillable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Ordered rules — first match wins. More specific patterns come first. */
function buildRules(p: AutofillProfile): Array<{ pattern: RegExp; value: string }> {
  return [
    { pattern: /first[\s_-]?name|given[\s_-]?name/i, value: p.firstName },
    { pattern: /last[\s_-]?name|family[\s_-]?name|surname/i, value: p.lastName },
    {
      pattern: /full[\s_-]?name|^name$|your[\s_-]?name|legal[\s_-]?name/i,
      value: [p.firstName, p.lastName].filter(Boolean).join(" "),
    },
    { pattern: /e-?mail/i, value: p.email },
    { pattern: /phone|mobile|cell/i, value: p.phone },
    { pattern: /linked[\s_-]?in/i, value: p.linkedin },
    { pattern: /git[\s_-]?hub/i, value: p.github },
    { pattern: /portfolio|personal[\s_-]?(web)?site|website|url/i, value: p.portfolio },
    { pattern: /current[\s_-]?(company|employer)|^(company|employer)/i, value: p.currentCompany },
    { pattern: /current[\s_-]?(title|role|position)|job[\s_-]?title/i, value: p.currentTitle },
    { pattern: /years[\s_-]?of[\s_-]?experience|experience[\s_-]?\(?years/i, value: p.yearsOfExperience },
    { pattern: /sponsor(ship)?/i, value: p.requiresSponsorship },
    { pattern: /authoriz|legally|right[\s_-]?to[\s_-]?work|work[\s_-]?permit/i, value: p.workAuthorization },
    { pattern: /salary|compensation|pay[\s_-]?expectation/i, value: p.desiredSalary },
    { pattern: /notice[\s_-]?period|start[\s_-]?date|available/i, value: p.noticePeriod },
    { pattern: /cover[\s_-]?letter|why.*(join|work|interested)/i, value: p.coverLetterTemplate },
    { pattern: /city|location|address/i, value: p.location },
  ];
}

/** Everything the form exposes about a field that can identify it. */
function fieldDescriptor(el: Fillable): string {
  const parts: string[] = [el.name, el.id, el.getAttribute("placeholder") ?? "", el.getAttribute("aria-label") ?? "", el.getAttribute("autocomplete") ?? ""];
  if (el.id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(el.id)}"]`);
    if (label) parts.push(label.innerText);
  }
  const wrappingLabel = el.closest("label");
  if (wrappingLabel) parts.push(wrappingLabel.innerText);
  // Greenhouse/Lever render the question text in a nearby container.
  const container = el.closest(".field, .application-question, [class*='question'], [class*='field'], li, .form-group");
  if (container) {
    const q = container.querySelector("label, legend, .text, [class*='label']");
    if (q) parts.push((q as HTMLElement).innerText);
  }
  return parts.join(" ").slice(0, 300);
}

function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    el.offsetParent !== null &&
    !el.hasAttribute("hidden")
  );
}

/** Set a value the way React/Vue-controlled inputs expect. */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
}

function fillSelect(el: HTMLSelectElement, desired: string): boolean {
  if (!desired) return false;
  const target = desired.toLowerCase();
  const yesNo = /^y(es)?$/i.test(desired) ? "yes" : /^no?$/i.test(desired) ? "no" : null;
  for (const option of el.options) {
    const text = option.text.trim().toLowerCase();
    if (!text) continue;
    if (text === target || text.includes(target) || (yesNo && text.startsWith(yesNo))) {
      el.value = option.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
  }
  return false;
}

/** Attach the stored resume to empty file inputs that ask for a resume/CV. */
function attachResume(resume: ResumePayload): boolean {
  const bytes = Uint8Array.from(atob(resume.b64), (c) => c.charCodeAt(0));
  const file = new File([bytes], resume.name, { type: resume.mime });
  let attached = false;

  for (const el of document.querySelectorAll<HTMLInputElement>("input[type=file]")) {
    if (el.files?.length) continue; // never replace a file the user chose
    const desc = fieldDescriptor(el);
    if (!/resume|\bcv\b|curriculum/i.test(desc)) continue;
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      el.files = dt.files;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      attached = true;
    } catch {
      /* some widgets refuse programmatic files — user attaches manually */
    }
  }
  return attached;
}

export function autofillPage(profile: AutofillProfile, resume?: ResumePayload): AutofillResult {
  const rules = buildRules(profile);
  const custom = profile.customAnswers.filter((qa) => qa.question.trim() && qa.answer.trim());
  const result: AutofillResult = { filled: 0, skipped: 0, fields: [], resumeAttached: false };

  if (resume) result.resumeAttached = attachResume(resume);

  const elements = document.querySelectorAll<Fillable>(
    "input:not([type=hidden]):not([type=file]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea, select",
  );

  for (const el of elements) {
    if (!isVisible(el)) continue;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (el.value.trim()) continue; // never overwrite what's already there
    }
    const desc = fieldDescriptor(el);
    if (!desc.trim()) continue;

    // Custom Q&A first — they're more specific than the generic rules.
    let value: string | null = null;
    for (const qa of custom) {
      const words = qa.question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const hits = words.filter((w) => desc.toLowerCase().includes(w)).length;
      if (words.length && hits / words.length >= 0.6) {
        value = qa.answer;
        break;
      }
    }
    if (value === null) {
      const rule = rules.find((r) => r.pattern.test(desc) && r.value);
      if (rule) value = rule.value;
    }
    if (value === null) {
      result.skipped++;
      continue;
    }

    if (el instanceof HTMLSelectElement) {
      if (fillSelect(el, value)) {
        result.filled++;
        result.fields.push(desc.slice(0, 60).trim());
      } else {
        result.skipped++;
      }
    } else {
      setNativeValue(el, value);
      result.filled++;
      result.fields.push(desc.slice(0, 60).trim());
    }
  }
  return result;
}
