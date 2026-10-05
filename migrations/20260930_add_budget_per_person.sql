-- Apply once before starting the updated API when DB_SYNCHRONIZE=false.
ALTER TABLE sessions ADD COLUMN budget_per_person INT UNSIGNED NULL;
