DECLARE analytics_project STRING DEFAULT @@project_id;
DECLARE analytics_dataset STRING DEFAULT "catch_analytics";
DECLARE dataset_location STRING DEFAULT "asia-south1";

EXECUTE IMMEDIATE FORMAT(
  "CREATE SCHEMA IF NOT EXISTS `%s.%s` OPTIONS(location = '%s')",
  analytics_project,
  analytics_dataset,
  dataset_location
);

-- One row per dated organizer fact, streamed by the organizer growth triggers.
-- Steps appear once per organizer; paid_booking and refund once per payment.
-- Count DISTINCT growth_event_id and take MIN(occurred_at) per id: streaming
-- insert ids are best-effort, and an earlier observation of a step can arrive
-- after a later one.
EXECUTE IMMEDIATE FORMAT("""
CREATE TABLE IF NOT EXISTS `%s.%s.organizer_growth_events` (
  growth_event_id STRING NOT NULL,
  organizer_id STRING NOT NULL,
  event_name STRING NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  event_date DATE NOT NULL,
  channel STRING NOT NULL,
  market_id STRING,
  nominator_role STRING,
  booking_event_id STRING,
  payment_source STRING,
  payment_id STRING,
  currency STRING,
  amount_minor INT64,
  provider_fee_minor INT64,
  provider_tax_minor INT64,
  ingested_at TIMESTAMP NOT NULL
)
PARTITION BY event_date
CLUSTER BY organizer_id, event_name
OPTIONS(
  description = 'Organizer growth facts: dated steps (listed, claim asked, claimed, first event, first paid booking), paid bookings and refunds, each with the organizer''s one acquisition channel. Firestore organizerGrowthFacts holds the steps.'
)
""", analytics_project, analytics_dataset);
