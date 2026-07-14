import assert from 'node:assert/strict'
import test from 'node:test'
import {
  hashDataRoomPassword,
  verifyDataRoomPassword,
} from '../lib/data-room/crypto.ts'

test('data-room passwords are salted and verifiable', async () => {
  const first = await hashDataRoomPassword('coca-cola-segura')
  const second = await hashDataRoomPassword('coca-cola-segura')

  assert.notEqual(first, second)
  assert.equal(await verifyDataRoomPassword('coca-cola-segura', first), true)
  assert.equal(await verifyDataRoomPassword('otra-clave', first), false)
})
test('data-room password verification rejects malformed hashes', async () => {
  assert.equal(await verifyDataRoomPassword('password', 'plain-text'), false)
  assert.equal(await verifyDataRoomPassword('password', 'scrypt-v1$bad$bad'), false)
})
