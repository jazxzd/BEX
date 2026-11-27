# IT operational support — scoped device access design

Status: proposed architecture choices recorded from the PO on 26/11/2026; pending technical review. These choices are not an approved physical schema, migration, or implementation authorization.

## 1. Proposed choices

| Topic | PO choice | Architectural interpretation |
|---|---|---|
| Support tickets/cases | No | A ticket/case is not a prerequisite. Do not create a ticket table or ticket foreign key solely for this workflow. |
| Scope | Devices | First design is limited to device-related support. Session revocation, general account assistance, messages, files, call content, and conversation history are excluded unless separately approved. |
| Duration | 8 hours | Each grant is valid for at most eight hours from its start. Expiry is enforced server-side; early revocation is allowed only by one of the three equivalent chief IT administrators. |

The PO selected consultation of a registered device and the ability to revoke/remove a registered device. **Visibility is limited to the single device explicitly covered by the support assignment**: an `it_support` agent must not browse, list, search, or otherwise consult the target user's complete device inventory. The exact API semantics, confirmation flow, and technical/privacy safeguards still require review before implementation.

## 2. Purpose and assignment model

IT team membership alone grants no support access. A person receives scoped support access only through an explicit, active, server-managed assignment.

Without a ticket workflow, an assignment must not depend on a ticket/case record. The logical scope should identify at minimum the support agent, organization, target user, specific device identity, allowed capabilities, justification, grantor (one of the three chief IT administrators), start time, expiry time, status, and revocation metadata.

## 3. Security invariants

1. Support access is deny-by-default and server-authorized.
2. Each assignment is restricted to one organization, one explicitly identified target user, and exactly one specifically identified registered device. A separate authorization is required for each additional device.
3. Only one of the three equivalent `platform_admin` chief IT administrators may grant or renew a support assignment. Self-grant and self-elevation are prohibited. A non-empty justification is required and persisted before access is granted.
4. The support agent must be authenticated, active, and explicitly assigned. The agent may see only the registered-device record identified by that active assignment; do not expose the user's complete device inventory, other devices, or device discovery/search endpoints to `it_support`.
5. The target user must be active and belong to the organization in the assignment; cross-organization access is denied.
6. The grant expires no later than eight hours after its start. Server-side checks reject access after expiry even if the client remains open. Revocation by one of the three equivalent chief IT administrators, agent deactivation, or target-user deactivation ends access earlier.
7. Only the three `platform_admin` chief IT administrators, with equivalent authority, may grant, renew, or revoke a support assignment. An `it_support` agent or any other lower-privilege TI member cannot create, renew, revoke, shorten, suspend, or otherwise invalidate an assignment. Each operation must be server-authorized and audited with the acting administrator, target assignment, timestamp, and reason.
8. Only device-related capabilities may be granted. The allowlist is closed and server-defined; client input cannot expand it.
9. No message bodies, attachments, call content, private conversation history, unrestricted audit history, role management, organization administration, or department administration is included.
10. Every grant, access, mutation, denial, revocation, and expiry is recorded in the central audit mechanism planned by Issue #97.
11. Client-provided organization, user, device, role, or scope values are untrusted. The server derives and verifies them from persisted records.

## 4. Logical data model (not executable SQL)

A future support-assignment record should capture: immutable assignment identifier; support agent identity; organization identity; target user identity; exactly one canonical registered-device identifier; permitted capabilities from a closed server-defined allowlist; mandatory justification; status and creation timestamp; grantor identity (one of the three equivalent chief IT administrators); start and expiry times (maximum eight-hour interval); renewal history; revocation timestamp and revoker identity. Grantor, renewer, and revoker must be one of the three equivalent chief IT administrators; this must be enforced server-side, not only by hiding client controls.

Do not add ticket/case identifiers or a ticket table for this workflow. Identify the canonical device registry and ownership relationship before designing device foreign keys. Do not invent a parallel device registry if BEX already has a canonical source.

