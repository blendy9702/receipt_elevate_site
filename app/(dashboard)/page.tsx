import type { Metadata } from "next";
import { OverviewPage } from "@/components/dashboard/overview-page";

export const metadata: Metadata = {
  title: "홈 · Receipt Elevate",
};

export default function HomePage() {
  return <OverviewPage />;
}
