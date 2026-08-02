import { requireRole } from "@/lib/session";
import { ScanClient } from "./scan-client";

export default async function ScanPage() {
  await requireRole("STUDENT");
  return <ScanClient />;
}
