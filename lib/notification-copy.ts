import type { NotificationItem } from "@/lib/types";

const TITLE_BY_TYPE: Record<string, string> = {
  point_insufficient_hold: "포인트 부족",
  script_upload_image_issue: "원고&사진 추가 이미지 이슈",
  manual_image_generation_started: "수동 이미지생성 시작",
  manual_image_generation_result: "수동 이미지생성 결과",
  manual_script_replenish_started: "수동 원고보충 시작",
  manual_script_replenish_result: "수동 원고보충 결과",
  manual_unassign_started: "수동 작업해제 시작",
  manual_unassign_result: "수동 작업해제 결과",
  scheduler_image_generation_result: "스케줄러 이미지생성 결과",
  auto_post_missing_biz_no: "자동발행 제외 플레이스",
  naver_local_token_generation_failed: "네이버 토큰 생성 실패",
  place_update_packet_tamper: "플레이스 수정 보안 경고",
  missing_as_run_progress: "누락 A/S 진행중",
  missing_as_run_summary: "누락 A/S 실행 결과",
  missing_as_validation_failed: "누락 A/S 검증 실패",
  missing_as_assets_shortage: "누락 A/S 재고 부족",
  missing_as_allocation_failed: "누락 A/S 배정 실패",
};

function payloadOf(item: NotificationItem) {
  return item.payload ?? {};
}

function str(value: unknown) {
  return typeof value === "string" ? value : "";
}

function num(value: unknown) {
  return Number(value || 0);
}

function formatElapsed(seconds: unknown) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 60) return `소요 ${Math.round(n)}초`;
  const m = Math.floor(n / 60);
  const s = Math.round(n % 60);
  return s ? `소요 ${m}분 ${s}초` : `소요 ${m}분`;
}

export function notificationTitle(item: NotificationItem) {
  const type = String(item.notification_type || "");
  if (TITLE_BY_TYPE[type]) return TITLE_BY_TYPE[type];
  if (type.startsWith("place_image_generation_started_")) return "플레이스 이미지생성 시작";
  if (type.startsWith("place_image_generation_result_")) return "플레이스 이미지생성 결과";
  return type || item.title || "알림";
}

