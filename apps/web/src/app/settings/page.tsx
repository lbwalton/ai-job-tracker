"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/client";

interface Settings {
  aiConfigured: boolean;
  gmailConfigured: boolean;
  gmailConnected: boolean;
  extensionToken: string;
  appUrl: string;
  syncIntervalMinutes: number;
}

function SettingsInner() {
  const params = useSearchParams();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [interval, setIntervalMin] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const s = await api<Settings>("/api/settings");
    setSettings(s);
    setIntervalMin(String(s.syncIntervalMinutes));
  }, []);

  useEffect(() => {
    load();
    const gmail = params.get("gmail");
    if (gmail === "connected") setNotice({ kind: "ok", text: "Gmail connected!" });
    if (gmail === "error" || gmail === "denied")
      setNotice({ kind: "err", text: "Gmail connection failed — check your OAuth settings." });
  }, [load, params]);

  async function disconnectGmail() {
    await api("/api/gmail/sync", { method: "DELETE" });
    setNotice({ kind: "ok", text: "Gmail disconnected." });
    load();
  }

  async function saveSyncInterval() {
    const minutes = Number(interval);
    if (!Number.isFinite(minutes)) return;
    const res = await api<{ syncIntervalMinutes: number }>("/api/settings", {
      method: "POST",
      json: { action: "setSyncInterval", minutes },
    });
    setIntervalMin(String(res.syncIntervalMinutes));
    setNotice({
      kind: "ok",
      text: `Auto-sync interval set to ${res.syncIntervalMinutes} minutes.`,
    });
  }

  async function regenerateToken() {
    if (!confirm("Regenerate? The extension will need the new token.")) return;
    await api("/api/settings", { method: "POST", json: { action: "regenerateExtensionToken" } });
    load();
  }

  async function importBackup(file: File) {
    try {
      const text = await file.text();
      const data = await api<{ imported: number; skipped: number }>("/api/import", {
        method: "POST",
        body: text,
        headers: { "content-type": "application/json" },
      });
      setNotice({
        kind: "ok",
        text: `Imported ${data.imported} job(s), skipped ${data.skipped} (duplicates/invalid).`,
      });
    } catch (err) {
      setNotice({ kind: "err", text: err instanceof Error ? err.message : "Import failed" });
    }
  }

  if (!settings) return <p className="muted">Loading…</p>;

  const check = (ok: boolean) => (ok ? "✅" : "⚠️");

  return (
    <div>
      <h1>Settings</h1>
      {notice && <div className={`notice ${notice.kind}`}>{notice.text}</div>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{check(settings.aiConfigured)} AI (Claude API)</h2>
        {settings.aiConfigured ? (
          <p className="muted">
            Configured. Job parsing and email classification are enabled.
          </p>
        ) : (
          <p>
            Add <code className="kbd">ANTHROPIC_API_KEY</code> to{" "}
            <code className="kbd">apps/web/.env.local</code> and restart. Get a key at{" "}
            <a href="https://platform.claude.com" target="_blank" rel="noreferrer">
              platform.claude.com
            </a>
            . Parsing a job or classifying an email costs a fraction of a cent.
          </p>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>
          {check(settings.gmailConnected)} Gmail Monitoring
        </h2>
        {!settings.gmailConfigured ? (
          <p>
            Set <code className="kbd">GOOGLE_CLIENT_ID</code> and{" "}
            <code className="kbd">GOOGLE_CLIENT_SECRET</code> in{" "}
            <code className="kbd">apps/web/.env.local</code>. See{" "}
            <code className="kbd">docs/SETUP.md</code> for the 5-minute Google Cloud walkthrough
            (read-only Gmail scope).
          </p>
        ) : settings.gmailConnected ? (
          <>
            <div className="row">
              <span className="muted">
                Connected. Emails sync on demand (Dashboard → Sync Gmail) or on the schedule
                below.
              </span>
              <div className="spacer" />
              <button className="btn danger" onClick={disconnectGmail}>
                Disconnect
              </button>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <div className="field">
                <label>Auto-sync interval (minutes, 5–720)</label>
                <input
                  type="number"
                  min={5}
                  max={720}
                  value={interval}
                  onChange={(e) => setIntervalMin(e.target.value)}
                  style={{ width: 120 }}
                />
              </div>
              <button className="btn" onClick={saveSyncInterval} style={{ alignSelf: "end" }}>
                Save
              </button>
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>
              Applies to any scheduled caller (launchd/cron) that reads this setting — no
              reload needed.
            </p>
          </>
        ) : (
          <a className="btn primary" href="/api/gmail/auth">
            Connect Gmail
          </a>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Chrome Extension</h2>
        <ol className="muted" style={{ paddingLeft: 18, marginTop: 0 }}>
          <li>
            Build it: <code className="kbd">npm run build:extension</code>, then load{" "}
            <code className="kbd">apps/extension/.output/chrome-mv3</code> via{" "}
            <code className="kbd">chrome://extensions</code> → “Load unpacked”.
          </li>
          <li>Open the extension popup → Settings, and paste the values below.</li>
        </ol>
        <div className="form-grid">
          <div className="field">
            <label>Server URL</label>
            <input type="text" readOnly value={settings.appUrl} onFocus={(e) => e.target.select()} />
          </div>
          <div className="field">
            <label>Extension Token</label>
            <input
              type="text"
              readOnly
              className="mono"
              value={settings.extensionToken}
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={regenerateToken}>
            Regenerate Token
          </button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Data</h2>
        <div className="row">
          <a className="btn" href="/api/export">
            Export Backup (JSON)
          </a>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Import Backup (v1 or v2 JSON)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importBackup(f);
              e.target.value = "";
            }}
          />
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          Your old single-file tracker’s “Export Backup” file imports directly — duplicates are
          skipped.
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <SettingsInner />
    </Suspense>
  );
}
