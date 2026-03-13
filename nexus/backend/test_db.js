const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function t() {
    try {
        console.log("Checking DB connection...");
        const count = await prisma.tenant.count();
        console.log("Tenants count:", count);
        const user = await prisma.user.findFirst({ where: { email: 'chiffonsfashion@gmail.com' } });
        console.log("User email check:", user?.email);
    } catch (e) {
        console.error("DB Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
t();
