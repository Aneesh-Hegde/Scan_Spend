-- Tables and Columns
SELECT 'TABLE: ' || t.table_name || ' | COLUMN: ' || c.column_name || ' | TYPE: ' || c.data_type || ' | NULL: ' || c.is_nullable || ' | DEFAULT: ' || COALESCE(c.column_default, 'NULL') as structure
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- Foreign Keys
SELECT 'FK: ' || tc.table_name || '.' || kcu.column_name || ' -> ' || ccu.table_name || '.' || ccu.column_name as relationships
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Functions
SELECT 'FUNCTION: ' || routine_name || ' | TYPE: ' || routine_type || ' | DEFINITION: ' || COALESCE(LEFT(routine_definition, 200), 'N/A') as functions
FROM information_schema.routines
WHERE routine_schema = 'public';

-- Triggers
SELECT 'TRIGGER: ' || trigger_name || ' | TABLE: ' || event_object_table || ' | EVENT: ' || event_manipulation as triggers
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Indexes
SELECT 'INDEX: ' || indexname || ' | TABLE: ' || tablename || ' | DEFINITION: ' || indexdef as indexes
FROM pg_indexes
WHERE schemaname = 'public';
