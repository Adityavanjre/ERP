
"use client";

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Permission, RolePermissions } from '@/constants/permissions';

interface HasPermissionProps {
    permission: Permission;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    disableOnly?: boolean;
}

export const HasPermission: React.FC<HasPermissionProps> = ({
    permission,
    children,
    fallback = null,
    disableOnly = false
}) => {
    const { user } = useAuth();
    const userRole = user?.role;

    const userPermissions = userRole ? (RolePermissions[userRole as any] || []) : [];
    const hasAccess = userPermissions.includes(permission);

    if (!hasAccess) {
        if (disableOnly && React.isValidElement(children)) {
            return React.cloneElement(children as React.ReactElement<any>, {
                disabled: true,
                title: "Insufficient permissions. Contact your Owner."
            });
        }
        return <>{fallback}</>;
    }

    return <>{children}</>;
};
