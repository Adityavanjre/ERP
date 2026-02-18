import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Klypso Plugin Manager
 * Responsibilities:
 * 1. Scan /plugins directory for custom integration modules.
 * 2. Track active plugins in the DB.
 * 3. [Future] Dynamically load NestJS modules from external paths.
 */
@Injectable()
export class PluginManager implements OnModuleInit {
  private readonly logger = new Logger('PluginManager');
  private readonly pluginsPath = path.join(process.cwd(), 'plugins');

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Klypso Nexus: Initializing Plugin System...');
    await this.ensurePluginsDir();
    await this.syncInstalledPlugins();
  }

  private async ensurePluginsDir() {
    if (!fs.existsSync(this.pluginsPath)) {
      this.logger.log(`Creating plugins directory at ${this.pluginsPath}`);
      fs.mkdirSync(this.pluginsPath, { recursive: true });
    }
  }

  /**
   * Scans the plugins folder and syncs state with the DB
   */
  private async syncInstalledPlugins() {
    const folders = fs.readdirSync(this.pluginsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    this.logger.log(`Found ${folders.length} plugin candidate(s) in local storage.`);

    for (const name of folders) {
      // Logic to check if already in DB
      const existing = await this.prisma.plugin.findUnique({
        where: { name }
      });

      if (!existing) {
        this.logger.log(`Registering new plugin: [${name}]`);
        await this.prisma.plugin.create({
          data: {
            name,
            version: '1.0.0', // Read from a manifest in future
            isActive: false,  // Default to off
          }
        });
      }
    }
  }

  async getActivePlugins() {
    return this.prisma.plugin.findMany({
      where: { isActive: true }
    });
  }

  async togglePlugin(id: string, active: boolean) {
    this.logger.log(`Switching plugin [${id}] to ${active ? 'ACTIVE' : 'INACTIVE'}`);
    return this.prisma.plugin.update({
      where: { id },
      data: { isActive: active }
    });
  }
}
