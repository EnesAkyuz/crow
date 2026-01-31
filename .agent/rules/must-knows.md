---
trigger: always_on
---

- The project uses bun, and you should also use bunx for supabase
- We have shadcn available if you want to install frontend components to quickly prototype
- bun format should be used right before your task ends so that you can resolve linter errors
- NEVER USE the type "ANY" while writing the applications
- NEVER RUN THE BROWSER OR THE BUILD OR THE DEV SERVER UNLESS I EXPLICITLY ASK.

FOR SUPABASE:

- While creating a migration, always run supabase migration new, and do not create it manually.
- In the migrations, the function search path should not be mutable, hence, you should probably put '' as the path.
- We gotta also apply the migrations.
- Do not forget to generate THE TYPES AUTOMATICALLY AND USE THOSE TYPES ALWAYS. You can use supabase gen types >> types.ts for this

FOR ENV:

- Always work on .example.env's. Do not read my environment variables.
