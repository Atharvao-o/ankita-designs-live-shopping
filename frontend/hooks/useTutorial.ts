"use client";

import { createContext, useContext } from "react";
import type { TutorialRole } from "@/lib/types";

export interface TutorialContextValue {
  isRunning: boolean;
  activeRole: TutorialRole | null;
  enabled: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  startTutorial: (role: TutorialRole, options?: { manual?: boolean }) => void;
  finishTutorial: () => void;
  skipTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  resetDeviceState: () => void;
  forceNextRefresh: () => void;
}

export const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorial() {
  const value = useContext(TutorialContext);
  if (!value) {
    throw new Error("useTutorial must be used inside TutorialProvider.");
  }
  return value;
}
