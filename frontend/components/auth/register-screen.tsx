"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Radio, ShieldCheck, Store, UserPlus } from "lucide-react";
import { UserRole } from "@/lib/types";
import { registerWithBackend } from "@/lib/api";
import { useExpoStore } from "@/lib/cart-store";
import { homeForRole } from "@/lib/role-routes";
import { AuroraBackground, StatefulButton, Tabs } from "@/components/ui/aceternity";

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 15);

const inputClassName =
  "mt-2 h-12 w-full rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--gold)] focus:ring-2 focus:ring-[color:var(--gold)]/20";

const textareaClassName =
  "mt-2 min-h-24 w-full rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--gold)] focus:ring-2 focus:ring-[color:var(--gold)]/20";

export function RegisterScreen() {
  const router = useRouter();
  const setCurrentUser = useExpoStore((state) => state.setCurrentUser);
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [fssaiNumber, setFssaiNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "admin">>("user");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const requestedRole = new URLSearchParams(window.location.search).get("role");
    if (requestedRole === "user" || requestedRole === "vendor") {
      setRole(requestedRole);
    }
  }, []);

  return (
    <AuroraBackground className="luxury-page flex min-h-screen items-center justify-center overflow-x-hidden p-3 sm:p-4">
      <div className="grid w-full max-w-6xl gap-4 lg:grid-cols-[0.78fr_1fr]">
        <aside className="hidden overflow-hidden rounded-[34px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-7 shadow-[var(--shadow-soft)] lg:block">
          <div className="relative min-h-full">
            <div className="relative z-10">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">Registration</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--text)]">
                Create your live exhibition account
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                Visitors can start exploring immediately. Vendors submit business details, then admin approval unlocks products, stalls, and live selling.
              </p>

              <div className="mt-8 grid gap-3">
                <InfoTile icon={UserPlus} title="Visitor account" description="Explore exhibitions, live rooms, carts, orders, and profile settings." />
                <InfoTile icon={Store} title="Vendor account" description="Submit real business details and wait for admin approval before selling." />
                <InfoTile icon={Radio} title="Live commerce ready" description="Approved vendors can request exhibitions, get stalls, pin products, and go live." />
              </div>

              <div className="mt-8 rounded-[28px] border border-[color:var(--border)] bg-[var(--surface)] p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--gold)]/15 text-[var(--gold)]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[var(--text)]">Secure registration</p>
                    <p className="text-xs text-[var(--muted)]">Passwords are stored as one-way hashes.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setMessage("");
            if (!name.trim() || !email.trim() || !phone.trim()) {
              setError("Name, email, and phone are required.");
              return;
            }
            if (!email.includes("@")) {
              setError("Enter a valid email address.");
              return;
            }
            if (password.length < 8) {
              setError("Password must be at least 8 characters.");
              return;
            }
            if (password !== confirmPassword) {
              setError("Passwords do not match.");
              return;
            }
            if (role === "vendor" && (!businessName.trim() || !businessCategory.trim() || !businessDescription.trim())) {
              setError("Business name, category, and description are required for vendor registration.");
              return;
            }
            const urlFields = [instagram, website].filter(Boolean);
            if (urlFields.some((value) => !/^https?:\/\//i.test(value))) {
              setError("Instagram and website links must start with http:// or https://.");
              return;
            }
            setIsSubmitting(true);
            try {
              const result = await registerWithBackend({
                role,
                name,
                owner_name: name,
                business_name: businessName,
                business_category: businessCategory,
                business_description: businessDescription,
                email,
                phone,
                password,
                instagram,
                website,
                whatsapp,
                gst_number: gstNumber,
                fssai_number: fssaiNumber,
                pan_number: panNumber,
                upi_id: upiId,
                bank_account_number: bankAccountNumber,
                ifsc,
                city,
                state: stateName,
                pincode,
                product_categories: businessCategory ? [businessCategory] : [],
                address
              });
              setCurrentUser(result.user, result.token, result.vendor ?? null);
              window.dispatchEvent(new CustomEvent("ankita:tutorial-auth-success", { detail: { role: result.user.role } }));
              setMessage(result.message ?? "Registration complete.");
              window.setTimeout(() => {
                if (result.user.role === "user") {
                  router.push("/exhibitions");
                  return;
                }
                router.push(homeForRole(result.user.role));
              }, 400);
            } catch (errorValue) {
              setError(errorValue instanceof Error ? errorValue.message : "Registration failed.");
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="w-full rounded-[28px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-soft)] sm:rounded-[32px] sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">Ankita Designs</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text)] sm:text-4xl">Create account</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Use real details so your account can be approved and connected to exhibitions.
              </p>
            </div>
            <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] text-[var(--gold)] sm:grid">
              <BadgeCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6" data-tour-id="auth-role-selector">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Account type</p>
            <Tabs tabs={["user", "vendor"]} active={role} onChange={(item) => setRole(item as Exclude<UserRole, "admin">)} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/register?role=user" className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-3 text-center text-xs font-black text-[var(--text)] transition hover:border-[var(--gold)]">
              Customer signup
            </Link>
            <Link href="/register?role=vendor" className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-3 text-center text-xs font-black text-[var(--text)] transition hover:border-[var(--gold)]">
              Vendor signup
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label={role === "vendor" ? "Owner name" : "Full name"} required>
              <input
                data-tour-id="auth-name-input"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClassName}
                placeholder={role === "vendor" ? "Owner name" : "Full name"}
              />
            </Field>
            <Field label="Email" required>
              <input
                data-tour-id="auth-email-input"
                autoComplete="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
                placeholder="Email address"
              />
            </Field>
            <Field label="Phone number" required hint="Digits only">
              <input
                data-tour-id="auth-phone-input"
                autoComplete="tel"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={phone}
                onChange={(event) => setPhone(digitsOnly(event.target.value))}
                className={inputClassName}
                placeholder="Phone number"
              />
            </Field>
            <Field label="Password" required>
              <input
                data-tour-id="auth-password-input"
                autoComplete="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
                placeholder="Minimum 8 characters"
              />
            </Field>
            <Field label="Confirm password" required className="sm:col-span-2">
              <input
                data-tour-id="auth-confirm-password-input"
                autoComplete="new-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={inputClassName}
                placeholder="Confirm secure password"
              />
            </Field>

            {role === "vendor" ? (
              <div className="sm:col-span-2">
                <div data-tour-id="vendor-business-profile" className="rounded-[24px] border border-[color:var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[var(--text)]">Business profile</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">Required for admin approval.</p>
                    </div>
                    <Store className="h-5 w-5 text-[var(--gold)]" />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Business name" required>
                      <input data-tour-id="vendor-business-name-input" placeholder="Business name" value={businessName} onChange={(event) => setBusinessName(event.target.value)} className={inputClassName} />
                    </Field>
                    <Field label="Business category" required>
                      <input data-tour-id="vendor-business-category-input" placeholder="Business category" value={businessCategory} onChange={(event) => setBusinessCategory(event.target.value)} className={inputClassName} />
                    </Field>
                    <Field label="Business description" required className="sm:col-span-2">
                      <textarea placeholder="Describe what you sell and your exhibition category." value={businessDescription} onChange={(event) => setBusinessDescription(event.target.value)} className={textareaClassName} />
                    </Field>
                    <Field label="Instagram URL">
                      <input placeholder="Instagram URL" value={instagram} onChange={(event) => setInstagram(event.target.value)} className={inputClassName} />
                    </Field>
                    <Field label="Website URL">
                      <input placeholder="Website URL" value={website} onChange={(event) => setWebsite(event.target.value)} className={inputClassName} />
                    </Field>
                    <Field label="WhatsApp contact">
                      <input placeholder="WhatsApp number or link" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} className={inputClassName} />
                    </Field>
                    <Field label="GST number">
                      <input placeholder="Optional" value={gstNumber} onChange={(event) => setGstNumber(event.target.value)} className={inputClassName} />
                    </Field>
                    <Field label="FSSAI number">
                      <input placeholder="Optional for food vendors" value={fssaiNumber} onChange={(event) => setFssaiNumber(event.target.value)} className={inputClassName} />
                    </Field>
                    <Field label="PAN number">
                      <input placeholder="Optional" value={panNumber} onChange={(event) => setPanNumber(event.target.value)} className={inputClassName} />
                    </Field>
                    <Field label="Business address" className="sm:col-span-2">
                      <textarea placeholder="Business address (optional)" value={address} onChange={(event) => setAddress(event.target.value)} className={textareaClassName} />
                    </Field>
                    <Field label="City">
                      <input placeholder="City" value={city} onChange={(event) => setCity(event.target.value)} className={inputClassName} />
                    </Field>
                    <Field label="State">
                      <input placeholder="State" value={stateName} onChange={(event) => setStateName(event.target.value)} className={inputClassName} />
                    </Field>
                    <Field label="Pincode">
                      <input placeholder="Pincode" value={pincode} onChange={(event) => setPincode(digitsOnly(event.target.value).slice(0, 6))} className={inputClassName} />
                    </Field>
                    <Field label="UPI ID">
                      <input placeholder="vendor@upi" value={upiId} onChange={(event) => setUpiId(event.target.value)} className={inputClassName} />
                    </Field>
                    <Field label="Bank account">
                      <input placeholder="Account number" value={bankAccountNumber} onChange={(event) => setBankAccountNumber(digitsOnly(event.target.value))} className={inputClassName} />
                    </Field>
                    <Field label="IFSC">
                      <input placeholder="IFSC code" value={ifsc} onChange={(event) => setIfsc(event.target.value.toUpperCase())} className={inputClassName} />
                    </Field>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {error ? <p className="mt-4 rounded-2xl border border-destructive bg-destructive px-4 py-3 text-sm font-bold text-destructive-foreground">{error}</p> : null}
          {message ? <p className="mt-4 rounded-2xl border border-emerald-600 bg-emerald-600 px-4 py-3 text-sm font-bold text-white">{message}</p> : null}
          <StatefulButton data-tour-id="auth-submit-button" loading={isSubmitting} disabled={isSubmitting} type="submit" className="mt-6 w-full px-8 py-4 text-base">
            {isSubmitting ? "Creating account..." : "Register"}
          </StatefulButton>
          <p className="mt-5 text-center text-sm text-[var(--muted)]">
            Already registered?{" "}
            <Link href={role === "vendor" ? "/login?role=vendor" : "/login?role=user"} data-tour-id="landing-login-button" className="font-semibold text-[var(--gold)]">
              Login
            </Link>
          </p>
        </form>
      </div>
    </AuroraBackground>
  );
}

function Field({
  label,
  hint,
  required,
  className = "",
  children
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="flex items-center justify-between gap-3 text-sm font-bold text-[var(--text)]">
        <span>
          {label}
          {required ? <span className="text-[var(--coral)]"> *</span> : null}
        </span>
        {hint ? <span className="text-xs font-semibold text-[var(--muted)]">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function InfoTile({
  icon: Icon,
  title,
  description
}: {
  icon: typeof UserPlus;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-[color:var(--border)] bg-[var(--surface)] p-4">
      <div className="flex gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--gold)]/15 text-[var(--gold)]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-black text-[var(--text)]">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
      </div>
    </div>
  );
}
