/** Fetch a job posting URL server-side and reduce it to parseable text. */
export async function fetchUrlContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Fetching the URL failed (HTTP ${res.status})`);
  const html = await res.text();

  // Prefer structured data when the site provides it.
  const jsonLdBlocks = [...html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )];
  for (const m of jsonLdBlocks) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      const posting = items.find((i) => i?.["@type"] === "JobPosting");
      if (posting) {
        return `URL: ${url}\nJSON-LD JobPosting:\n${JSON.stringify(posting).slice(0, 20000)}`;
      }
    } catch {
      // ignore malformed blocks
    }
  }

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;|&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 200) {
    throw new Error(
      "The page returned too little readable content (it may require JavaScript or block bots). Paste the posting text instead.",
    );
  }
  return `URL: ${url}\nPage text:\n${text}`;
}
