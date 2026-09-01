"use client";

import { ScreenManage } from "@/components/screen-manage";
import { useDashboardChrome } from "@/components/dashboard/chrome";

export function SettingsPage() {
  const { reloadChrome } = useDashboardChrome();
  return <ScreenManage onSaved={() => void reloadChrome()} />;
}
