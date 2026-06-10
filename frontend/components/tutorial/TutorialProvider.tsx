"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getMyOnboarding, getTutorialSetting, patchMyOnboarding, patchTutorialSetting } from "@/lib/api";
import { useExpoStore } from "@/lib/cart-store";
import type { TutorialRole, UserRole } from "@/lib/types";
import { TutorialContext } from "@/hooks/useTutorial";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";
import { getTutorialSteps } from "@/lib/tutorial/tutorialSteps";
import type { TutorialStep } from "@/lib/tutorial/types";
import {
  consumeForcedTutorialFlag,
  forceTutorialOnNextRefresh,
  readTutorialEnabledOverride,
  readTutorialRoleState,
  resetDeviceTutorialState,
  TUTORIAL_VERSION,
  writeTutorialEnabledOverride,
  writeTutorialRoleState
} from "@/lib/tutorial/tutorialStorage";

type TargetRect = { top: number; left: number; width: number; height: number } | null;

export function TutorialProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentUser = useExpoStore((state) => state.currentUser);
  const [enabled, setEnabledState] = useState(true);
  const [activeRole, setActiveRole] = useState<TutorialRole | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect>(null);
  const [accountCompleted, setAccountCompleted] = useState<TutorialRole[]>([]);
  const [accountSkipped, setAccountSkipped] = useState<TutorialRole[]>([]);
  const manualRunRef = useRef(false);
  const startedRef = useRef(false);

  const steps = useMemo(() => (activeRole ? getTutorialSteps(activeRole, pathname) : []), [activeRole, pathname]);
  const currentStep = steps[Math.min(currentIndex, Math.max(steps.length - 1, 0))] as TutorialStep | undefined;
  const isRunning = Boolean(activeRole && currentStep && enabled);

  const markRole = useCallback(
    async (role: TutorialRole, status: "completed" | "skipped") => {
      writeTutorialRoleState(role, status);
      if (currentUser && role !== "preAuth") {
        try {
          const state = await patchMyOnboarding({ role, status, version: TUTORIAL_VERSION });
          setAccountCompleted(state.completedRoles);
          setAccountSkipped(state.skippedRoles);
        } catch {
          // Local state still prevents repeated auto-start if the account endpoint is temporarily unavailable.
        }
      }
    },
    [currentUser]
  );

  const startTutorial = useCallback((role: TutorialRole, options?: { manual?: boolean }) => {
    manualRunRef.current = Boolean(options?.manual);
    setActiveRole(role);
    setCurrentIndex(0);
  }, []);

  const stopTutorial = useCallback(() => {
    setActiveRole(null);
    setCurrentIndex(0);
    setTargetRect(null);
    manualRunRef.current = false;
  }, []);

  const finishTutorial = useCallback(() => {
    if (activeRole && !manualRunRef.current) {
      void markRole(activeRole, "completed");
    }
    stopTutorial();
  }, [activeRole, markRole, stopTutorial]);

  const skipTutorial = useCallback(() => {
    if (activeRole && !manualRunRef.current) {
      void markRole(activeRole, "skipped");
    }
    stopTutorial();
  }, [activeRole, markRole, stopTutorial]);

  const nextStep = useCallback(() => {
    setCurrentIndex((index) => {
      if (index >= steps.length - 1) {
        window.setTimeout(finishTutorial, 0);
        return index;
      }
      return index + 1;
    });
  }, [finishTutorial, steps.length]);

  const previousStep = useCallback(() => {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, []);

  const setEnabled = useCallback(async (nextEnabled: boolean) => {
    setEnabledState(nextEnabled);
    writeTutorialEnabledOverride(nextEnabled);
    try {
      await patchTutorialSetting(nextEnabled);
    } catch {
      // Backend setting may be unavailable in local development; admin override still applies on this device.
    }
    if (!nextEnabled) {
      stopTutorial();
    }
  }, [stopTutorial]);

  useEffect(() => {
    const override = readTutorialEnabledOverride();
    if (override !== null) {
      setEnabledState(override);
      return;
    }
    getTutorialSetting()
      .then((setting) => setEnabledState(setting.enabled))
      .catch(() => setEnabledState(process.env.NEXT_PUBLIC_TUTORIALS_ENABLED !== "false"));
  }, [currentUser?.role]);

  useEffect(() => {
    if (!currentUser) {
      setAccountCompleted([]);
      setAccountSkipped([]);
      return;
    }
    getMyOnboarding()
      .then((state) => {
        setAccountCompleted(state.completedRoles);
        setAccountSkipped(state.skippedRoles);
      })
      .catch(() => {
        setAccountCompleted([]);
        setAccountSkipped([]);
      });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!enabled || isRunning || startedRef.current) {
      return;
    }
    const forced = consumeForcedTutorialFlag();
    if (!currentUser) {
      if (forced || !readTutorialRoleState("preAuth")) {
        startedRef.current = true;
        window.setTimeout(() => startTutorial("preAuth"), 450);
      }
      return;
    }

    const role = currentUser.role as UserRole;
    const localState = readTutorialRoleState(role);
    const accountDone = accountCompleted.includes(role) || accountSkipped.includes(role);
    if (forced || (!localState && !accountDone)) {
      startedRef.current = true;
      window.setTimeout(() => startTutorial(role), 650);
    }
  }, [accountCompleted, accountSkipped, currentUser, enabled, isRunning, startTutorial]);

  useEffect(() => {
    startedRef.current = false;
    if (activeRole) {
      setCurrentIndex(0);
    }
  }, [pathname, activeRole]);

  useEffect(() => {
    function onAuthSuccess(event: Event) {
      const detail = (event as CustomEvent<{ role?: TutorialRole }>).detail;
      writeTutorialRoleState("preAuth", "completed");
      const nextRole = detail?.role;
      if (nextRole && nextRole !== "preAuth") {
        window.setTimeout(() => startTutorial(nextRole), 500);
      }
      stopTutorial();
    }
    window.addEventListener("ankita:tutorial-auth-success", onAuthSuccess);
    return () => window.removeEventListener("ankita:tutorial-auth-success", onAuthSuccess);
  }, [startTutorial, stopTutorial]);

  useEffect(() => {
    if (!isRunning || !currentStep) {
      document.body.removeAttribute("data-tour-lock");
      document.querySelectorAll("[data-tour-active='true']").forEach((node) => node.removeAttribute("data-tour-active"));
      return;
    }

    document.body.setAttribute("data-tour-lock", "true");
    let frame = 0;
    let attempts = 0;
    const update = () => {
      document.querySelectorAll("[data-tour-active='true']").forEach((node) => node.removeAttribute("data-tour-active"));
      if (!currentStep.targetId) {
        setTargetRect(null);
        return;
      }
      const target = document.querySelector<HTMLElement>(`[data-tour-id="${currentStep.targetId}"]`);
      if (!target) {
        attempts += 1;
        if (attempts < 20) {
          frame = window.requestAnimationFrame(update);
        } else {
          setTargetRect(null);
        }
        return;
      }
      target.setAttribute("data-tour-active", "true");
      target.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
      frame = window.requestAnimationFrame(() => {
        if (currentStep.action === "input") {
          const focusTarget = target.matches("input, select, textarea, button, a")
            ? target
            : target.querySelector<HTMLElement>("input, select, textarea, button, a");
          focusTarget?.focus({ preventScroll: true });
        }
        const rect = target.getBoundingClientRect();
        setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      });
    };

    update();
    const onMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("resize", onMeasure);
    window.addEventListener("scroll", onMeasure, true);
    const observer = new MutationObserver(onMeasure);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onMeasure);
      window.removeEventListener("scroll", onMeasure, true);
      observer.disconnect();
      document.body.removeAttribute("data-tour-lock");
      document.querySelectorAll("[data-tour-active='true']").forEach((node) => node.removeAttribute("data-tour-active"));
    };
  }, [currentStep, isRunning]);

  useEffect(() => {
    if (!isRunning || !currentStep?.targetId || currentStep.action !== "click") {
      return;
    }
    const target = document.querySelector<HTMLElement>(`[data-tour-id="${currentStep.targetId}"]`);
    if (!target) return;
    const onClick = () => window.setTimeout(nextStep, 160);
    target.addEventListener("click", onClick);
    return () => target.removeEventListener("click", onClick);
  }, [currentStep, isRunning, nextStep]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        skipTutorial();
      }
      if (event.key === "Enter" && currentStep?.action !== "input") {
        nextStep();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentStep?.action, isRunning, nextStep, skipTutorial]);

  const value = useMemo(
    () => ({
      isRunning,
      activeRole,
      enabled,
      setEnabled,
      startTutorial,
      finishTutorial,
      skipTutorial,
      nextStep,
      previousStep,
      resetDeviceState: resetDeviceTutorialState,
      forceNextRefresh: forceTutorialOnNextRefresh
    }),
    [activeRole, enabled, finishTutorial, isRunning, nextStep, previousStep, setEnabled, skipTutorial, startTutorial]
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {isRunning && currentStep ? (
        <TutorialOverlay
          step={currentStep}
          rect={targetRect}
          current={Math.min(currentIndex, steps.length - 1)}
          total={steps.length}
          canGoBack={currentIndex > 0}
          onNext={nextStep}
          onBack={previousStep}
          onSkip={skipTutorial}
        />
      ) : null}
    </TutorialContext.Provider>
  );
}
