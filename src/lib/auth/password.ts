import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string) {
  if (password.length < 8) {
    throw new Error("Mật khẩu tối thiểu 8 ký tự.");
  }

  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) return false;

  const [algorithm, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;

  const hashBuffer = Buffer.from(hash, "hex");
  const derivedKey = (await scrypt(password, salt, hashBuffer.length)) as Buffer;

  return (
    hashBuffer.length === derivedKey.length &&
    timingSafeEqual(hashBuffer, derivedKey)
  );
}
