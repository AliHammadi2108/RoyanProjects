import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { name: 'purchase_requests.create', nameAr: 'إنشاء طلب شراء', module: 'purchases' },
  { name: 'purchase_requests.view', nameAr: 'عرض طلبات الشراء', module: 'purchases' },
  { name: 'purchase_requests.update', nameAr: 'تعديل طلب شراء', module: 'purchases' },
  { name: 'purchase_requests.delete', nameAr: 'حذف طلب شراء', module: 'purchases' },
  { name: 'purchase_requests.submit', nameAr: 'إرسال طلب للاعتماد', module: 'purchases' },
  { name: 'quotations.create', nameAr: 'إنشاء عرض سعر', module: 'purchases' },
  { name: 'quotations.view', nameAr: 'عرض عروض الأسعار', module: 'purchases' },
  { name: 'quotations.update', nameAr: 'تعديل عرض سعر', module: 'purchases' },
  { name: 'quotations.submit', nameAr: 'إرسال عرض للاعتماد', module: 'purchases' },
  { name: 'comparisons.create', nameAr: 'إنشاء مقارنة', module: 'purchases' },
  { name: 'comparisons.view', nameAr: 'عرض المقارنات', module: 'purchases' },
  { name: 'comparisons.update', nameAr: 'تعديل مقارنة', module: 'purchases' },
  { name: 'comparisons.submit', nameAr: 'إرسال مقارنة للاعتماد', module: 'purchases' },
  { name: 'supplier_selection.create', nameAr: 'ترشيح مورد', module: 'purchases' },
  { name: 'supplier_selection.view', nameAr: 'عرض الترشيحات', module: 'purchases' },
  { name: 'purchase_orders.create', nameAr: 'إنشاء أمر شراء', module: 'purchases' },
  { name: 'purchase_orders.view', nameAr: 'عرض أوامر الشراء', module: 'purchases' },
  { name: 'purchase_orders.update', nameAr: 'تعديل أمر شراء', module: 'purchases' },
  { name: 'purchase_orders.submit', nameAr: 'إرسال أمر للاعتماد', module: 'purchases' },
  { name: 'inspections.create', nameAr: 'إنشاء فحص', module: 'purchases' },
  { name: 'inspections.view', nameAr: 'عرض الفحوصات', module: 'purchases' },
  { name: 'receivings.create', nameAr: 'إنشاء إذن توريد', module: 'purchases' },
  { name: 'receivings.view', nameAr: 'عرض إذونات التوريد', module: 'purchases' },
  { name: 'invoices.create', nameAr: 'إنشاء فاتورة', module: 'purchases' },
  { name: 'invoices.view', nameAr: 'عرض الفواتير', module: 'purchases' },
  { name: 'invoices.update_payment_status', nameAr: 'تحديث حالة الدفع', module: 'purchases' },
  { name: 'approvals.view', nameAr: 'عرض الاعتمادات', module: 'approvals' },
  { name: 'approvals.action', nameAr: 'تنفيذ اعتماد', module: 'approvals' },
  { name: 'notifications.view', nameAr: 'عرض التنبيهات', module: 'notifications' },
  { name: 'tracking.view', nameAr: 'عرض المتابعة', module: 'purchases' },
  { name: 'audit_logs.view', nameAr: 'عرض سجل التدقيق', module: 'audit' },
  { name: 'APPROVE_OWN_DOCUMENT', nameAr: 'اعتماد المستندات الخاصة', module: 'approvals' },
  { name: 'admin', nameAr: 'صلاحيات المدير', module: 'admin' },
];

