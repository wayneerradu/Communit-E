import { PrismaClient, Role, ResidentStatus, FaultPriority, FaultStatus, ProjectStatus, ParkingLotStatus, PRCommStatus, AssetType } from "@prisma/client";

const prisma = new PrismaClient();

function parseList(value, fallback = []) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .concat(fallback)
    .filter((value, index, array) => array.indexOf(value) === index);
}

async function main() {
  const superAdmins = parseList(process.env.SUPER_ADMIN_EMAILS, ["hello@unityincommunity.org.za"]);
  const admins = parseList(process.env.ADMIN_EMAILS);

  const userRows = [
    ...superAdmins.map((email) => ({
      email,
      name: email.split("@")[0].replace(/[._-]/g, " "),
      role: Role.SUPER_ADMIN
    })),
    ...admins.map((email) => ({
      email,
      name: email.split("@")[0].replace(/[._-]/g, " "),
      role: Role.ADMIN
    }))
  ];

  for (const user of userRows) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        isActive: true
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: true
      }
    });
  }

  const resident = await prisma.resident.upsert({
    where: { email: "sibongile@example.com" },
    update: {},
    create: {
      name: "Sibongile Ndlovu",
      standNo: "Stand 114",
      email: "sibongile@example.com",
      phone: "082 000 0001",
      status: ResidentStatus.ACTIVE,
      ward: "Ward 7",
      addressLine1: "114 Palm Crescent",
      suburb: "Mount Vernon",
      city: "Durban",
      notes: "Seed resident for local development."
    }
  });

  await prisma.fault.upsert({
    where: { id: "fault-seed-1" },
    update: {},
    create: {
      id: "fault-seed-1",
      title: "Streetlight outage on Palm Crescent",
      description: "Three poles are out, leaving the corner unsafe at night.",
      reporterEmail: resident.email ?? "sibongile@example.com",
      category: "streetlight",
      priority: FaultPriority.CRITICAL,
      status: FaultStatus.ASSIGNED,
      locationText: "Palm Crescent and Ridge Road",
      municipalityEmail: "hello@unityincommunity.org.za",
      residentId: resident.id
    }
  });

  await prisma.project.upsert({
    where: { id: "project-seed-1" },
    update: {},
    create: {
      id: "project-seed-1",
      title: "Bellair Primary School Safety Improvement",
      description: "Collaborative task tracking for the school safety initiative.",
      status: ProjectStatus.ACTIVE
    }
  });

  await prisma.parkingLot.upsert({
    where: { id: "parking-seed-1" },
    update: {},
    create: {
      id: "parking-seed-1",
      title: "Community table cloth",
      justification: "Useful for events, meetings, and public visibility.",
      priority: "medium",
      status: ParkingLotStatus.SHORTLISTED,
      threshold: 4
    }
  });

  await prisma.prComm.upsert({
    where: { id: "pr-seed-1" },
    update: {},
    create: {
      id: "pr-seed-1",
      headline: "Freedom Day community update",
      body: "Celebrate local volunteers and share service-delivery wins.",
      channel: "website",
      status: PRCommStatus.PENDING_APPROVAL,
      appCount: 1
    }
  });

  await prisma.infrastructureAsset.upsert({
    where: { id: "asset-seed-1" },
    update: {},
    create: {
      id: "asset-seed-1",
      assetName: "Pole 14",
      assetType: AssetType.POLE,
      condition: "Needs lamp replacement",
      street: "Palm Crescent",
      latitude: -29.863,
      longitude: 30.933
    }
  });

  await prisma.auditLog.create({
    data: {
      actorEmail: superAdmins[0] ?? "hello@unityincommunity.org.za",
      action: "seed.run",
      entityType: "platform",
      entityId: "bootstrap",
      description: "Initial development seed completed."
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
