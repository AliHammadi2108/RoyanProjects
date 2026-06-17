import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { formatActionError } from '@/lib/utils';

export async function getUsers(filters?: { search?: string; activeOnly?: boolean }) {
  const search = filters?.search?.trim();
  return prisma.user.findMany({
    where: {
      ...(filters?.activeOnly && { isActive: true }),
      ...(search && {
        OR: [
          { userNo: { contains: search } },
          { nameAr: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
          { username: { contains: search } },
        ],
      }),
    },
    include: {
      roles: { include: { role: true } },
      branch: true,
      department: true,
      supplierPermissions: { include: { supplier: true } },
      _count: {
        select: {
          purchaseRequestsCreated: true,
          quotationsCreated: true,
          ordersCreated: true,
        },
      },
    },
    orderBy: { userNo: 'asc' },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      roles: { include: { role: true } },
      userPermissions: { include: { permission: true } },
      supplierPermissions: { include: { supplier: true } },
      branch: true,
      department: true,
    },
  });
}

export async function userHasOperations(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          purchaseRequestsCreated: true,
          quotationsCreated: true,
          ordersCreated: true,
          approvalsRequested: true,
        },
      },
    },
  });
  if (!user) return false;
  const c = user._count;
  return (
    c.purchaseRequestsCreated + c.quotationsCreated + c.ordersCreated + c.approvalsRequested > 0
  );
}

interface SaveUserInput {
  userNo: string;
  nameAr: string;
  phone?: string;
  email: string;
  password?: string;
  isActive: boolean;
  notes?: string;
  branchId?: string;
  departmentId?: string;
  roleIds: string[];
  permissionIds: string[];
  supplierIds: string[];
}

export async function saveUser(data: SaveUserInput, id?: string) {
  const userNo = data.userNo.trim();
  if (!userNo) throw new Error('رقم المستخدم مطلوب');
  if (!/^\d+$/.test(userNo)) throw new Error('رقم المستخدم يجب أن يكون أرقاماً فقط');

  const duplicate = await prisma.user.findFirst({
    where: { userNo, ...(id ? { NOT: { id } } : {}) },
  });
  if (duplicate) throw new Error('رقم المستخدم مستخدم مسبقاً');

  const emailDuplicate = await prisma.user.findFirst({
    where: { email: data.email, ...(id ? { NOT: { id } } : {}) },
  });
  if (emailDuplicate) throw new Error('البريد الإلكتروني مستخدم مسبقاً');

  try {
    return await prisma.$transaction(async (tx) => {
      const passwordHash =
        data.password && data.password.length > 0
          ? await bcrypt.hash(data.password, 10)
          : undefined;

      const user = id
        ? await tx.user.update({
            where: { id },
            data: {
              userNo,
              nameAr: data.nameAr,
              phone: data.phone || null,
              email: data.email,
              notes: data.notes || null,
              isActive: data.isActive,
              branchId: data.branchId || null,
              departmentId: data.departmentId || null,
              ...(passwordHash ? { passwordHash } : {}),
            },
          })
        : await tx.user.create({
            data: {
              userNo,
              username: userNo,
              nameAr: data.nameAr,
              phone: data.phone || null,
              email: data.email,
              notes: data.notes || null,
              isActive: data.isActive,
              branchId: data.branchId || null,
              departmentId: data.departmentId || null,
              passwordHash: passwordHash || (await bcrypt.hash('ChangeMe123!', 10)),
            },
          });

      await tx.userRole.deleteMany({ where: { userId: user.id } });
      if (data.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: data.roleIds.map((roleId) => ({ userId: user.id, roleId })),
        });
      }

      await tx.userPermission.deleteMany({ where: { userId: user.id } });
      if (data.permissionIds.length > 0) {
        await tx.userPermission.createMany({
          data: data.permissionIds.map((permissionId) => ({
            userId: user.id,
            permissionId,
            effect: 'allow',
          })),
        });
      }

      await tx.userSupplierPermission.deleteMany({ where: { userId: user.id } });
      if (data.supplierIds.length > 0) {
        await tx.userSupplierPermission.createMany({
          data: data.supplierIds.map((supplierId) => ({
            userId: user.id,
            supplierId,
            canView: true,
            canUseInPurchase: true,
          })),
        });
      }

      return user;
    });
  } catch (err) {
    throw new Error(formatActionError(err));
  }
}

export async function deactivateUser(id: string) {
  const hasOps = await userHasOperations(id);
  if (hasOps) {
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
  return prisma.user.delete({ where: { id } });
}

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('المستخدم غير موجود');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error('كلمة المرور الحالية غير صحيحة');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  } catch (err) {
    throw new Error(formatActionError(err));
  }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('المستخدم غير موجود');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  } catch (err) {
    throw new Error(formatActionError(err));
  }
}
