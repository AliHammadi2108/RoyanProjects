import fs from 'fs/promises';
import path from 'path';

const ALLOWED_KEYS = new Set(['WHATSAPP_AUTO_NOTIFY']);

function getEnvFilePath(): string {
  return path.join(process.cwd(), '.env');
}

/** Update a single non-secret key in `.env` (allowed keys only). */
export async function updateEnvFileVariable(key: string, value: string): Promise<void> {
  if (!ALLOWED_KEYS.has(key)) {
    throw new Error(`غير مسموح بتعديل المتغير: ${key}`);
  }

  const envPath = getEnvFilePath();
  let content = '';
  try {
    content = await fs.readFile(envPath, 'utf8');
  } catch {
    throw new Error('ملف .env غير موجود — أنشئه من .env.example أولاً');
  }

  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');

  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    const trimmed = content.trimEnd();
    content = trimmed.length ? `${trimmed}\n${line}\n` : `${line}\n`;
  }

  await fs.writeFile(envPath, content, 'utf8');
  process.env[key] = value;
}
