'use client';

import { useReportWebVitals } from 'next/web-vitals';

/**
 * PerformanceMonitor silently tracks Core Web Vitals (LCP, FID, CLS, etc.)
 * it ensures the platform stays within its performance budgets.
 */
export function PerformanceMonitor() {
    useReportWebVitals((metric) => {
        // In production, we would send this to a monitoring service (e.g., Vercel Analytics, GA4)
        if (process.env.NODE_ENV === 'development') {
            console.log(`[SEO-Performance] ${metric.name}: ${metric.value.toFixed(2)}ms`);
        }
    });

    return null;
}
