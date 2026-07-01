import re

with open('nexus/frontend/src/app/(dashboard)/invoice/[id]/page.tsx', 'r') as f:
    content = f.read()

if 'useUX' not in content:
    content = content.replace('import { toast } from "sonner";',
                              'import { toast } from "sonner";\nimport { useUX } from "../../../../components/providers/ux-provider";\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";')

if 'const { pbac } = useUX();' not in content:
    content = content.replace('const [loading, setLoading] = useState(true);',
                              'const [loading, setLoading] = useState(true);\n  const [template, setTemplate] = useState("classic");\n  const { pbac } = useUX();\n  const logoUrl = pbac.tenantProfile?.logoUrl;')

with open('nexus/frontend/src/app/(dashboard)/invoice/[id]/page.tsx', 'w') as f:
    f.write(content)
