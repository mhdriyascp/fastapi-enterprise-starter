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
      { source: '/access-control/matrix', destination: '/rbac?tab=matrix', permanent: false },
      { source: '/access-control/access-matrix', destination: '/rbac?tab=matrix', permanent: false },
      { source: '/masters/countries', destination: '/masters?tab=countries', permanent: false },
      { source: '/masters/states', destination: '/masters?tab=states', permanent: false },
      { source: '/masters/cities', destination: '/masters?tab=cities', permanent: false },
      { source: '/masters/currencies', destination: '/masters?tab=currencies', permanent: false },
      { source: '/masters/time-zones', destination: '/masters?tab=time-zones', permanent: false },
      { source: '/masters/languages', destination: '/masters?tab=languages', permanent: false },
      { source: '/masters/industries', destination: '/masters?tab=industries', permanent: false },
      { source: '/masters/address-types', destination: '/masters?tab=address-types', permanent: false },
      { source: '/masters/communication-types', destination: '/masters?tab=communication-types', permanent: false },
      { source: '/masters/document-types', destination: '/masters?tab=document-types', permanent: false },
      { source: '/masters/identification-types', destination: '/masters?tab=identification-types', permanent: false },
      { source: '/masters/units-of-measure', destination: '/masters?tab=units-of-measure', permanent: false },
    ];
  },
};

export default nextConfig;
