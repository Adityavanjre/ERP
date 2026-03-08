import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType } from '@prisma/client';

import { TraceService } from '../common/services/trace.service';

@Injectable()
export class HealthcareService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private trace: TraceService,
  ) {}

  // --- Patient Registry (EMR/EHR) ---
  async registerPatient(tenantId: string, data: any) {
    const {
      firstName,
      lastName,
      email,
      bloodGroup,
      allergies,
      medicalHistory,
      emergencyContact,
    } = data;

    return this.prisma.$transaction(async (tx) => {
      // Create or find central Customer record
      let customer = await tx.customer.findFirst({
        where: { tenantId, email, isDeleted: false },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            tenantId,
            firstName,
            lastName,
            email,
            status: 'Customer', // In healthcare, patient is a customer
          },
        });
      }

      // Create Patient profile
      return tx.patient.create({
        data: {
          tenantId,
          customerId: customer.id,
          bloodGroup,
          allergies,
          medicalHistory,
          emergencyContact,
          correlationId: this.trace.getCorrelationId(),
        },
      });
    });
  }

  async getPatients(tenantId: string) {
    return this.prisma.patient.findMany({
      where: { tenantId },
      include: {
        customer: true,
        appointments: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        medicalRecords: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
    });
  }

  async getPatientHistory(tenantId: string, patientId: string) {
    return this.prisma.patient.findUnique({
      where: { id: patientId, tenantId },
      include: {
        customer: true,
        appointments: { orderBy: { date: 'desc' } },
        medicalRecords: { orderBy: { date: 'desc' } },
      },
    });
  }

  // --- Medical Records & Prescriptions ---
  async createMedicalRecord(tenantId: string, data: any) {
    const { patientId, diagnosis, prescription, labResults, notes } = data;

    // 100x Logic: Clinical Value Triage Engine
    // IND-001: Dynamic Thresholds from Governance Profile
    const gov = await this.prisma.governanceProfile.findUnique({
      where: { tenantId },
    });

    let triageStatus = 'Normal';
    if (labResults && typeof labResults === 'object') {
      const results = labResults;
      // Use configured values or system defaults
      const thresholds = {
        kCrit: gov?.criticalPotassium || 6.0,
        hbCrit: gov?.criticalHemoglobin || 7.0,
        glCrit: gov?.criticalGlucose || 500,
        kWarn: gov?.warningPotassium || 5.2,
        hbWarn: gov?.warningHemoglobin || 10.0,
        glWarn: gov?.warningGlucose || 200,
      };

      if (
        results.potassium > thresholds.kCrit ||
        results.hemoglobin < thresholds.hbCrit ||
        results.glucose > thresholds.glCrit
      ) {
        triageStatus = 'Critical';
      } else if (
        results.potassium > thresholds.kWarn ||
        results.hemoglobin < thresholds.hbWarn ||
        results.glucose > thresholds.glWarn
      ) {
        triageStatus = 'Warning';
      }
    }

    return this.prisma.medicalRecord.create({
      data: {
        tenantId,
        patientId,
        diagnosis,
        prescription, // Expecting JSON structure
        labResults,
        notes,
        triageStatus,
        correlationId: this.trace.getCorrelationId(),
      },
    });
  }

  // --- Appointment Scheduling ---
  async scheduleAppointment(tenantId: string, data: any) {
    const { patientId, employeeId, date, startTime, note } = data;

    return this.prisma.appointment.create({
      data: {
        tenantId,
        patientId,
        employeeId,
        date: new Date(date),
        startTime,
        status: 'Scheduled',
        notes: note,
        correlationId: this.trace.getCorrelationId(),
      },
    });
  }

  async updateAppointmentStatus(tenantId: string, id: string, status: string) {
    return this.prisma.appointment.update({
      where: { id, tenantId },
      data: { status },
    });
  }

  // --- Pharmacy Batch Expiry Alerts ---
  async getExpiryAlerts(tenantId: string, daysThreshold: number = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    return this.prisma.pharmacyBatch.findMany({
      where: {
        tenantId,
        expiryDate: {
          lte: thresholdDate,
          gt: new Date(), // Only upcoming expiries
        },
      },
      include: { product: true },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async addPharmacyBatch(tenantId: string, data: any) {
    return this.prisma.pharmacyBatch.create({
      data: {
        tenantId,
        productId: data.productId,
        batchNumber: data.batchNumber,
        expiryDate: new Date(data.expiryDate),
        quantity: data.quantity,
        costPrice: data.costPrice,
        correlationId: this.trace.getCorrelationId(),
      },
    });
  }

  // --- Insurance / TPA Billing Split ---
  async generateInsuranceClaimInvoice(
    tenantId: string,
    data: {
      patientId: string;
      totalBill: number;
      coPayAmount: number;
      insuranceProviderId: string;
      arAccountId: string;
      insuranceReceivableAccountId: string;
      revenueAccountId: string;
    },
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: data.patientId, tenantId },
      include: { customer: true },
    });

    if (!patient) throw new BadRequestException('Patient not found');

    const total = new Decimal(data.totalBill);
    const coPay = new Decimal(data.coPayAmount);
    const claimAmount = total.sub(coPay);

    return this.prisma.$transaction(async (tx) => {
      // Split entries between Patient (Cash/AR) and Insurance Carrier (Receivable)
      const entry = await this.ledger.createJournalEntry(
        tenantId,
        {
          date: new Date().toISOString(),
          description: `Medical Bill Split: ${patient.customer?.firstName} (Claim: ${claimAmount})`,
          reference: `HLTH_BILL_${Date.now()}`,
          transactions: [
            {
              accountId: data.arAccountId, // Amount patient pays
              type: TransactionType.Debit,
              amount: coPay.toNumber(),
              description: `Co-pay amount for ${patient.customer?.firstName}`,
            },
            {
              accountId: data.insuranceReceivableAccountId, // Amount carrier pays
              type: TransactionType.Debit,
              amount: claimAmount.toNumber(),
              description: `Insurance Claim: ${data.insuranceProviderId}`,
            },
            {
              accountId: data.revenueAccountId, // Total Revenue
              type: TransactionType.Credit,
              amount: total.toNumber(),
              description: 'Medical Services Revenue',
            },
          ],
        },
        tx,
      );

      return {
        journalEntry: entry,
        total: total.toFixed(2),
        patientCoPay: coPay.toFixed(2),
        insuranceClaim: claimAmount.toFixed(2),
      };
    });
  }
}
