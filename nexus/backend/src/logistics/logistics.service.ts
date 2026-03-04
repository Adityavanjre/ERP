import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { Decimal } from '@prisma/client/runtime/library';

import { TraceService } from '../common/services/trace.service';

@Injectable()
export class LogisticsService {
    constructor(
        private prisma: PrismaService,
        private ledger: LedgerService,
        private trace: TraceService,
    ) { }

    // --- Fleet Management ---
    async registerVehicle(tenantId: string, data: any) {
        // --- INDUSTRY INVARIANT: LOGISTICS SCOPE ---
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        const industry = tenant?.industry || tenant?.type;

        if (industry !== 'Logistics' && industry !== 'Manufacturing' && industry !== 'Construction') {
            throw new BadRequestException('Vertical Compliance Violation: Vehicle registration is restricted to Logistics, Manufacturing, or Construction verticals.');
        }

        // --- SAFETY INVARIANT: REGISTRATION FORMAT ---
        if (!data.registrationNo || data.registrationNo.length < 5) {
            throw new BadRequestException('Compliance Error: Invalid registration number. Must be a valid legal registration for fleet tracking.');
        }

        return (this.prisma as any).vehicle.create({
            data: {
                tenantId,
                registrationNo: data.registrationNo.toUpperCase(),
                model: data.model,
                type: data.type,
                capacity: data.capacity,
                correlationId: this.trace.getCorrelationId(),
            },
        });
    }

    async getVehicles(tenantId: string) {
        return (this.prisma as any).vehicle.findMany({
            where: { tenantId },
            include: { fuelLogs: true, maintenance: true },
        });
    }

    // --- Fuel vs Mileage Accounting ---
    async logFuel(tenantId: string, data: any) {
        const { vehicleId, liters, rate, odometerReading, fuelAccountId, bankAccountId } = data;
        const totalCost = Number(liters) * Number(rate);

        return this.prisma.$transaction(async (tx) => {
            // 1. Create Journal Entry for Fuel Expense
            const journal = await this.ledger.createJournalEntry(tenantId, {
                date: new Date().toISOString(),
                description: `Fuel purchase for vehicle ${vehicleId}`,
                reference: `FUEL_LOG_${vehicleId}_${Date.now()}`,
                transactions: [
                    {
                        accountId: fuelAccountId, // Fuel Expense Account
                        type: 'Debit',
                        amount: totalCost,
                        description: `Fuel: ${liters}L @ ${rate}`,
                    },
                    {
                        accountId: bankAccountId, // Bank/Cash Account
                        type: 'Credit',
                        amount: totalCost,
                        description: `Payment for fuel`,
                    },
                ],
            }, tx);

            // 2. Create Fuel Log
            const fuelLog = await (tx as any).fuelLog.create({
                data: {
                    tenantId,
                    vehicleId,
                    liters,
                    rate,
                    totalCost,
                    odometerReading,
                    journalEntryId: journal.id,
                    correlationId: this.trace.getCorrelationId(),
                },
            });

            // 3. Update Vehicle's current KM
            await (tx as any).vehicle.update({
                where: { id: vehicleId },
                data: { lastCurrentKM: odometerReading },
            });

            return fuelLog;
        });
    }

    // --- Route & LR Tracking ---
    async createRouteLog(tenantId: string, data: any) {
        return (this.prisma as any).routeLog.create({
            data: {
                tenantId,
                vehicleId: data.vehicleId,
                lrNumber: data.lrNumber,
                origin: data.origin,
                destination: data.destination,
                dispatchDate: new Date(data.dispatchDate),
                status: 'Dispatched',
                revenue: new Decimal(data.revenue || 0), // Forensic Revenue Tracking
                correlationId: this.trace.getCorrelationId(),
            },
        });
    }

