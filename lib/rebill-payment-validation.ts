/**
 * Rebill reports the checkout total in `amount`. When the buyer chooses
 * installments, that total includes financing charges and is higher than the
 * price sent by Pasito. We accept that Rebill-authenticated financed total,
 * but never an underpayment or an unexplained overpayment without installments.
 */
export function isRebillPaymentAmountValid(
  paidAmount: number | string | undefined,
  expectedAmount: number,
  installments: number | null | undefined,
): boolean {
  const paid = Number(paidAmount)
  if (!Number.isFinite(paid) || !Number.isFinite(expectedAmount) || expectedAmount <= 0) return false
  if (paid === expectedAmount) return true
  return paid > expectedAmount && Number.isInteger(installments) && Number(installments) > 1
}
