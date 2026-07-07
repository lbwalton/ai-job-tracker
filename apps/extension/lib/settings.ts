import { browser } from "#imports";

export interface ExtensionSettings {
  serverUrl: string;
  token: string;
}

export async function getSettings(): Promise<ExtensionSettings> {
  const data = await browser.storage.local.get(["serverUrl", "token"]);
  return {
    serverUrl: (data.serverUrl as string) || "http://localhost:3000",
    token: (data.token as string) || "",
  };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await browser.storage.local.set({
    serverUrl: settings.serverUrl.replace(/\/$/, ""),
    token: settings.token.trim(),
  });
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { serverUrl, token } = await getSettings();
  const { json, ...rest } = init ?? {};
  const res = await fetch(`${serverUrl}${path}`, {
    ...rest,
    headers: {
      authorization: `Bearer ${token}`,
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...rest.headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    duplicate?: unknown;
  };
  if (!res.ok) {
    const err = new Error(
      typeof data.error === "string" ? data.error : `Request failed (${res.status})`,
    ) as Error & { status?: number; data?: unknown };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
