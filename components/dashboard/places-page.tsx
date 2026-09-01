"use client";

import { useEffect, useState } from "react";
import { ErrorBanner, SectionHeader } from "@/components/dashboard/ui";
import { useDashboardChrome } from "@/components/dashboard/chrome";
import { PlaceWorkspace } from "@/components/place-workspace";
import { goLoginIfUnauthorized, number } from "@/lib/format";
import type { PlaceStatsResponse } from "@/lib/types";

export function PlacesPage() {
  const { refreshEpoch, reloadChrome } = useDashboardChrome();
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [localEpoch, setLocalEpoch] = useState(0);

  const loadStats = async () => {
    setError(null);
    const response = await fetch("/api/management/place-stats", { cache: "no-store" });
    if (goLoginIfUnauthorized(response)) return;
    if (!response.ok) {
      setError("플레이스 정보를 불러오지 못했습니다.");
      return;
    }
    const data = (await response.json()) as PlaceStatsResponse;
    setTotal(Number(data.registered_places ?? 0));
  };

  useEffect(() => {
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshEpoch]);

  return (
    <>
      <SectionHeader
        eyebrow="MY PLACES"
        title="플레이스"
        description={`내게 배정된 플레이스 ${number(total)}곳`}
      />
      {error ? <ErrorBanner message={error} onRetry={() => void loadStats()} /> : null}
      <PlaceWorkspace
        reloadToken={refreshEpoch + localEpoch}
        onRefresh={() => {
          void reloadChrome();
          void loadStats();
          setLocalEpoch((current) => current + 1);
        }}
      />
    </>
  );
}
