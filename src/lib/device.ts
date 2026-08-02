// Optional one-device-per-session layer (SPEC.md §7).
//
// Produces a stable-ish hash of the current browser/device from signals that don't
// require permissions. It is deliberately coarse: it stops one phone from marking
// several students in the SAME session, not a determined attacker. Two devices with
// identical characteristics could collide — acceptable for the "plus" layer, and it
// resets every session.

async function sha256Hex(input: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Non-crypto fallback for insecure contexts (djb2).
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function canvasSignature(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 40, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("beacon", 2, 2);
    return canvas.toDataURL();
  } catch {
    return "no-canvas";
  }
}

/** Compute a device hash for the current browser. Best-effort; never throws. */
export async function getDeviceHash(): Promise<string> {
  const signals = [
    navigator.userAgent,
    navigator.language,
    (navigator.languages ?? []).join(","),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(new Date().getTimezoneOffset()),
    String(navigator.hardwareConcurrency ?? ""),
    canvasSignature(),
  ].join("|");
  return sha256Hex(signals);
}
