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
  /** Primary phone number */
  phone?: string | null;
  /** User account lifecycle status ('active', 'pending', 'suspended', 'disabled') */
  status: string;
  /** Timestamp when the email address was verified, or null if pending */
  email_verified_at: string | null;
  /** UTC timestamp of user account creation */
  created_at: string;
  /** UTC timestamp of the most recent profile modification */
  updated_at: string | null;
  /** Active assigned role codes */
  roles?: string[];
  /** Whether user is a protected Super Administrator */
  is_super_admin?: boolean;
  /** Granular assigned RBAC permission codes */
  permissions?: string[];
  /** Preferred user time zone (e.g. 'America/New_York', 'Asia/Kolkata') */
  timezone?: string | null;
  /** Preferred user locale (e.g. 'en-US', 'en-GB') */
  locale?: string | null;
}

export interface UserUpdatePayload {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  phone?: string | null;
  status?: string | null;
  role_codes?: string[];
}

export interface UserCreatePayload {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  email: string;
  password: string;
  phone?: string | null;
  status?: string;
  role_codes?: string[];
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
  /** Menu item unique identifier (internal ID or public UUIDv7) */
  id: number | string;
  /** Public-facing UUID */
  public_id?: string;
  /** Parent menu identifier for hierarchical nesting, or null for root items */
  parent_id: number | string | null;
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
  /** Whether this menu item is displayed in the top header navigation */
  show_in_header?: boolean;
  /** Whether this menu item has been soft-deleted */
  is_deleted?: boolean;
  /** UTC timestamp of soft deletion */
  deleted_at?: string | null;
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
  show_in_header?: boolean;
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
  show_in_header?: boolean;
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
  /** UUID of operator who created this record */
  created_by_id?: string | null;
  /** UUID of operator who last modified this record */
  updated_by_id?: string | null;
  /** Soft-deletion status indicator */
  is_deleted?: boolean;
  /** UTC timestamp of soft-deletion */
  deleted_at?: string | null;
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
  code?: string;
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
  is_deleted?: boolean;
  deleted_at?: string | null;
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
  is_deleted?: boolean;
  deleted_at?: string | null;
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
  code?: string;
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

/**
 * Platform notification entity.
 * Mirrored from FastAPI Pydantic schema: app/modules/notifications/schemas.py (NotificationResponse).
 */
export interface NotificationItem {
  /** Internal BigInteger primary key or string identifier */
  id: number | string;
  /** Public-facing UUIDv7 identifier */
  public_id?: string;
  /** Targeted user UUID or null for system-wide broadcast */
  user_id?: string | null;
  /** Subject/title of notification */
  title: string;
  /** Detailed content body */
  message: string;
  /** Event module taxonomy classification */
  type: string;
  /** Optional deep-link destination URL */
  link?: string | null;
  /** Read status flag */
  is_read: boolean;
  /** UTC timestamp when recipient marked notification as read */
  read_at?: string | null;
  /** UTC timestamp when notification was created */
  created_at: string;
  /** UTC timestamp of last update */
  updated_at?: string | null;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface NotificationCreateInput {
  title: string;
  message: string;
  type?: 'deal' | 'security' | 'tenant' | 'system';
  link?: string | null;
  user_id?: string | null;
}

export interface NotificationUpdateInput {
  is_read: boolean;
}

/**
 * Standard pagination envelope returned by /api/v1/masters/* collection endpoints.
 */
export interface MasterListResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface BaseMasterEntity {
  id?: number;
  public_id: string;
  is_active: boolean;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_by_id?: string | null;
  updated_by_id?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface MasterCountry extends BaseMasterEntity {
  id: number;
  code: string;
  iso3_code?: string | null;
  name: string;
  phone_code?: string | null;
  default_currency_id?: number | null;
  default_currency?: MasterCurrency | null;
}

export interface MasterState extends BaseMasterEntity {
  id: number;
  country_id: number;
  code?: string | null;
  name: string;
}

export interface MasterCity extends BaseMasterEntity {
  id: number;
  country_id: number;
  state_id?: number | null;
  name: string;
}

export interface MasterCurrency extends BaseMasterEntity {
  code: string;
  name: string;
  symbol?: string | null;
  decimal_places: number;
}

export interface MasterTimeZone extends BaseMasterEntity {
  name: string;
  label: string;
  utc_offset?: string | null;
}

export interface MasterLanguage extends BaseMasterEntity {
  code: string;
  name: string;
  native_name?: string | null;
}

export interface MasterIndustry extends BaseMasterEntity {
  code: string;
  name: string;
  description?: string | null;
}

export interface MasterUnitOfMeasure extends BaseMasterEntity {
  code: string;
  name: string;
  symbol?: string | null;
  category?: string | null;
}

export interface MasterTypeEntity extends BaseMasterEntity {
  code: string;
  name: string;
  description?: string | null;
}

export type MasterAddressType = MasterTypeEntity;
export type MasterCommunicationType = MasterTypeEntity;
export type MasterDocumentType = MasterTypeEntity;
export type MasterIdentificationType = MasterTypeEntity;

export interface MasterBrand extends BaseMasterEntity {
  code: string;
  name: string;
  description?: string | null;
}

export interface MasterTax extends BaseMasterEntity {
  code: string;
  name: string;
  rate: number;
  tax_type: string;
  country_id: number;
}

export interface MasterAddress extends BaseMasterEntity {
  organization_id?: number | null;
  branch_id?: number | null;
  address_type_id: number;
  country_id: number;
  state_id?: number | null;
  city_id?: number | null;
  address_line1: string;
  address_line2?: string | null;
  landmark?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  is_default: boolean;
}

/**
 * Enterprise System Configuration & Application Preferences entity.
 * Mirrored from FastAPI Pydantic schema: app/modules/settings/schemas.py.
 */
export type SettingValue = string | number | boolean | unknown[] | Record<string, unknown> | null;

export interface SystemSetting {
  id: number;
  public_id: string;
  category: 'general' | 'security' | 'notifications' | 'governance' | 'features' | string;
  key: string;
  value: SettingValue;
  value_type: 'string' | 'integer' | 'float' | 'boolean' | 'json' | 'array';
  label: string;
  description?: string | null;
  is_public: boolean;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string | null;
}

export interface SystemSettingUpdatePayload {
  value: SettingValue;
  label?: string;
  description?: string;
  sort_order?: number;
}

export interface BulkSettingsUpdatePayload {
  settings: Record<string, SettingValue>;
  sort_orders?: Record<string, number>;
}

export interface PublicSettingsResponse {
  settings: Record<string, SettingValue>;
}

/**
 * Activity log entry representing system-wide mutation audit records.
 * Mirrored from FastAPI Pydantic schema: app/modules/activity_logs/schemas.py (ActivityLogResponse).
 */
export interface ActivityLog {
  id: number;
  public_id: string;
  module: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  details: Record<string, unknown> | null;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  request_id: string | null;
  created_at: string;
}



