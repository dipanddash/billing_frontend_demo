import { createContext, useContext } from "react";
import { DEFAULT_PERMISSIONS } from "./permissions";

const PermissionContext = createContext<any>(null);

export const PermissionProvider = ({ children, role }: any) => {
  const permissions = DEFAULT_PERMISSIONS[role] || [];

  const canAccess = (module: string) => {
    return permissions.includes(module);
  };

  return (
    <PermissionContext.Provider value={{ canAccess, permissions }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => useContext(PermissionContext);