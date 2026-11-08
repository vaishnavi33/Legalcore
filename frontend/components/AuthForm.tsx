"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, type User } from "@/lib/api";
import { useUser } from "./UserProvider";

function safeNext(): string {
  const n = new URLSearchParams(window.location.search).get("next") || "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const reg = mode === "register";
  const router = useRouter();
  const { user, setUser, loading } = useUser();
  const [f, setF] = useState({ name: "", mobile: "", email: "", identifier: "", password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(safeNext());
  }, [loading, user, router]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reg) {
      if (f.name.trim().length < 2) return setErr("Please enter your name.");
      if (f.mobile.replace(/\D/g, "").length < 10) return setErr("Please enter your 10-digit mobile number.");
      if (f.password.length < 8) return setErr("Choose a password with at least 8 characters.");
      if (f.password !== f.confirm) return setErr("The two passwords do not match.");
    } else if (!f.identifier.trim() || !f.password) {
      return setErr("Enter your mobile number or email, and your password.");
    }
    setErr("");
    setBusy(true);
    try {
      const u = reg
        ? await api<User>("/auth/register", { method: "POST", json: { name: f.name, mobile: f.mobile, email: f.email || null, password: f.password } })
        : await api<User>("/auth/login", { method: "POST", json: { identifier: f.identifier, password: f.password } });
      setUser(u);
      router.replace(safeNext());
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="blk">
      <div className="wrap" style={{ maxWidth: 540 }}>
        <div className="desk">
          <div className="sec-head" style={{ margin: 0 }}>
            <span className="label">One account for everyone</span>
            <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)" }}>{reg ? "Create your account" : "Sign in to Legal Core"}</h1>
            <p className="muted">
              Lawyers, clients and our staff all use the same sign in. After you sign in, you see the pages and requests that belong to you.
            </p>
          </div>
          <form onSubmit={submit} noValidate>
            {reg ? (
              <>
                <div className="field">
                  <label htmlFor="a-name">Full name</label>
                  <input id="a-name" autoComplete="name" value={f.name} onChange={set("name")} />
                </div>
                <div className="field">
                  <label htmlFor="a-mobile">Mobile number</label>
                  <input id="a-mobile" type="tel" inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile number" value={f.mobile} onChange={set("mobile")} />
                </div>
                <div className="field">
                  <label htmlFor="a-email">
                    Email <small>(optional)</small>
                  </label>
                  <input id="a-email" type="email" autoComplete="email" value={f.email} onChange={set("email")} />
                </div>
              </>
            ) : (
              <div className="field">
                <label htmlFor="a-id">Mobile number or email</label>
                <input id="a-id" autoComplete="username" placeholder="10-digit mobile or email" value={f.identifier} onChange={set("identifier")} />
              </div>
            )}
            <div className="field">
              <label htmlFor="a-pass">Password {reg && <small>(at least 8 characters)</small>}</label>
              <input id="a-pass" type={show ? "text" : "password"} autoComplete={reg ? "new-password" : "current-password"} value={f.password} onChange={set("password")} />
            </div>
            {reg && (
              <div className="field">
                <label htmlFor="a-confirm">Type the password again</label>
                <input id="a-confirm" type={show ? "text" : "password"} autoComplete="new-password" value={f.confirm} onChange={set("confirm")} />
              </div>
            )}
            <label className="check" htmlFor="a-show">
              <input type="checkbox" id="a-show" checked={show} onChange={(e) => setShow(e.target.checked)} />
              <span>Show password</span>
            </label>
            {err && (
              <p className="err" role="alert">
                {err}
              </p>
            )}
            <button className="btn alt" type="submit" disabled={busy} style={{ justifySelf: "stretch" }}>
              {busy ? "Please wait…" : reg ? "Create account" : "Sign in"}
            </button>
          </form>
          <p className="muted">
            {reg ? (
              <>
                Already have an account? <Link href="/login">Sign in</Link>
              </>
            ) : (
              <>
                New here? <Link href="/register">Create a free account</Link>
              </>
            )}
          </p>
          {!reg && <p className="note">Forgot your password? Call your nearest branch and we will reset it after checking who you are.</p>}
        </div>
      </div>
    </section>
  );
}
