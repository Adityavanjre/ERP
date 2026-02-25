import { Industry as SharedIndustry, INDUSTRY_CONFIGS as SharedConfigs, IndustryModuleConfig as SharedModuleConfig } from '@nexus/shared';

export const Industry = SharedIndustry;
export type Industry = SharedIndustry;

export type IndustryModuleConfig = SharedModuleConfig;

export const INDUSTRY_CONFIGS = SharedConfigs;

export function getIndustryConfig(industry: string): IndustryModuleConfig {
    return (INDUSTRY_CONFIGS as any)[industry] || (INDUSTRY_CONFIGS as any)[Industry.General];
}
