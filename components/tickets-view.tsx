"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CountUp } from "@/components/count-up";
import type {
  ChildAccount,
  TicketService,
  TicketsBalanceResponse,
  TicketsLedgerResponse,
  TicketTransaction,
} from "@/lib/types";

const HIDDEN_CODES = new Set(["place"]);

const SERVICE_LABELS: Record<string, string> = {
  review: "리뷰",
  blog: "블로그",
  ncomment: "N 댓글",
  naccount: "N 계정",
  npassword: "N 패스워드",
};

const TYPE_LABELS: Record<string, string> = {
  hold: "홀드",
  use_confirm: "확정",
  hold_release: "해제",
  allocate_out: "지급",
  allocate_in: "수령",
  reclaim_out: "회수",
  reclaim_in: "회수수령",
  admin_grant: "관리자 지급",
  admin_revoke: "관리자 회수",
};

type AccountOption = { id: number; username: string };

function number(value: number | null | undefined) {
  return new Intl.NumberFormat("ko-KR").format(Number(value ?? 0));
}

function apiError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object") {
      const msg = (detail[0] as { msg?: string }).msg;
      if (msg) return msg;
    }
  }
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as { error: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

function visibleTickets(tickets: Record<string, number> | undefined) {
  return Object.entries(tickets ?? {}).filter(([code]) => !HIDDEN_CODES.has(code));
}

function serviceLabel(code: string, names?: Map<string, string>) {
  return names?.get(code) || SERVICE_LABELS[code] || code;
}

function typeLabel(type?: string | null) {
  if (!type) return "—";
  return TYPE_LABELS[type] || type;
}

function formatKst(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).replace("T", " ");
}

function normalizeDescription(value?: string | null) {
  return String(value || "—")
    .replaceAll("일별 hold 통합", "일별 홀드 통합")
    .replaceAll("일별 confirm 통합", "일별 확정 통합")
    .replaceAll("일별 release 통합", "일별 해제 통합")
    .replaceAll("서비스 이용권 hold 확정", "서비스 이용권 홀드 확정")
    .replaceAll("서비스 이용권 hold 해제", "서비스 이용권 홀드 해제")
    .replaceAll("리뷰 작업 이용권 hold", "리뷰 작업 이용권 홀드")
    .replaceAll("서비스 이용권 hold", "서비스 이용권 홀드");
}

function flattenAccounts(accounts: ChildAccount[]): AccountOption[] {
  const seen = new Set<number>();
  const out: AccountOption[] = [];
  const push = (id: number, username: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push({ id, username });
  };
  for (const child of accounts) {
    push(child.id, child.username);
    for (const descendant of child.descendants ?? []) {
      push(descendant.id, descendant.username);
    }
  }
  return out;
}

function filterAccounts(accounts: AccountOption[], query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return accounts;
  return accounts.filter(
    (account) =>
      account.username.toLowerCase().includes(keyword) ||
      String(account.id).includes(keyword),
  );
}

function reviewBlogSummary(tickets: Record<string, number> | undefined) {
  const review = Number(tickets?.review ?? 0);
  const blog = Number(tickets?.blog ?? 0);
  return `리뷰: ${number(review)}개 / 블로그: ${number(blog)}개 / 총합: ${number(review + blog)}개`;
}

