# IT administration model — three equivalent chiefs

Status: product decision approved by the PO on 26/11/2026; architecture clarification prepared for review. This document does not authorize migrations, account provisioning, or production deployment.

## 1. Approved organizational model

The IT administration team has exactly three chief administrators. All three have equivalent authority and use the same `platform_admin` role/capability set. There is no primary/deputy hierarchy or automatic elevation based on absence.

Remaining IT personnel receive lower, least-privilege access. IT membership alone does not confer platform-administrator authority.

## 2. Role and capability boundaries

| Identity category | Role/category | Allowed scope | Explicit exclusions |
|---|---|---|---|
| Three chief administrators | `platform_admin` | Platform-level IT administration and governance under explicit capabilities and audit controls | No routine conversation-content access; no bypass of exceptional-access workflow |
| IT operational support personnel | `it_support` | Proposed: explicit, time-limited device support for one organization and target user, with justification and audit | No role changes, organization administration, cross-organization access, unrestricted audit history, session/account support unless separately approved, or conversation-content access |
| Other IT personnel without support assignment | `collaborator` | Ordinary organization-user capabilities | No implicit IT support or platform-administration privileges |
| Department manager | `collaborator` plus department-scoped capabilities | Own assigned departments and approved department-scoped membership/groups | No other-department access, organization administration, or global permission management |

The `it_support` category is not automatically assigned to every IT employee. It requires an explicit active assignment restricted to organization, target user, device scope, and authorization window. A support ticket is not required under the PO's proposed choice.

## 3. Three-chief invariants

1. Maintain three active chief-administrator assignments as the organizational target.
2. Each chief has the same role and capability set; authorization must not branch on chief identity.
3. Temporary absence of one chief does not elevate the others.
4. No quorum or co-signature is added for ordinary platform-administration operations by this decision.
5. The separately approved two-party approval workflow for exceptional conversation-content access remains mandatory.
6. Appointment, removal, and replacement use a controlled server-side process, identity verification, separation of duties, and append-only audit events.
7. No chief may grant or elevate their own role. Client-side metadata, email, account age, row count, or user-supplied identifiers do not prove chief status.
8. A vacant seat is restored through the controlled replacement process; an `it_support` member is never silently promoted.

Appointing authority and replacement procedure remain to be specified; this document does not invent that authority.

## 4. Current schema impact

The existing `public.platform_users` table uses `user_id` as its primary key and restricts `role` to `platform_admin`.

- Three distinct `user_id` rows can each have `role = 'platform_admin'`; no new role value is needed for the three chiefs.
- The current role CHECK does not enforce exactly three assignments. This requires controlled provisioning/governance and an auditable operational check.
- The current table does not represent `it_support` assignments. Do not broaden its CHECK constraint or make support a platform-wide role.
- Recommended next design: a separate support-assignment relation with organization/target-user scope, device scope, maximum eight-hour validity, lifecycle, justification, and audit linkage. Do not introduce a ticket foreign key for this workflow.
- Existing department RPCs checking `platform_users.role = 'platform_admin'` will treat all three chiefs equally. They must not authorize `it_support` or ordinary collaborators.
- Department-scoped collaborator capabilities remain separate from platform administration.

## 5. Required implementation and test gates

Before migration or release:
- Define controlled assignment, revocation, and replacement of chief administrators, including appointing authority.
- Identify the canonical device registry and ownership model; define exact permitted device operations.
- Define who may grant, revoke, and renew support assignments; prevent self-grant and self-elevation.
- Keep role/capability changes server-side and audited.
- Verify support grants enforce organization, target user, device scope, allowlisted capabilities, justification, and maximum eight-hour validity.
- Verify all three chief identities receive identical authorized operations and two remain fully capable during the third's absence.
- Verify `it_support` cannot call platform-admin RPCs or change roles.
- Verify collaborators and department managers cannot escalate privileges.
- Preserve the dual-approval workflow for exceptional conversation-content access.
- Run positive, negative, expiry, revocation, cross-tenant, and privilege-escalation tests against BEX DEV.

## 6. Change boundary

Documentation-only clarification. No SQL migrations, accounts, Supabase data, Vercel configuration, or deployments are changed or authorized. Any SQL changes must be reviewed incremental migrations with a separate approval gate.
