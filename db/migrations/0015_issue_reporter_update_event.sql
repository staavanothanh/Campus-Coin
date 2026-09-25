ALTER TABLE issue_events
  MODIFY kind ENUM('created', 'reporter_update', 'status_change', 'priority_change', 'note') NOT NULL;
