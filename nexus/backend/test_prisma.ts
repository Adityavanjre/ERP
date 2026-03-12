import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    try {
        const assets = await (prisma as any).fixedAsset.findMany();
        console.log('Success: Found', assets.length, 'assets.');
    } catch (err: any) {
        console.error('Failure:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
