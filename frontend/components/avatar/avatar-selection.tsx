"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { avatarOptions } from "@/lib/avatar-options";
import { useExpoStore } from "@/lib/cart-store";
import { Screen } from "@/components/layout/screen";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";
import { updateUserAvatar } from "@/lib/api";

export function AvatarSelection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedAvatarId = useExpoStore((state) => state.selectedAvatarId);
  const setSelectedAvatarId = useExpoStore((state) => state.setSelectedAvatarId);
  const currentUser = useExpoStore((state) => state.currentUser);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const selectedAvatar = avatarOptions.find((item) => item.id === selectedAvatarId);
  const nextPath = searchParams.get("next") || "/exhibitions";

  return (
    <Screen>
      <section className="grid min-h-screen w-full gap-4 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="screen-panel rounded-[30px] p-4 sm:rounded-[38px] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#8A5A24]">Avatar selection</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-[#17120C] sm:text-3xl">
                Pick a visitor persona
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7B7065]">
                This saves to your account and controls how you appear on the expo map. You can change it later from Settings → Avatar.
              </p>
            </div>
          </div>

          <div data-tour-id="avatar-selector" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
            {avatarOptions.map((item) => {
              const selected = item.id === selectedAvatarId;

              return (
                <motion.button
                  key={item.id}
                  whileHover={{ y: -6 }}
                  type="button"
                  onClick={() => setSelectedAvatarId(item.id)}
                  className={`rounded-[22px] border p-2 text-left transition sm:rounded-[30px] sm:p-4 ${
                    selected
                      ? "border-[#C59A4A] bg-[#FFF7EB] shadow-gold"
                      : "border-[#E9D9BE] bg-[#FFFDF8] shadow-luxury"
                  }`}
                >
                  <AppImage src={item.image} alt={item.name} fallbackSrc="/avatars/default-avatar.png" className="h-32 w-full rounded-[18px] sm:h-56 sm:rounded-[24px] xl:h-64" />
                  <div className="mt-3 flex items-start justify-between gap-2 sm:mt-4 sm:gap-3">
                    <div>
                      <p className="text-base font-semibold text-[#17120C] sm:text-xl">{item.name}</p>
                      <p className="mt-1 text-xs text-[#7B7065] sm:text-sm">{item.persona}</p>
                    </div>
                    <div className={`mt-1 h-3.5 w-3.5 rounded-full ${selected ? "bg-[#E95F45]" : "bg-[#E9D9BE]"}`} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="screen-panel flex rounded-[30px] p-4 sm:rounded-[38px] sm:p-6">
          <div className="flex h-full w-full flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-[#8A5A24]">Ready to enter</p>
              <h3 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-[#17120C] sm:text-[clamp(2rem,4vw,3.3rem)]">
                One avatar, one exhibition path
              </h3>
              <p className="mt-4 max-w-md text-base leading-7 text-[#7B7065]">
                This avatar represents you inside the exhibition hall. Next, choose which live exhibition you want to enter.
              </p>
            </div>

            <div className="mt-6 rounded-[26px] border border-[#E9D9BE] bg-[#FFF7EB] p-4 sm:rounded-[30px] sm:p-5 xl:mt-0">
              {selectedAvatar ? (
                <div className="flex items-center gap-4">
                  <AppImage src={selectedAvatar.image} alt={selectedAvatar.name} fallbackSrc="/avatars/default-avatar.png" className="h-20 w-20 shrink-0 rounded-[20px] sm:h-24 sm:w-24 sm:rounded-[22px]" />
                  <div>
                    <p className="text-sm text-[#7B7065]">Selected</p>
                    <p className="text-2xl font-semibold text-[#17120C]">{selectedAvatar.name}</p>
                    <p className="mt-1 text-sm text-[#7B7065]">{selectedAvatar.persona}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-[#D8BE82] p-6 text-center text-[#7B7065]">
                  Select an avatar to continue.
                </div>
              )}
            </div>

            <button
              data-tour-id="avatar-confirm-button"
              type="button"
              disabled={!selectedAvatar}
              onClick={async () => {
                if (!selectedAvatarId) {
                  return;
                }
                setError("");
                setIsSaving(true);
                try {
                  if (currentUser) {
                    await updateUserAvatar(selectedAvatarId);
                  }
                  router.push(nextPath);
                } catch (errorValue) {
                  setError(errorValue instanceof Error ? errorValue.message : "Could not save avatar.");
                } finally {
                  setIsSaving(false);
                }
              }}
              className={buttonStyles("primary", "mt-6 w-full justify-center px-8 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50")}
            >
              {isSaving ? "Saving avatar..." : "Choose Exhibition"}
            </button>
            {error ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
          </div>
        </div>
      </section>
    </Screen>
  );
}
