import React from 'react';
import Link from 'next/link';
import { LinkingEngine } from '@/lib/seo/linking-engine';

interface InternalLinkProps {
    children: string;
    className?: string;
}

/**
 * InternalLink component that automatically wraps keywords with their 
 * respective SEO-friendly internal links.
 */
export const InternalLink: React.FC<InternalLinkProps> = ({ children, className }) => {
    const url = LinkingEngine.getLinkForText(children);

    if (!url) {
        return <span className={className}>{children}</span>;
    }

    return (
        <Link
            href={url}
            className={`text-inherit hover:text-blue-600 transition-colors underline decoration-blue-500/20 underline-offset-4 ${className}`}
        >
            {children}
        </Link>
    );
};
