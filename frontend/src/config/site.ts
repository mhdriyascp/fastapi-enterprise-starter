/**
 * Global Enterprise Site & SEO Configuration.
 * Central single-source-of-truth for application metadata, branding, and environment URLs.
 */
export const siteConfig = {
  name: "Enterprise CRM Platform",
  shortName: "Enterprise CRM",
  description:
    "High-throughput enterprise CRM platform featuring dynamic RBAC, multi-tenant organization management, hierarchical dynamic menus, and real-time operational intelligence.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://crm.enterprise.internal",
  ogImage: "/og-image.png",
  authors: [
    {
      name: "Enterprise Core Architecture Team",
      url: "https://crm.enterprise.internal",
    },
  ],
  creator: "Enterprise Architecture Team",
  publisher: "Enterprise Systems Corp",
  keywords: [
    "Enterprise CRM",
    "Customer Relationship Management",
    "Multi-Tenant SaaS",
    "RBAC Management",
    "Role-Based Access Control",
    "Organization Registry",
    "FastAPI Next.js Architecture",
    "Executive Analytics",
  ],
  links: {
    docs: "/docs",
    apiDocs: "/scalar",
    support: "mailto:support@crm.enterprise.internal",
  },
  themeColor: {
    dark: "#0f172a",
    light: "#ffffff",
  },
};

export type SiteConfig = typeof siteConfig;
