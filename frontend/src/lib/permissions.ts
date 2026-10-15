import { User } from './types';

/**
 * Checks whether a user possesses a specific permission code.
 * Super Administrators inherently possess universal system permissions across all modules.
 * Other users are authorized based on granular permissions assigned to their active roles.
 */
export function hasPermission(user: User | null, permissionCode: string): boolean {
  if (!user) return false;
  if (user.is_super_admin || user.roles?.includes('super_admin')) return true;
  return user.permissions?.includes(permissionCode) ?? false;
}

/**
 * Checks whether a user possesses ANY of the provided permission codes.
 */
export function hasAnyPermission(user: User | null, permissionCodes: string[]): boolean {
  if (!user) return false;
  if (user.is_super_admin || user.roles?.includes('super_admin')) return true;
  return permissionCodes.some((code) => user.permissions?.includes(code));
}

/**
 * Checks whether a user possesses ALL of the provided permission codes.
 */
export function hasAllPermissions(user: User | null, permissionCodes: string[]): boolean {
  if (!user) return false;
  if (user.is_super_admin || user.roles?.includes('super_admin')) return true;
  return permissionCodes.every((code) => user.permissions?.includes(code));
}
