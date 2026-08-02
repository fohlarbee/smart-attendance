"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { RotatingQr } from "./rotating-qr";
import { CountdownRing } from "./countdown-ring";
import { Button } from "@/components/ui/button";
import { QR_ROTATE_MS, LIVE_POLL_MS } from "@/lib/constants";

type PresentRow = {
  fullName: string;
  matricNumber: string | null;
  markedAt: string;
};

export function BeaconDisplay({
  sessionId,
  courseCode,
  courseTitle,
  label,
  radiusMetres,
}: {
  sessionId: string;
  courseCode: string;
  courseTitle: string;
  label: string | null;
  radiusMetres: number;
}) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [cycle, setCycle] = useState(0);
  const [present, setPresent] = useState<PresentRow[]>([]);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/token`, {
        cache: "no-store",
      });
      if (res.status === 410) {
        router.replace(`/lecturer/session/${sessionId}/summary`);
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setToken(data.token);
      setCycle((c) => c + 1);
      setError(null);
    } catch {
      setError("Lost connection — retrying…");
    }
  }, [sessionId, router]);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/live`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setPresent(data.present ?? []);
    } catch {
      /* ignore transient poll errors */
    }
  }, [sessionId]);

  // Rotate the QR token.
  useEffect(() => {
    fetchToken();
    const t = setInterval(fetchToken, QR_ROTATE_MS);
    return () => clearInterval(t);
  }, [fetchToken]);

  // Poll the live list.
  useEffect(() => {
    fetchLive();
    const t = setInterval(fetchLive, LIVE_POLL_MS);
    return () => clearInterval(t);
  }, [fetchLive]);

  async function endSession() {
    setEnding(true);
    try {
      await fetch(`/api/sessions/${sessionId}/end`, { method: "POST" });
      router.push(`/lecturer/session/${sessionId}/summary`);
    } catch {
      setEnding(false);
      setError("Couldn't end the session. Try again.");
    }
  }

  const firstName = (full: string) => full.split(" ")[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      {/* Beacon */}
      <div className="flex flex-col items-center">
        <div className="mb-6 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-amber">
            {courseCode} · live
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">
            {label ?? courseTitle}
          </h1>
        </div>

        <div className="glow-amber rounded-[2rem] border border-hairline bg-surface p-6 sm:p-10">
          <CountdownRing cycleKey={cycle} durationMs={QR_ROTATE_MS} size={460}>
            {token ? (
              <RotatingQr token={token} size={360} />
            ) : (
              <div className="aspect-square w-[360px] max-w-full animate-pulse rounded-2xl bg-surface-2" />
            )}
          </CountdownRing>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Scan with the Beacon app · code refreshes automatically ·{" "}
          <span className="text-faint">must be within {radiusMetres} m</span>
        </p>
        {error && <p className="mt-2 text-sm text-alert">{error}</p>}
      </div>

      {/* Live list */}
      <div className="flex flex-col">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            Scanned in
          </h2>
          <span className="font-display text-3xl font-semibold text-amber">
            {present.length}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-hairline bg-surface">
          {present.length === 0 ? (
            <p className="p-6 text-sm text-faint">
              Waiting for the first scan…
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              <AnimatePresence initial={false}>
                {present.map((p) => (
                  <motion.li
                    key={`${p.matricNumber ?? p.fullName}-${p.markedAt}`}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.fullName}</p>
                      <p className="font-mono text-xs text-muted">
                        {p.matricNumber ?? "—"}
                      </p>
                    </div>
                    <span className="text-xs text-faint">
                      {new Date(p.markedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        <Button
          variant="danger"
          size="lg"
          className="mt-4"
          onClick={endSession}
          disabled={ending}
        >
          {ending ? "Ending…" : "End session"}
        </Button>
      </div>
    </div>
  );
}
