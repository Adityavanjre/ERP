import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PassThrough } from 'stream';
import { sanitizeCsvCell } from '../../common/utils/csv-sanitize.util';

@Injectable()
export class ReportingService {
    constructor(private prisma: PrismaService) { }

    exportTransactionsCsvStream(tenantId: string) {
        const stream = new PassThrough();

        (async () => {
            try {
                const headers = ['Date', 'Account', 'Type', 'Amount', 'Description', 'Reference'];
                stream.write(headers.map(sanitizeCsvCell).join(',') + '\n');

                let skip = 0;
                const take = 2000; // Chunk size to prevent memory bloat
                let hasMore = true;

                while (hasMore) {
                    const transactions = await this.prisma.transaction.findMany({
                        where: { tenantId },
                        include: { account: true, journalEntry: true },
                        orderBy: { date: 'asc' },
                        take,
                        skip,
                    });

                    if (transactions.length === 0) {
                        hasMore = false;
                        break;
                    }

                    let chunk = '';
                    for (const t of transactions) {
                        const dateStr = t.date ? t.date.toISOString().split('T')[0] : '';
                        const accountName = t.account?.name || '';
                        const type = t.type || '';
                        const amount = Number(t.amount || 0).toFixed(2);
                        const desc = t.description || '';
                        const ref = t.journalEntry?.reference || '';

                        const row = [dateStr, accountName, type, amount, desc, ref];

                        chunk += row.map((val) => {
                            const sanitized = sanitizeCsvCell(val);
                            if (sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('"')) {
                                return `"${sanitized.replace(/"/g, '""')}"`;
                            }
                            return sanitized;
                        }).join(',') + '\n';
                    }

                    const canWrite = stream.write(chunk);
                    if (!canWrite) {
                        await new Promise((resolve) => stream.once('drain', resolve));
                    }

                    // REP-001: Yield to event loop to allow concurrent requests to process
                    await new Promise((resolve) => setImmediate(resolve));

                    skip += take;
                }
            } catch (err) {
                console.error('Error streaming GL CSV:', err);
            } finally {
                stream.end();
            }
        })();

        return stream;
    }
}
