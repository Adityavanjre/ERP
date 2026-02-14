import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export interface AppManifest {
  name: string;
  label: string;
  description?: string;
  version: string;
  category: string;
  dependencies?: string[];
  author?: string;
  website?: string;
}

@Injectable()
export class RegistryService implements OnModuleInit {
  private readonly logger = new Logger(RegistryService.name);
  private readonly appsPath = path.join(process.cwd(), 'src', 'apps');

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Klypso Kernel: Initializing App Registry...');
    await this.syncManifests();
  }

  /**
   * Scans the apps directory and synchronizes manifest.json files with the database.
   */
  async syncManifests() {
    if (!fs.existsSync(this.appsPath)) {
      fs.mkdirSync(this.appsPath, { recursive: true });
    }

    const appFolders = fs.readdirSync(this.appsPath);

    for (const folder of appFolders) {
      const manifestPath = path.join(this.appsPath, folder, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest: AppManifest = JSON.parse(
            fs.readFileSync(manifestPath, 'utf8'),
          );
          await this.upsertModule(manifest);
        } catch (err) {
          this.logger.error(`Failed to parse manifest for app: ${folder}`, err);
        }
      }
    }
  }

  private async upsertModule(manifest: AppManifest) {
    return this.prisma.app.upsert({
      where: { name: manifest.name },
      update: {
        label: manifest.label,
        description: manifest.description,
        version: manifest.version,
        category: manifest.category,
        author: manifest.author,
        website: manifest.website,
        dependencies: manifest.dependencies?.join(',') || '',
      },
      create: {
        name: manifest.name,
        label: manifest.label,
        description: manifest.description,
        version: manifest.version,
        category: manifest.category,
        author: manifest.author,
        website: manifest.website,
        dependencies: manifest.dependencies?.join(',') || '',
        installed: false,
      },
    });
  }

  async getInstalledApps() {
    return this.prisma.app.findMany({
      where: { installed: true },
    });
  }

  async getAllApps() {
    return this.prisma.app.findMany();
  }

  async installApp(name: string) {
    this.logger.log(`Klypso Kernel: Installing app [${name}]...`);
    return this.prisma.app.update({
      where: { name },
      data: { installed: true },
    });
  }

  async uninstallApp(name: string) {
    this.logger.log(`Klypso Kernel: Uninstalling app [${name}]...`);
    return this.prisma.app.update({
      where: { name },
      data: { installed: false },
    });
  }

  /**
   * Rapid Deployment: Configures the kernel for a specific industry by auto-installing relevant apps.
   */
  async applyIndustryPreset(type: string) {
    const presets: Record<string, string[]> = {
      manufacturing: ['inventory', 'manufacturing', 'purchase'],
      retail: ['crm', 'inventory', 'sales'],
      wholesale: ['crm', 'inventory', 'sales', 'purchase'],
      services: ['crm', 'projects', 'accounting'],
    };

    const appsToInstall = presets[type.toLowerCase()];
    if (!appsToInstall) throw new Error('Invalid Industry Preset');

    this.logger.log(`Klypso Kernel: Applying [${type}] industry preset...`);

    for (const appName of appsToInstall) {
      await this.prisma.app.updateMany({
        where: { name: appName },
        data: { installed: true },
      });
    }

    return { success: true, installed: appsToInstall };
  }
}
