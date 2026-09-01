"use client";

import { useEffect, useState } from "react";
import { useDashboardChrome } from "@/components/dashboard/chrome";
import { TicketsView } from "@/components/tickets-view";
import { goLoginIfUnauthorized } from "@/lib/format";
import type { TicketService } from "@/lib/types";

export function TicketsPage() {
  const { children, refreshEpoch, reloadChrome } = useDashboardChrome();
  const [services, setServices] = useState<TicketService[]>([]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/upstream/tickets/services", { cache: "no-store" });
      if (goLoginIfUnauthorized(response)) return;
      if (!response.ok) return;
      const data = (await response.json()) as { services?: TicketService[] };
      setServices(data.services ?? []);
    })();
  }, [refreshEpoch]);

  return (
    <TicketsView
      key={refreshEpoch}
      services={services}
      childAccounts={children}
      onChanged={() => void reloadChrome()}
    />
  );
}
