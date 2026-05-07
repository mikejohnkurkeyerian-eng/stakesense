"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "stakesense-pwa-dismissed-at";
const RESHOW_AFTER_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PWAInstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      const lastDismissedAt = Number(
        typeof window !== "undefined"
          ? localStorage.getItem(DISMISS_KEY) || "0"
          : "0",
      );
      if (Date.now() - lastDismissedAt > RESHOW_AFTER_MS) {
        setShow(true);
      }
    }
    function onInstalled() {
      setShow(false);
      setEvt(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }

  async function install() {
    if (!evt) return;
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome !== "accepted") dismiss();
    else setShow(false);
    setEvt(null);
  }

  if (!show || !evt) return null;

  return (
    <div
      role="dialog"
      aria-label="Install stakesense"
      className="fixed bottom-4 right-4 z-40 max-w-sm border border-slate-200 rounded-lg bg-white shadow-lg p-4 text-sm"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-semibold text-slate-900">
            Install stakesense
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            One tap from your home screen — no app store, no notifications.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="text-slate-400 hover:text-slate-700 leading-none px-1"
        >
          ×
        </button>
      </div>
      <div className="flex gap-2 justify-end mt-2">
        <button
          onClick={dismiss}
          className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
        >
          Not now
        </button>
        <button
          onClick={install}
          className="px-3 py-1.5 text-xs bg-violet-700 text-white rounded font-medium hover:bg-violet-800"
        >
          Install
        </button>
      </div>
    </div>
  );
}
