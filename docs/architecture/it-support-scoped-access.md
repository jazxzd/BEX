# IT operational support — scoped access design

Status: architecture proposal for review; not an approved physical schema or migration. Related decisions: PO-approved three equivalent chief administrators; least-privilege access for other IT personnel. This document does not authorize SQL execution, account provisioning, or deployment.

## 1. Purpose

Define constrained operational-support capability for IT personnel who are not one of the three platform chief administrators. IT team membership alone grants no access. A person receives the it_support category only when an authorized assignment exists and is active.

## 2. Security invariants

1. Support access is deny-by-default and server-authorized.
2. Every support action is tied to one active support case/ticket, one organization, and one explicitly identified target user or resource.
3. A non-empty justification is required and persisted before access is granted.
4. The support agent must be authenticated, active, and assigned to the case.
5. The target user must be active and belong to the organization recorded on the case; cross-organization access is denied.
6. Scope is limited to explicitly approved operational functions. Session/device access assistance are candidates, not yet approved capabilities. No message bodies, files, call content, or private conversation history.
7. No support assignment grants role management, organization administration, department administration outside existing department-scoped capabilities, or unrestricted audit-history access.
8. Every grant, access, mutation, denial, revocation, and expiry is recorded in the central audit mechanism planned by Issue #97.
9. Access ends when the case is closed, assignment revoked, support agent deactivated, target user deactivated, or assignment expires, whichever occurs first.
10. Client-provided organization, user, ticket, role, or scope values are untrusted. Server derives and verifies them from persisted records.

## 3. Logical data model (not executable SQL)

A future support-assignment record should capture: immutable assignment identifier; support agent identity; support case/ticket reference; organization identity; target user identity; permitted capabilities from a closed server-defined allowlist; mandatory justification; status and creation timestamp; creator/approver identity; start and expiry times; revocation timestamp and revoker identity; and case closure state.

The canonical ticket/case table and identifier must be established before designing a foreign key. Do not invent a parallel ticket table. If ticket-based support is not approved as a product workflow, return to the PO rather than weakening the case requirement.

## 4. Authorization flow

1. Support agent authenticates.
2. Server receives requested operation and case reference.
3. Server loads case and assignment from trusted database records.
4. Server verifies agent assignment, active status, organization match, target-user membership/status, allowed capability, validity window, and justification.
5. Server performs only the requested allowlisted operation.
6. Server writes central audit event with actor, case, organization, target, capability, outcome, timestamp, and reason.
7. Failed checks deny the operation and are audited where safe.

Browser must never write support assignments or choose capabilities. Use server-side RPCs with explicit grants and narrowly scoped execution. Any SECURITY DEFINER function must pin a safe search_path, validate auth.uid(), check all scope constraints, and revoke execution from PUBLIC/unauthorized roles.

## 5. Relationship to existing roles

| Category | Authority |
|---|---|
| platform_admin | Three equivalent chief administrators; platform administration under approved capability rules |
| it_support | Case-scoped operational support only; no implicit platform governance |
| collaborator | Ordinary organization-user capabilities |
| Department manager | Existing department-scoped capabilities, separate from platform and support administration |

An IT employee without an active support assignment remains a normal collaborator. The platform_users table must not be broadened into a generic support-assignment table.

## 6. Required tests

- Assigned agent can perform only the capability on the active case.
- Agent cannot access another organization or target user.
- Agent cannot act without case reference, active assignment, justification, or within an invalid time window.
- Closed, revoked, or expired case denies further access immediately.
- Deactivated agent or target user denies access.
- Ordinary collaborator cannot create or elevate an assignment.
- it_support cannot invoke platform-admin department RPCs, role-management functions, or organization administration.
- Support agent cannot read message bodies, attachments, call content, or conversation history.
- Manipulating client-supplied case, organization, target, or capability values cannot bypass server validation.
- Every successful mutation and security-relevant denial produces the expected central audit event.
- Cross-tenant and privilege-escalation tests pass under authenticated and anonymous roles.

## 7. Decisions required before physical schema

- Confirm whether product will provide a support-ticket/case workflow and identify its canonical entity.
- Confirm first-release operational actions; session revocation and device/account access assistance are candidates, not approved scope.
- Define who may create, assign, approve, and close a case; a support agent must not self-approve elevated access to their own target.
- Define maximum assignment duration and renewal approval.
- Reconcile six-month initial PO retention rule with category-specific retention in ADR-001 before implementing deletion.
- Define whether a case covers one target user or a bounded set of resources.

## 8. Implementation gate

Do not add SQL migrations until the product decisions and canonical support-case model are approved. Then implement schema and RPCs in a new incremental migration, integrate Issue #97 audit events, add positive/negative/cross-tenant tests, and validate on the empty BEX development project. Do not execute migrations against production as part of this proposal.
