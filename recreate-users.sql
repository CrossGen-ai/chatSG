-- Recreate users in PostgreSQL database

-- Insert Test User
INSERT INTO users (azure_id, email, name, groups, last_login, created_at, updated_at)
VALUES (
    'test-azure-id',
    'test@example.com',
    'Test User',
    ARRAY['basic'],
    NULL,
    '2025-07-08 17:51:51.092058+00',
    '2025-07-08 20:24:46.467583+00'
)
ON CONFLICT (azure_id) DO NOTHING;

-- Insert Development User
INSERT INTO users (azure_id, email, name, groups, last_login, created_at, updated_at)
VALUES (
    'mock-azure-id',
    'dev@example.com',
    'Development User',
    ARRAY['admin'],
    '2025-07-10 23:35:18.406745+00',
    '2025-07-08 02:21:50.807812+00',
    '2025-07-10 23:35:18.406745+00'
)
ON CONFLICT (azure_id) DO NOTHING;