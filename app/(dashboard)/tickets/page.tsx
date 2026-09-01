import type { Metadata } from "next";
import { TicketsPage } from "@/components/dashboard/tickets-page";

export const metadata: Metadata = {
  title: "이용권 · Receipt Elevate",
};

export default function Page() {
  return <TicketsPage />;
}
