import type { TutorialRole } from "@/lib/types";

export const TUTORIAL_VERSION = "v1";

const root = "ankita-expoverse:tutorial";
const overrideKey = `${root}:admin-enabled-override`;
const forcedKey = `${root}:force-next:${TUTORIAL_VERSION}`;

export function tutorialStateKey(role: TutorialRole) {
  return `${root}:${role}:${TUTORIAL_VERSION}`;
}

export function readTutorialRoleState(role: TutorialRole): "completed" | "skipped" | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem(tutorialStateKey(role));
  return value === "completed" || value === "skipped" ? value : null;
}

export function writeTutorialRoleState(role: TutorialRole, state: "completed" | "skipped") {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(tutorialStateKey(role), state);
  window.localStorage.setItem(`${root}:last-version`, TUTORIAL_VERSION);
}

export function resetDeviceTutorialState() {
  if (typeof window === "undefined") {
    return;
  }
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(root) && key !== overrideKey)
    .forEach((key) => window.localStorage.removeItem(key));
}

export function readTutorialEnabledOverride(): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem(overrideKey);
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function writeTutorialEnabledOverride(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(overrideKey, String(enabled));
}

export function forceTutorialOnNextRefresh() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(forcedKey, "true");
}

export function consumeForcedTutorialFlag() {
  if (typeof window === "undefined") {
    return false;
  }
  const forced = window.localStorage.getItem(forcedKey) === "true";
  if (forced) {
    window.localStorage.removeItem(forcedKey);
  }
  return forced;
}
