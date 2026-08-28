# M07 Command Palette Heading Alignment Design

## Goal

Vertically center the heading icon and heading text inside each command-palette heading result row.

## Change

In the existing heading-result anchor, replace the cross-axis class `items-start` with `items-center`, and remove the icon's top margin class. Keep the 44px-or-larger row target, indentation, icon, text, selection state, href, and keyboard behavior unchanged.

## Scope and verification

This is a palette-only Tailwind class change. It does not change API, search data, database, grouping, focus, Staging, or Production.

Add a component assertion that the heading result uses `items-center` and the heading icon does not carry `mt-0.5`, then run the palette test, lint, and build.
