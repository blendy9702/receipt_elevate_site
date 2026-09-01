const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const authBase = stripTrailingSlash(
  process.env.EXTERNAL_AUTH_BASE ?? "http://127.0.0.1:8000",
);
const internalBase = stripTrailingSlash(
  process.env.INTERNAL_API_BASE ?? "http://127.0.0.1:8000",
);

export const EXTERNAL_API = {
  authBase,
  internalBase,
  login:
    process.env.EXTERNAL_LOGIN_URL ?? `${authBase}/api/external/login`,
  ssoIssue:
    process.env.EXTERNAL_SSO_ISSUE_URL ?? `${authBase}/api/external/sso/issue`,
  ssoSessionLogin:
    process.env.EXTERNAL_SSO_SESSION_LOGIN_URL ??
    `${authBase}/api/external/sso/session-login`,
  ticketsBalance:
    process.env.EXTERNAL_TICKETS_BALANCE_URL ??
    `${internalBase}/api/tickets/balance`,
  ticketsLedger:
    process.env.EXTERNAL_TICKETS_LEDGER_URL ??
    `${internalBase}/api/tickets/ledger`,
  notificationsMe:
    process.env.EXTERNAL_NOTIFICATIONS_ME_URL ??
    `${internalBase}/api/notifications/me`,
  notificationsReadBase:
    process.env.EXTERNAL_NOTIFICATIONS_READ_BASE_URL ??
    `${internalBase}/api/notifications`,
  notificationsReadAll:
    process.env.EXTERNAL_NOTIFICATIONS_READ_ALL_URL ??
    `${internalBase}/api/notifications/me/read-all`,
  hiddenPlacesUser:
    process.env.EXTERNAL_HIDDEN_PLACES_USER_URL ??
    `${internalBase}/api/ui/hidden-places/user`,
  parentChildren:
    process.env.EXTERNAL_PARENT_CHILDREN_URL ??
    `${internalBase}/api/parent/my-children-tree`,
  parentAllowedPlaces:
    process.env.EXTERNAL_PARENT_ALLOWED_PLACES_URL ??
    `${internalBase}/api/parent/allowed-places`,
  parentChildAssignedPlaces:
    process.env.EXTERNAL_PARENT_CHILD_ASSIGNED_PLACES_URL ??
    `${internalBase}/api/parent/child-assigned-places`,
  parentSaveChildAssignedPlaces:
    process.env.EXTERNAL_PARENT_SAVE_CHILD_ASSIGNED_PLACES_URL ??
    `${internalBase}/api/parent/save-child-assigned-places`,
  managementPlaces:
    process.env.EXTERNAL_MANAGEMENT_PLACES_URL ??
    `${internalBase}/api/management/places`,
  managementPlaceStats:
    process.env.EXTERNAL_MANAGEMENT_PLACE_STATS_URL ??
    `${internalBase}/api/management/place-stats`,
  reviewAudience:
    process.env.REVIEW_SSO_AUDIENCE ?? "review.popcorn1.me",
  reviewSsoEntry:
    process.env.REVIEW_SSO_ENTRY_URL ??
    "https://review.popcorn1.me/sso/callback",
  reviewSessionCookieName:
    process.env.REVIEW_SESSION_COOKIE_NAME ?? "review_session",
} as const;