function ServiceIcon({ code }: { code: string }) {
  const common = {
    "aria-hidden": true,
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (code === "blog") {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    );
  }
  if (code === "review") {
    return (
      <svg {...common}>
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
        <path d="M8 7h8" />
        <path d="M8 11h8" />
        <path d="M8 15h5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6Z" />
      <path d="M13 5v14" />
    </svg>
  );
}

export function TicketsView({
  services,
  childAccounts,
  onChanged,
}: {
  services: TicketService[];
  childAccounts: ChildAccount[];
  onChanged?: () => void;
}) {
  const nameByCode = useMemo(
    () => new Map(services.map((service) => [service.service_code, service.service_name])),
    [services],
  );
  const lookupAccounts = useMemo(() => flattenAccounts(childAccounts), [childAccounts]);
  const transferAccounts = useMemo(
    () => childAccounts.map((child) => ({ id: child.id, username: child.username })),
    [childAccounts],
  );
  const serviceOptions = useMemo(() => {
    const active = services.filter(
      (service) => service.is_active !== false && !HIDDEN_CODES.has(service.service_code),
    );
    if (active.length) return active;
    return [
      { service_code: "review", service_name: "영수증" },
      { service_code: "blog", service_name: "블로그" },
    ];
  }, [services]);

  const [balance, setBalance] = useState<Record<string, number>>({});
  const [ledger, setLedger] = useState<TicketTransaction[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [lookupTickets, setLookupTickets] = useState<Record<string, number> | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [transferQuery, setTransferQuery] = useState("");
  const [transferId, setTransferId] = useState("");
  const [transferTickets, setTransferTickets] = useState<Record<string, number>>({});
  const [transferService, setTransferService] = useState("review");
  const [transferMode, setTransferMode] = useState<"allocate" | "reclaim">("allocate");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDescription, setTransferDescription] = useState("");
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferNotice, setTransferNotice] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  const lookupOptions = filterAccounts(lookupAccounts, lookupQuery);
  const transferOptions = filterAccounts(transferAccounts, transferQuery);
  const myEntries = visibleTickets(balance);
  const myTotal = myEntries.reduce((sum, [, value]) => sum + Number(value || 0), 0);

  const loadMine = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const res = await fetch("/api/tickets/balance", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as TicketsBalanceResponse;
      setBalance(res.ok ? data.tickets ?? {} : {});
    } catch {
      setBalance({});
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const res = await fetch("/api/tickets/ledger?limit=100&offset=0&collapse_daily=true", {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as TicketsLedgerResponse;
      setLedger(res.ok ? data.transactions ?? [] : []);
    } catch {
      setLedger([]);
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMine();
    void loadLedger();
  }, [loadLedger, loadMine]);

  useEffect(() => {
    if (!lookupId) {
      setLookupTickets(null);
      setLookupError(null);
      return;
    }
    let cancelled = false;
    setLookupLoading(true);
    setLookupError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/tickets/balance/${lookupId}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as TicketsBalanceResponse & {
          detail?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setLookupTickets(null);
          setLookupError(apiError(data, "계정 이용권을 불러오지 못했습니다."));
          return;
        }
        setLookupTickets(data.tickets ?? {});
      } catch {
        if (!cancelled) {
          setLookupTickets(null);
          setLookupError("계정 이용권을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lookupId]);

  useEffect(() => {
    if (!transferId) {
      setTransferTickets({});
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/tickets/balance/${transferId}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as TicketsBalanceResponse;
        if (!cancelled) setTransferTickets(res.ok ? data.tickets ?? {} : {});
      } catch {
        if (!cancelled) setTransferTickets({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transferId]);

  const submitTransfer = async () => {
    const targetUserId = Number(transferId);
    const quantity = Number(transferAmount.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      setTransferError("자식 계정을 선택해주세요.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setTransferError("수량을 입력해주세요.");
      return;
    }
    const selected = transferAccounts.find((account) => account.id === targetUserId);
    const label = selected ? `${selected.username} (ID: ${selected.id})` : String(targetUserId);
    const modeText = transferMode === "allocate" ? "분배" : "회수";
    const confirmText =
      transferMode === "allocate"
        ? `자식 계정 ${label}에게 ${number(quantity)} ${transferService} 이용권을 분배하시겠습니까?`
        : `자식 계정 ${label}으로부터 ${number(quantity)} ${transferService} 이용권을 회수하시겠습니까?`;
    if (!window.confirm(confirmText)) return;

    setTransferBusy(true);
    setTransferError(null);
    setTransferNotice(null);
    try {
      const res = await fetch("/api/tickets/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_user_id: targetUserId,
          service_code: transferService,
          quantity,
          mode: transferMode,
          description: transferDescription.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        out?: { balance_after?: number };
        in?: { balance_after?: number };
        detail?: string;
      };
      if (!res.ok) throw new Error(apiError(data, `${modeText}에 실패했습니다.`));
      setTransferNotice(
        `${modeText} 완료 · 서비스 ${serviceLabel(transferService, nameByCode)} · 수량 ${number(quantity)} · 출금 후 ${number(data.out?.balance_after)} · 입금 후 ${number(data.in?.balance_after)}`,
      );
      setTransferAmount("");
      setTransferDescription("");
      setTransferId("");
      setTransferQuery("");
      setTransferTickets({});
      await Promise.all([loadMine(), loadLedger()]);
      onChanged?.();
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : "이용권 이동에 실패했습니다.");
    } finally {
      setTransferBusy(false);
    }
  };

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">TICKETS</p>
          <h1>이용권 관리</h1>
          <p className="section-description">전체 <CountUp value={myTotal} active={!balanceLoading} /></p>
        </div>
        <button type="button" className="primary-outline-button" onClick={() => void loadMine()}>
          잔액 새로고침
        </button>
      </div>

      <section className="ticket-balance-grid">
        <div className="total-balance-card">
          <span>내 이용권 현황</span>
          <strong>{balanceLoading ? "…" : <CountUp value={myTotal} />}</strong>
          <p>
            {myEntries.length
              ? myEntries.map(([code, amount]) => `${serviceLabel(code, nameByCode)} ${number(amount)}`).join(" / ")
              : "이용권 정보가 없습니다"}
          </p>
        </div>
        {myEntries.map(([code, amount], index) => (
          <div className="service-balance-card" key={code}>
            <div className={`service-mark tone-${index % 3}`}>
              <ServiceIcon code={code} />
            </div>
            <div>
              <span>{serviceLabel(code, nameByCode)}</span>
              <strong><CountUp value={Number(amount || 0)} /></strong>
            </div>
          </div>
        ))}
      </section>

      <div className="ticket-manage-grid">
        <section className="content-card ticket-panel">
          <h2>계정 이용권 조회</h2>
          <div className="ticket-field-row">
            <label className="modal-field">
              닉네임 또는 ID 검색
              <input
                value={lookupQuery}
                onChange={(event) => setLookupQuery(event.target.value)}
                placeholder="닉네임 또는 ID 검색"
              />
            </label>
            <label className="modal-field">
              계정 선택
              <select value={lookupId} onChange={(event) => setLookupId(event.target.value)}>
                <option value="">계정 선택</option>
                {lookupOptions.map((account) => (
                  <option key={account.id} value={String(account.id)}>
                    {account.username} (ID: {account.id})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="ticket-lookup-result">
            {!lookupId ? (
              <p>계정을 선택하면 이용권 현황이 표시됩니다.</p>
            ) : lookupLoading ? (
              <p>불러오는 중…</p>
            ) : lookupError ? (
              <p className="is-error">{lookupError}</p>
            ) : (
              <>
                <strong>합계 <CountUp key={`${lookupId}-total`} value={visibleTickets(lookupTickets ?? {}).reduce((sum, [, value]) => sum + Number(value || 0), 0)} /></strong>
                <ul>
                  {visibleTickets(lookupTickets ?? {}).map(([code, amount]) => (
                    <li key={code}>
                      <span>{serviceLabel(code, nameByCode)}</span>
                      <b><CountUp key={`${lookupId}-${code}`} value={Number(amount || 0)} /></b>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <section className="content-card ticket-panel">
          <h2>부모 이용권 분배/회수</h2>
          <p className="ticket-child-balance">{reviewBlogSummary(transferTickets)}</p>
          <div className="ticket-field-row">
            <label className="modal-field">
              자식 계정
              <input
                value={transferQuery}
                onChange={(event) => setTransferQuery(event.target.value)}
                placeholder="닉네임 또는 ID 검색"
              />
            </label>
            <label className="modal-field">
              계정 선택
              <select value={transferId} onChange={(event) => setTransferId(event.target.value)}>
                <option value="">자식 계정 선택</option>
                {transferOptions.map((account) => (
                  <option key={account.id} value={String(account.id)}>
                    {account.username} (ID: {account.id})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="ticket-field-row">
            <label className="modal-field">
              서비스
              <select value={transferService} onChange={(event) => setTransferService(event.target.value)}>
                {serviceOptions.map((service) => (
                  <option key={service.service_code} value={service.service_code}>
                    {service.service_name || SERVICE_LABELS[service.service_code] || service.service_code}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              모드
              <select
                value={transferMode}
                onChange={(event) => setTransferMode(event.target.value as "allocate" | "reclaim")}
              >
                <option value="allocate">분배</option>
                <option value="reclaim">회수</option>
              </select>
            </label>
          </div>
          <div className="ticket-field-row">
            <label className="modal-field">
              수량
              <input
                type="number"
                min={1}
                step={1}
                value={transferAmount}
                onChange={(event) => setTransferAmount(event.target.value)}
                placeholder="수량을 입력하세요."
              />
            </label>
            <label className="modal-field">
              설명
              <input
                value={transferDescription}
                onChange={(event) => setTransferDescription(event.target.value)}
                placeholder="설명을 작성해 주세요"
              />
            </label>
          </div>
          <button
            type="button"
            className="solid-button"
            disabled={transferBusy}
            onClick={() => void submitTransfer()}
          >
            {transferBusy ? "처리 중" : "적용"}
          </button>
          {transferNotice ? <div className="modal-notice">{transferNotice}</div> : null}
          {transferError ? <div className="modal-notice is-error">{transferError}</div> : null}
          {!transferAccounts.length ? (
            <p className="field-hint">직속 하위 계정이 있어야 분배/회수를 할 수 있습니다.</p>
          ) : null}
        </section>
      </div>

      <section className="content-card ledger-card">
        <div className="card-heading">
          <div>
            <h2>내 거래내역</h2>
          </div>
          <button type="button" className="solid-button" onClick={() => void loadLedger()} disabled={ledgerLoading}>
            {ledgerLoading ? "조회 중" : "조회"}
          </button>
        </div>
        <div className="ticket-ledger-wrap">
          <table className="ticket-ledger-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>서비스</th>
                <th>유형</th>
                <th>수량</th>
                <th>서비스 잔여</th>
                <th>설명</th>
              </tr>
            </thead>
            <tbody>
              {ledgerLoading && !ledger.length ? (
                <tr>
                  <td colSpan={6}>불러오는 중…</td>
                </tr>
              ) : null}
              {!ledgerLoading && !ledger.length ? (
                <tr>
                  <td colSpan={6}>거래내역이 없습니다</td>
                </tr>
              ) : null}
              {ledger.map((item) => {
                const amount = Number(item.amount || 0);
                const positive = amount >= 0;
                return (
                  <tr key={item.id}>
                    <td>{formatKst(item.created_at)}</td>
                    <td>{serviceLabel(item.service_code, nameByCode)}</td>
                    <td>{typeLabel(item.tx_type)}</td>
                    <td className={positive ? "is-plus" : "is-minus"}>
                      {positive ? "+" : ""}
                      {number(amount)}개
                    </td>
                    <td>{number(item.balance_after)}개</td>
                    <td className="is-desc">{normalizeDescription(item.description)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
