import React from 'react';
import { InternalLink } from './internal-link';
import { LinkingEngine } from '@/lib/seo/linking-engine';

interface SmartContentProps {
    children: string;
}

/**
 * SmartContent Component
 * Automatically transforms plain text keywords into InternalLinks based on the LinkingEngine dictionary.
 */
export function SmartContent({ children }: SmartContentProps) {
    const dictionary = LinkingEngine.getDictionary();
    const keywords = Object.keys(dictionary).sort((a, b) => b.length - a.length); // Longest first to prevent partial matches

    if (!children) return null;

    // Build a regex that matches any of the keywords
    // Using word boundaries to avoid matching parts of words
    const regex = new RegExp(`\\b(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');

    const parts = children.split(regex);
    const matches = children.match(regex) || [];

    return (
        <>
            {parts.map((part, i) => {
                if (i % 2 === 0) return part;
                const match = matches[Math.floor(i / 2)];
                return (
                    <InternalLink key={i}>
                        {match}
                    </InternalLink>
                );
            })}
        </>
    );
}
