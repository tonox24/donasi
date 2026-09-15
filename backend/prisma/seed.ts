import {
  PrismaClient,
  RoleName,
} from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  ['user.view', 'View users'],
  ['user.create', 'Create users'],
  ['user.update', 'Update users'],
  ['user.delete', 'Delete users'],

  ['campaign.view', 'View campaigns'],
  ['campaign.create', 'Create campaigns'],
  ['campaign.update', 'Update campaigns'],
  ['campaign.delete', 'Delete campaigns'],

  ['donation.view', 'View donations'],
  ['donation.create', 'Create donations'],

  ['payment.view', 'View payments'],
  ['payment.manage', 'Manage payments'],

  ['receipt.view', 'View receipts'],
  ['receipt.create', 'Create receipts'],

  ['finance.view', 'View finance'],
  ['finance.manage', 'Manage finance'],

  ['report.view', 'View reports'],

  ['qurban.view', 'View Qurban'],
  ['qurban.manage', 'Manage Qurban'],

  ['seller.view', 'View sellers'],
  ['seller.manage', 'Manage sellers'],

  ['product.view', 'View products'],
  ['product.manage', 'Manage products'],

  ['order.view', 'View orders'],
  ['order.manage', 'Manage orders'],

  ['audit.view', 'View audit logs'],
];

async function main() {
  for (const [code, name] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { name },
      create: {
        code,
        name,
      },
    });
  }

  const roles = [
    {
      name: RoleName.SUPER_ADMIN,
      description: 'Full system access',
    },
    {
      name: RoleName.ADMIN,
      description: 'System administrator',
    },
    {
      name: RoleName.FINANCE,
      description: 'Finance management',
    },
    {
      name: RoleName.FUNDRAISING,
      description: 'Fundraising management',
    },
    {
      name: RoleName.PROGRAM,
      description: 'Program management',
    },
    {
      name: RoleName.DONOR,
      description: 'Donor account',
    },
    {
      name: RoleName.SELLER,
      description: 'UMKM seller',
    },
    {
      name: RoleName.PARTNER,
      description: 'External partner',
    },
    {
      name: RoleName.STAFF,
      description: 'Internal staff',
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
      },
      create: role,
    });
  }

  const superAdmin = await prisma.role.findUnique({
    where: {
      name: RoleName.SUPER_ADMIN,
    },
  });

  if (superAdmin) {
    const allPermissions = await prisma.permission.findMany();

    for (const permission of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdmin.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: superAdmin.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
