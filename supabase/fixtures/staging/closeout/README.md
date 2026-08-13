# M01–M06 close-out fixtures

Run order: `inspect.sql` → `setup.sql` → M01–M06 verification → R2/document lifecycle cleanup → `cleanup.sql` → `inspect.sql`.

Targets use deterministic IDs:

- Sections: `fa100000-0000-4000-8000-000000000001` through `...0003`
- Documents: `fa200000-0000-4000-8000-000000000001` through `...0007`

`cleanup.sql` aborts if target Media, lifecycle operations or cleanup records remain. Resolve those through the App/Worker first. It never deletes Auth users, `public.users`, `public.roles` or rows outside the exact ID arrays.
