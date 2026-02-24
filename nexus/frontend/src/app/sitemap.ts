import { MetadataRoute } from 'next';
import { industryThemes } from '@/constants/industries';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://nexus.klypso.in/portal';

    // Static routes
    const staticRoutes = [
        '',
        '/login',
        '/register',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // Industry dynamic routes
    const industryRoutes = Object.keys(industryThemes).map((slug) => ({
        url: `${baseUrl}/industries/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.9,
    }));

    return [...staticRoutes, ...industryRoutes];
}
