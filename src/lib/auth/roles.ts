/**
 * Role-Based Access Control (RBAC) & Authorization Engine
 *
 * Defines user roles, privilege boundaries, and access evaluation functions
 * for the Australian Nail Salon Management System.
 */

export type UserRole = 'super_admin' | 'manager' | 'staff';

export const USER_ROLES: readonly UserRole[] = ['super_admin', 'manager', 'staff'] as const;

/**
 * Validates whether a given string is a recognized UserRole.
 */
export function isValidRole(role: unknown): role is UserRole {
  return typeof role === 'string' && (USER_ROLES as readonly string[]).includes(role.trim().toLowerCase());
}

/**
 * Normalizes an unknown role input to a standard UserRole or undefined if invalid.
 */
export function normalizeRole(role: unknown): UserRole | undefined {
  if (typeof role !== 'string') return undefined;
  const cleaned = role.trim().toLowerCase();
  return (USER_ROLES as readonly string[]).includes(cleaned) ? (cleaned as UserRole) : undefined;
}

/**
 * Evaluates whether an actor role has privilege to assign or elevate a target role.
 *
 * Privilege Rules:
 * - 'super_admin': Full privilege to assign any valid role ('super_admin', 'manager', 'staff').
 * - 'manager': Can assign operational roles ('manager', 'staff'), but is STRICTLY FORBIDDEN
 *   from elevating any user to 'super_admin' (T2-BVA-33 invariant).
 * - 'staff': Zero role assignment or elevation privilege.
 * - Missing, null, or unrecognized roles return false.
 */
export function canElevateRole(
  actorRole: string | undefined | null,
  targetRole: string | undefined | null
): boolean {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);

  if (!actor || !target) {
    return false;
  }

  // Super admin has unrestricted delegation and elevation privileges
  if (actor === 'super_admin') {
    return true;
  }

  // Manager can delegate operational roles, but CANNOT elevate to super_admin
  if (actor === 'manager') {
    return target !== 'super_admin';
  }

  // Staff and other roles have zero delegation or elevation privilege
  return false;
}

/**
 * Evaluates whether a role is authorized to mutate CMS content
 * (hero banner, announcements, services catalog, gallery lookbook, business info, hours).
 *
 * Rules:
 * - 'super_admin': true
 * - 'manager': true
 * - 'staff': false (HTTP 403 Forbidden per T2-BVA-32)
 */
export function canMutateCMS(role: string | undefined | null): boolean {
  const userRole = normalizeRole(role);
  if (!userRole) return false;
  return userRole === 'super_admin' || userRole === 'manager';
}

/**
 * Evaluates whether a role is authorized to view or mutate financial records and tax calculations.
 *
 * Rules:
 * - 'super_admin': true
 * - 'manager': true
 * - 'staff': false (HTTP 403 Forbidden per T2-BVA-31)
 */
export function canAccessFinance(role: string | undefined | null): boolean {
  const userRole = normalizeRole(role);
  if (!userRole) return false;
  return userRole === 'super_admin' || userRole === 'manager';
}

/**
 * Evaluates whether a role is authorized to access a given URL path / route.
 *
 * Route Guarding Rules:
 * - Financial routes (/admin/finance, /api/admin/finance): requires canAccessFinance
 * - Staff role elevation routes (/api/admin/staff/[id]/role): requires super_admin
 * - CMS mutation API routes (/api/admin/cms/*, /api/admin/services/*, /api/admin/gallery/*, /api/admin/upload):
 *   requires canMutateCMS
 * - General admin UI (/admin/dashboard, /admin/customers, /admin/staff, /admin/cms): accessible to all authenticated roles
 * - Public routes: accessible to everyone
 */
export function canAccessRoute(
  role: string | undefined | null,
  routePath: string
): boolean {
  if (!routePath) return false;

  const pathname = routePath.split('?')[0].toLowerCase();

  // Public paths are universally accessible
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return true;
  }

  // Unauthenticated access to /admin/login is allowed
  if (pathname === '/admin/login') {
    return true;
  }

  const userRole = normalizeRole(role);
  if (!userRole) {
    return false; // Unauthenticated cannot access admin routes
  }

  // Financial boundaries: staff prohibited
  if (pathname.startsWith('/admin/finance') || pathname.startsWith('/api/admin/finance')) {
    return canAccessFinance(userRole);
  }

  // Staff role modification boundary: only super_admin can modify staff roles
  if (pathname.includes('/staff/') && pathname.endsWith('/role')) {
    return userRole === 'super_admin';
  }

  // CMS mutation boundaries: staff prohibited
  if (
    pathname.startsWith('/api/admin/cms') ||
    pathname.startsWith('/api/admin/services') ||
    pathname.startsWith('/api/admin/gallery') ||
    pathname.startsWith('/api/admin/upload')
  ) {
    return canMutateCMS(userRole);
  }

  // General admin pages and read APIs are accessible to all authenticated roles
  return true;
}
