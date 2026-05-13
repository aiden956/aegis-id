import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  const demoPassword = "aegisid-demo-password";
  const passwordHash = await argon2.hash(demoPassword, {
    type: argon2.argon2id,
  });

  const users = [
    {
      email: "maya.user@aegisid.test",
      name: "Maya Tran",
      role: Role.USER,
      isTwoFactorEnabled: true,
      provider: "local",
    },
    {
      email: "admin@aegisid.test",
      name: "Aiden Admin",
      role: Role.ADMIN,
      isTwoFactorEnabled: true,
      provider: "local",
    },
    {
      email: "linh@aegisid.test",
      name: "Linh Nguyen",
      role: Role.USER,
      isTwoFactorEnabled: false,
      provider: "local",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        ...user,
        passwordHash,
      },
      update: {
        name: user.name,
        role: user.role,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
        provider: user.provider,
        passwordHash,
      },
    });
  }
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
