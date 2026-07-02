"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Delete, MessageSquareText, Phone, ShieldCheck, UserRound } from "lucide-react";
import { requestOtpRegistration, verifyOtpRegistration } from "@/lib/api";
import { useExpoStore } from "@/lib/cart-store";
import { AuroraBackground, StatefulButton } from "@/components/ui/aceternity";
import { OtpCodeInput } from "@/components/auth/otp-code-input";

const keypadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "0", "*"];
const phonePattern = /^[+0-9*]{8,18}$/;

function cleanOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function MobileRegisterScreen() {
  const router = useRouter();
  const setCurrentUser = useExpoStore((state) => state.setCurrentUser);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [message, setMessage] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [error, setError] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const canRequest = useMemo(() => name.trim().length >= 2 && phonePattern.test(phone.trim()), [name, phone]);
  const canVerify = Boolean(challengeId) && cleanOtp(code).length === 6;

  const appendKey = (key: string) => {
    setError("");
    setPhone((current) => {
      if (key === "+" && current.includes("+")) {
        return current;
      }
      if (current.length >= 18) {
        return current;
      }
      return `${current}${key}`;
    });
  };

  const requestOtp = async () => {
    setError("");
    setMessage("");
    setDevOtp("");
    if (name.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (!phonePattern.test(phone.trim())) {
      setError("Enter a valid mobile number. Use +91 format for India.");
      return;
    }
    setIsRequesting(true);
    try {
      const response = await requestOtpRegistration({ phone, name });
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
      const result = await verifyOtpRegistration({ phone, challengeId, code: cleanOtp(code), name });
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
      <section className="relative z-10 w-full max-w-[520px]">
        <div className="mb-5 flex justify-center">
          <Link href="/" className="inline-flex min-h-11 items-center gap-3 rounded-full border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-[var(--text)] shadow-[var(--shadow-soft)]">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[color:var(--gold)]/50 bg-[color:var(--gold)]/10 font-semibold text-[var(--gold)]">AD</span>
            <span>
              <span className="block text-sm font-bold leading-tight">Ankita Designs</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">Mobile customer signup</span>
            </span>
          </Link>
        </div>

        <div className="rounded-[32px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-strong)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-3xl bg-[color:var(--gold)]/12 text-[var(--gold)] ring-1 ring-[color:var(--gold)]/20">
              <Phone className="h-6 w-6" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">
              <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
              OTP verified
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--gold)]">Customer account</p>
            <h1 className="mt-3 text-4xl font-black leading-tight tracking-[-0.045em] text-[var(--text)]">Register with mobile</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Create a customer account using your phone number. Vendors should continue using vendor signup.</p>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-[var(--muted)]">
              Full name
              <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 focus-within:border-[var(--gold)] focus-within:ring-2 focus-within:ring-[color:var(--gold)]/20">
                <UserRound className="h-5 w-5 text-[var(--gold)]" />
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your full name" className="min-w-0 flex-1 bg-transparent text-base font-black text-[var(--text)] outline-none placeholder:text-[var(--muted)]" />
              </div>
            </label>

            <div className="rounded-[28px] border border-[color:var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--gold)]">Mobile number</p>
                  <p className="mt-1 min-h-8 break-all text-2xl font-black tracking-[-0.03em] text-[var(--text)]">
                    {phone || "+91"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPhone((current) => current.slice(0, -1))}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[color:var(--border)] bg-[var(--surface-strong)] text-[var(--text)] transition hover:border-[var(--gold)]"
                  aria-label="Delete last digit"
                >
                  <Delete className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {keypadKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => appendKey(key)}
                    className="min-h-14 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-strong)] text-xl font-black text-[var(--text)] transition hover:border-[var(--gold)] hover:bg-[color:var(--gold)]/10 active:scale-[0.98]"
                  >
                    {key}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setPhone("")} className="mt-3 w-full rounded-2xl border border-[color:var(--border)] bg-transparent px-4 py-3 text-sm font-black text-[var(--muted)] transition hover:border-[var(--gold)] hover:text-[var(--text)]">
                Clear number
              </button>
            </div>

            <StatefulButton type="button" loading={isRequesting} disabled={isRequesting || !canRequest} onClick={requestOtp} className="w-full px-8 py-4 text-base">
              {challengeId ? "Resend OTP" : "Send registration OTP"}
              <MessageSquareText className="ml-2 h-4 w-4" />
            </StatefulButton>

            {challengeId ? (
              <OtpCodeInput value={code} onChange={setCode} />
            ) : null}
          </div>

          {devOtp ? <p className="mt-4 rounded-2xl border border-[color:var(--gold)] bg-[color:var(--gold)]/12 px-4 py-3 text-sm font-black text-[var(--text)]">Dev OTP: {devOtp}</p> : null}
          {message ? <p className="mt-4 rounded-2xl border border-[var(--success)] bg-[color:var(--success)]/12 px-4 py-3 text-sm font-bold text-[var(--text)]">{message}</p> : null}
          {error ? <p className="mt-4 rounded-2xl border border-destructive bg-destructive px-4 py-3 text-sm font-bold text-destructive-foreground">{error}</p> : null}

          {challengeId ? (
            <StatefulButton type="button" loading={isVerifying} disabled={isVerifying || !canVerify} onClick={verifyOtp} className="mt-6 w-full px-8 py-4 text-base">
              Verify and create account
              <ArrowRight className="ml-2 h-4 w-4" />
            </StatefulButton>
          ) : null}

          <div className="mt-6 grid gap-2 text-center text-sm text-[var(--muted)]">
            <Link href="/register?role=user" className="inline-flex items-center justify-center gap-2 font-bold text-[var(--gold)] transition hover:text-[var(--coral)]">
              <ArrowLeft className="h-4 w-4" />
              Use email signup
            </Link>
            <Link href="/login/otp" className="font-bold text-[var(--muted)] transition hover:text-[var(--gold)]">Already have a mobile account?</Link>
            <Link href="/register?role=vendor" className="font-bold text-[var(--muted)] transition hover:text-[var(--gold)]">Register as vendor</Link>
          </div>
        </div>
      </section>
    </AuroraBackground>
  );
}
