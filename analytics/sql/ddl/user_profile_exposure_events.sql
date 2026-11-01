DECLARE analytics_project STRING DEFAULT @@project_id;
DECLARE analytics_dataset STRING DEFAULT "catch_user_analytics";
DECLARE dataset_location STRING DEFAULT "asia-south1";

EXECUTE IMMEDIATE FORMAT(
  "CREATE SCHEMA IF NOT EXISTS `%s.%s` OPTIONS(location = '%s')",
  analytics_project,
  analytics_dataset,
  dataset_location
);

EXECUTE IMMEDIATE FORMAT("""
CREATE TABLE IF NOT EXISTS `%s.%s.user_profile_exposure_events` (
  analytics_event_id STRING NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  event_date DATE NOT NULL,
  viewer_uid STRING,
  subject_uid STRING NOT NULL,
  event_id STRING,
  organizer_id STRING,
  event_name STRING NOT NULL,
  surface STRING,
  photo_id STRING,
  photo_slot INT64,
  dwell_ms INT64,
  session_hash STRING,
  platform STRING,
  ingested_at TIMESTAMP NOT NULL
)
PARTITION BY event_date
CLUSTER BY subject_uid, viewer_uid, event_id, event_name
OPTIONS(
  description = 'Raw profile exposure and photo performance events for user analytics. User-facing callables expose only aggregate safe metrics.'
)
""", analytics_project, analytics_dataset);

EXECUTE IMMEDIATE FORMAT("""
ALTER TABLE `%s.%s.user_profile_exposure_events`
ADD COLUMN IF NOT EXISTS surface STRING
""", analytics_project, analytics_dataset);

EXECUTE IMMEDIATE FORMAT("""
ALTER TABLE `%s.%s.user_profile_exposure_events`
ADD COLUMN IF NOT EXISTS dwell_ms INT64
""", analytics_project, analytics_dataset);
