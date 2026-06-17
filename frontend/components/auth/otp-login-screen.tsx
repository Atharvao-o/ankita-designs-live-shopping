"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, MessageSquareText, Phone, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { requestOtpLogin, verifyOtpLogin } from "@/lib/api";
import { useExpoStore } from "@/lib/cart-store";
import { AuroraBackground, StatefulButton } from "@/components/ui/aceternity";

const phonePattern = /^[+0-9\s()-]{8,18}$/;

export function OtpLoginScreen() {
  const router = useRouter();
  const setCurrentUser = useExpoStore((state) => state.setCurrentUser);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [message, setMessage] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [error, setError] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const canRequest = phonePattern.test(phone.trim());
  const canVerify = challengeId && /^\d{6}$/.test(code.trim());

  const requestOtp = async () => {
    setError("");
    setMessage("");
    setDevOtp("");
    if (!canRequest) {
      setError("Enter a valid mobile number. Use +91 format for India.");
      return;
    }
    setIsRequesting(true);
    try {
      const response = await requestOtpLogin({ phone });
      setChallengeId(response.challengeId);
      setMessage(response.message || "OTP sent.");
      setDevOtp(response.devOtp || "");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not send OTP.");
    } finally {
      setIsRequesting(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    setMessage("");
    if (!canVerify) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setIsVerifying(true);
    try {
      const result = await verifyOtpLogin({ phone, challengeId, code });
      setCurrentUser(result.user, result.token, result.vendor ?? null);
      window.dispatchEvent(new CustomEvent("ankita:tutorial-auth-success", { detail: { role: result.user.role } }));
      router.push("/");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "OTP verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AuroraBackground className="luxury-page flex min-h-screen items-center justify-center overflow-x-hidden px-4 py-8 text-[var(--text)] sm:px-6">
      <section className="relative z-10 w-full max-w-[500px]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-5 flex justify-center">
          <Link href="/" className="inline-flex min-h-11 items-center gap-3 rounded-full border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-[var(--text)] shadow-[var(--shadow-soft)]">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[color:var(--gold)]/50 bg-[color:var(--gold)]/10 font-semibold text-[var(--gold)]">AD</span>
            <span>
              <span className="block text-sm font-bold leading-tight">Ankita Designs</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">Customer OTP Login</span>
            </span>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.04 }} className="rounded-[32px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-strong)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-3xl bg-[color:var(--gold)]/12 text-[var(--gold)] ring-1 ring-[color:var(--gold)]/20">
              <Phone className="h-6 w-6" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">
              <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
              SMS secured
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--gold)]">Quick customer login</p>
            <h1 className="mt-3 text-4xl font-black leading-tight tracking-[-0.045em] text-[var(--text)]">Login with OTP</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Enter the mobile number on your customer account. We will send a 6-digit code to verify your login.</p>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-[var(--muted)]">
              Mobile number
              <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 focus-within:border-[var(--gold)] focus-within:ring-2 focus-within:ring-[color:var(--gold)]/20">
                <Phone className="h-5 w-5 text-[var(--gold)]" />
                <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" className="min-w-0 flex-1 bg-transparent text-base font-black text-[var(--text)] outline-none placeholder:text-[var(--muted)]" />
              </div>
            </label>
            <StatefulButton type="button" loading={isRequesting} disabled={isRequesting || !canRequest} onClick={requestOtp} className="w-full px-8 py-4 text-base">
              {challengeId ? "Resend OTP" : "Send OTP"}
              <MessageSquareText className="ml-2 h-4 w-4" />
            </StatefulButton>

            {challengeId ? (
              <label className="grid gap-2 text-sm font-bold text-[var(--muted)]">
                6-digit OTP
                <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="min-h-14 rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 text-center text-2xl font-black tracking-[0.35em] text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--gold)] focus:ring-2 focus:ring-[color:var(--gold)]/20" />
              </label>
            ) : null}
          </div>

          {devOtp ? <p className="mt-4 rounded-2xl border border-[color:var(--gold)] bg-[color:var(--gold)]/12 px-4 py-3 text-sm font-black text-[var(--text)]">Dev OTP: {devOtp}</p> : null}
          {message ? <p className="mt-4 rounded-2xl border border-[var(--success)] bg-[color:var(--success)]/12 px-4 py-3 text-sm font-bold text-[var(--text)]">{message}</p> : null}
          {error ? <p className="mt-4 rounded-2xl border border-destructive bg-destructive px-4 py-3 text-sm font-bold text-destructive-foreground">{error}</p> : null}

          {challengeId ? (
            <StatefulButton type="button" loading={isVerifying} disabled={isVerifying || !canVerify} onClick={verifyOtp} className="mt-6 w-full px-8 py-4 text-base">
              Verify and login
              <ArrowRight className="ml-2 h-4 w-4" />
            </StatefulButton>
          ) : null}

          <div className="mt-6 grid gap-2 text-center text-sm text-[var(--muted)]">
            <Link href="/login?role=user" className="font-bold text-[var(--gold)] transition hover:text-[var(--coral)]">Use email and password</Link>
            <Link href="/register?role=user" className="font-bold text-[var(--muted)] transition hover:text-[var(--gold)]">Create customer account</Link>
          </div>
        </motion.div>
      </section>
    </AuroraBackground>
  );
}
