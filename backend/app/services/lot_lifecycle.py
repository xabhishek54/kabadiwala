from app.models.enums import TransactionStatus

VALID_TRANSITIONS = {
    TransactionStatus.draft: {TransactionStatus.quoted, TransactionStatus.draft},
    TransactionStatus.quoted: {TransactionStatus.matched, TransactionStatus.draft},
    TransactionStatus.matched: {TransactionStatus.handed_over, TransactionStatus.draft},
    TransactionStatus.handed_over: {TransactionStatus.confirmed},
    TransactionStatus.confirmed: {TransactionStatus.paid},
    TransactionStatus.paid: {TransactionStatus.closed},
    TransactionStatus.closed: set(),
}
