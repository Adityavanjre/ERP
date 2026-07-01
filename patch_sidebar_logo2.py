import re

with open('nexus/frontend/src/components/layout/sidebar.tsx', 'r') as f:
    content = f.read()

content = content.replace('const { pbac, hasPermission } = useUX();',
                          'const { pbac, hasPermission } = useUX();\n  const { tenantProfile } = pbac;')

with open('nexus/frontend/src/components/layout/sidebar.tsx', 'w') as f:
    f.write(content)
