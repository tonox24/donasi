import {
  PrismaClient,
  RoleName,
} from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  // User
  ['user.view', 'View users'],
  ['user.create', 'Create users'],
  ['user.update', 'Update users'],
  ['user.delete', 'Delete users'],

  // Program
  ['program.view', 'View programs'],
  ['program.create', 'Create programs'],
  ['program.update', 'Update programs'],
  ['program.delete', 'Delete programs'],

  // Campaign
  ['campaign.view', 'View campaigns'],
  ['campaign.create', 'Create campaigns'],
  ['campaign.update', 'Update campaigns'],
  ['campaign.delete', 'Delete campaigns'],

  //Permission Campaign
  ['campaign-category.view', 'View campaign categories'],
  ['campaign-category.create', 'Create campaign categories'],
  ['campaign-category.update', 'Update campaign categories'],
  ['campaign-category.delete', 'Delete campaign categories'],

  // Donation
  ['donation.view', 'View donations'],
  ['donation.create', 'Create donations'],

  // Payment
  ['payment.view', 'View payments'],
  ['payment.manage', 'Manage payments'],

  // Receipt
  ['receipt.view', 'View receipts'],
  ['receipt.create', 'Create receipts'],

  // Finance
  ['finance.view', 'View finance'],
  ['finance.manage', 'Manage finance'],

  // Reporting
  ['report.view', 'View reports'],

  // Qurban
  ['qurban.view', 'View Qurban'],
  ['qurban.manage', 'Manage Qurban'],

  // Seller / UMKM
  ['seller.view', 'View sellers'],
  ['seller.manage', 'Manage sellers'],

  // Product
  ['product.view', 'View products'],
  ['product.manage', 'Manage products'],

  // Order
  ['order.view', 'View orders'],
  ['order.manage', 'Manage orders'],

  // Audit
  ['audit.view', 'View audit logs'],
];

async function main() {
  console.log('Starting database seed...');

  // ============================================================
  // 1. PERMISSIONS
  // ============================================================

  for (const [code, name] of permissions) {
    await prisma.permission.upsert({
      where: {
        code,
      },
      update: {
        name,
      },
      create: {
        code,
        name,
      },
    });
  }

  console.log(
    `Permissions processed: ${permissions.length}`,
  );

  // ============================================================
  // 2. ROLES
  // ============================================================

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
      where: {
        name: role.name,
      },
      update: {
        description: role.description,
      },
      create: {
        name: role.name,
        description: role.description,
      },
    });
  }

  console.log(
    `Roles processed: ${roles.length}`,
  );

  // ============================================================
  // 3. SUPER ADMIN
  //    SUPER_ADMIN receives ALL permissions
  // ============================================================

  const superAdmin = await prisma.role.findUnique({
    where: {
      name: RoleName.SUPER_ADMIN,
    },
  });

  if (superAdmin) {
    const allPermissions =
      await prisma.permission.findMany();

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

    console.log(
      `SUPER_ADMIN permissions assigned: ${allPermissions.length}`,
    );
  }

  // ============================================================
  // 4. PROGRAM ROLE
  //    PROGRAM receives Program permissions
  // ============================================================

  const programRole = await prisma.role.findUnique({
    where: {
      name: RoleName.PROGRAM,
    },
  });

  if (programRole) {
    const programPermissions =
      await prisma.permission.findMany({
        where: {
          code: {
            in: [
              'program.view',
              'program.create',
              'program.update',
              'program.delete',
              'campaign-category.view',
              'campaign-category.create',
              'campaign-category.update',
              'campaign-category.delete',
            ],
          },
        },
      });

    for (const permission of programPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: programRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: programRole.id,
          permissionId: permission.id,
        },
      });
    }

    console.log(
      `PROGRAM permissions assigned: ${programPermissions.length}`,
    );
  }

  // ============================================================
  // 5. FUNDRAISING ROLE
  //    FUNDRAISING receives Campaign + Donation permissions
  // ============================================================

  const fundraisingRole = await prisma.role.findUnique({
    where: {
      name: RoleName.FUNDRAISING,
    },
  });

  if (fundraisingRole) {
    const fundraisingPermissions =
      await prisma.permission.findMany({
        where: {
          code: {
            in: [
              'campaign.view',
              'campaign.create',
              'campaign.update',
              'campaign.delete',
              'donation.view',
              'donation.create',
            ],
          },
        },
      });

    for (const permission of fundraisingPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: fundraisingRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: fundraisingRole.id,
          permissionId: permission.id,
        },
      });
    }

    console.log(
      `FUNDRAISING permissions assigned: ${fundraisingPermissions.length}`,
    );
  }

  // ============================================================
  // 6. FINANCE ROLE
  //    FINANCE receives Payment + Finance + Receipt + Report
  // ============================================================

  const financeRole = await prisma.role.findUnique({
    where: {
      name: RoleName.FINANCE,
    },
  });

  if (financeRole) {
    const financePermissions =
      await prisma.permission.findMany({
        where: {
          code: {
            in: [
              'payment.view',
              'payment.manage',
              'receipt.view',
              'receipt.create',
              'finance.view',
              'finance.manage',
              'report.view',
            ],
          },
        },
      });

    for (const permission of financePermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: financeRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: financeRole.id,
          permissionId: permission.id,
        },
      });
    }

    console.log(
      `FINANCE permissions assigned: ${financePermissions.length}`,
    );
  }

  // ============================================================
  // 7. SELLER ROLE
  //    SELLER receives Seller + Product + Order permissions
  // ============================================================

  const sellerRole = await prisma.role.findUnique({
    where: {
      name: RoleName.SELLER,
    },
  });

  if (sellerRole) {
    const sellerPermissions =
      await prisma.permission.findMany({
        where: {
          code: {
            in: [
              'seller.view',
              'seller.manage',
              'product.view',
              'product.manage',
              'order.view',
              'order.manage',
            ],
          },
        },
      });

    for (const permission of sellerPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: sellerRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: sellerRole.id,
          permissionId: permission.id,
        },
      });
    }

    console.log(
      `SELLER permissions assigned: ${sellerPermissions.length}`,
    );
  }

  // ============================================================
  // 8. ADMIN ROLE
  //    ADMIN receives operational permissions
  // ============================================================

  const adminRole = await prisma.role.findUnique({
    where: {
      name: RoleName.ADMIN,
    },
  });

  if (adminRole) {
    const adminPermissions =
      await prisma.permission.findMany({
        where: {
          code: {
            in: [
              'user.view',
              'user.create',
              'user.update',
              'user.delete',

              'program.view',
              'program.create',
              'program.update',
              'program.delete',

              'campaign.view',
              'campaign.create',
              'campaign.update',
              'campaign.delete',

              'donation.view',

              'payment.view',

              'receipt.view',

              'finance.view',

              'report.view',

              'qurban.view',

              'seller.view',

              'product.view',

              'order.view',

              'audit.view',
            ],
          },
        },
      });

    for (const permission of adminPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      });
    }

    console.log(
      `ADMIN permissions assigned: ${adminPermissions.length}`,
    );
  }

  // ============================================================
  // 9. COMPLETED
  // ============================================================

  console.log(
    'Seed completed successfully.',
  );
}

main()
  .catch((error) => {
    console.error(
      'Seed failed:',
      error,
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
