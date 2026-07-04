# Project Activity Logging and Audit Trail

## Scope

Project engagements are embedded in customer records. Project audit history is
stored separately in the append-only `ProjectActivity` collection so history
can grow without increasing the customer document size.

The implementation records:

- Project creation with its initial configuration.
- Project field and status changes with old and new values.
- Manual invoice generation.
- Automatic scheduled invoice generation.
- Payment recording, including invoice and payment references.
- The acting user or system process.
- Timestamp, source, IP address, and browser user agent.

## Activity fields

Each activity contains:

- `customerId`, `projectId`, and a project-name snapshot.
- `userId` and `actorType`.
- `action`, `entityType`, and optional `entityId`.
- A human-readable summary.
- Field-level `changes` with old and new values.
- Structured event metadata.
- `source`, `ipAddress`, `userAgent`, and `occurredAt`.

Indexes support project timeline, action, user, and date-based queries.

## API

| Method | Endpoint                                                    | Description                           |
| ------ | ----------------------------------------------------------- | ------------------------------------- |
| PUT    | `/api/customers/:customerId/projects/:projectId`            | Update project fields or status       |
| GET    | `/api/customers/:customerId/projects/:projectId/activities` | Retrieve newest-first project history |
| GET    | `/api/project-activities`                                   | Search the complete audit collection  |

The history endpoint accepts:

- `limit` from 1 to 250, defaulting to 100.
- `action` to filter by activity action.
- `before` as an ISO timestamp for cursor-style pagination.

The global audit endpoint additionally accepts `customerId`, `projectId`,
`userId`, `from`, and `to`. It retains access to activities for projects whose
customer was subsequently deleted.

Existing project creation, invoice-generation, and payment APIs now write
activity records automatically. Automated invoice generation uses a system
actor and `AUTOMATION` source.

## UI

Open a customer, select **Projects & Invoices**, and use:

- **Edit Project** to modify supported project fields or status.
- **Activity History** to view actors, timestamps, actions, and field changes.

Billing frequency and existing milestone definitions are locked during editing
because changing a billing schedule after invoices exist could invalidate
financial history.

## Historical data

Logging begins after this feature is deployed. Existing projects remain
available. The startup seeder creates one `PROJECT_BASELINE_IMPORTED` record
for an existing project that has no audit history. This preserves its current
baseline without inventing historical user actions; actions performed before
deployment cannot be reconstructed.
