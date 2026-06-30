# SaintAcademia

A starter PHP + MySQL + React project for a Cameroonian secondary school management system.

## Structure
- public/ - entrypoint and rewrite rules
- api/ - PHP controllers, middleware, config, routes
- frontend/ - React frontend shell
- database/ - SQL schema and setup scripts

## Quick start
1. Start Apache and MySQL in XAMPP.
2. Create a database named `saint_academia`.
3. Import [database/schema.sql](database/schema.sql).
4. Copy [.env.example](.env.example) to `.env` and update values.
5. Serve the project from the project root with XAMPP.
6. In the frontend folder, run `npm install` and `npm run dev`.
