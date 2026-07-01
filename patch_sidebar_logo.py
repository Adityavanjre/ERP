import re

with open('nexus/frontend/src/components/layout/sidebar.tsx', 'r') as f:
    content = f.read()

if 'tenantProfile' not in content:
    content = content.replace('const { pbac, triggerSessionExpiry, setUILocked } = useUX();',
                              'const { pbac, triggerSessionExpiry, setUILocked } = useUX();\n  const { tenantProfile } = pbac;')

    old_logo_ui = '''<KlypsoLogo name={user?.tenantName || "KLYPSO"} />'''
    new_logo_ui = '''{tenantProfile?.logoUrl ? (
            <div className="flex items-center">
              <img src={tenantProfile.logoUrl} alt={user?.tenantName || "Logo"} className="h-8 w-auto object-contain max-w-[140px]" />
            </div>
          ) : (
            <KlypsoLogo name={user?.tenantName || "KLYPSO"} />
          )}'''
    content = content.replace(old_logo_ui, new_logo_ui)

with open('nexus/frontend/src/components/layout/sidebar.tsx', 'w') as f:
    f.write(content)
