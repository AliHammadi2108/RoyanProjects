export const OPERATION_MESSAGES = {
  save: 'تم حفظ العملية بنجاح',
  update: 'تم تعديل العملية بنجاح',
  submit: 'تم إرسال العملية للاعتماد بنجاح',
  approve: 'تم اعتماد العملية بنجاح',
  reject: 'تم رفض العملية',
  delete: 'تم حذف العملية بنجاح',
} as const;

export type OperationMessageKey = keyof typeof OPERATION_MESSAGES;
