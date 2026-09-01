import type { Metadata } from "next";
import { NotificationsPage } from "@/components/dashboard/notifications-page";

export const metadata: Metadata = {
  title: "알림 · Receipt Elevate",
};

export default function Page() {
  return <NotificationsPage />;
}
