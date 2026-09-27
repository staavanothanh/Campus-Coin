CREATE TRIGGER trg_category_update_custom_owner_only
  BEFORE UPDATE ON categories
  FOR EACH ROW
  SET NEW.name_en = IF(
    OLD.user_id IS NOT NULL
      AND NEW.user_id = OLD.user_id
      AND NEW.applies_to = OLD.applies_to
      AND NEW.is_default = OLD.is_default
      AND NEW.is_default = 0,
    NEW.name_en,
    NULL
  );
