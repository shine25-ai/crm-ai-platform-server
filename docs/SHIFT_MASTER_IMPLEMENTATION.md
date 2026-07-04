# Employee Shift Master and Timesheet Calculation Guide

## Implemented scope

- Shift Master configuration with `SINGLE`, `DOUBLE`, and `TRIPLE` operating
  patterns.
- One, two, or three named shift slots with start time, end time, unpaid break,
  check-in grace, and check-out grace.
- Working-day, timezone, active/inactive, and descriptive configuration.
- Effective-dated employee-to-shift-slot assignments.
- Protection against overlapping active assignments.
- Overnight shift handling, including check-ins occurring after midnight.
- Attendance snapshots of the assigned schedule to preserve historical results
  when a Shift Master changes.
- Shift-based worked, scheduled, break, late, early-departure, overtime, and
  deficit calculations.
- Monthly HR summary fields for scheduled hours, worked hours, overtime,
  deficit, breaks, and late days.
- HR management UI at `/shifts`, with Shift Masters and Employee Assignments
  tabs.
- Dynamic “My Shift” information on the Attendance screen.

## Business rules

1. A Shift Master describes the company's daily operating pattern:
    - `SINGLE` requires one slot.
    - `DOUBLE` requires two slots.
    - `TRIPLE` requires three slots.
2. An employee is assigned to one slot for an effective date range.
3. Active assignment ranges for the same employee cannot overlap.
4. A slot whose end time is less than or equal to its start time is an
   overnight shift.
5. Paid working minutes are calculated as:

    `check-out - check-in - max(actual breaks, configured unpaid break)`

6. Scheduled paid minutes are:

    `scheduled slot duration - configured unpaid break`

7. Overtime is worked minutes above scheduled paid minutes. Deficit is
   scheduled paid minutes above worked minutes.
8. Late and early-departure minutes apply the configured grace values.
9. Shift Masters with assignment history cannot be deleted; they must be made
   inactive. Assignments referenced by attendance are also deactivated rather
   than physically deleted.

## API endpoints

| Method     | Endpoint                                    | Purpose                         |
| ---------- | ------------------------------------------- | ------------------------------- |
| GET/POST   | `/api/shifts`                               | List or create Shift Masters    |
| PUT/DELETE | `/api/shifts/:id`                           | Update or delete a Shift Master |
| GET/POST   | `/api/shifts/assignments`                   | List or create assignments      |
| PUT/DELETE | `/api/shifts/assignments/:id`               | Update or remove an assignment  |
| GET        | `/api/shifts/my-schedule?date=YYYY-MM-DD`   | Logged-in employee schedule     |
| GET        | `/api/shifts/employee/:employeeId/schedule` | HR schedule lookup              |

## Permissions

- `shifts:read`
- `shifts:write`
- `shifts:delete`

Super Admin, Admin, and HR can manage Shift Masters and assignments. Employees
receive read access to view their own schedule.

## Deployment notes

1. Deploy the backend before or together with the frontend.
2. Restart the backend once so the permission seeder adds the new permissions.
   The startup seeder also creates `GENERAL-DAY`, `TWO-SHIFT`, and
   `THREE-SHIFT` sample Shift Masters when those codes do not already exist.
   A second idempotent seeder maps active employees without any assignment to a
   suitable shift based on their department or designation. Existing
   assignments are never changed.
3. Confirm the server timezone configuration with `APP_TIMEZONE`; Shift Masters
   default to `Asia/Kolkata` but can store another IANA timezone.
4. Create Shift Masters, assign employees, and only then validate check-in and
   check-out calculations.
5. Existing attendance remains valid and is displayed as `Unscheduled` because
   it predates shift assignment snapshots.
