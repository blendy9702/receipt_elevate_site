import type { Metadata } from "next";
import { SettingsPage } from "@/components/dashboard/settings-page";

export const metadata: Metadata = {
  title: "화면 관리 · Receipt Elevate",
};

export default function Page() {
  return <SettingsPage />;
}
