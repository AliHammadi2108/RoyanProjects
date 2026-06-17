import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { name: 'purchase_requests.create', nameAr: 'إنشاء طلب شراء', module: 'purchases' },
  { name: 'purchase_requests.view', nameAr: 'عرض طلبات الشراء', module: 'purchases' },
  { name: 'purchase_requests.update', nameAr: 'تعديل طلب شراء', module: 'purchases' },
  { name: 'purchase_requests.delete', nameAr: 'حذف طلب شراء', module: 'purchases' },
  { name: 'purchase_requests.submit', nameAr: 'إرسال طلب للاعتماد', module: 'purchases' },
  { name: 'purchase_requests.print', nameAr: 'طباعة طلب شراء', module: 'purchases' },
  { name: 'quotations.create', nameAr: 'إنشاء عرض سعر', module: 'purchases' },
  { name: 'quotations.view', nameAr: 'عرض عروض الأسعار', module: 'purchases' },
  { name: 'quotations.update', nameAr: 'تعديل عرض سعر', module: 'purchases' },
  { name: 'quotations.submit', nameAr: 'إرسال عرض للاعتماد', module: 'purchases' },
  { name: 'quotations.print', nameAr: 'طباعة عرض سعر', module: 'purchases' },
  { name: 'comparisons.create', nameAr: 'إنشاء مقارنة', module: 'purchases' },
  { name: 'comparisons.view', nameAr: 'عرض المقارنات', module: 'purchases' },
  { name: 'comparisons.update', nameAr: 'تعديل مقارنة', module: 'purchases' },
  { name: 'comparisons.submit', nameAr: 'إرسال مقارنة للاعتماد', module: 'purchases' },
  { name: 'comparisons.print', nameAr: 'طباعة مقارنة', module: 'purchases' },
  { name: 'supplier_selection.create', nameAr: 'ترشيح مورد', module: 'purchases' },
  { name: 'supplier_selection.view', nameAr: 'عرض الترشيحات', module: 'purchases' },
  { name: 'supplier_selection.print', nameAr: 'طباعة ترشيح مورد', module: 'purchases' },
  { name: 'purchase_orders.create', nameAr: 'إنشاء أمر شراء', module: 'purchases' },
  { name: 'purchase_orders.view', nameAr: 'عرض أوامر الشراء', module: 'purchases' },
  { name: 'purchase_orders.update', nameAr: 'تعديل أمر شراء', module: 'purchases' },
  { name: 'purchase_orders.submit', nameAr: 'إرسال أمر للاعتماد', module: 'purchases' },
  { name: 'purchase_orders.print', nameAr: 'طباعة أمر شراء', module: 'purchases' },
  { name: 'inspections.create', nameAr: 'إنشاء فحص', module: 'purchases' },
  { name: 'inspections.view', nameAr: 'عرض الفحوصات', module: 'purchases' },
  { name: 'inspections.print', nameAr: 'طباعة فحص', module: 'purchases' },
  { name: 'receivings.create', nameAr: 'إنشاء إذن توريد', module: 'purchases' },
  { name: 'receivings.view', nameAr: 'عرض إذونات التوريد', module: 'purchases' },
  { name: 'receivings.print', nameAr: 'طباعة إذن توريد', module: 'purchases' },
  { name: 'invoices.create', nameAr: 'إنشاء فاتورة', module: 'purchases' },
  { name: 'invoices.view', nameAr: 'عرض الفواتير', module: 'purchases' },
  { name: 'invoices.update_payment_status', nameAr: 'تحديث حالة الدفع', module: 'purchases' },
  { name: 'invoices.print', nameAr: 'طباعة فاتورة', module: 'purchases' },
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
  { name: 'access.users.reset_password', nameAr: 'إعادة تعيين كلمة مرور مستخدم', module: 'access', screenCode: 'users', action: 'reset_password' },
  { name: 'profile.change_own_password', nameAr: 'تغيير كلمة المرور الخاصة', module: 'profile', screenCode: 'change_password', action: 'change' },
  { name: 'profile.theme.view', nameAr: 'عرض إعدادات المظهر', module: 'profile', screenCode: 'appearance', action: 'view' },
  { name: 'profile.theme.edit', nameAr: 'تعديل إعدادات المظهر', module: 'profile', screenCode: 'appearance', action: 'edit' },
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
  { name: 'operations.print', nameAr: 'طباعة العمليات', module: 'operations', screenCode: 'print', action: 'print' },
  { name: 'whatsapp.send', nameAr: 'إرسال واتساب', module: 'operations', screenCode: 'whatsapp', action: 'send' },
  { name: 'whatsapp.configure', nameAr: 'إعداد واتساب', module: 'operations', screenCode: 'whatsapp', action: 'configure' },
  { name: 'whatsapp.auto', nameAr: 'الإرسال التلقائي لواتساب', module: 'operations', screenCode: 'whatsapp', action: 'auto' },
];

