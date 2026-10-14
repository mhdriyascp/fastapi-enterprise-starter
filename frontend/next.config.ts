import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      { source: '/dashboard', destination: '/', permanent: false },
      { source: '/settings/menus', destination: '/menus', permanent: false },
      { source: '/access-control', destination: '/rbac', permanent: false },
      { source: '/access-control/roles', destination: '/rbac?tab=roles', permanent: false },
      { source: '/access-control/permissions', destination: '/rbac?tab=permissions', permanent: false },
    ];
  },
};

export default nextConfig;
