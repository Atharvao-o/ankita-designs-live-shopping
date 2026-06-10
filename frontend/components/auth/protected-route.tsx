"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useExpoStore } from "@/lib/cart-store";
import { UserRole } from "@/lib/types";
import { homeForRole } from "@/lib/role-routes";

export function ProtectedRoute({
  role,
  children
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const currentUser = useExpoStore((state) => state.currentUser);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    if (currentUser.role !== role) {
      router.replace(homeForRole(currentUser.role));
    }
  }, [currentUser, mounted, role, router]);

  if (!mounted || !currentUser || currentUser.role !== role) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F4EF] text-slate-600">
        Loading workspace...
      </main>
    );
  }

  return <>{children}</>;
}
