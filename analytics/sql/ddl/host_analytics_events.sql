DECLARE analytics_project STRING DEFAULT @@project_id;
DECLARE analytics_dataset STRING DEFAULT "catch_analytics";
DECLARE dataset_location STRING DEFAULT "asia-south1";

EXECUTE IMMEDIATE FORMAT(
  "CREATE SCHEMA IF NOT EXISTS `%s.%s` OPTIONS(location = '%s')",
  analytics_project,
  analytics_dataset,
  dataset_location
);

EXECUTE IMMEDIATE FORMAT("""
CREATE TABLE IF NOT EXISTS `%s.%s.host_analytics_events` (
  analytics_event_id STRING NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  event_date DATE NOT NULL,
  event_name STRING NOT NULL,
  organizer_id STRING NOT NULL,
  target_event_id STRING,
  page_path STRING NOT NULL,
  source STRING,
  session_hash STRING,
  platform STRING,
  link_id STRING,
  traffic_source STRING,
  ingested_at TIMESTAMP NOT NULL
)
PARTITION BY event_date
CLUSTER BY organizer_id, target_event_id, event_name
OPTIONS(
  description = 'Aggregate-safe host discovery event stream. Firestore is not the source of truth for these counters.'
)
""", analytics_project, analytics_dataset);

-- Owner link clicks (CAT-254): the link a linkClick opened and the fixed-list
-- traffic source the page mapped from its referrer or ?via=.
EXECUTE IMMEDIATE FORMAT("""
ALTER TABLE `%s.%s.host_analytics_events`
ADD COLUMN IF NOT EXISTS link_id STRING
""", analytics_project, analytics_dataset);

EXECUTE IMMEDIATE FORMAT("""
ALTER TABLE `%s.%s.host_analytics_events`
ADD COLUMN IF NOT EXISTS traffic_source STRING
""", analytics_project, analytics_dataset);
