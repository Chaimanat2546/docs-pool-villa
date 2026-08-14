# System Requirements Document (SRD)

## Poolvilla Documentation Platform

**Version:** 1.0 (MVP baseline)  
**Date:** 10 August 2026  
**Status:** Draft for approval  
**Owner:** Poolvilla Team

## 1. Purpose

Define the functional, data, security, and operational requirements for a Poolvilla documentation platform. The platform provides public product guides and a restricted admin area for authorised staff to manage those guides.

## 2. Product Summary

The product is a Mintlify-inspired documentation website with a responsive public reader experience and an admin workspace. Documentation is organised as a hierarchy of sections and documents. Authors write content with Tiptap and can place formatted text, images, YouTube videos, tables, code blocks, and callouts anywhere in an article.

## 3. Goals and Scope

### 3.1 Goals

- Make Poolvilla guides easy to find, read, and navigate on desktop and mobile.
- Let only users with approved existing `role_id` values manage documentation.
- Reuse the existing Supabase project for authentication and database access.
- Reuse the existing Cloudflare image storage for media delivery.
- Support a safe publishing lifecycle: draft, preview, publish, archive.

### 3.2 MVP included

- Public documentation home, navigation, document view, table of contents, search, and previous/next navigation.
- Hierarchical sections (data model supports any depth; admin UI starts with two levels).
- Admin management of sections, documents, ordering, slugs, publication state, and previews.
- Tiptap editor with text, headings, lists, links, tables, code blocks, callouts, images, and YouTube embeds.
- Cloudflare image upload and display.
- Supabase authentication, role checks, and Row Level Security (RLS).

### 3.3 Not included in MVP

- Document version history and restore.
- Collaboration, commenting, review approvals, or scheduled publishing.
- Full media-library management, image deletion workflow, or unused-media cleanup.
- External search engines, analytics dashboard, multilingual content, and public API.

## 4. Users and Permissions

| Role | Public docs | Admin area | Write operations |
|---|---:|---:|---:|
| Guest | Yes, published content only | No | No |
| Authenticated user without approved role | Yes, published content only | No | No |
| Docs administrator | Yes | Yes | Yes |
| System service | N/A | N/A | Server-only integration actions |

`DOC_ADMIN_ROLE_IDS` is the configuration source for allowed `role_id` values. The exact values must be supplied from the main Poolvilla system before implementation.

## 5. Functional Requirements

### 5.1 Public documentation

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Visitors can see only published and visible documentation. | Must |
| FR-02 | The home page shows a search entry point and selected documentation sections. | Must |
| FR-03 | The sidebar shows sections and documents in configured order. | Must |
| FR-04 | A document page shows title, content, last-updated date, table of contents, and previous/next document links when available. | Must |
| FR-05 | The table of contents is generated from H2 and H3 headings in the document content. | Must |
| FR-06 | Search returns published documents matching title, excerpt, or extracted document text. | Must |
| FR-07 | Images stored in Cloudflare are rendered securely with descriptive alt text when supplied. | Must |
| FR-08 | YouTube videos embedded inside the editor content are rendered in their authored position. | Must |

### 5.2 Admin access

| ID | Requirement | Priority |
|---|---|---|
| FR-09 | Users must sign in before accessing `/admin`. | Must |
| FR-10 | The application checks an approved role before rendering admin functions. | Must |
| FR-11 | Database write access is separately enforced by Supabase RLS; a UI role check alone is not sufficient. | Must |
| FR-12 | Users without permission receive an appropriate forbidden response and cannot read drafts or archived documents through APIs. | Must |

### 5.3 Section management

| ID | Requirement | Priority |
|---|---|---|
| FR-13 | Administrators can create, rename, describe, hide/show, reorder, and delete a section. | Must |
| FR-14 | Administrators can create a child section. | Must |
| FR-15 | The database supports recursive section nesting using `parent_id`; the MVP UI limits management to two visible levels. | Must |
| FR-16 | A section cannot be deleted while it has child sections or documents, unless content is moved or explicitly removed first. | Must |