## 5. Authorization flow

1. Support agent authenticates.
2. Server receives requested device operation and target context.
3. Server loads the active assignment and device ownership from trusted database records.
4. Server verifies agent assignment, active status, organization match, target-user membership/status, device ownership, allowlisted capability, validity window, and justification.
5. Server performs only the requested allowlisted device operation.
6. Server writes a central audit event with actor, organization, target user, device/resource, capability, outcome, timestamp, and reason.
7. Failed checks deny the operation and are audited where safe.

Browser must never create or renew support assignments or choose capabilities. Only chief-admin-authorized server operations may grant, renew, or revoke assignments. Use server-side RPCs with explicit grants and narrowly scoped execution. Any SECURITY DEFINER function must pin a safe search_path, validate auth.uid(), check all scope constraints, and revoke execution from PUBLIC/unauthorized roles.

## 6. Role relationship

| Category | Authority |
|---|---|
| platform_admin | Three equivalent chief administrators; platform administration under approved capability rules |
| it_support | Explicitly assigned, time-limited device support only; no implicit platform governance |
| collaborator | Ordinary organization-user capabilities |
| Department manager | Existing department-scoped capabilities, separate from platform and support administration |

An IT employee without an active support assignment remains a normal collaborator. Do not broaden public.platform_users into a generic support-assignment table.

## 7. Required tests

- Assigned agent can perform only an allowlisted device capability on the single device identified by the active assignment.
- A grant or renewal is accepted only from one of the three equivalent chief IT administrators; ordinary TI support members cannot grant or renew.
- Self-grant and self-elevation are rejected server-side.
- A grant covering device A cannot be used against device B, including another device owned by the same target user.
- Agent cannot access another organization, target user, or out-of-scope device.
- Agent cannot act without an active assignment, non-empty justification, or outside the valid time window.
- `it_support` and other lower-privilege TI members cannot revoke, suspend, shorten, or invalidate support assignments.
- Each of the three equivalent chief IT administrators can grant, renew, and revoke an assignment; each operation is denied to all other roles and always audited.
- Consultation and revoke/remove operations are supported only for the specifically authorized device record; complete inventory consultation is prohibited. Each operation must be audited.
- Access is denied immediately after revocation, agent/target deactivation, or eight-hour expiry.
- Client-supplied organization, target, device, or capability manipulation cannot bypass server validation.
- Ordinary collaborator cannot create or elevate an assignment.
- it_support cannot invoke platform-admin department RPCs, role-management functions, or organization administration.
- Support agent cannot read message bodies, attachments, call content, or conversation history.
- Every successful mutation and security-relevant denial produces the expected central audit event.
- Cross-tenant and privilege-escalation tests pass under authenticated and anonymous roles.

## 8. Remaining decisions and implementation gates

- Device operations selected: consult the registered-device record and revoke/remove that registered device. The support agent's visibility is restricted to the one device identified by the active assignment; complete inventory listing, browsing, or search is prohibited. Finalize API semantics, confirmation UX, and safeguards during technical review.
- Identify the canonical device registry and ownership model already present or planned in BEX.
- Grant, renewal, and revocation authority is decided: only the three equivalent chief IT administrators may perform these operations. Enforce no self-grant/self-elevation; every renewal must be auditable and each authorization remains subject to the eight-hour maximum.
- Device scope is decided: exactly one specific registered device per assignment; additional devices require separate assignments.
- Reconcile the six-month initial PO retention rule with category-specific retention in ADR-001 before implementing deletion.
- Confirm audit-event fields and integration with Issue #97.

Do not add SQL migrations until the canonical device model, exact allowlist, assignment governance, and audit integration have been reviewed. Then implement schema/RPCs in a new incremental migration and add positive, negative, expiry, revocation, and cross-tenant tests. Validate on BEX DEV; no production execution is authorized by this proposal.
