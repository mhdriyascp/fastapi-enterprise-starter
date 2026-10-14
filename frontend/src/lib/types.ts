/**
 * User identity entity representing an authenticated platform user.
 * Mirrored from FastAPI Pydantic schema: app/modules/users/schemas.py (UserResponse).
 */
export interface User {
  /** Internal UUID primary key */
  id: string;
  /** Public-facing UUID identifier used in URLs and external APIs */
  public_id: string;
  /** Given first name */
  first_name: string | null;
  /** Family last name */
  last_name: string | null;
  /** Formatted full display name */
  display_name: string | null;
  /** Primary contact email address */
  email: string;
  /** User account lifecycle status ('active', 'pending', 'suspended', 'disabled') */
  status: string;
  /** Timestamp when the email address was verified, or null if pending */
  email_verified_at: string | null;
  /** UTC timestamp of user account creation */
  created_at: string;
  /** UTC timestamp of the most recent profile modification */
  updated_at: string | null;
}

/**
 * JWT credentials returned upon successful authentication.
 * Mirrored from FastAPI Pydantic schema: app/modules/users/schemas.py (TokenResponse).
 */
export interface TokenResponse {
  /** Short-lived JWT access token for API authorization */
  access_token: string;
  /** Cryptographic refresh token used to obtain a new access token */
  refresh_token: string;
  /** Bearer token standard identifier */
  token_type: string;
}

/**
 * Hierarchical navigation menu item controlled by RBAC roles and permissions.
 * Mirrored from FastAPI Pydantic schema: app/modules/menus/schemas.py (MenuItemResponse).
 */
export interface MenuItem {
  /** Menu item unique identifier */
  id: string;
  /** Public-facing UUID */
  public_id?: string;
  /** Parent menu identifier for hierarchical nesting, or null for root items */
  parent_id: string | null;
  /** Unique system identifier (e.g., 'nav_orgs') */
  code: string;
  /** User-facing title rendered in the sidebar */
  title: string;
  /** Backend destination path (e.g., '/organizations') */
  path?: string | null;
  /** Next.js destination route alias */
  route?: string | null;
  /** Icon identifier mapped to Lucide icons */
  icon: string | null;
  /** Numerical sorting order */
  sort_order?: number;
  /** Legacy alias for sort order */
  order_no?: number;
  /** Whether this menu item is currently enabled in navigation */
  is_active: boolean;
  /** Whether the route opens in a new external browser tab */
  is_external?: boolean;
  /** Optional visual badge tag (e.g., 'New', 'v2') */
  badge?: string | null;
  /** Specific permission code required to view this item */
  required_permission_code?: string | null;
  /** Specific role code required to view this item */
  required_role_code?: string | null;
  /** Child sub-menu items */
  children: MenuItem[];
}

/**
 * Payload for creating a new navigation menu item via POST /api/v1/menus.
 */
export interface MenuCreateInput {
  title: string;
  code?: string;
  path?: string | null;
  icon?: string | null;
  sort_order?: number;
  parent_id?: string | null;
  is_active?: boolean;
}

/**
 * Payload for updating an existing navigation menu item via PATCH /api/v1/menus/{id}.
 */
export interface MenuUpdateInput {
  title?: string;
  code?: string;
  path?: string | null;
  icon?: string | null;
  sort_order?: number;
  parent_id?: string | null;
  is_active?: boolean;
}

/**
 * Standard paginated response envelope for all collection endpoints.
 * Mirrored from FastAPI generic schema: app.shared.response.PagedResponse[T].
 */
export interface PagedResponse<T> {
  /** List of records on the current page */
  items: T[];
  /** Total count of records matching query across all pages */
  total: number;
  /** Current page index (1-indexed) */
  page: number;
  /** Maximum number of records per page */
  page_size: number;
  /** Total calculated pages based on total and page_size */
  total_pages: number;
}

/**
 * Organization tenant entity.
 * Mirrored from FastAPI Pydantic schema: app/modules/organizations/schemas.py (OrganizationResponse).
 */
export interface Organization {
  /** Organization integer primary key */
  id: number;
  /** Public-facing UUID identifier */
  public_id?: string;
  /** Official company or organization name */
  name: string;
  /** Unique upper-case alphanumeric identifier (e.g., 'ORG-001') */
  code: string;
  /** Optional formal business legal name */
  legal_name?: string | null;
  /** Commercial registration identification number */
  registration_number?: string | null;
  /** Value-added tax or corporate tax number */
  tax_registration_number?: string | null;
  /** Primary contact corporate email */
  email?: string | null;
  /** Primary voice phone line */
  phone?: string | null;
  /** Corporate official website URL */
  website?: string | null;
  /** Whether the organization is active */
  is_active: boolean;
  /** UTC timestamp of organization creation */
  created_at: string;
  /** UTC timestamp of last update */
  updated_at: string | null;
}

/**
 * Payload for creating a new organization tenant via POST /api/v1/organizations.
 */
export interface OrganizationCreateInput {
  name: string;
  code?: string;
  legal_name?: string | null;
  registration_number?: string | null;
  tax_registration_number?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

/**
 * Payload for updating an existing organization tenant via PATCH /api/v1/organizations/{id}.
 */
export interface OrganizationUpdateInput {
  name?: string;
  legal_name?: string | null;
  registration_number?: string | null;
  tax_registration_number?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  is_active?: boolean;
}


/**
 * Role entity representing access roles in RBAC system.
 * Mirrored from FastAPI Pydantic schema: app/modules/rbac/schemas.py (RoleResponse).
 */
export interface Role {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

/**
 * Permission entity representing granular action permissions in RBAC.
 * Mirrored from FastAPI Pydantic schema: app/modules/rbac/schemas.py (PermissionResponse).
 */
export interface Permission {
  id: string;
  name: string;
  code: string;
  description: string | null;
  resource: string;
  action: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface RoleCreateInput {
  name: string;
  code?: string;
  description?: string | null;
}

export interface RoleUpdateInput {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface PermissionCreateInput {
  name: string;
  code?: string;
  resource: string;
  action: string;
  description?: string | null;
}

export interface PermissionUpdateInput {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

