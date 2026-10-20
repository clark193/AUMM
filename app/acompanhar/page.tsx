import type { Metadata } from "next";
import { LiveLocationViewer } from "@/components/LiveLocationViewer";
export const metadata: Metadata = { title: "Acompanhar localização · AUMM", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function TrackingPage() { return <LiveLocationViewer />; }
