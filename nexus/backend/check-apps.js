const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const apps = await prisma.app.findMany();
    console.log('Current Apps:', apps.map(u => ({ name: u.name, installed: u.installed })));
    await prisma.$disconnect();
}

check();
