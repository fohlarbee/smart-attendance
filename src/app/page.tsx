import Link from "next/link";
import { getCurrentUser, dashboardPathFor } from "@/lib/auth";
import { QrGlyph } from "@/components/qr-glyph";

export default async function Home() {
  const user = await getCurrentUser();
  const cta = user ? dashboardPathFor(user.role) : "/login";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-amber font-display font-bold text-ink">
            B
          </span>
          <span className="font-display font-semibold">Beacon</span>
        </div>
        <Link
          href={cta}
          className="inline-flex h-10 items-center rounded-lg border border-hairline px-4 text-sm text-fg transition-colors hover:border-amber/60"
        >
          {user ? "Dashboard" : "Sign in"}
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-16 px-6 py-12 lg:grid-cols-[1.1fr_1fr]">
        {/* Thesis */}
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1 text-xs uppercase tracking-widest text-amber">
            <span className="h-1.5 w-1.5 rounded-full bg-amber" />
            Rotating-QR attendance
          </p>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Attendance that
            <br />
            <span className="text-amber">can&apos;t be faked.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
            The code on the lecturer&apos;s screen changes every few seconds, and a
            scan only counts inside the room. A screenshot sent to an absent friend
            is dead on arrival.
          </p>

          <div className="mt-9 flex items-center gap-3">
            <Link
              href={cta}
              className="inline-flex h-12 items-center rounded-xl bg-amber px-6 font-semibold text-ink transition-colors hover:bg-amber-soft"
            >
              {user ? "Go to dashboard" : "Get started"}
            </Link>
            <span className="text-sm text-faint">No app to install.</span>
          </div>

          <dl className="mt-14 grid max-w-md grid-cols-3 gap-6">
            {[
              { t: "Rotating code", d: "Expires in seconds" },
              { t: "Location check", d: "Must be in the room" },
              { t: "One device", d: "No signing for friends" },
            ].map((f) => (
              <div key={f.t}>
                <dt className="font-display text-sm font-semibold text-fg">
                  {f.t}
                </dt>
                <dd className="mt-1 text-xs text-muted">{f.d}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Signature: the beacon */}
        <div className="flex justify-center lg:justify-end">
          <div className="relative">
            <div
              aria-hidden
              className="beacon-pulse absolute -inset-8 rounded-[2.5rem] bg-amber/10 blur-2xl"
            />
            <div className="glow-amber relative grid aspect-square w-[18rem] place-items-center overflow-hidden rounded-[2rem] border border-hairline bg-surface p-9 sm:w-[22rem]">
              <QrGlyph className="h-full w-full text-fg" />
              <div
                aria-hidden
                className="scan-sweep pointer-events-none absolute inset-x-6 h-16 rounded-full bg-gradient-to-b from-transparent via-amber/40 to-transparent blur-md"
              />
            </div>
            <p className="mt-4 text-center font-mono text-xs text-faint">
              rotates every 20s · location-checked
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
