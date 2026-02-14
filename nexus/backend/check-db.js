const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const users = await prisma.user.findMany();
    console.log('Current Users:', users.map(u => u.email));
    await prisma.$disconnect();
}

check();
