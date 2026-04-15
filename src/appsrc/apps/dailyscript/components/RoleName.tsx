import React from 'react';
import { useRoleDisplayNameBridge } from '../../../shared/business/contacts/roleDisplayNameBridge';

interface RoleNameProps {
  roleId: string;
}

export const RoleName: React.FC<RoleNameProps> = ({ roleId }) => {
  const roleName = useRoleDisplayNameBridge(roleId);
  return <>{roleName || roleId}</>;
};