const MASTER_PERMISSIONS = [
  { name: 'master.currencies.view', nameAr: 'عرض العملات', module: 'master', screenCode: 'currencies', action: 'view' },
  { name: 'master.currencies.create', nameAr: 'إنشاء عملة', module: 'master', screenCode: 'currencies', action: 'create' },
  { name: 'master.currencies.edit', nameAr: 'تعديل عملة', module: 'master', screenCode: 'currencies', action: 'edit' },
  { name: 'master.currencies.delete', nameAr: 'حذف عملة', module: 'master', screenCode: 'currencies', action: 'delete' },
  { name: 'master.currencies.activate', nameAr: 'تفعيل عملة', module: 'master', screenCode: 'currencies', action: 'activate' },
  { name: 'master.currencies.deactivate', nameAr: 'تعطيل عملة', module: 'master', screenCode: 'currencies', action: 'deactivate' },
  { name: 'master.suppliers.view', nameAr: 'عرض الموردين', module: 'master', screenCode: 'suppliers', action: 'view' },
  { name: 'master.suppliers.create', nameAr: 'إنشاء مورد', module: 'master', screenCode: 'suppliers', action: 'create' },
  { name: 'master.suppliers.edit', nameAr: 'تعديل مورد', module: 'master', screenCode: 'suppliers', action: 'edit' },
  { name: 'master.suppliers.delete', nameAr: 'حذف مورد', module: 'master', screenCode: 'suppliers', action: 'delete' },
  { name: 'master.suppliers.activate', nameAr: 'تفعيل مورد', module: 'master', screenCode: 'suppliers', action: 'activate' },
  { name: 'master.suppliers.deactivate', nameAr: 'تعطيل مورد', module: 'master', screenCode: 'suppliers', action: 'deactivate' },
  { name: 'master.units.view', nameAr: 'عرض الوحدات', module: 'master', screenCode: 'units', action: 'view' },
  { name: 'master.units.create', nameAr: 'إنشاء وحدة', module: 'master', screenCode: 'units', action: 'create' },
  { name: 'master.units.edit', nameAr: 'تعديل وحدة', module: 'master', screenCode: 'units', action: 'edit' },
  { name: 'master.units.delete', nameAr: 'حذف وحدة', module: 'master', screenCode: 'units', action: 'delete' },
  { name: 'master.units.activate', nameAr: 'تفعيل وحدة', module: 'master', screenCode: 'units', action: 'activate' },
  { name: 'master.units.deactivate', nameAr: 'تعطيل وحدة', module: 'master', screenCode: 'units', action: 'deactivate' },
  { name: 'master.items.view', nameAr: 'عرض الأصناف', module: 'master', screenCode: 'items', action: 'view' },
  { name: 'master.items.create', nameAr: 'إنشاء صنف', module: 'master', screenCode: 'items', action: 'create' },
  { name: 'master.items.edit', nameAr: 'تعديل صنف', module: 'master', screenCode: 'items', action: 'edit' },
  { name: 'master.items.delete', nameAr: 'حذف صنف', module: 'master', screenCode: 'items', action: 'delete' },
  { name: 'master.items.activate', nameAr: 'تفعيل صنف', module: 'master', screenCode: 'items', action: 'activate' },
  { name: 'master.items.deactivate', nameAr: 'تعطيل صنف', module: 'master', screenCode: 'items', action: 'deactivate' },
  { name: 'access.roles.view', nameAr: 'عرض الأدوار', module: 'access', screenCode: 'roles', action: 'view' },
  { name: 'access.roles.create', nameAr: 'إنشاء دور', module: 'access', screenCode: 'roles', action: 'create' },
  { name: 'access.roles.edit', nameAr: 'تعديل دور', module: 'access', screenCode: 'roles', action: 'edit' },
  { name: 'access.users.view', nameAr: 'عرض صلاحيات المستخدمين', module: 'access', screenCode: 'users', action: 'view' },
  { name: 'access.users.edit', nameAr: 'تعديل صلاحيات المستخدمين', module: 'access', screenCode: 'users', action: 'edit' },
  { name: 'access.supplier_permissions.view', nameAr: 'عرض صلاحيات الموردين', module: 'access', screenCode: 'supplier_permissions', action: 'view' },
  { name: 'access.supplier_permissions.edit', nameAr: 'تعديل صلاحيات الموردين', module: 'access', screenCode: 'supplier_permissions', action: 'edit' },
  { name: 'access.approval_rules.view', nameAr: 'عرض قواعد الاعتماد', module: 'access', screenCode: 'approval_rules', action: 'view' },
  { name: 'access.approval_rules.create', nameAr: 'إنشاء قاعدة اعتماد', module: 'access', screenCode: 'approval_rules', action: 'create' },
  { name: 'access.approval_rules.edit', nameAr: 'تعديل قاعدة اعتماد', module: 'access', screenCode: 'approval_rules', action: 'edit' },
  { name: 'access.approval_requests.view', nameAr: 'عرض طلبات الاعتماد', module: 'access', screenCode: 'approval_requests', action: 'view' },
  { name: 'operations.approve', nameAr: 'اعتماد العمليات', module: 'operations', screenCode: 'approval', action: 'approve' },
  { name: 'operations.reject', nameAr: 'رفض العمليات', module: 'operations', screenCode: 'approval', action: 'reject' },
  { name: 'operations.view_cost', nameAr: 'عرض التكلفة', module: 'operations', screenCode: 'reports', action: 'view_cost' },
  { name: 'operations.view_reports', nameAr: 'عرض التقارير', module: 'operations', screenCode: 'reports', action: 'view' },
];