function bodyLines(item: NotificationItem): string[] {
  const p = payloadOf(item);
  const type = String(item.notification_type || "");

  if (type === "place_update_packet_tamper") {
    const fields = Array.isArray(p.forbidden_fields) ? p.forbidden_fields.join(", ") : "";
    return [
      str(p.message) || "허용되지 않은 플레이스 수정 요청이 감지되었습니다.",
      p.actor_username ? `사용자: ${p.actor_username} (${p.actor_role || "-"})` : "",
      p.place_name ? `플레이스: ${p.place_name} (ID ${p.place_id || "-"})` : "",
      fields ? `금지 필드: ${fields}` : "",
      p.client_ip ? `IP: ${p.client_ip}` : "",
      num(item.attempt_count) > 1 ? `오늘 누적 시도: ${num(item.attempt_count)}회` : "",
    ].filter(Boolean);
  }

  if (type === "point_insufficient_hold") {
    const amt = num(item.shortage_amount_total).toLocaleString("ko-KR");
    const lineage = p.lineage as { display_path?: string } | undefined;
    const path = str(lineage?.display_path).trim();
    return path ? [`누적 부족 포인트: ${amt}`, `계층: ${path}`] : [`누적 부족 포인트: ${amt}`];
  }

  if (type === "script_upload_image_issue") {
    const placeName = str(item.place_name || p.place_name || p.placename).trim();
    const placeAlias = str(item.place_alias || p.place_alias).trim();
    const placeId = item.place_id ?? p.place_id ?? "-";
    const created = num(p.created);
    const skipped = num(p.skipped_duplicates);
    const totalLines = num(p.total_lines);
    const mapped = num(p.images_mapped);
    const ignored = num(p.images_ignored);
    const failed = num(p.failed_image_count);
    const stage = str(p.stage).trim();
    const imageMode = str(p.image_mode).trim();
    const ignoredFolderLines = Array.isArray(p.ignored_folder_lines)
      ? p.ignored_folder_lines.filter((v) => v != null && String(v).trim() !== "")
      : [];
    const invalidFolderEntries = Array.isArray(p.invalid_folder_entries)
      ? p.invalid_folder_entries.filter((v) => v != null && String(v).trim() !== "")
      : [];
    const parts = [
      placeName ? `플레이스: ${placeName}` : "",
      placeAlias ? `alias: ${placeAlias}` : "",
      placeId !== "-" ? `place_id: ${placeId}` : "",
    ].filter(Boolean);
    if (stage === "image_mapping") {
      if (totalLines > 0) parts.push(`원고 ${totalLines}줄 확인`);
      if (skipped > 0) parts.push(`중복 원고 ${skipped}건 제외`);
      if (created > 0 || skipped > 0) parts.push(`새 원고 ${created}건 등록`);
      if (mapped > 0) parts.push(`이미지 ${mapped}건 연결`);
      if (ignored > 0) {
        if (imageMode === "sequential" && created > 0) {
          parts.push(`이미지 ${ignored}건은 새 원고보다 많아 연결되지 않음`);
        } else if (ignoredFolderLines.length) {
          parts.push(`라인 번호가 맞지 않은 이미지 ${ignored}건`);
        } else if (invalidFolderEntries.length) {
          parts.push(`폴더 형식 오류로 이미지 ${ignored}건 제외`);
        } else {
          parts.push(`이미지 ${ignored}건 연결 누락`);
        }
      }
      if (failed > 0) parts.push(`이미지 저장 실패 ${failed}건`);
      if (ignoredFolderLines.length) parts.push(`범위 밖 폴더: ${ignoredFolderLines.join(",")}`);
      if (invalidFolderEntries.length) parts.push(`잘못된 폴더명: ${invalidFolderEntries.join(",")}`);
    } else if (ignored > 0 || failed > 0) {
      parts.push(`누락 ${Math.max(ignored, failed)}건`);
    }
    if (stage) parts.push(`stage: ${stage}`);
    return parts.length ? parts : ["원고&사진 추가 중 이미지 이슈가 발생했습니다."];
  }

  const progressTypes =
    type === "manual_image_generation_started" ||
    type === "manual_image_generation_result" ||
    type.startsWith("place_image_generation_started_") ||
    type.startsWith("place_image_generation_result_") ||
    type === "scheduler_image_generation_result" ||
    type === "manual_script_replenish_started" ||
    type === "manual_script_replenish_result" ||
    type === "manual_unassign_started" ||
    type === "manual_unassign_result" ||
    type === "naver_local_token_generation_failed" ||
    type === "missing_as_run_progress" ||
    type === "missing_as_run_summary" ||
    type === "missing_as_validation_failed" ||
    type === "missing_as_assets_shortage" ||
    type === "missing_as_allocation_failed";

  if (progressTypes) {
    const parts: string[] = [];
    if (str(p.message)) parts.push(str(p.message));
    if (p.actor_username) parts.push(`관리자: ${p.actor_username}`);
    if (p.task_id) parts.push(`task_id: ${p.task_id}`);
    if (p.place_id) parts.push(`MID: ${p.place_id}`);
    if (typeof p.attempts === "number") parts.push(`재시도: ${p.attempts}회`);
    if (typeof p.percent === "number" && typeof p.total === "number") {
      parts.push(`진행률: ${p.processed || 0}/${p.total} (${p.percent}%)`);
    }
    if (Array.isArray(p.failure_reasons) && p.failure_reasons.length) {
      const reasonLines = p.failure_reasons.map((reason) => {
        const rec = (reason ?? {}) as Record<string, unknown>;
        const count = num(rec.count);
        const label = str(rec.label || rec.code || "원인 미확인").trim();
        const detail = str(rec.detail).trim();
        const examples = Array.isArray(rec.examples)
          ? rec.examples.map((v) => String(v || "").trim()).filter(Boolean)
          : [];
        let line = `- ${label}: ${count}건`;
        if (detail && detail !== label) line += ` (${detail})`;
        if (examples.length) line += `\n  예: ${examples.join(", ")}`;
        return line;
      });
      parts.push(`실패/스킵 상세:\n${reasonLines.join("\n")}`);
    }
    if (p.phase_label) parts.push(`단계: ${p.phase_label}`);
    if (p.current_place) parts.push(`현재 플레이스: ${p.current_place}`);
    if (typeof p.client_count === "number") parts.push(`대상 클라이언트: ${p.client_count}개`);
    if (typeof p.generated_total === "number") parts.push(`생성 영수증: ${p.generated_total}건`);
    if (typeof p.generated === "number") parts.push(`생성 영수증: ${p.generated}건`);
    if (typeof p.requested === "number") parts.push(`요청 영수증: ${p.requested}건`);
    if (p.place_name) parts.push(`플레이스: ${p.place_name}`);
    if (p.note) parts.push(`note: ${p.note}`);
    if (typeof p.failed_count === "number") parts.push(`실패 플레이스: ${p.failed_count}개`);
    if (Array.isArray(p.failed_places) && p.failed_places.length) {
      parts.push(`실패 목록:\n${p.failed_places.join("\n")}`);
    }
    if (typeof p.created_total === "number") parts.push(`생성 원고: ${p.created_total}건`);
    if (typeof p.touched_places === "number") parts.push(`대상 플레이스: ${p.touched_places}개`);
    if (typeof p.updated_jobs === "number") parts.push(`해제 작업: ${p.updated_jobs}건`);
    if (typeof p.updated_receipts === "number") parts.push(`되돌린 영수증: ${p.updated_receipts}건`);
    if (typeof p.deleted_cycle_logs === "number") parts.push(`삭제 cycle log: ${p.deleted_cycle_logs}건`);
    const elapsed = formatElapsed(p.elapsed_seconds);
    if (elapsed) parts.push(elapsed);
    return parts.length ? parts : ["-"];
  }

  if (str(p.message)) return [str(p.message)];
  if (item.body) return [item.body];
  return ["-"];
}

export function notificationBody(item: NotificationItem) {
  return bodyLines(item).join("\n");
}

export function notificationCopy(item: NotificationItem) {
  return {
    title: notificationTitle(item),
    body: notificationBody(item),
  };
}
