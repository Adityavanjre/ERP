const { PrismaClient } = require('@prisma/client');
const { JwtService } = require('@nestjs/jwt');
const prisma = new PrismaClient();
const jwtService = new JwtService({ secret: 'generate-a-high-entropy-string-here' });

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'john@example.com' }
  });

  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'klypso-corp' }
  });

  const membership = await prisma.tenantUser.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } }
  });

  const payload = {
    sub: user.id,
    email: user.email,
    tenantId: membership.tenantId,
    tenantName: tenant.name,
    type: 'tenant_scoped',
    isOnboarded: tenant.isOnboarded,
    role: typeof membership.permissions === 'string' ? membership.permissions : 'Member',
  };

  const token = jwtService.sign(payload);
  console.log('\n=== GENERATED JWT PAYLOAD ===');
  console.log(JSON.stringify(payload, null, 2));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