const ALL_PERMISSIONS = [...PERMISSIONS, ...MASTER_PERMISSIONS];

const ROLES = [
  {
    name: 'admin',
    nameAr: 'مدير النظام',
    permissions: ALL_PERMISSIONS.map((p) => p.name),
  },
  {
    name: 'purchase_requester',
    nameAr: 'مقدم طلب شراء',
    permissions: [
      'purchase_requests.create', 'purchase_requests.view', 'purchase_requests.update',
      'purchase_requests.submit', 'notifications.view', 'tracking.view',
    ],
  },
  {
    name: 'purchasing_officer',
    nameAr: 'موظف مشتريات',
    permissions: [
      'purchase_requests.view', 'quotations.create', 'quotations.view', 'quotations.update',
      'quotations.submit', 'comparisons.create', 'comparisons.view', 'comparisons.update',
      'comparisons.submit', 'supplier_selection.create', 'supplier_selection.view',
      'purchase_orders.create', 'purchase_orders.view', 'purchase_orders.update',
      'purchase_orders.submit', 'notifications.view', 'tracking.view', 'audit_logs.view',
    ],
  },
  {
    name: 'purchase_approver',
    nameAr: 'معتمد مشتريات',
    permissions: [
      'purchase_requests.view', 'quotations.view', 'comparisons.view',
      'supplier_selection.view', 'purchase_orders.view', 'approvals.view',
      'approvals.action', 'notifications.view', 'tracking.view', 'audit_logs.view',
    ],
  },
  {
    name: 'warehouse_user',
    nameAr: 'مستخدم مخزن',
    permissions: [
      'purchase_orders.view', 'inspections.create', 'inspections.view',
      'receivings.create', 'receivings.view', 'notifications.view', 'tracking.view',
    ],
  },
  {
    name: 'finance_user',
    nameAr: 'مستخدم مالية',
    permissions: [
      'purchase_orders.view', 'receivings.view', 'invoices.create', 'invoices.view',
      'invoices.update_payment_status', 'notifications.view', 'tracking.view',
    ],
  },
  {
    name: 'auditor',
    nameAr: 'مدقق / مشاهد',
    permissions: [
      'purchase_requests.view', 'quotations.view', 'comparisons.view',
      'supplier_selection.view', 'purchase_orders.view', 'inspections.view',
      'receivings.view', 'invoices.view', 'tracking.view', 'audit_logs.view',
    ],
  },
];

const USERS = [
  { username: 'admin', email: 'admin@purchase.local', nameAr: 'مدير النظام', password: 'admin123', role: 'admin' },
  { username: 'requester', email: 'requester@purchase.local', nameAr: 'أحمد مقدم الطلب', password: 'requester123', role: 'purchase_requester' },
  { username: 'purchasing_officer', email: 'officer@purchase.local', nameAr: 'محمد موظف المشتريات', password: 'officer123', role: 'purchasing_officer' },
  { username: 'approver', email: 'approver@purchase.local', nameAr: 'خالد المعتمد', password: 'approver123', role: 'purchase_approver' },
  { username: 'warehouse_user', email: 'warehouse@purchase.local', nameAr: 'سعد مستخدم المخزن', password: 'warehouse123', role: 'warehouse_user' },
  { username: 'finance_user', email: 'finance@purchase.local', nameAr: 'فهد مستخدم المالية', password: 'finance123', role: 'finance_user' },
];

