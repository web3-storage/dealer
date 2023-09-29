export const DatabaseOperationErrorName = /** @type {const} */ (
  'DatabaseOperationFailed'
)
export class DatabaseOperationFailed extends Error {
  get reason() {
    return this.message
  }
  get name() {
    return DatabaseOperationErrorName
  }
}

export const UnexpectedDealForApprovalErrorName = /** @type {const} */ (
  'UnexpectedDealForApprovalFailed'
)
export class UnexpectedDealForApprovalFailed extends Error {
  get reason() {
    return this.message
  }
  get name() {
    return UnexpectedDealForApprovalErrorName
  }
}
