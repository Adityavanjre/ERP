import { ImageResponse } from 'next/og';
import { industryThemes } from '@/constants/industries';

export const runtime = 'edge';

export default async function Image({ params }: { params: { slug: string } }) {
    const { slug } = params;
    const theme = industryThemes[slug.toLowerCase()];

    if (!theme) return new ImageResponse(<div>Nexus ERP</div>);

    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff',
                    backgroundImage: 'radial-gradient(circle at top right, #eff6ff, transparent), radial-gradient(circle at bottom left, #f8fafc, transparent)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '80px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '64px',
                        backgroundColor: '#fff',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
                    }}
                >
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb', marginBottom: '24px', letterSpacing: '-0.02em' }}>
                        NEXUS ERP <span style={{ color: '#64748b', fontWeight: 'normal', margin: '0 8px' }}>|</span> {theme.name.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '84px', fontWeight: '900', color: '#0f172a', textAlign: 'center', lineHeight: '1.1', letterSpacing: '-0.05em' }}>
                        The Imperial Standard <br /> for {theme.name}
                    </div>
                    <div style={{ fontSize: '28px', color: '#64748b', marginTop: '40px', fontWeight: '500' }}>
                        nexus.klypso.in/portal
                    </div>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
}
