const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function v() {
    try {
        const user = await prisma.user.findUnique({ 
            where: { email: 'chiffonsfashion@gmail.com' },
            include: { memberships: { include: { tenant: true } } }
        });
        if (!user) {
            console.log("User not found");
            return;
        }
        user.memberships.forEach(m => {
            console.log(`Tenant: ${m.tenant.name}`);
            console.log(` - Industry: ${m.tenant.industry}`);
            console.log(` - Type: ${m.tenant.type}`);
            console.log(` - User Role: ${m.role}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
v();
