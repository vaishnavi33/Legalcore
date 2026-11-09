// Small fetch wrapper. The website and API share one origin (Next.js forwards /api to FastAPI),
// so the session cookie is sent automatically. The X-Requested-With header is our CSRF guard.

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function messageFrom(data: unknown, status: number): string {
  const d = (data as { detail?: unknown })?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d.length) {
    const first = d[0] as { msg?: string; loc?: unknown[] };
    const field = Array.isArray(first.loc) ? String(first.loc[first.loc.length - 1]) : "";
    const msg = (first.msg || "").replace(/^Value error, /, "");
    return field && !["body", "data"].includes(field) ? `${field.replace(/_/g, " ")}: ${msg}` : msg;
  }
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  if (status >= 500) return "Something went wrong on our side. Please try again in a moment.";
  return "Something went wrong. Please try again.";
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-Requested-With", "legalcore");
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, { ...init, headers, body, credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new ApiError(0, "Could not reach Legal Core. Check your internet connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) throw new ApiError(res.status, messageFrom(data, res.status));
  return data as T;
}

export interface User {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  roles: string[];
  branches: { id: number; slug: string; code: string; name: string }[];
  lawyer_status: string | null;
  enrolment_number: string | null;
  is_active: boolean;
}

export type Audience = "lawyer" | "individual" | "business";

export interface RequestSummary {
  request_number: string;
  status: string;
  status_label: string;
  priority: string;
  audience: Audience;
  service: string;
  service_slug: string;
  service_other: string;
  branch: string | null;
  branch_slug: string | null;
  contact_name: string;
  needed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Doc {
  id: string;
  filename: string;
  size: number;
  kind: string;
  version: number;
  shared_with_client: boolean;
  scan_status: string;
  uploaded_by: string | null;
  from_requester: boolean;
  at: string;
}

export interface History {
  old_status: string | null;
  new_status: string;
  label: string;
  note: string;
  internal_note: string;
  at: string;
  by: string | null;
}

export interface RequestDetail extends RequestSummary {
  contact_phone: string;
  contact_email: string;
  organisation: string;
  preferred_contact: string;
  topic: string;
  message: string;
  enrolment_number: string;
  enrolment_verified: boolean;
  court: string;
  case_number: string;
  opposite_party: string;
  requires_advocate: boolean;
  status_explain: string;
  history: History[];
  notes: { id: number; body: string; internal: boolean; kind: string; author: string | null; from_staff: boolean; at: string }[];
  documents: Doc[];
  assignees: { id: string; name: string; roles: string[]; conflict_checked: boolean }[];
  allowed_next: string[];
  can_manage: boolean;
  can_allocate: boolean;
  is_requester: boolean;
}

export interface Branch {
  id: number;
  slug: string;
  code: string;
  name: string;
  name_te: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  description: string;
  office_status: "operational" | "service_area" | "planned";
  manager_name: string;
}

export interface Service {
  id: number;
  slug: string;
  name: string;
  category: string;
  audience: string;
  requires_advocate: boolean;
  fee_text?: string;
  is_active?: boolean;
}

export interface PublicConfig {
  demo_mode: boolean;
  today_india: string;
  earliest_needed_by: string;
  max_upload_mb: number;
  max_files_per_request: number;
}

export const STAFF_ROLES = ["drafting_staff", "support_staff", "advocate_reviewer", "branch_manager", "admin", "super_admin"];
export const isStaff = (u: User | null) => !!u && u.roles.some((r) => STAFF_ROLES.includes(r));
export const isAdmin = (u: User | null) => !!u && u.roles.some((r) => ["admin", "super_admin"].includes(r));
export const isManager = (u: User | null) => !!u && (isAdmin(u) || u.roles.includes("branch_manager"));
export const isLawyer = (u: User | null) => !!u && u.roles.includes("lawyer");
export const isBusiness = (u: User | null) => !!u && u.roles.includes("business_client");
export const isReviewer = (u: User | null) => !!u && u.roles.includes("advocate_reviewer");

// India has one time zone and no daylight saving, so a fixed +05:30 offset gives the India-local date.
export function indiaToday(): string {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const MIN_NEEDED_BY_DAYS = 2;
export const earliestNeededBy = () => addDays(indiaToday(), MIN_NEEDED_BY_DAYS);

export function fmtDay(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Multipart POST with upload progress (fetch cannot report upload progress). */
export function upload<T>(path: string, form: FormData, onProgress?: (pct: number) => void, headers: Record<string, string> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/v1${path}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-Requested-With", "legalcore");
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else reject(new ApiError(xhr.status, messageFrom(data, xhr.status)));
    };
    xhr.onerror = () => reject(new ApiError(0, "Could not reach Legal Core. Check your internet connection and try again."));
    xhr.send(form);
  });
}

export function fmtDate(s: string | null | undefined, withTime = false) {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}) });
}

export function fmtSize(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}