const REPORT_PERMISSIONS = [
  { name: 'reports.operations.view', nameAr: 'عرض تقارير العمليات', module: 'reports', screenCode: 'operations', action: 'view' },
  { name: 'reports.quantity_cost.view', nameAr: 'عرض تقارير مقارنة الكميات والتكاليف', module: 'reports', screenCode: 'quantity_cost', action: 'view' },
  { name: 'reports.supplier_debt.view', nameAr: 'عرض تقارير مديونية الموردين', module: 'reports', screenCode: 'supplier_debt', action: 'view' },
  { name: 'reports.supplier_statement.view', nameAr: 'عرض كشف حساب المورد', module: 'reports', screenCode: 'supplier_statement', action: 'view' },
  { name: 'reports.supplier_statement.print', nameAr: 'طباعة كشف حساب المورد', module: 'reports', screenCode: 'supplier_statement', action: 'print' },
  { name: 'reports.supplier_statement.export', nameAr: 'تصدير كشف حساب المورد', module: 'reports', screenCode: 'supplier_statement', action: 'export' },
  { name: 'reports.approvals.view', nameAr: 'عرض تقارير الاعتمادات', module: 'reports', screenCode: 'approvals', action: 'view' },
  { name: 'reports.used_documents.view', nameAr: 'عرض تقارير الوثائق المستخدمة', module: 'reports', screenCode: 'used_documents', action: 'view' },
  { name: 'reports.print', nameAr: 'طباعة التقارير', module: 'reports', screenCode: 'reports', action: 'print' },
  { name: 'reports.export', nameAr: 'تصدير التقارير', module: 'reports', screenCode: 'reports', action: 'export' },
  { name: 'reports.view_cost', nameAr: 'عرض التكاليف في التقارير', module: 'reports', screenCode: 'reports', action: 'view_cost' },
  { name: 'reports.view_supplier_balance', nameAr: 'عرض أرصدة الموردين', module: 'reports', screenCode: 'reports', action: 'view_supplier_balance' },
  { name: 'reports.view_charts', nameAr: 'عرض الرسوم البيانية', module: 'reports', screenCode: 'reports', action: 'view_charts' },
];

const INVENTORY_PERMISSIONS = [
  { name: 'inventory.reorder_settings.view', nameAr: 'عرض إعدادات حد الطلب', module: 'inventory', screenCode: 'reorder_settings', action: 'view' },
  { name: 'inventory.reorder_settings.edit', nameAr: 'تعديل إعدادات حد الطلب', module: 'inventory', screenCode: 'reorder_settings', action: 'edit' },
  { name: 'inventory.reorder_alerts.view', nameAr: 'عرض تنبيهات حد الطلب', module: 'inventory', screenCode: 'reorder_alerts', action: 'view' },
  { name: 'inventory.reorder_alerts.create_purchase_request', nameAr: 'إنشاء طلب شراء من تنبيه', module: 'inventory', screenCode: 'reorder_alerts', action: 'create_purchase_request' },
  { name: 'inventory.reorder_alerts.print', nameAr: 'طباعة تنبيهات حد الطلب', module: 'inventory', screenCode: 'reorder_alerts', action: 'print' },
  { name: 'inventory.reorder_alerts.export', nameAr: 'تصدير تنبيهات حد الطلب', module: 'inventory', screenCode: 'reorder_alerts', action: 'export' },
];

