import {
  PrismaClient,
  RoleName,
} from '@prisma/client';

const prisma = new PrismaClient();

const permissions: [string, string][] = [
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

  // Donor CRM
  ['donor.view', 'View donors'],
  ['donor.create', 'Create donors'],
  ['donor.update', 'Update donors'],
  ['donor.delete', 'Delete donors'],
  
  // Campaign
['campaign.view', 'View campaigns'],
['campaign.create', 'Create campaigns'],
['campaign.update', 'Update campaigns'],
['campaign.delete', 'Delete campaigns'],

// Campaign Workflow
[
  'campaign.submit_review',
  'Submit campaign for review',
],

[
  'campaign.approve',
  'Approve campaign',
],

[
  'campaign.pause',
  'Pause campaign',
],

[
  'campaign.resume',
  'Resume campaign',
],

[
  'campaign.complete',
  'Complete campaign',
],

[
  'campaign.cancel',
  'Cancel campaign',
],

  // Campaign Category
  ['campaign-category.view', 'View campaign categories'],
  ['campaign-category.create', 'Create campaign categories'],
  ['campaign-category.update', 'Update campaign categories'],
  ['campaign-category.delete', 'Delete campaign categories'],

  // Beneficiary
  [ 'beneficiary.view', 'View beneficiaries',],
  ['beneficiary.create',  'Create beneficiaries',],
  ['beneficiary.update', 'Update beneficiaries',],
  ['beneficiary.delete', 'Delete beneficiaries',],

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

async function assignPermissions(
  roleName: RoleName,
  permissionCodes: string[],
) {
  const role = await prisma.role.findUnique({
    where: {
      name: roleName,
    },
  });

  if (!role) {
    console.log(`Role ${roleName} not found. Skipping.`);
    return 0;
  }

  const rolePermissions =
    await prisma.permission.findMany({
      where: {
        code: {
          in: permissionCodes,
        },
      },
    });

  for (const permission of rolePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });
  }

  return rolePermissions.length;
}

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
  //    PROGRAM receives Program + Campaign + Campaign Category
  // ============================================================

  const programPermissions = await assignPermissions(
    RoleName.PROGRAM,
    [
      'program.view',
      'program.create',
      'program.update',
      'program.delete',

      'campaign.view',
      'campaign.create',
      'campaign.update',
      'campaign.delete',

      'campaign-category.view',
      'campaign-category.create',
      'campaign-category.update',
      'campaign-category.delete',

      'campaign.submit_review',
      'campaign.pause',
      'campaign.resume',
      'campaign.complete',
      'campaign.cancel',

      'beneficiary.view',
      'beneficiary.create',
      'beneficiary.update',
      'beneficiary.delete',

      'qurban.view',
      'qurban.manage',
    ],
  );

  console.log(
    `PROGRAM permissions assigned: ${programPermissions}`,
  );

  // ============================================================
  // 5. FUNDRAISING ROLE
  //    FUNDRAISING receives Campaign + Campaign Category
  //    + Donation permissions
  // ============================================================

  const fundraisingPermissions = await assignPermissions(
    RoleName.FUNDRAISING,
    [
      'campaign.view',
      'campaign.create',
      'campaign.update',
      'campaign.delete',

      'campaign-category.view',
      'campaign-category.create',
      'campaign-category.update',
      'campaign-category.delete',

      'campaign.submit_review',
      'campaign.pause',
      'campaign.resume',
      'campaign.complete',
      'campaign.cancel',

      'donor.view',
      'donor.create',
      'donor.update',

      'beneficiary.view',

      'donation.view',
      'donation.create',

      'qurban.view',
      'qurban.manage',
    ],
  );

  console.log(
    `FUNDRAISING permissions assigned: ${fundraisingPermissions}`,
  );

  // ============================================================
  // 6. FINANCE ROLE
  //    FINANCE receives Payment + Finance + Receipt + Report
  // ============================================================

  const financePermissions = await assignPermissions(
    RoleName.FINANCE,
    [
      'payment.view',
      'payment.manage',

      'receipt.view',
      'receipt.create',

      'finance.view',
      'finance.manage',

      'report.view',
    ],
  );

  console.log(
    `FINANCE permissions assigned: ${financePermissions}`,
  );

  // ============================================================
  // 7. SELLER ROLE
  //    SELLER receives Seller + Product + Order permissions
  // ============================================================

  const sellerPermissions = await assignPermissions(
    RoleName.SELLER,
    [
      'seller.view',
      'seller.manage',

      'product.view',
      'product.manage',

      'order.view',
      'order.manage',
    ],
  );

  console.log(
    `SELLER permissions assigned: ${sellerPermissions}`,
  );

  // ============================================================
  // 8. ADMIN ROLE
  //    ADMIN receives operational permissions
  // ============================================================

  const adminPermissions = await assignPermissions(
    RoleName.ADMIN,
    [
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

      'campaign.submit_review',
      'campaign.approve',
      'campaign.pause',
      'campaign.resume',
      'campaign.complete',
      'campaign.cancel',

      'beneficiary.view',
      'beneficiary.create',
      'beneficiary.update',
      'beneficiary.delete',

      'donor.view',
      'donor.create',
      'donor.update',
      'donor.delete',

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
  );

  console.log(
    `ADMIN permissions assigned: ${adminPermissions}`,
  );

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
