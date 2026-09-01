import type { Metadata } from "next";
import { PlacesPage } from "@/components/dashboard/places-page";

export const metadata: Metadata = {
  title: "플레이스 · Receipt Elevate",
};

export default function Page() {
  return <PlacesPage />;
}