const SUPPLIER_PAYMENT_PERMISSIONS = [
  { name: 'supplier_payment.view', nameAr: 'عرض سندات صرف الموردين', module: 'purchases', screenCode: 'supplier_payment', action: 'view' },
  { name: 'supplier_payment.create', nameAr: 'إنشاء سند صرف مورد', module: 'purchases', screenCode: 'supplier_payment', action: 'create' },
  { name: 'supplier_payment.edit', nameAr: 'تعديل سند صرف مورد', module: 'purchases', screenCode: 'supplier_payment', action: 'edit' },
  { name: 'supplier_payment.delete', nameAr: 'حذف سند صرف مورد', module: 'purchases', screenCode: 'supplier_payment', action: 'delete' },
  { name: 'supplier_payment.print', nameAr: 'طباعة سند صرف مورد', module: 'purchases', screenCode: 'supplier_payment', action: 'print' },
  { name: 'supplier_payment.approve', nameAr: 'اعتماد سند صرف مورد', module: 'purchases', screenCode: 'supplier_payment', action: 'approve' },
  { name: 'supplier_payment.post', nameAr: 'ترحيل سند صرف مورد', module: 'purchases', screenCode: 'supplier_payment', action: 'post' },
  { name: 'supplier_payment.cancel', nameAr: 'إلغاء سند صرف مورد', module: 'purchases', screenCode: 'supplier_payment', action: 'cancel' },
  { name: 'supplier_payment.view_amounts', nameAr: 'عرض مبالغ سند الصرف', module: 'purchases', screenCode: 'supplier_payment', action: 'view_amounts' },
];

const ALL_PERMISSIONS = [...PERMISSIONS, ...MASTER_PERMISSIONS, ...REPORT_PERMISSIONS, ...INVENTORY_PERMISSIONS, ...SUPPLIER_PAYMENT_PERMISSIONS];

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
      'profile.change_own_password',
      'profile.theme.view', 'profile.theme.edit',
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
      'reports.operations.view', 'reports.used_documents.view', 'reports.export', 'reports.view_charts',
      'inventory.reorder_alerts.view', 'inventory.reorder_alerts.create_purchase_request',
      'inventory.reorder_alerts.export',
      'profile.change_own_password',
      'profile.theme.view', 'profile.theme.edit',
    ],
  },
  {
    name: 'purchase_approver',
    nameAr: 'معتمد مشتريات',
    permissions: [
      'purchase_requests.view', 'quotations.view', 'comparisons.view',
      'supplier_selection.view', 'purchase_orders.view', 'approvals.view',
      'approvals.action', 'operations.approve', 'operations.reject', 'operations.print', 'whatsapp.send',
      'notifications.view', 'tracking.view', 'audit_logs.view',
      'profile.change_own_password',
      'profile.theme.view', 'profile.theme.edit',
    ],
  },
  {
    name: 'warehouse_user',
    nameAr: 'مستخدم مخزن',
    permissions: [
      'purchase_orders.view', 'inspections.create', 'inspections.view',
      'receivings.create', 'receivings.view', 'notifications.view', 'tracking.view',
      'inventory.reorder_settings.view', 'inventory.reorder_settings.edit',
      'inventory.reorder_alerts.view', 'inventory.reorder_alerts.print', 'inventory.reorder_alerts.export',
      'profile.change_own_password',
      'profile.theme.view', 'profile.theme.edit',
    ],
  },
  {
    name: 'finance_user',
    nameAr: 'مستخدم مالية',
    permissions: [
      'purchase_orders.view', 'receivings.view', 'invoices.create', 'invoices.view',
      'invoices.update_payment_status', 'notifications.view', 'tracking.view',
      'reports.operations.view', 'reports.supplier_debt.view', 'reports.supplier_statement.view',
      'reports.supplier_statement.print', 'reports.supplier_statement.export',
      'reports.view_supplier_balance',
      'reports.view_cost', 'reports.export', 'reports.print', 'reports.view_charts', 'whatsapp.send',
      'supplier_payment.view', 'supplier_payment.create', 'supplier_payment.edit',
      'supplier_payment.delete', 'supplier_payment.print', 'supplier_payment.approve',
      'supplier_payment.post', 'supplier_payment.cancel', 'supplier_payment.view_amounts',
      'profile.change_own_password',
      'profile.theme.view', 'profile.theme.edit',
    ],
  },
  {
    name: 'auditor',
    nameAr: 'مدقق / مشاهد',
    permissions: [
      'purchase_requests.view', 'quotations.view', 'comparisons.view',
      'supplier_selection.view', 'purchase_orders.view', 'inspections.view',
      'receivings.view', 'invoices.view', 'tracking.view', 'audit_logs.view',
      'operations.print', 'whatsapp.send',
      'reports.operations.view', 'reports.quantity_cost.view', 'reports.supplier_debt.view',
      'reports.supplier_statement.view', 'reports.supplier_statement.print', 'reports.supplier_statement.export',
      'reports.approvals.view', 'reports.used_documents.view', 'reports.export', 'reports.print',
      'reports.view_cost', 'reports.view_supplier_balance', 'reports.view_charts', 'whatsapp.send',
      'profile.change_own_password',
      'profile.theme.view', 'profile.theme.edit',
    ],
  },
];

