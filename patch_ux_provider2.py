import re

with open('nexus/frontend/src/components/providers/ux-provider.tsx', 'r') as f:
    content = f.read()

if 'tenantProfile?:' not in content:
    content = content.replace('interface PBACState {\n  permissions: Record<string, string[]>;\n  modules: string[];\n}',
                              'interface PBACState {\n  permissions: Record<string, string[]>;\n  modules: string[];\n  tenantProfile?: { name?: string; logoUrl?: string };\n}')

if 'res.data.tenantProfile' not in content:
    content = content.replace('''const newState = {
            permissions: res.data.permissions || {},
            modules: res.data.modules || [],
          };''',
                              '''const newState = {
            permissions: res.data.permissions || {},
            modules: res.data.modules || [],
            tenantProfile: res.data.tenantProfile || undefined,
          };''')

with open('nexus/frontend/src/components/providers/ux-provider.tsx', 'w') as f:
    f.write(content)
