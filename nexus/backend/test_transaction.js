const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://postgres.nyakpylctpygnlrxvhxn:UvgtMof7AgAsubaQ@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
        },
    },
});

async function main() {
    console.log('Testing interactive transaction...');
    try {
        await prisma.$transaction(async (tx) => {
            // Simple read
            const count = await tx.user.count();
            console.log('User count in tx:', count);

            // Simple write (using a dummy ID that wont conflict)
            // Actually, let's just create a dummy tenant and fail it
            // or just do a read is enough to test if transaction opens.

            // We need to do at least one write to verify it holds locks? 
            // pgBouncer transaction mode might fail immediately on 'BEGIN'.
        });
        console.log('Transaction success!');
    } catch (e) {
        console.error('Transaction failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
