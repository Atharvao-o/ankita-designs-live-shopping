"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, Mail, Moon, Palette, Phone, ShieldCheck, Sun, UserRound } from "lucide-react";
import { useExpoStore } from "@/lib/cart-store";
import { updateUserAvatar } from "@/lib/api";
import { useTheme, type ThemeMode } from "@/components/theme/theme-provider";
import { ImageCropUpload } from "@/components/uploads/image-crop-upload";
import { cn } from "@/lib/utils";

const appearanceOptions: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon }
];

export function SettingsScreen() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const currentUser = useExpoStore((state) => state.currentUser);
  const setCurrentUser = useExpoStore((state) => state.setCurrentUser);
  const authToken = useExpoStore((state) => state.authToken);
  const currentVendor = useExpoStore((state) => state.currentVendor);
  const logout = useExpoStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 pb-28 pt-6 text-[var(--text)] sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-5xl gap-5">
        <div className="rounded-[28px] border border-[color:var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Website settings</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[var(--text)] sm:text-4xl">Account and appearance</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Manage your session, theme preference, and basic account information for Ankita Designs Live Shopping.
              </p>
            </div>
            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-black text-red-600 transition hover:bg-red-500/15 dark:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            ) : (
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--coral)] px-5 py-3 text-sm font-black text-white shadow-[var(--shadow-soft)] transition hover:brightness-105"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[28px] border border-[color:var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 text-[var(--gold)]">
                <Palette className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-[var(--text)]">Appearance</h2>
                <p className="text-sm text-[var(--muted)]">Choose a readable theme for this device.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 rounded-[24px] border border-[color:var(--border)] bg-[var(--bg-soft)] p-2">
              {appearanceOptions.map((option) => {
                const Icon = option.icon;
                const active = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      "inline-flex min-h-14 items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)]/60",
                      active
                        ? "bg-[var(--gold)] text-slate-950 shadow-[var(--shadow-soft)]"
                        : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                    )}
                    aria-pressed={active}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              Your theme is saved in this browser and applies to marketplace pages, listings, cards, and forms.
            </p>
          </section>

          <section className="rounded-[28px] border border-[color:var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[color:var(--border)] bg-[var(--surface-strong)] text-[var(--gold)]">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-[var(--text)]">Personal info</h2>
                <p className="text-sm text-[var(--muted)]">Current profile details from your account.</p>
              </div>
            </div>

            {currentUser ? (
              <div className="mt-5 grid gap-3">
                <div className="flex items-center gap-4 rounded-[24px] border border-[color:var(--border)] bg-[var(--bg-soft)] p-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-[color:var(--border)] bg-[var(--surface-strong)] text-xl font-black text-[var(--gold)]">
                    {currentUser.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={currentUser.avatar} alt={currentUser.name} className="h-full w-full object-cover" />
                    ) : (
                      currentUser.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[var(--text)]">Profile picture</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      Google profile photos are used automatically. You can replace it with your own cropped upload.
                    </p>
                  </div>
                </div>
                <ImageCropUpload
                  uploadType="profile_picture"
                  preset="profile"
                  value={currentUser.avatar}
                  label="Upload profile picture"
                  onUploaded={async (url) => {
                    const updatedUser = await updateUserAvatar(url);
                    setCurrentUser(updatedUser, authToken, currentVendor);
                  }}
                />
                <InfoRow icon={UserRound} label="Name" value={currentUser.name} />
                <InfoRow icon={Mail} label="Email" value={currentUser.email} />
                <InfoRow icon={Phone} label="Phone" value={currentUser.phone || "Not added"} />
                <InfoRow icon={ShieldCheck} label="Account type" value={currentUser.role} capitalize />
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-[color:var(--border)] bg-[var(--bg-soft)] p-5">
                <p className="text-base font-black text-[var(--text)]">Login required</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Login to view your personal information, orders, and saved shopping session.
                </p>
                <Link
                  href="/login"
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--coral)] px-5 py-3 text-sm font-black text-white transition hover:brightness-105"
                >
                  Login now
                </Link>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  capitalize = false
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-[color:var(--border)] bg-[var(--bg-soft)] px-4 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--surface-strong)] text-[var(--gold)]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
        <p className={cn("mt-1 truncate text-sm font-black text-[var(--text)]", capitalize ? "capitalize" : "")}>{value}</p>
      </div>
    </div>
  );
}
