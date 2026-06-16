import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_EMAIL || "admin@jowmail.com";
  const password = process.env.SEED_PASSWORD || "jowmail123";
  const orgName = process.env.SEED_ORG_NAME || "JowMail";
  const orgSlug = process.env.SEED_ORG_SLUG || "jowmail";

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`User ${email} already exists. Skipping seed.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name: "Admin",
      passwordHash,
    },
  });

  const organization = await prisma.organization.create({
    data: {
      name: orgName,
      slug: orgSlug,
      postalBaseUrl: process.env.POSTAL_BASE_URL || "https://mail.jowmail.com",
    },
  });

  await prisma.organizationMember.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      role: "owner",
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log(`   User: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Organization: ${orgName} (${orgSlug})`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