### 5.4 Document management

| ID | Requirement | Priority |
|---|---|---|
| FR-17 | Administrators can create, edit, preview, publish, return to draft, archive, reorder, move, and delete documents. | Must |
| FR-18 | A document has one of three states: `draft`, `published`, or `archived`. | Must |
| FR-19 | Publishing records `published_at`; moving away from published must prevent public access immediately. | Must |
| FR-20 | Each document has a title, section, URL slug, optional excerpt, editor content, and sort order. | Must |
| FR-21 | The system validates the document slug and prevents duplicate public routes. | Must |
| FR-22 | Preview is available only to authorised administrators and must render the same document style as the public viewer. | Must |

### 5.5 Editor and media

| ID | Requirement | Priority |
|---|---|---|
| FR-23 | The editor stores the document body as valid Tiptap JSON. | Must |
| FR-24 | The editor supports headings, paragraph, bold, italic, underline, bullet/numbered list, link, table, code block, quote, divider, callout, image, and YouTube blocks. | Must |
| FR-25 | A toolbar and slash-command menu expose supported blocks. | Should |
| FR-26 | The editor and read-only viewer use the same node styling, except for editing controls. | Must |
| FR-27 | Image upload is performed through a server endpoint that validates authorisation and returns a Cloudflare URL or image identifier. | Must |
| FR-28 | The system validates YouTube URLs and stores them as a Tiptap node; multiple videos may be inserted in any position. | Must |

## 6. Information Architecture and Routes

| Area | Route | Purpose |
|---|---|---|
| Public home | `/` | Search entry point and documentation discovery |
| Public search | `/search` | Search published documentation |
| Public document | `/[...slug]` | Render a document by its hierarchical route |
| Admin overview | `/admin` | Simple document status and recently updated view |
| Documents | `/admin/documents` | Filter, search, and manage documents |
| New document | `/admin/documents/new` | Create a document |
| Edit document | `/admin/documents/[id]/edit` | Edit, preview, and publish a document |
| Structure | `/admin/structure` | Manage section tree and ordering |

## 7. Data Requirements

### 7.1 `doc_sections`

| Field | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| parent_id | UUID, nullable | References `doc_sections.id`; null for a top-level section |
| name | text | Required |
| slug | text | Required; route-safe |
| sort_order | integer | Required; determines sibling order |
| is_published | boolean | Required; controls public navigation visibility |
| created_by / updated_by | UUID | Existing authenticated user id |
| created_at / updated_at | timestamptz | Server-managed timestamps |

### 7.2 `documents`

| Field | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| section_id | UUID | References `doc_sections.id` |
| title | text | Required |
| slug | text | Required; unique across the resolved public route |
| excerpt | text, nullable | Optional search/result summary |
| content | JSONB | Required Tiptap JSON |
| search_text | text | Derived plain text for search |
| status | text/enum | `draft`, `published`, or `archived` |
| sort_order | integer | Required; determines document order within a section |
| created_by / updated_by | UUID | Existing authenticated user id |
| published_at | timestamptz, nullable | Set when published |
| created_at / updated_at | timestamptz | Server-managed timestamps |

## 8. Business Rules

- Only a published document in a published/visible ancestor path is publicly accessible.
- Direct access to a draft or archived route must return not found or forbidden without exposing its content.
- Sections and documents must have deterministic sibling ordering using `sort_order`.
- A route slug must be lowercase, URL-safe, and non-empty. Thai titles may use a transliterated or manually supplied slug.
- Content must be validated against the supported Tiptap schema before storage or rendering.
- HTML from untrusted sources must not be rendered directly; Tiptap node attributes and links must be sanitised.
- Images are stored outside Supabase. The document JSON stores only the Cloudflare delivery URL/identifier and alt text.
- The Cloudflare credential used for uploads is server-side only and never delivered to the browser.

