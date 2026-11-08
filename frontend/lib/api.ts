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

export interface RequestSummary {
  request_number: string;
  status: string;
  status_label: string;
  audience: "lawyer" | "individual";
  service: string;
  service_slug: string;
  branch: string;
  branch_slug: string;
  contact_name: string;
  created_at: string;
  updated_at: string;
}

export interface RequestDetail extends RequestSummary {
  contact_phone: string;
  contact_email: string;
  preferred_contact: string;
  preferred_date: string | null;
  topic: string;
  message: string;
  enrolment_number: string;
  court: string;
  case_number: string;
  needed_by: string | null;
  history: { old_status: string | null; new_status: string; label: string; note: string; at: string; by: string | null }[];
  notes: { id: number; body: string; internal: boolean; author: string | null; from_staff: boolean; at: string }[];
  documents: { id: string; filename: string; size: number; kind: string; version: number; at: string }[];
  assignees: { id: string; name: string; roles: string[] }[];
  allowed_next: string[];
  can_manage: boolean;
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
}

export interface Service {
  id: number;
  slug: string;
  name: string;
  category: string;
  audience: string;
  fee_text: string;
}

export const isStaff = (u: User | null) => !!u && u.roles.some((r) => ["drafting_staff", "advocate_reviewer", "branch_manager", "admin", "super_admin"].includes(r));
export const isAdmin = (u: User | null) => !!u && u.roles.some((r) => ["admin", "super_admin"].includes(r));
export const isManager = (u: User | null) => !!u && (isAdmin(u) || u.roles.includes("branch_manager"));
export const isLawyer = (u: User | null) => !!u && u.roles.includes("lawyer");

export function fmtDate(s: string | null | undefined, withTime = false) {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}) });
}

export function fmtSize(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}
