# IT administration model — three equivalent chiefs

Status: product decision approved by the PO on 26/11/2026; architecture clarification prepared for review. This document defines the approved topology and implementation constraints. It does not authorize database migration execution, account provisioning, or production deployment.

## 1. Approved organizational model

The IT administration team has exactly three chief administrators. All three have equivalent administrative authority and use the same `platform_admin` role/capability set. There is no single primary chief, deputy hierarchy, or automatic elevation based on absence.

The remaining IT personnel receive lower, least-privilege access. They do not become platform administrators simply because they are members of IT.

## 2. Role and capability boundaries

| Identity category | Role/category | Allowed scope | Explicit exclusions |
|---|---|---|---|
| Three chief administrators | `platform_admin` | Platform-level IT administration and governance, according to explicit capabilities and audit controls | No routine or automatic conversation-content access; no bypass of separately approved exceptional-access workflow |
| IT operational support personnel | `it_support` | Device/session consultation and revocation for the user and organization covered by an active support ticket, with justification and audit | No platform/organization role changes, organization administration, cross-organization access, complete administrative audit history, or routine conversation-content access |
| Other IT personnel without support assignment | `collaborator` | Ordinary organization-user capabilities only | No implicit IT support or platform-administration privileges |
| Department manager | `collaborator` plus department-scoped capabilities | Own assigned department(s), membership management, and groups linked to those departments as approved | No other-department access, organization administration, or global permission management |

The `it_support` category is not automatically assigned to every employee in IT. It is granted only where operational support duties require it and remains scoped to a validated ticket, organization, and target user.

## 3. Three-chief invariants

1. Maintain three active chief-administrator assignments as the organizational target.
2. Each chief has the same role and capability set; authorization must not branch on chief identity.
3. Temporary absence of one chief does not elevate the others; the remaining two already hold equivalent authority.
4. No quorum or co-signature is added for ordinary platform-administration operations by this decision.
5. The separately approved two-party approval workflow for exceptional conversation-content access remains mandatory and unchanged.
6. Appointment, removal, and replacement use a controlled server-side process, with identity verification, separation of duties, and append-only audit events.
7. No chief may grant or elevate their own role. No client-side metadata, email address, account age, row count, or user-supplied identifier is proof of chief status.
8. A vacant seat is restored through the controlled replacement process; an `it_support` member is never silently promoted.

The appointing authority and detailed replacement procedure remain to be specified as governance/implementation details. This document does not invent that authority.

## 4. Current schema impact

The existing `public.platform_users` table uses `user_id` as its primary key and restricts `role` to `platform_admin`.

- This schema can represent three chiefs without a new role value: three distinct `user_id` rows can each have `role = 'platform_admin'`.
- The current role CHECK does not itself enforce that exactly three assignments exist. The three-seat invariant therefore requires a controlled provisioning/governance workflow and an auditable operational check, not a client-writable count constraint.
- The current table does not represent `it_support` assignments. Do not broaden its CHECK constraint or treat support as a platform-wide role without a separate scoped assignment design.
- Recommended next design: a separate support-assignment relation for `it_support`, with explicit organization scope, assignment lifecycle, and audit linkage to support tickets. Final physical schema remains subject to review.
- Existing department RPCs that check `platform_users.role = 'platform_admin'` will treat all three chiefs equally once their assignments exist. They will not authorize `it_support` or ordinary collaborators.
- Department-scoped collaborator capabilities remain separate from platform administration.

## 5. Required implementation and test gates

Before any migration or release implementing this model:

- Define the controlled workflow for assigning, revoking, and replacing a chief administrator, including who is authorized to appoint them.
- Define the support-assignment schema and lifecycle, including organization scope and support-ticket linkage.
- Ensure role and capability changes are server-side only and audited.
- Verify that three distinct chief identities receive identical authorized operations.
- Verify that two chiefs remain fully capable during the third chief's absence.
- Verify that `it_support` cannot call platform-admin RPCs or change roles.
- Verify that support operations fail without an active ticket, non-empty justification, valid organization, and in-scope target user.
- Verify that collaborators and department managers cannot escalate to platform or cross-department authority.
- Verify that no administrative role grants routine conversation-content access and that exceptional access still requires its separately approved dual-approval workflow.
- Run positive, negative, cross-tenant, and privilege-escalation tests against the new BEX DEV project before any production authorization.

## 6. Change boundary

This is a documentation-only architectural clarification. It does not modify SQL migrations, create or modify user accounts, change Supabase data, alter Vercel configuration, or authorize deployment. SQL changes, if required after the support-assignment design is completed, must be delivered as reviewed incremental migrations and a separate approval gate.
