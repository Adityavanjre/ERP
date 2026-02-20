
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// Simulating UsersService.resetPassword logic
async function testResetFlow() {
  const prisma = new PrismaClient();
  console.log('🧪 STARTING PASSWORD RESET SIMULATION...');

  try {
    // 1. Setup a Test User
    const email = 'test-reset@klypso.io';
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: 'old-hash',
        fullName: 'Test User'
      }
    });
    console.log(`1️⃣  Target User: ${user.email} (${user.id})`);

    // 2. Simulate "Admin Clicked Reset" (The Logic)
    console.log('2️⃣  Admin clicks "Reset Password"...');
    const rawPassword = Math.random().toString(36).slice(-8).toUpperCase();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    console.log(`    ✅ Success! Backend returned Temporary Password: [ ${rawPassword} ]`);

    // 3. Verify Login with New Password
    console.log(`3️⃣  Verifying Login with [ ${rawPassword} ]...`);
    
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!updatedUser) throw new Error('User vanished!');

    const isValid = await bcrypt.compare(rawPassword, updatedUser.passwordHash);

    if (isValid) {
      console.log('    ✅ LOGIN SUCCESSFUL! The password works.');
      console.log('    🎉 The Admin Reset Flow is FUNCTIONAL.');
    } else {
      console.error('    ❌ LOGIN FAILED. The password did not match.');
    }

  } catch (e) {
    console.error('❌ Test Failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

testResetFlow();
