import { UserRole } from '../types/auth';

export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'complainant':
      return '/complainant/my-complaints';
    case 'technician':
      return '/technician/queue';
    default:
      return '/login';
  }
}

export function isRoleAllowed(userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}
