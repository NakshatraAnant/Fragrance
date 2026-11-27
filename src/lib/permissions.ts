export const PERMISSIONS = [
  "dashboard:read",
  "catalog:write",
  "inventory:write",
  "cms:write",
  "merch:write",
  "orders:read",
  "orders:write",
  "customers:read",
  "customers:write",
  "marketing:write",
  "reviews:write",
  "support:write",
  "b2b:read",
  "b2b:write",
  "analytics:read",
  "system:write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_DEFINITIONS: { key: string; name: string; permissions: string }[] = [
  { key: "SUPER_ADMIN", name: "Super admin", permissions: "*" },
  { key: "MERCHANDISER", name: "Merchandiser", permissions: "dashboard:read,catalog:write,inventory:write,cms:write,merch:write,marketing:write,analytics:read" },
  { key: "ORDER_OPS", name: "Order operations", permissions: "dashboard:read,orders:read,orders:write,customers:read,inventory:write,support:write" },
  { key: "CRM_MANAGER", name: "CRM manager", permissions: "dashboard:read,customers:read,customers:write,marketing:write,reviews:write,support:write,analytics:read,orders:read" },
  { key: "CONTENT_EDITOR", name: "Content editor", permissions: "dashboard:read,cms:write" },
  // Odaya team is firewalled: B2B data only, no consumer customer data.
  { key: "B2B_SALES", name: "Odaya B2B sales", permissions: "b2b:read,b2b:write" },
];

export function hasPermission(rolePermissions: string | null | undefined, needed: Permission): boolean {
  if (!rolePermissions) return false;
  const list = rolePermissions.split(",").map((s) => s.trim());
  return list.includes("*") || list.includes(needed);
}