const USERS = [
  {
    userNo: '1',
    username: 'admin',
    email: 'admin@purchase.local',
    nameAr: 'مدير النظام',
    password: 'admin123',
    role: 'admin',
    phone: '+967773084555',
  },
  { userNo: '2', username: 'requester', email: 'requester@purchase.local', nameAr: 'أحمد مقدم الطلب', password: 'requester123', role: 'purchase_requester' },
  { userNo: '3', username: 'purchasing_officer', email: 'officer@purchase.local', nameAr: 'محمد موظف المشتريات', password: 'officer123', role: 'purchasing_officer' },
  { userNo: '4', username: 'approver', email: 'approver@purchase.local', nameAr: 'خالد المعتمد', password: 'approver123', role: 'purchase_approver' },
  { userNo: '5', username: 'warehouse_user', email: 'warehouse@purchase.local', nameAr: 'سعد مستخدم المخزن', password: 'warehouse123', role: 'warehouse_user' },
  { userNo: '6', username: 'finance_user', email: 'finance@purchase.local', nameAr: 'فهد مستخدم المالية', password: 'finance123', role: 'finance_user' },
];

async function migrateUserNo() {
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info(User)`
  );
  const hasUserNo = columns.some((c) => c.name === 'userNo');
  if (!hasUserNo) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "userNo" TEXT`);
  }
  for (const user of USERS) {
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "userNo" = '${user.userNo}' WHERE "username" = '${user.username}'`
    );
  }
  await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "userNo" = CAST(rowid AS TEXT) WHERE "userNo" IS NULL OR "userNo" = ''`
  );
}

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
  await migrateUserNo();

  for (const user of USERS) {
    const hash = await bcrypt.hash(user.password, 10);
    const userPhone = (user as { phone?: string }).phone;
    const created = await prisma.user.upsert({
      where: { username: user.username },
      update: {
        userNo: user.userNo,
        nameAr: user.nameAr,
        ...(userPhone ? { phone: userPhone } : {}),
      },
      create: {
        userNo: user.userNo,
        username: user.username,
        email: user.email,
        nameAr: user.nameAr,
        phone: userPhone,
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
    'SUPPLIER_PAYMENT',
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

  // Backfill invoice payment amounts
  const invoices = await prisma.purchaseInvoice.findMany();
  for (const inv of invoices) {
    const paid = inv.paidAmount ?? 0;
    const remaining = inv.remainingAmount ?? Math.max(0, inv.netTotal - paid);
    if (inv.remainingAmount == null || inv.paidAmount == null) {
      await prisma.purchaseInvoice.update({
        where: { id: inv.id },
        data: { paidAmount: paid, remainingAmount: remaining },
      });
    }
  }

  console.log('✅ تم إدخال البيانات التجريبية بنجاح');
  console.log('\n📋 حسابات تجريبية (رقم المستخدم / كلمة المرور):');
  USERS.forEach((u) => console.log(`  ${u.userNo} / ${u.password} (${u.nameAr})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