## 9. Security Requirements

- Enable RLS on all new public tables exposed through Supabase Data API.
- Public `SELECT` policy permits only published documents and visible section paths.
- Insert, update, delete, and non-public reads require an authenticated user whose existing profile/user record has a role in `DOC_ADMIN_ROLE_IDS`.
- The role lookup used in policies must be stable, security-definer only where required, and must not permit a user to assign their own role.
- Never expose Supabase service-role credentials or Cloudflare upload credentials in client code.
- Protect admin routes on the server, then mirror the same authorisation rules in RLS.
- Validate upload file type, size, dimensions where relevant, filename handling, and allowed source origin for embeds.
- Log meaningful administrative mutations with actor id and timestamps at minimum; a full audit-history table is a future enhancement.

## 10. Search Requirements

- MVP search uses PostgreSQL full-text search over `title`, `excerpt`, and `search_text`.
- `search_text` is extracted from Tiptap JSON whenever a document is saved or published.
- Search returns only published documents that are publicly visible.
- Result items show title, excerpt or matched summary, and hierarchy path.
- Search must not query JSONB directly as its primary mechanism.

## 11. Non-functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | Public pages must be responsive for mobile, tablet, and desktop. |
| NFR-02 | Public document URLs must be shareable, stable, and SEO-friendly. |
| NFR-03 | The UI must support Thai text correctly, including headings, search, and slugs selected by administrators. |
| NFR-04 | Reader pages should be server-rendered or statically regenerated where compatible with the deployment model. |
| NFR-05 | Images should use Cloudflare optimisation/delivery capabilities where the existing storage configuration supports them. |
| NFR-06 | Admin errors and failed uploads must present actionable messages without exposing credentials or internal details. |
| NFR-07 | The design must meet baseline accessibility: semantic headings, keyboard navigation, focus states, labelled controls, and meaningful image alt text. |

## 12. Acceptance Criteria for MVP

1. A guest can navigate and search only published guides.
2. A user without an approved role cannot access the admin UI or mutate records through Supabase.
3. An approved administrator can create a draft, add text, image, callout, and multiple YouTube embeds, preview it, then publish it.
4. The published page displays the same content order and styling as the preview/editor viewer.
5. Administrators can add a parent section, child section, and documents, then reorder them; the public sidebar follows that order.
6. Draft and archived documents do not appear in public navigation, search, or direct public requests.
7. An uploaded image is stored through the existing Cloudflare image service and its returned URL is saved in document JSON.
8. Search finds a published document by words in its title, excerpt, or body text.

## 13. Open Decisions Before Implementation

| Decision | Needed answer | Impact |
|---|---|---|
| Admin roles | Which existing `role_id` values are documentation administrators? | RLS policies and route guards |
| User table | Which table/view owns `role_id` and how is it linked to `auth.users`? | RLS implementation |
| Cloudflare storage type | Is the existing service Cloudflare Images, R2, or a custom upload API? | Upload endpoint and delivery URLs |
| Public host | Confirm production domain/subdomain, e.g. `docs.poolvilla.co.th`. | Routing, cookies, SEO |
| Slug rule | Should routes be globally unique or unique only within a section path? | Constraints and route lookup |
| Deletion policy | Hard delete, soft delete, or archive-only for documents? | Data retention and UI |
| Search language | Confirm Thai word-segmentation expectations. | PostgreSQL search configuration |

## 14. Recommended Delivery Order

1. Confirm open decisions, data ownership, and role mapping.
2. Create migrations, constraints, indexes, and RLS policies.
3. Build authentication helpers, admin route guard, and section/document server actions.
4. Build public viewer, hierarchy navigation, and search.
5. Build Tiptap editor, validation, preview, and Cloudflare upload integration.
6. Build admin document/structure screens and ordering.
7. Test authorisation, public visibility, media upload, and all MVP acceptance criteria.