    // --- Trip Profitability Engine ---
    async getTripPerformance(tenantId: string, routeLogId: string) {
        const route = await (this.prisma as any).routeLog.findUnique({
            where: { id: routeLogId, tenantId },
            include: { vehicle: { include: { fuelLogs: true, maintenance: true } } }
        });

        if (!route) throw new BadRequestException('Route Log not found');

        const revenue = new Decimal((route as any).revenue || 0);

        // Find fuel logs during the trip period (Simplified)
        const fuelLogs = (route as any).vehicle.fuelLogs
            .filter((f: any) => f.date >= route.dispatchDate && (route.arrivalDate ? f.date <= route.arrivalDate : true));

        const fuelCost = fuelLogs.reduce((acc: Decimal, f: any) => acc.add(f.totalCost), new Decimal(0));
        const actualLiters = fuelLogs.reduce((acc: Decimal, f: any) => acc.add(f.liters), new Decimal(0));

        // 100x Logic: Fuel Benchmarking
        const benchmark = await (this.prisma as any).routeBenchmark.findUnique({
            where: {
                tenantId_origin_destination: {
                    tenantId,
                    origin: route.origin,
                    destination: route.destination,
                },
            },
        });

        const fuelEfficiencyAlert = benchmark && actualLiters.greaterThan(new Decimal(benchmark.avgFuelLiters).mul(1.15))
            ? 'HIGH: Consumption exceeds benchmark by >15%. Potential fuel theft or engine inefficiency.'
            : 'Normal: Consumption within benchmark parameters.';

        // Allocated Maintenance Cost (Simplified: Total Maintenance / Total Trips)
        const maintenanceCost = (route as any).vehicle.maintenance
            .filter((m: any) => m.status === 'Completed')
            .reduce((acc: Decimal, m: any) => acc.add(new Decimal(100)), new Decimal(0)); // Static allocation for demo

        const netProfit = revenue.sub(fuelCost).sub(maintenanceCost);

        return {
            lrNumber: route.lrNumber,
            origin: route.origin,
            destination: route.destination,
            revenue: revenue.toFixed(2),
            fuelCost: fuelCost.toFixed(2),
            actualLiters: actualLiters.toFixed(2),
            benchmarkLiters: benchmark ? benchmark.avgFuelLiters : 'N/A',
            fuelEfficiencyAlert,
            maintenanceAllocation: maintenanceCost.toFixed(2),
            netProfit: netProfit.toFixed(2),
            marginPercentage: revenue.gt(0) ? netProfit.div(revenue).mul(100).toFixed(2) + '%' : '0%',
        };
    }

    async scheduleMaintenance(tenantId: string, data: any) {
        return (this.prisma as any).maintenanceSchedule.create({
            data: {
                tenantId,
                vehicleId: data.vehicleId,
                serviceType: data.serviceType,
                scheduledDate: new Date(data.scheduledDate),
                status: 'Pending',
                correlationId: this.trace.getCorrelationId(),
            },
        });
    }

    async updateRouteLogStatus(tenantId: string, id: string, status: string, arrivalDate?: string) {
        return (this.prisma as any).routeLog.update({
            where: { id, tenantId },
            data: {
                status,
                arrivalDate: arrivalDate ? new Date(arrivalDate) : undefined
            },
        });
    }

    async createRouteBenchmark(tenantId: string, data: any) {
        return (this.prisma as any).routeBenchmark.upsert({
            where: {
                tenantId_origin_destination: {
                    tenantId,
                    origin: data.origin,
                    destination: data.destination,
                },
            },
            update: {
                avgFuelLiters: data.avgFuelLiters,
                avgTimeHours: data.avgTimeHours,
            },
            create: {
                tenantId,
                origin: data.origin,
                destination: data.destination,
                avgFuelLiters: data.avgFuelLiters,
                avgTimeHours: data.avgTimeHours,
            },
        });
    }

    async completeMaintenance(tenantId: string, id: string, data: { completionDate: string, cost?: number, currentKM: number }) {
        return this.prisma.$transaction(async (tx) => {
            const schedule = await (tx as any).maintenanceSchedule.update({
                where: { id, tenantId },
                data: {
                    status: 'Completed',
                    lastServiceDate: new Date(data.completionDate),
                },
            });

            await (tx as any).vehicle.update({
                where: { id: schedule.vehicleId },
                data: { lastCurrentKM: data.currentKM },
            });

            return schedule;
        });
    }
}
