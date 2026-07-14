import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64
const HASH_PREFIX = 'scrypt-v1'
const DUMMY_HASH = `${HASH_PREFIX}$${'0'.repeat(32)}$${'0'.repeat(KEY_LENGTH * 2)}`

export async function hashDataRoomPassword(password: string) {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password, salt, KEY_LENGTH) as Buffer

  return `${HASH_PREFIX}$${salt.toString('hex')}$${derived.toString('hex')}`
}
export async function verifyDataRoomPassword(password: string, encodedHash: string) {
  const [prefix, saltHex, expectedHex] = encodedHash.split('$')

  if (
    prefix !== HASH_PREFIX
    || !/^[a-f0-9]{32}$/i.test(saltHex ?? '')
    || !new RegExp(`^[a-f0-9]{${KEY_LENGTH * 2}}$`, 'i').test(expectedHex ?? '')
  ) {
    return false
  }

  const expected = Buffer.from(expectedHex, 'hex')
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH) as Buffer

  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function consumeDummyPasswordCheck(password: string) {
  await verifyDataRoomPassword(password, DUMMY_HASH)
}
