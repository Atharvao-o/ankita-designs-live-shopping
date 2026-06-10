import { UserRole } from "@/lib/types";

export function homeForRole(role: UserRole) {
  if (role === "admin") {
    return "/admin";
  }
  if (role === "vendor") {
    return "/vendor";
  }
  return "/exhibitions";
}
