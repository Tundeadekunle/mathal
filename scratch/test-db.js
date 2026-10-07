const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function test() {
  try {
    const user = await p.user.findFirst({
      include: {
        student: true,
        teacher: true,
      }
    });
    console.log('Success, found user:', user?.email);
  } catch (err) {
    console.error('Error during query:', err.message);
  } finally {
    await p.$disconnect();
  }
}
test();
