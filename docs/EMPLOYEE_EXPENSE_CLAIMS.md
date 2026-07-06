# Employee Expense Claims

## Employee workflow

1. Open **Employee Portal → My Expenses**.
2. Create a claim with expense date, category, amount, merchant, description,
   and business purpose.
3. Attach one to five receipt files. Supported formats are PDF, JPG, JPEG, and
   PNG, with a maximum size of 10 MB per file.
4. Save the claim as a draft or submit it immediately.
5. Track manager and HR stages, review comments, claim status, and attachment
   history.
6. Draft attachments can be added or removed. Submitted attachments are locked
   to protect the review evidence.

## Approval lifecycle

```text
Draft
  → Submitted
  → Stage 1: Manager Sign-off
  → Under Review
  → Stage 2: HR Expense Review
  → Approved or Rejected
```

Employees can cancel draft or pending claims. Approval decisions automatically
synchronize the expense claim and append status-history entries.

## HR workflow

Open **Operations → Expense Review** to:

- Filter claims by status and category.
- Inspect employee details, receipts, amounts, and approval stages.
- Approve the full or a reduced amount.
- Reject with a mandatory reason.

The HR decision endpoint uses the existing approval engine, so duplicate
decisions, stage ownership, timestamps, notifications, and approval history use
the same controls as other approval requests.

## API

| Method  | Endpoint                                  | Purpose                                         |
| ------- | ----------------------------------------- | ----------------------------------------------- |
| GET     | `/api/expenses/my`                        | Employee claim history                          |
| POST    | `/api/expenses`                           | Create draft or create-and-submit with receipts |
| GET/PUT | `/api/expenses/:id`                       | Read or edit a draft                            |
| POST    | `/api/expenses/:id/attachments`           | Add draft attachments                           |
| DELETE  | `/api/expenses/attachments/:attachmentId` | Remove a draft attachment                       |
| POST    | `/api/expenses/:id/submit`                | Submit a draft                                  |
| POST    | `/api/expenses/:id/cancel`                | Cancel a claim                                  |
| GET     | `/api/expenses`                           | HR claim queue                                  |
| POST    | `/api/expenses/:id/review`                | HR approval or rejection                        |

## Permissions

- `expenses:read`
- `expenses:write`
- `expenses:review`

Restart the backend after deployment so the permission and approval-workflow
seeders synchronize the new access rules and HR review stage.

The feature-data seeder also creates idempotent sample claims covering Draft,
Submitted, Under Review, Approved, and Rejected states. Submitted samples are
linked to real approval records and include a sample PDF receipt.