async function main() {
  console.log('🌱 بدء إدخال البيانات التجريبية...');

  // Permissions
  for (const perm of ALL_PERMISSIONS) {
    const extra = perm as { screenCode?: string; action?: string };
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {
        nameAr: perm.nameAr,
        module: perm.module,
        screenCode: extra.screenCode,
        action: extra.action,
      },
      create: {
        name: perm.name,
        nameAr: perm.nameAr,
        module: perm.module,
        screenCode: extra.screenCode,
        action: extra.action,
      },
    });
  }

  // Roles
  const roleMap: Record<string, string> = {};
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { nameAr: role.nameAr },
      create: { name: role.name, nameAr: role.nameAr },
    });
    roleMap[role.name] = created.id;

    for (const permName of role.permissions) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: created.id, permissionId: perm.id } },
          update: {},
          create: { roleId: created.id, permissionId: perm.id },
        });
      }
    }
  }

  // Branches
  const branch = await prisma.branch.upsert({
    where: { code: 'BR001' },
    update: {},
    create: { code: 'BR001', nameAr: 'الفرع الرئيسي', nameEn: 'Main Branch' },
  });

  const branch2 = await prisma.branch.upsert({
    where: { code: 'BR002' },
    update: {},
    create: { code: 'BR002', nameAr: 'فرع جدة', nameEn: 'Jeddah Branch' },
  });

  // Departments
  const dept = await prisma.department.upsert({
    where: { code: 'DEPT001' },
    update: {},
    create: { code: 'DEPT001', nameAr: 'إدارة المشتريات', branchId: branch.id },
  });

  await prisma.department.upsert({
    where: { code: 'DEPT002' },
    update: {},
    create: { code: 'DEPT002', nameAr: 'إدارة تقنية المعلومات', branchId: branch.id },
  });

  // Warehouses
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH001' },
    update: {},
    create: { code: 'WH001', nameAr: 'المخزن الرئيسي', branchId: branch.id },
  });

  // Units
  const unitPcs = await prisma.unit.upsert({
    where: { code: 'PCS' },
    update: { symbol: 'قطعة', isActive: true },
    create: { code: 'PCS', nameAr: 'قطعة', nameEn: 'Piece', symbol: 'قطعة', isActive: true },
  });

  const unitBox = await prisma.unit.upsert({
    where: { code: 'BOX' },
    update: { symbol: 'علبة', isActive: true },
    create: { code: 'BOX', nameAr: 'علبة', nameEn: 'Box', symbol: 'علبة', isActive: true },
  });

  // Currencies
  const sar = await prisma.currency.upsert({
    where: { code: 'SAR' },
    update: { isBase: true, rateToBase: 1, rate: 1, isActive: true },
    create: { code: 'SAR', nameAr: 'ريال سعودي', symbol: 'ر.س', rate: 1, rateToBase: 1, isBase: true, isActive: true },
  });

  const usd = await prisma.currency.upsert({
    where: { code: 'USD' },
    update: { rateToBase: 3.75, rate: 3.75, isActive: true },
    create: { code: 'USD', nameAr: 'دولار أمريكي', symbol: '$', rate: 3.75, rateToBase: 3.75, isActive: true },
  });

  // Items
  const items = [
    { code: 'ITM001', nameAr: 'لابتوب Dell Latitude', unitId: unitPcs.id },
    { code: 'ITM002', nameAr: 'طابعة HP LaserJet', unitId: unitPcs.id },
    { code: 'ITM003', nameAr: 'شاشة Samsung 27"', unitId: unitPcs.id },
    { code: 'ITM004', nameAr: 'لوحة مفاتيح لاسلكية', unitId: unitPcs.id },
    { code: 'ITM005', nameAr: 'أوراق طباعة A4', unitId: unitBox.id },
  ];

  for (const item of items) {
    const saved = await prisma.item.upsert({
      where: { code: item.code },
      update: { unitId: item.unitId },
      create: { ...item, specs: 'مواصفات قياسية' },
    });

    const existingUnit = await prisma.itemUnit.findFirst({
      where: { itemId: saved.id, unitId: item.unitId },
    });
    if (!existingUnit) {
      await prisma.itemUnit.create({
        data: {
          itemId: saved.id,
          unitId: item.unitId,
          isBase: true,
          factorToBase: 1,
          isDefaultPurchase: true,
          isDefaultSale: true,
          isActive: true,
        },
      });
    }
  }

  // ترحيل الأصناف القديمة بدون ItemUnit
  const legacyItems = await prisma.item.findMany({
    where: { unitId: { not: null } },
    include: { itemUnits: true },
  });
  for (const item of legacyItems) {
    if (item.itemUnits.length === 0 && item.unitId) {
      await prisma.itemUnit.create({
        data: {
          itemId: item.id,
          unitId: item.unitId,
          isBase: true,
          factorToBase: 1,
          isDefaultPurchase: true,
          isDefaultSale: true,
          isActive: true,
        },
      });
    }
  }

  // Suppliers
  const suppliers = [
    { code: 'SUP001', nameAr: 'شركة التقنية المتقدمة', email: 'info@tech.com', phone: '0112345678' },
    { code: 'SUP002', nameAr: 'مؤسسة الحاسبات الحديثة', email: 'sales@modern.com', phone: '0123456789' },
    { code: 'SUP003', nameAr: 'شركة الإمدادات المكتبية', email: 'office@supply.com', phone: '0134567890' },
  ];

  for (const sup of suppliers) {
    await prisma.supplier.upsert({
      where: { code: sup.code },
      update: { defaultCurrencyId: sar.id },
      create: { ...sup, defaultCurrencyId: sar.id },
    });
  }

  // Users
  for (const user of USERS) {
    const hash = await bcrypt.hash(user.password, 10);
    const created = await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        username: user.username,
        email: user.email,
        nameAr: user.nameAr,
        passwordHash: hash,
        branchId: branch.id,
        departmentId: dept.id,
      },
    });

    const roleId = roleMap[user.role];
    if (roleId) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: created.id, roleId } },
        update: {},
        create: { userId: created.id, roleId },
      });
    }
  }

  // صلاحيات الموردين للمستخدمين الرئيسيين
  const allSuppliers = await prisma.supplier.findMany();
  const officerUser = await prisma.user.findUnique({ where: { username: 'purchasing_officer' } });
  if (officerUser) {
    for (const sup of allSuppliers) {
      await prisma.userSupplierPermission.upsert({
        where: { userId_supplierId: { userId: officerUser.id, supplierId: sup.id } },
        update: {
          canView: true,
          canUseInPurchase: true,
          canViewBalance: true,
        },
        create: {
          userId: officerUser.id,
          supplierId: sup.id,
          canView: true,
          canUseInPurchase: true,
          canViewBalance: true,
        },
      });
    }
  }

  // System Settings
  await prisma.systemSetting.upsert({
    where: { key: 'nomination_requires_approval' },
    update: {},
    create: { key: 'nomination_requires_approval', value: 'true' },
  });

  // Approval Matrix
  const approverUser = await prisma.user.findUnique({ where: { username: 'approver' } });
  const approverRole = await prisma.role.findUnique({ where: { name: 'purchase_approver' } });

  const docTypes = [
    'PURCHASE_REQUEST',
    'QUOTATION',
    'TECHNICAL_COMPARISON',
    'SUPPLIER_NOMINATION',
    'PURCHASE_ORDER',
  ];

  for (const docType of docTypes) {
    const existing = await prisma.approvalMatrix.findFirst({
      where: { documentType: docType, level: 1, branchId: branch.id },
    });
    if (!existing) {
      await prisma.approvalMatrix.create({
        data: {
          documentType: docType,
          branchId: branch.id,
          level: 1,
          roleId: approverRole?.id,
          userId: approverUser?.id,
          requiredApprovalsCount: 1,
          approvalMode: 'Sequential',
          isActive: true,
        },
      });
    }
  }

  console.log('✅ تم إدخال البيانات التجريبية بنجاح');
  console.log('\n📋 حسابات تجريبية:');
  USERS.forEach((u) => console.log(`  ${u.username} / ${u.password} (${u.nameAr})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
