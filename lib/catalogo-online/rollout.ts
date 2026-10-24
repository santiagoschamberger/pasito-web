import { createHash } from "node:crypto";
type Flag = {
  enabled: boolean;
  rollout_percentage: number;
  user_allowlisted?: boolean;
};
// Same MD5 bucket as the app's userBucket. Dart VM uses signed 64-bit ints;
// the four bytes form a positive unsigned 32-bit number there.
export function flagEnabled(flag: Flag | undefined, userId: string) {
  if (!flag?.enabled) return false;
  if (flag.user_allowlisted) return true;
  const bucket =
    createHash("md5").update(userId).digest().readUInt32LE(0) % 100;
  return bucket < flag.rollout_percentage;
}
