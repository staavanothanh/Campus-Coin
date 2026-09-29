# ADR-0010: Optional User Profile Fields

- **Status:** Accepted by Team Leader on 2026-09-28
- **Scope:** Date of birth and gender in user profile

## Context

Settings must allow users to update their date of birth and gender. These two fields constitute personal data and are not required for transaction recording or balance calculations.

## Decision

- Store `birth_date DATE NULL` and `gender VARCHAR(32) NULL` using an additive migration; existing accounts remain `NULL`.
- Both fields are optional. The API accepts only gender codes defined in the contract and valid calendar dates that are not in the future according to `Asia/Ho_Chi_Minh`.
- Only the profile endpoint of the authenticated user reads/writes these fields; owner is resolved from the session.
- Do not expose birth date or gender in admin listings, audit details, analytics, logs, or JEV requests.
- Grant runtime `UPDATE` privileges only to the two new columns requiring modification; no index is needed since there are no filter queries on them.

## Consequences

- Shared databases must run migration `0034_user_profile_details.sql` before activating the new application version.
- Existing records remain compatible because both columns permit `NULL`; users can clear values by sending PATCH `null`.
- Date of birth and gender do not affect session authorization or the monetary domain.

## Risks and Limitations

Date of birth and gender may be considered sensitive data under organizational policies; production must maintain a clear usage purpose, restrict access permissions, and comply with project retention requirements.
