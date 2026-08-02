"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { AnimatePresence, motion } from "motion/react";

/**
 * The beacon's QR. Each rotation the whole code changes; we crossfade the frame
 * (opacity/scale, ease-out) rather than animating the modules themselves, which
 * would be noisy and defeat scanning. See plan "Motion rules".
 */
export function RotatingQr({ token, size = 460 }: { token: string; size?: number }) {
  const [frame, setFrame] = useState<{ token: string; src: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(token, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: size,
      color: { dark: "#0b0f14", light: "#f5f7fa" },
    })
      .then((src) => {
        if (!cancelled) setFrame({ token, src });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, size]);

  return (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#f5f7fa]"
      style={{ maxWidth: size }}
    >
      <AnimatePresence mode="popLayout">
        {frame && (
          <motion.img
            key={frame.token}
            src={frame.src}
            alt="Attendance QR code"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 h-full w-full"
            draggable={false}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
