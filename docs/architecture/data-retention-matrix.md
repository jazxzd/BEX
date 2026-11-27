# Data-retention matrix — BEX / CONNEXA3

Status: reconciliation document. This matrix records the retention decisions already ratified in ADR-001 v1.3 and identifies the separate six-month PO direction whose categories have not yet been specified. It is not an implementation authorization, legal opinion, or executable purge specification.

## 1. Governing rules

1. ADR-001 v1.3 is the current documentary source for the five-year retention policy ratified for the categories listed below.
2. The PO's earlier direction of an initial six-month period applies only to “certain categories” of data. Those categories have not yet been identified precisely enough to map to database entities, events, or storage objects. Therefore, this matrix does **not** assign six months to any specific category.
3. Do not apply one universal retention period to all BEX data. Do not shorten the five-year categories in ADR-001 by interpreting the six-month direction broadly.
4. A documented legal/investigative hold may extend preservation beyond the ordinary retention period. Holds require legal basis, scope, accountable owner, review, and release records; they must not silently shorten the applicable minimum.
5. Retention start events, backup/replica expiry, purge propagation, restore behavior, and secure deletion evidence remain separate implementation gates wherever ADR-001 marks them as proposals or pending validation.

## 2. Category matrix

| Data category | Current documentary rule | Source / status | Notes and implementation gate |
|---|---|---|---|
| Messages and conversation history | Five years | ADR-001 v1.3; PO-ratified | The precise start event for the five-year clock is not ratified in ADR-001. The proposed messages.created_at timestamp is only a technical proposal and must not be encoded as normative behavior until confirmed. |
| Attachments and audio files | Five years | ADR-001 v1.3; PO-ratified | The proposed start based on the parent message timestamp remains pending PO confirmation and applicable RPGD/legal review. Deletion of a message revokes ordinary access immediately; physical purge follows the applicable retention rule. |
| Conversation metadata and call metadata | Five years | ADR-001 v1.3; PO-ratified | The exact event/start timestamp for each metadata subtype still requires specification before implementation. Calls are not automatically recorded; this row concerns metadata, not call recordings. |
| Administrative, security, and audit records | Five years | ADR-001 v1.3; PO-ratified | Includes applicable administrative/security events such as device-support authorization and operations. Audit records must exclude message bodies, attachment contents, passwords, tokens, and credentials. |
| Other data categories potentially intended for six months | Not assigned | PO direction exists; category mapping pending | The PO referred to certain data categories with an initial six-month period, but no precise category list is established in the current approved material. Do not infer that profiles, device records, sessions, drafts, temporary files, or any other specific category belongs here. Obtain an explicit category-by-category PO decision before implementation. |
| Backups and replicas | No independent period ratified here | ADR-001 v1.3; operational design pending | A proposed additional 35-day backup window is not ratified. Define maximum backup/replica expiry, restore-time reapplication of expired deletions/holds, owner, and evidence before claiming purge compliance. |

## 3. Six-month decision — clarification required

The six-month direction is retained as a valid PO input but is **not yet implementable** because its categories, exceptions, and interaction with the five-year ADR policy have not been mapped. The next requirements step is to identify each data category explicitly and record, for each one:

- the data/object category and its business purpose;
- the approved retention duration;
- the event that starts the retention clock;
- exceptions, including legal/investigative holds;
- whether the rule applies to primary storage, derived copies, backups, and replicas;
- the responsible owner and deletion/anonymization evidence.

Until that mapping is approved, the five-year ADR-001 rules remain applicable to the categories explicitly covered by ADR-001, and no six-month deletion job or schema default may be introduced for an assumed category.

## 4. Mandatory technical and governance gates

- Obtain PO clarification of the exact categories intended for six-month retention.
- Reconcile the category matrix with ADR-001, Issue #96 authorization/audit contracts, conversation and attachment data models, and any device-support audit events.
- Obtain applicable RPGD/legal/privacy validation before implementing retention and legal-hold behavior.
- Ratify category-specific start events. Proposed timestamps in ADR-001 are not approved merely because they appear in a technical draft.
- Define backup/replica maximum lifetime and restore-time purge/hold reconciliation; the proposed 35-day window is not an approved policy.
- Implement purge only through trusted, auditable server-side operations; ordinary users, collaborators, and support agents cannot alter retention metadata or legal holds.
- Test early-purge denial, hold preservation/release, primary and backup deletion, restore behavior, and evidence generation before any production release.

## 5. Non-authorization statement

This document is a documentation reconciliation only. It creates no tables, policies, RPCs, scheduled jobs, migrations, or Vercel configuration. It does not authorize SQL execution, Supabase changes, production deployment, or physical deletion of data.

## 6. Source references

- docs/architecture/ADR-001_v1.3_proposta_consolidada_SQA.md, especially sections 7.1–7.4, 12.1, 12.3, 13, and 16.
- docs/architecture/authorization-permissions-issue-96.md, including the five-year audit/retention contract and pending category-specific start events.
- docs/product/decisoes-oficiais-po.md, including the six-month initial direction pending category delimitation.
