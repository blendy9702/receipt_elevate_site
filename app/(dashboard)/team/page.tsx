import type { Metadata } from "next";
import { TeamPage } from "@/components/dashboard/team-page";

export const metadata: Metadata = {
  title: "하위 계정 · Receipt Elevate",
};

export default function Page() {
  return <TeamPage />;
}
