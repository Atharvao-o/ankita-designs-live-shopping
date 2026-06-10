import type { TutorialRole } from "@/lib/types";

export type TutorialAction = "info" | "click" | "input";
export type TutorialPlacement = "auto" | "top" | "bottom" | "left" | "right" | "center";

export interface TutorialStep {
  id: string;
  role: TutorialRole;
  title: string;
  description: string;
  targetId?: string;
  action?: TutorialAction;
  placement?: TutorialPlacement;
}

export interface TutorialRuntimeState {
  role: TutorialRole | null;
  isRunning: boolean;
  currentIndex: number;
}
