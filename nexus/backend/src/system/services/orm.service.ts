import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from './audit.service';
import { FieldType } from '@prisma/client';

@Injectable()
export class OrmService {
  private readonly logger = new Logger(OrmService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) { }

  /**
   * Define a new model in the system metadata.
   */
  async defineModel(
    appName: string,
    modelData: {
      name: string;
      label: string;
      description?: string;
      isSystem?: boolean;
      fields: Array<{
        name: string;
        label: string;
        type: FieldType;
        required?: boolean;
        targetModel?: string;
        selectionOptions?: any;
      }>;
    },
  ) {
    const app = await this.prisma.app.findUnique({ where: { name: appName } });
    if (!app) throw new NotFoundException(`App ${appName} not found`);

    const existing = await this.prisma.modelDefinition.findFirst({
      where: { name: modelData.name },
    });
    if (existing)
      throw new ConflictException(`Model ${modelData.name} already exists`);

    return this.prisma.modelDefinition.create({
      data: {
        moduleId: app.id,
        name: modelData.name,
        label: modelData.label,
        description: modelData.description,
        isSystem: modelData.isSystem || false,
        fields: {
          create: modelData.fields.map((f) => ({
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required || false,
            targetModel: f.targetModel,
            selectionOptions: f.selectionOptions,
          })),
        },
      },
      include: { fields: true },
    });
  }

  /**
   * Internal check for model access rights based on user role.
   */
  private async checkAccess(
    tenantId: string,
    modelName: string,
    role: string,
    permission: 'read' | 'write' | 'create' | 'unlink',
  ) {
    const model = await this.prisma.modelDefinition.findFirst({
      where: { name: modelName },
      include: { accessRights: true },
    });

    if (!model) return true; // System models without definitions follow default rules
    if (model.accessRights.length === 0) return true; // No specific restrictions

    const access = model.accessRights.find((a) => a.role === role);
    if (!access) return false;

    switch (permission) {
      case 'read':
        return access.permRead;
      case 'write':
        return access.permWrite;
      case 'create':
        return access.permCreate;
      case 'unlink':
        return access.permUnlink;
      default:
        return false;
    }
  }

  /**
   * Create a new record for a given model.
   */
  async createRecord(
    tenantId: string,
    modelName: string,
    data: any,
    userRole: any = 'Admin',
  ) {
    const hasAccess = await this.checkAccess(
      tenantId,
      modelName,
      userRole,
      'create',
    );
    if (!hasAccess)
      throw new ConflictException(
        `Access Denied: You do not have 'create' rights on ${modelName}`,
      );

    // Validate model exists
    const model = await this.prisma.modelDefinition.findFirst({
      where: { name: modelName },
      include: { fields: true },
    });
    if (!model) throw new NotFoundException(`Model ${modelName} not found`);

    // Basic validation against field definitions
    for (const field of model.fields) {
      if (field.required && !data[field.name]) {
        throw new ConflictException(
          `Field ${field.name} is required for model ${modelName}`,
        );
      }
    }

    return this.prisma.record.create({
      data: {
        tenantId,
        modelName,
        data: data,
      },
    });
  }

  /**
   * Search for records with basic filtering.
   */
  async findRecords(tenantId: string, modelName: string, domain: any = {}) {
    const records = await this.prisma.record.findMany({
      where: {
        tenantId,
        modelName,
        // In a production ORM, we would implement complex domain -> prisma where mapping
      },
    });

    return records.map((r) => ({
      id: r.id,
      ...(r.data as object),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async getRecord(tenantId: string, modelName: string, id: string) {
    const record = await this.prisma.record.findFirst({
      where: { id, tenantId, modelName },
    });
    if (!record) throw new NotFoundException(`Record ${id} not found`);

    return {
      id: record.id,
      ...(record.data as object),
    };
  }

  async updateRecord(
    tenantId: string,
    modelName: string,
    id: string,
    data: any,
  ) {
    const record = await this.prisma.record.findFirst({
      where: { id, tenantId, modelName },
    });
    if (!record) throw new NotFoundException(`Record ${id} not found`);

    const newData = { ...(record.data as object), ...data };

    return this.prisma.record.updateMany({
      where: { id, tenantId, modelName },
      data: { data: newData },
    });
  }

  async deleteRecord(tenantId: string, modelName: string, id: string) {
    const record = await this.prisma.record.findFirst({
      where: { id, tenantId, modelName },
    });
    if (!record) throw new NotFoundException(`Record ${id} not found`);

    // Write audit log BEFORE soft-delete — ensures forensic trace even if update fails
    await this.audit.log({
      tenantId,
      action: 'DELETE',
      resource: `OrmRecord:${modelName}`,
      details: { id, modelName, snapshot: record.data },
    });

    // Soft-delete: mark as deleted rather than destroying the record
    return this.prisma.record.updateMany({
      where: { id, tenantId, modelName },
      data: { data: { ...(record.data as object), _isDeleted: true, _deletedAt: new Date().toISOString() } },
    });
  }
}
