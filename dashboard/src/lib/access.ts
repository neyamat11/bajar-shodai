import type { AdminUser } from "@/api/client";

/** Every permission the server knows (the list shown in the staff form comes from the server). */
export type Permission =
  | "orders.view" | "orders.manage" | "orders.assign" | "orders.delete" | "delivery.manage"
  | "products.view" | "products.manage" | "inventory.manage"
  | "customers.view" | "customers.manage" | "reports.view" | "logs.view"
  | "settings.manage" | "staff.manage";

export const isAdminRole = (u: Pick<AdminUser, "role"> | null | undefined) => u?.role === "ADMIN" || u?.role === "SUPER_ADMIN";

/** True when the user is authorized to delete orders (SuperAdmin, Admin, or Manager). */
export function canDeleteOrders(u: AdminUser | null | undefined): boolean {
  if (!u) return false;
  if (isAdminRole(u)) return true;
  if (u.staffTitle && /manager/i.test(u.staffTitle)) return true;
  return can(u, "orders.delete");
}

/** true when the person holds at least one of the permissions. Admins hold all of them; no permission listed = any signed-in person. */
export function can(u: AdminUser | null | undefined, ...anyOf: Permission[]): boolean {
  if (!u) return false;
  if (isAdminRole(u)) return true;
  if (anyOf.length === 0) return true;
  return anyOf.some((p) => u.permissions?.includes(p));
}

/** Can this person be sent to deliver (the rider screen)? */
export const canDeliver = (u: AdminUser | null | undefined) => !!u?.canDeliver;
