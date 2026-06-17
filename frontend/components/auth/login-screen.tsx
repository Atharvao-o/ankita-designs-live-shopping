"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useExpoStore } from "@/lib/cart-store";
import { homeForRole } from "@/lib/role-routes";
import { loginWithBackend, loginWithGoogle } from "@/lib/api";
import { AuroraBackground, PlaceholdersAndVanishInput, StatefulButton } from "@/components/ui/aceternity";

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const roleCopy: Record<string, string> = {
  admin: "Admin access selected. Sign in to manage exhibitions, vendors, stalls, orders, and analytics.",
  vendor: "Vendor access selected. Sign in to manage your stall, products, live sessions, and orders.",
  user: "Visitor access selected. Sign in to enter exhibitions, join live rooms, chat, and shop."
};

export function LoginScreen() {
  const router = useRouter();
  const setCurrentUser = useExpoStore((state) => state.setCurrentUser);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleHint, setRoleHint] = useState("");
  const [error, setError] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const completeLogin = useCallback((result: Awaited<ReturnType<typeof loginWithBackend>>) => {
    setCurrentUser(result.user, result.token, result.vendor ?? null);
    window.dispatchEvent(new CustomEvent("ankita:tutorial-auth-success", { detail: { role: result.user.role } }));
    if (result.user.role === "user") {
      router.push("/exhibitions");
      return;
    }
    if (result.user.role === "vendor") {
      router.push("/vendor");
      return;
    }
    router.push(homeForRole(result.user.role));
  }, [router, setCurrentUser]);

  useEffect(() => {
    const role = new URLSearchParams(window.location.search).get("role");
    if (role && roleCopy[role]) {
      setRoleHint(roleCopy[role]);
    }
  }, []);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return;
    }

    let cancelled = false;
    const renderGoogleButton = () => {
      if (cancelled || !googleButtonRef.current || !window.google) {
        return;
      }
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) {
            setGoogleError("Google did not return a sign-in token.");
            return;
          }
          setIsGoogleSubmitting(true);
          setError("");
          setGoogleError("");
          try {
            const result = await loginWithGoogle({ idToken: response.credential });
            completeLogin(result);
          } catch (errorValue) {
            setGoogleError(errorValue instanceof Error ? errorValue.message : "Google login failed.");
          } finally {
            setIsGoogleSubmitting(false);
          }
        }
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: googleButtonRef.current.clientWidth || 320
      });
    };

    if (window.google) {
      renderGoogleButton();
      return () => {
        cancelled = true;
      };
    }

    let script = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderGoogleButton);
    return () => {
      cancelled = true;
      script?.removeEventListener("load", renderGoogleButton);
    };
  }, [completeLogin, googleClientId]);

  return (
    <AuroraBackground className="luxury-page flex min-h-screen items-center justify-center overflow-x-hidden px-4 pb-32 pt-6 text-[var(--text)] sm:px-6 md:py-8 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[color:var(--gold)]/10 to-transparent"
      />
      <section className="relative z-10 w-full max-w-[520px]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-5 flex justify-center"
        >
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-3 rounded-full border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-[var(--text)] shadow-[var(--shadow-soft)]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[color:var(--gold)]/50 bg-[color:var(--gold)]/10 font-semibold text-[var(--gold)]">
              AE
            </span>
            <span>
              <span className="block text-sm font-bold leading-tight">Ankita Designs</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--gold)]">
                Live Shopping | Chat | Order
              </span>
            </span>
          </Link>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmitting(true);
            setError("");
            try {
              const result = await loginWithBackend({ email, password });
              completeLogin(result);
            } catch (errorValue) {
              setError(errorValue instanceof Error ? errorValue.message : "Login failed.");
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="relative w-full overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-strong)] sm:rounded-[36px] sm:p-8"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--gold)] to-transparent"
          />
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[color:var(--gold)]/12 text-[var(--gold)] ring-1 ring-[color:var(--gold)]/20">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">
              <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
              Secure login
            </div>
          </div>

          <div className="mt-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-[color:var(--coral)]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--coral)]">
              <Sparkles className="h-3.5 w-3.5" />
              Welcome back
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.045em] text-[var(--text)] sm:text-5xl">
              Login to continue
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
              Access exhibitions, live shopping rooms, orders, and dashboards from one secure workspace.
            </p>
          </div>

          {roleHint ? (
            <p className="mt-5 rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              {roleHint}
            </p>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href="/login?role=user" className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-3 text-center text-xs font-black text-[var(--text)] transition hover:border-[var(--gold)]">
              Customer login
            </Link>
            <Link href="/login?role=vendor" className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-3 text-center text-xs font-black text-[var(--text)] transition hover:border-[var(--gold)]">
              Vendor login
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            <label data-tour-id="auth-email-input" className="grid gap-2 text-sm font-semibold text-[var(--muted)]">
              Email
              <PlaceholdersAndVanishInput
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholders={["Enter your account email", "Use your registered email", "Email address"]}
                type="email"
                inputClassName="min-h-14 rounded-2xl text-base"
              />
            </label>
            <label data-tour-id="auth-password-input" className="grid gap-2 text-sm font-semibold text-[var(--muted)]">
              Password
              <PlaceholdersAndVanishInput
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholders={["Enter secure password", "Use your registered password"]}
                inputClassName="min-h-14 rounded-2xl text-base"
              />
            </label>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-destructive bg-destructive px-4 py-3 text-sm font-bold text-destructive-foreground">
              {error}
            </p>
          ) : null}

          <StatefulButton data-tour-id="auth-submit-button" loading={isSubmitting} disabled={isSubmitting} type="submit" className="mt-6 w-full px-8 py-4 text-base">
            {isSubmitting ? "Signing in..." : "Continue"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </StatefulButton>

          <div className="mt-5">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--border)]" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">or</span>
              <span className="h-px flex-1 bg-[var(--border)]" aria-hidden="true" />
            </div>
            {googleClientId ? (
              <div
                ref={googleButtonRef}
                className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2"
                aria-busy={isGoogleSubmitting}
              />
            ) : (
              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-3 text-center text-sm font-semibold text-[var(--muted)]">
                Google login is ready to enable after setting <span className="font-black text-[var(--text)]">NEXT_PUBLIC_GOOGLE_CLIENT_ID</span>.
              </div>
            )}
            {googleError ? (
              <p className="mt-3 rounded-2xl border border-destructive bg-destructive px-4 py-3 text-sm font-bold text-destructive-foreground">
                {googleError}
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-2 text-center text-sm text-[var(--muted)]">
            <span>
              New here?{" "}
              <Link href="/register?role=user" data-tour-id="landing-register-button" className="font-bold text-[var(--gold)] transition hover:text-[var(--coral)]">
                Create customer account
              </Link>
            </span>
            <Link href="/register?role=vendor" className="font-bold text-[var(--gold)] transition hover:text-[var(--coral)]">
              Register as vendor
            </Link>
            <Link href="/" className="font-bold text-[var(--muted)] transition hover:text-[var(--gold)]">
              Back to home
            </Link>
          </div>
        </motion.form>
      </section>
    </AuroraBackground>
  );
}
