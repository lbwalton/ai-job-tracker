/** Runs inside the page: pull out whatever identifies the job posting. */

export interface ExtractedPage {
  url: string;
  title: string;
  jsonLd: Record<string, unknown> | null;
  pageText: string;
  looksLikeJob: boolean;
}

function findJobPostingJsonLd(): Record<string, unknown> | null {
  for (const script of document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  )) {
    try {
      const data = JSON.parse(script.textContent ?? "");
      const items: unknown[] = Array.isArray(data)
        ? data
        : data?.["@graph"] && Array.isArray(data["@graph"])
          ? data["@graph"]
          : [data];
      for (const item of items) {
        if (
          item &&
          typeof item === "object" &&
          (item as Record<string, unknown>)["@type"] === "JobPosting"
        ) {
          return item as Record<string, unknown>;
        }
      }
    } catch {
      // malformed JSON-LD — ignore
    }
  }
  return null;
}

function visibleText(): string {
  const main =
    document.querySelector("main") ??
    document.querySelector("[role='main']") ??
    document.body;
  return (main.innerText || "").replace(/\n{3,}/g, "\n\n").slice(0, 16000);
}

const JOB_URL_HINTS =
  /greenhouse\.io|lever\.co|ashbyhq\.com|workday|icims|smartrecruiters|jobvite|linkedin\.com\/jobs|indeed\.com\/(viewjob|job)|glassdoor\.com\/job|careers?|jobs?\//i;
const JOB_TEXT_HINTS =
  /apply now|responsibilities|qualifications|job description|what you.ll do|about the role/i;

export function extractPage(): ExtractedPage {
  const jsonLd = findJobPostingJsonLd();
  const pageText = visibleText();
  return {
    url: location.href,
    title: document.title,
    jsonLd,
    pageText,
    looksLikeJob:
      Boolean(jsonLd) || JOB_URL_HINTS.test(location.href) || JOB_TEXT_HINTS.test(pageText),
  };
}
