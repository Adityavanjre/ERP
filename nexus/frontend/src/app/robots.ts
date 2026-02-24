import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://nexus.klypso.in/portal';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/admin/', '/(dashboard)/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
