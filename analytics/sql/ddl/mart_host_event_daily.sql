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
CREATE TABLE IF NOT EXISTS `%s.%s.mart_host_event_daily` (
  date DATE NOT NULL,
  club_id STRING NOT NULL,
  club_name STRING,
  event_id STRING,
  event_title STRING,
  event_start_time TIMESTAMP,
  event_status STRING,
  capacity_limit INT64,
  booked_count INT64,
  checked_in_count INT64,
  waitlisted_count INT64,
  gross_revenue_minor INT64,
  currency STRING,
  checkout_started_count INT64,
  checkout_dropoff_count INT64,
  payment_completed_count INT64,
  payment_failed_count INT64,
  payment_refunded_count INT64,
  review_count INT64,
  rating_total FLOAT64,
  verified_review_count INT64,
  public_review_count INT64,
  owner_response_count INT64,
  demand_count INT64,
  invite_open_count INT64,
  mutual_match_count INT64,
  chat_started_count INT64,
  repeat_attendee_count INT64,
  listing_views INT64,
  search_appearances INT64,
  event_views INT64,
  organizer_saves INT64,
  event_saves INT64,
  contact_clicks INT64,
  claim_clicks INT64,
  outbound_clicks INT64,
  outbound_booking_clicks INT64,
  link_clicks INT64,
  refreshed_at TIMESTAMP NOT NULL
)
PARTITION BY date
CLUSTER BY club_id, event_id
OPTIONS(
  description = 'Host/admin analytics mart at daily club/event grain, derived from BigQuery exports and raw host analytics events.'
)
""", analytics_project, analytics_dataset);

EXECUTE IMMEDIATE FORMAT("""
ALTER TABLE `%s.%s.mart_host_event_daily`
ADD COLUMN IF NOT EXISTS checkout_started_count INT64
""", analytics_project, analytics_dataset);

EXECUTE IMMEDIATE FORMAT("""
ALTER TABLE `%s.%s.mart_host_event_daily`
ADD COLUMN IF NOT EXISTS checkout_dropoff_count INT64
""", analytics_project, analytics_dataset);

EXECUTE IMMEDIATE FORMAT("""
ALTER TABLE `%s.%s.mart_host_event_daily`
ADD COLUMN IF NOT EXISTS outbound_booking_clicks INT64
""", analytics_project, analytics_dataset);

EXECUTE IMMEDIATE FORMAT("""
ALTER TABLE `%s.%s.mart_host_event_daily`
ADD COLUMN IF NOT EXISTS link_clicks INT64
""", analytics_project, analytics_dataset);

-- Owner link clicks per organizer, link and traffic source (CAT-254), for the
-- per-link roll-up the event-grain mart cannot hold.
EXECUTE IMMEDIATE FORMAT("""
CREATE TABLE IF NOT EXISTS `%s.%s.mart_host_link_daily` (
  date DATE NOT NULL,
  club_id STRING NOT NULL,
  link_id STRING NOT NULL,
  traffic_source STRING NOT NULL,
  link_clicks INT64 NOT NULL,
  refreshed_at TIMESTAMP NOT NULL
)
PARTITION BY date
CLUSTER BY club_id, link_id
OPTIONS(
  description = 'Owner link clicks at daily organizer/link/traffic-source grain, derived from host_analytics_events.'
)
""", analytics_project, analytics_dataset);
