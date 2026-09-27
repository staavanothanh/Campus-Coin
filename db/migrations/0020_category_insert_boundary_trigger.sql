CREATE TRIGGER trg_category_insert_custom_owner_only
  BEFORE INSERT ON categories
  FOR EACH ROW
  SET
    NEW.user_id = (
      SELECT CASE WHEN i.user_id = NEW.user_id AND i.scope = 'category.create' THEN NEW.user_id ELSE NULL END
      FROM mutation_idempotency AS i
      WHERE i.id = NEW.idempotency_id
    ),
    NEW.name_en = IF(
      (NEW.user_id IS NOT NULL AND NEW.is_default = 0)
        OR SUBSTRING_INDEX(USER(), '@', 1) = 'cc_migrate',
      NEW.name_en,
      NULL
    );
