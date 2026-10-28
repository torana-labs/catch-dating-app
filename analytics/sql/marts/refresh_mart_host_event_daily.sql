DECLARE analytics_project STRING DEFAULT @@project_id;
DECLARE analytics_dataset STRING DEFAULT "catch_analytics";
DECLARE marketplace_dataset STRING DEFAULT "catch_marketplace_metrics";
DECLARE ga4_dataset STRING DEFAULT "analytics_526484083";
DECLARE refresh_start DATE DEFAULT DATE_SUB(CURRENT_DATE("Asia/Kolkata"), INTERVAL 400 DAY);
DECLARE refresh_end DATE DEFAULT CURRENT_DATE("Asia/Kolkata");
DECLARE ga4_dataset_exists BOOL DEFAULT FALSE;
DECLARE ga4_events_exist BOOL DEFAULT FALSE;

-- The warehouse keeps club_id as a physical compatibility column. Canonical
-- Firestore organizerId wins; only historical rows need the clubId fallback.
CREATE TEMP FUNCTION organizer_id(data STRING) AS (
  COALESCE(
    NULLIF(JSON_VALUE(data, '$.organizerId'), ''),
    NULLIF(JSON_VALUE(data, '$.clubId'), '')
  )
);

CREATE TEMP TABLE ga4_host_analytics_events (
  event_date DATE NOT NULL,
  event_name STRING NOT NULL,
  club_id STRING NOT NULL,
  target_event_id STRING
);

EXECUTE IMMEDIATE FORMAT("""
SELECT COUNT(*) > 0
FROM `%s.region-asia-south1.INFORMATION_SCHEMA.SCHEMATA`
WHERE schema_name = @ga4_dataset
""", analytics_project)
INTO ga4_dataset_exists
USING ga4_dataset AS ga4_dataset;

IF ga4_dataset_exists THEN
  EXECUTE IMMEDIATE FORMAT("""
  SELECT COUNT(*) > 0
  FROM `%s.%s.INFORMATION_SCHEMA.TABLES`
  WHERE STARTS_WITH(table_name, 'events_')
  """, analytics_project, ga4_dataset)
  INTO ga4_events_exist;
END IF;

IF ga4_events_exist THEN
  EXECUTE IMMEDIATE FORMAT("""
  INSERT INTO ga4_host_analytics_events (
    event_date,
    event_name,
    club_id,
    target_event_id
  )
  SELECT
    event_date,
    event_name,
    club_id,
    target_event_id
  FROM (
    SELECT
      PARSE_DATE('%%Y%%m%%d', event_date) AS event_date,
      CASE event_name
        WHEN 'organizer_listingView' THEN 'listingView'
        WHEN 'organizer_searchAppearance' THEN 'searchAppearance'
        WHEN 'organizer_eventView' THEN 'eventView'
        WHEN 'organizer_organizerSave' THEN 'organizerSave'
        WHEN 'organizer_eventSave' THEN 'eventSave'
        WHEN 'organizer_contactClick' THEN 'contactClick'
        WHEN 'organizer_claimClick' THEN 'claimClick'
        WHEN 'organizer_outboundClick' THEN 'outboundClick'
      END AS event_name,
      NULLIF((
        SELECT COALESCE(
          value.string_value,
          CAST(value.int_value AS STRING),
          CAST(value.float_value AS STRING),
          CAST(value.double_value AS STRING)
        )
        FROM UNNEST(event_params)
        WHERE key IN ('organizer_id', 'club_id')
          AND NULLIF(COALESCE(
            value.string_value,
            CAST(value.int_value AS STRING),
            CAST(value.float_value AS STRING),
            CAST(value.double_value AS STRING)
          ), '') IS NOT NULL
        ORDER BY IF(key = 'organizer_id', 0, 1)
        LIMIT 1
      ), '') AS club_id,
      NULLIF((
        SELECT COALESCE(
          value.string_value,
          CAST(value.int_value AS STRING),
          CAST(value.float_value AS STRING),
          CAST(value.double_value AS STRING)
        )
        FROM UNNEST(event_params)
        WHERE key = 'event_id'
        LIMIT 1
      ), '') AS target_event_id
    FROM `%s.%s.events_*`
    WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%%Y%%m%%d', @refresh_start)
      AND FORMAT_DATE('%%Y%%m%%d', @refresh_end)
      AND event_name IN (
        'organizer_listingView',
        'organizer_searchAppearance',
        'organizer_eventView',
        'organizer_organizerSave',
        'organizer_eventSave',
        'organizer_contactClick',
        'organizer_claimClick',
        'organizer_outboundClick'
      )
  )
  WHERE club_id IS NOT NULL AND event_name IS NOT NULL
  """, analytics_project, ga4_dataset)
  USING refresh_start AS refresh_start, refresh_end AS refresh_end;
END IF;

EXECUTE IMMEDIATE FORMAT("""
CREATE TEMP TABLE refreshed_host_event_daily AS
WITH
clubs AS (
  SELECT
    document_id AS club_id,
    JSON_VALUE(data, '$.name') AS club_name
  FROM (
    -- One dimension row per ID: canonical state wins, while retained legacy
    -- names still describe historical IDs absent from the canonical export.
    SELECT document_id, data, 0 AS source_priority
    FROM `%s.%s.organizers_raw_latest`
    UNION ALL
    SELECT document_id, data, 1 AS source_priority
    FROM `%s.%s.clubs_raw_latest`
  )
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY document_id ORDER BY source_priority
  ) = 1
),
events AS (
  SELECT
    document_id AS event_id,
    organizer_id(data) AS club_id,
    COALESCE(
      NULLIF(JSON_VALUE(data, '$.eventFormat.customActivityLabel'), ''),
      NULLIF(JSON_VALUE(data, '$.eventFormat.activityKind'), ''),
      'Event'
    ) AS event_title_base,
    TIMESTAMP_MICROS(
      SAFE_CAST(JSON_VALUE(data, '$.startTime._seconds') AS INT64) * 1000000 +
      DIV(COALESCE(SAFE_CAST(JSON_VALUE(data, '$.startTime._nanoseconds') AS INT64), 0), 1000)
    ) AS event_start_time,
    JSON_VALUE(data, '$.status') AS event_status,
    COALESCE(SAFE_CAST(JSON_VALUE(data, '$.capacityLimit') AS INT64), 0) AS capacity_limit,
    COALESCE(SAFE_CAST(JSON_VALUE(data, '$.bookedCount') AS INT64), 0) AS booked_count,
    COALESCE(SAFE_CAST(JSON_VALUE(data, '$.checkedInCount') AS INT64), 0) AS checked_in_count,
    COALESCE(SAFE_CAST(JSON_VALUE(data, '$.waitlistedCount') AS INT64), 0) AS waitlisted_count,
    COALESCE(NULLIF(JSON_VALUE(data, '$.currency'), ''), 'INR') AS currency
  FROM `%s.%s.events_raw_latest`
  WHERE organizer_id(data) IS NOT NULL
),
event_dim AS (
  SELECT
    e.event_id,
    e.club_id,
    c.club_name,
    CONCAT(e.event_title_base, ' · ', CAST(DATE(e.event_start_time, "Asia/Kolkata") AS STRING)) AS event_title,
    e.event_start_time,
    e.event_status,
    e.capacity_limit,
    e.booked_count,
    e.checked_in_count,
    e.waitlisted_count,
    e.currency,
    DATE(e.event_start_time, "Asia/Kolkata") AS event_date
  FROM events e
  LEFT JOIN clubs c USING (club_id)
  WHERE DATE(e.event_start_time, "Asia/Kolkata") BETWEEN @refresh_start AND @refresh_end
),
participations AS (
  SELECT
    JSON_VALUE(data, '$.eventId') AS event_id,
    COUNTIF(JSON_VALUE(data, '$.status') IN ('signedUp', 'attended')) AS booked_count,
    COUNTIF(JSON_VALUE(data, '$.status') = 'attended') AS checked_in_count,
    COUNTIF(JSON_VALUE(data, '$.status') = 'waitlisted') AS waitlisted_count,
    COUNTIF(JSON_VALUE(data, '$.status') IN ('signedUp', 'attended', 'waitlisted')) AS demand_count
  FROM `%s.%s.event_participations_raw_latest`
  WHERE JSON_VALUE(data, '$.eventId') IS NOT NULL
  GROUP BY event_id
),
invite_links AS (
  SELECT
    JSON_VALUE(data, '$.eventId') AS event_id,
    SUM(COALESCE(SAFE_CAST(JSON_VALUE(data, '$.openCount') AS INT64), 0)) AS invite_open_count
  FROM `%s.%s.event_invite_links_raw_latest`
  WHERE JSON_VALUE(data, '$.eventId') IS NOT NULL
  GROUP BY event_id
),
payments AS (
  SELECT
    JSON_VALUE(data, '$.eventId') AS event_id,
    COUNT(*) AS checkout_started_count,
    COUNTIF(JSON_VALUE(data, '$.status') IN ('pending', 'failed')) AS checkout_dropoff_count,
    COUNTIF(JSON_VALUE(data, '$.status') = 'completed') AS payment_completed_count,
    COUNTIF(JSON_VALUE(data, '$.status') IN ('failed', 'refundFailed')) AS payment_failed_count,
    COUNTIF(JSON_VALUE(data, '$.status') = 'refunded') AS payment_refunded_count,
    SUM(IF(
      JSON_VALUE(data, '$.status') = 'completed',
      COALESCE(
        SAFE_CAST(JSON_VALUE(data, '$.amountMinor') AS INT64),
        SAFE_CAST(JSON_VALUE(data, '$.amount') AS INT64),
        0
      ),
      0
    )) AS gross_revenue_minor
  FROM `%s.%s.payments_raw_latest`
  WHERE JSON_VALUE(data, '$.eventId') IS NOT NULL
  GROUP BY event_id
),
reviews AS (
  SELECT
    organizer_id(data) AS club_id,
    JSON_VALUE(data, '$.eventId') AS event_id,
    DATE(TIMESTAMP_MICROS(
      SAFE_CAST(JSON_VALUE(data, '$.createdAt._seconds') AS INT64) * 1000000 +
      DIV(COALESCE(SAFE_CAST(JSON_VALUE(data, '$.createdAt._nanoseconds') AS INT64), 0), 1000)
    ), "Asia/Kolkata") AS review_date,
    COUNTIF(COALESCE(JSON_VALUE(data, '$.moderationStatus'), 'published') = 'published') AS review_count,
    SUM(IF(
      COALESCE(JSON_VALUE(data, '$.moderationStatus'), 'published') = 'published',
      COALESCE(SAFE_CAST(JSON_VALUE(data, '$.rating') AS FLOAT64), 0),
      0
    )) AS rating_total,
    COUNTIF(
      COALESCE(JSON_VALUE(data, '$.moderationStatus'), 'published') = 'published' AND
      COALESCE(JSON_VALUE(data, '$.verificationStatus'), 'unverified') = 'verified'
    ) AS verified_review_count,
    COUNTIF(COALESCE(JSON_VALUE(data, '$.source'), 'catchEvent') = 'publicListing') AS public_review_count,
    COUNTIF(JSON_QUERY(data, '$.ownerResponse') IS NOT NULL) AS owner_response_count
  FROM `%s.%s.reviews_raw_latest`
  WHERE organizer_id(data) IS NOT NULL
  GROUP BY club_id, event_id, review_date
),
saved_events AS (
  SELECT
    JSON_VALUE(data, '$.eventId') AS event_id,
    DATE(TIMESTAMP_MICROS(
      SAFE_CAST(JSON_VALUE(data, '$.savedAt._seconds') AS INT64) * 1000000 +
      DIV(COALESCE(SAFE_CAST(JSON_VALUE(data, '$.savedAt._nanoseconds') AS INT64), 0), 1000)
    ), "Asia/Kolkata") AS saved_date,
    COUNT(*) AS event_saves
  FROM `%s.%s.saved_events_raw_latest`
  WHERE JSON_VALUE(data, '$.eventId') IS NOT NULL
  GROUP BY event_id, saved_date
),
scorecards AS (
  SELECT
    document_id AS event_id,
    COALESCE(SAFE_CAST(JSON_VALUE(data, '$.funnel.totalDemandCount') AS INT64), 0) AS total_demand_count,
    COALESCE(SAFE_CAST(JSON_VALUE(data, '$.funnel.inviteOpenCount') AS INT64), 0) AS invite_open_count,
    COALESCE(SAFE_CAST(JSON_VALUE(data, '$.funnel.mutualMatchCount') AS INT64), 0) AS mutual_match_count,
    COALESCE(SAFE_CAST(JSON_VALUE(data, '$.funnel.chatStartedCount') AS INT64), 0) AS chat_started_count,
    COALESCE(SAFE_CAST(JSON_VALUE(data, '$.funnel.repeatAttendeeCount') AS INT64), 0) AS repeat_attendee_count
  FROM `%s.%s.event_success_scorecards_raw_latest`
),
event_rows AS (
  SELECT
    ed.event_date AS date,
    ed.club_id,
    ed.club_name,
    ed.event_id,
    ed.event_title,
    ed.event_start_time,
    ed.event_status,
    ed.capacity_limit,
    COALESCE(pf.booked_count, ed.booked_count) AS booked_count,
    COALESCE(pf.checked_in_count, ed.checked_in_count) AS checked_in_count,
    COALESCE(pf.waitlisted_count, ed.waitlisted_count) AS waitlisted_count,
    COALESCE(p.gross_revenue_minor, 0) AS gross_revenue_minor,
    ed.currency,
    COALESCE(p.checkout_started_count, 0) AS checkout_started_count,
    COALESCE(p.checkout_dropoff_count, 0) AS checkout_dropoff_count,
    COALESCE(p.payment_completed_count, 0) AS payment_completed_count,
    COALESCE(p.payment_failed_count, 0) AS payment_failed_count,
    COALESCE(p.payment_refunded_count, 0) AS payment_refunded_count,
    0 AS review_count,
    0.0 AS rating_total,
    0 AS verified_review_count,
    0 AS public_review_count,
    0 AS owner_response_count,
    COALESCE(
      s.total_demand_count,
      pf.demand_count,
      ed.booked_count + ed.waitlisted_count
    ) AS demand_count,
    COALESCE(s.invite_open_count, il.invite_open_count, 0) AS invite_open_count,
    COALESCE(s.mutual_match_count, 0) AS mutual_match_count,
    COALESCE(s.chat_started_count, 0) AS chat_started_count,
    COALESCE(s.repeat_attendee_count, 0) AS repeat_attendee_count,
    0 AS listing_views,
    0 AS search_appearances,
    0 AS event_views,
    0 AS organizer_saves,
    0 AS event_saves,
    0 AS contact_clicks,
    0 AS claim_clicks,
    0 AS outbound_clicks,
    0 AS outbound_booking_clicks,
    0 AS link_clicks
  FROM event_dim ed
  LEFT JOIN payments p USING (event_id)
  LEFT JOIN participations pf USING (event_id)
  LEFT JOIN invite_links il USING (event_id)
  LEFT JOIN scorecards s USING (event_id)
),
review_rows AS (
  SELECT
    r.review_date AS date,
    r.club_id,
    c.club_name,
    r.event_id,
    ed.event_title,
    ed.event_start_time,
    ed.event_status,
    0 AS capacity_limit,
    0 AS booked_count,
    0 AS checked_in_count,
    0 AS waitlisted_count,
    0 AS gross_revenue_minor,
    COALESCE(ed.currency, 'INR') AS currency,
    0 AS checkout_started_count,
    0 AS checkout_dropoff_count,
    0 AS payment_completed_count,
    0 AS payment_failed_count,
    0 AS payment_refunded_count,
    r.review_count,
    r.rating_total,
    r.verified_review_count,
    r.public_review_count,
    r.owner_response_count,
    0 AS demand_count,
    0 AS invite_open_count,
    0 AS mutual_match_count,
    0 AS chat_started_count,
    0 AS repeat_attendee_count,
    0 AS listing_views,
    0 AS search_appearances,
    0 AS event_views,
    0 AS organizer_saves,
    0 AS event_saves,
    0 AS contact_clicks,
    0 AS claim_clicks,
    0 AS outbound_clicks,
    0 AS outbound_booking_clicks,
    0 AS link_clicks
  FROM reviews r
  LEFT JOIN event_dim ed ON ed.event_id = r.event_id
  LEFT JOIN clubs c ON c.club_id = r.club_id
  WHERE r.review_date BETWEEN @refresh_start AND @refresh_end
),
saved_event_rows AS (
  SELECT
    se.saved_date AS date,
    ed.club_id,
    ed.club_name,
    se.event_id,
    ed.event_title,
    ed.event_start_time,
    ed.event_status,
    0 AS capacity_limit,
    0 AS booked_count,
    0 AS checked_in_count,
    0 AS waitlisted_count,
    0 AS gross_revenue_minor,
    COALESCE(ed.currency, 'INR') AS currency,
    0 AS checkout_started_count,
    0 AS checkout_dropoff_count,
    0 AS payment_completed_count,
    0 AS payment_failed_count,
    0 AS payment_refunded_count,
    0 AS review_count,
    0.0 AS rating_total,
    0 AS verified_review_count,
    0 AS public_review_count,
    0 AS owner_response_count,
    0 AS demand_count,
    0 AS invite_open_count,
    0 AS mutual_match_count,
    0 AS chat_started_count,
    0 AS repeat_attendee_count,
    0 AS listing_views,
    0 AS search_appearances,
    0 AS event_views,
    0 AS organizer_saves,
    se.event_saves,
    0 AS contact_clicks,
    0 AS claim_clicks,
    0 AS outbound_clicks,
    0 AS outbound_booking_clicks,
    0 AS link_clicks
  FROM saved_events se
  JOIN event_dim ed USING (event_id)
  WHERE se.saved_date BETWEEN @refresh_start AND @refresh_end
),
direct_discovery_counts AS (
  SELECT
    event_date AS date,
    club_id,
    COALESCE(target_event_id, '') AS event_key,
    event_name,
    COUNT(DISTINCT analytics_event_id) AS event_count,
    COUNT(DISTINCT IF(event_name = 'outboundClick' AND
      source IN ('external_event_card', 'external_event_booking'),
      analytics_event_id, NULL)) AS outbound_booking_clicks
  FROM `%s.%s.host_analytics_events`
  WHERE event_date BETWEEN @refresh_start AND @refresh_end
  GROUP BY date, club_id, event_key, event_name
),
ga4_discovery_counts AS (
  SELECT
    event_date AS date,
    club_id,
    COALESCE(target_event_id, '') AS event_key,
    event_name,
    COUNT(*) AS event_count
  FROM ga4_host_analytics_events
  WHERE event_date BETWEEN @refresh_start AND @refresh_end
  GROUP BY date, club_id, event_key, event_name
),
behavior_counts AS (
  -- First-party measurements are independent of optional ad-provider events.
  -- GA4 remains available for historical diagnostics, never a counter fallback.
  SELECT date, club_id, NULLIF(event_key, '') AS event_id, event_name,
    event_count, outbound_booking_clicks
  FROM direct_discovery_counts
),
discovery_rows AS (
  SELECT
    date,
    club_id,
    CAST(NULL AS STRING) AS club_name,
    event_id,
    CAST(NULL AS STRING) AS event_title,
    CAST(NULL AS TIMESTAMP) AS event_start_time,
    CAST(NULL AS STRING) AS event_status,
    0 AS capacity_limit,
    0 AS booked_count,
    0 AS checked_in_count,
    0 AS waitlisted_count,
    0 AS gross_revenue_minor,
    'INR' AS currency,
    0 AS checkout_started_count,
    0 AS checkout_dropoff_count,
    0 AS payment_completed_count,
    0 AS payment_failed_count,
    0 AS payment_refunded_count,
    0 AS review_count,
    0.0 AS rating_total,
    0 AS verified_review_count,
    0 AS public_review_count,
    0 AS owner_response_count,
    0 AS demand_count,
    0 AS invite_open_count,
    0 AS mutual_match_count,
    0 AS chat_started_count,
    0 AS repeat_attendee_count,
    SUM(IF(event_name = 'listingView', event_count, 0)) AS listing_views,
    SUM(IF(event_name = 'searchAppearance', event_count, 0)) AS search_appearances,
    SUM(IF(event_name = 'eventView', event_count, 0)) AS event_views,
    SUM(IF(event_name = 'organizerSave', event_count, 0)) AS organizer_saves,
    SUM(IF(event_name = 'eventSave', event_count, 0)) AS event_saves,
    SUM(IF(event_name = 'contactClick', event_count, 0)) AS contact_clicks,
    SUM(IF(event_name = 'claimClick', event_count, 0)) AS claim_clicks,
    SUM(IF(event_name = 'outboundClick', event_count, 0)) AS outbound_clicks,
    SUM(outbound_booking_clicks) AS outbound_booking_clicks,
    SUM(IF(event_name = 'linkClick', event_count, 0)) AS link_clicks
  FROM behavior_counts
  GROUP BY date, club_id, event_id
),
unioned AS (
  SELECT * FROM event_rows
  UNION ALL SELECT * FROM review_rows
  UNION ALL SELECT * FROM saved_event_rows
  UNION ALL SELECT * FROM discovery_rows
)
SELECT
  u.date,
  u.club_id,
  COALESCE(ANY_VALUE(NULLIF(u.club_name, '')), ANY_VALUE(c.club_name)) AS club_name,
  u.event_id,
  COALESCE(ANY_VALUE(NULLIF(u.event_title, '')), ANY_VALUE(ed.event_title)) AS event_title,
  COALESCE(ANY_VALUE(u.event_start_time), ANY_VALUE(ed.event_start_time)) AS event_start_time,
  COALESCE(ANY_VALUE(NULLIF(u.event_status, '')), ANY_VALUE(ed.event_status)) AS event_status,
  SUM(u.capacity_limit) AS capacity_limit,
  SUM(u.booked_count) AS booked_count,
  SUM(u.checked_in_count) AS checked_in_count,
  SUM(u.waitlisted_count) AS waitlisted_count,
  SUM(u.gross_revenue_minor) AS gross_revenue_minor,
  COALESCE(ANY_VALUE(NULLIF(u.currency, '')), ANY_VALUE(ed.currency), 'INR') AS currency,
  SUM(u.checkout_started_count) AS checkout_started_count,
  SUM(u.checkout_dropoff_count) AS checkout_dropoff_count,
  SUM(u.payment_completed_count) AS payment_completed_count,
  SUM(u.payment_failed_count) AS payment_failed_count,
  SUM(u.payment_refunded_count) AS payment_refunded_count,
  SUM(u.review_count) AS review_count,
  SUM(u.rating_total) AS rating_total,
  SUM(u.verified_review_count) AS verified_review_count,
  SUM(u.public_review_count) AS public_review_count,
  SUM(u.owner_response_count) AS owner_response_count,
  SUM(u.demand_count) AS demand_count,
  SUM(u.invite_open_count) AS invite_open_count,
  SUM(u.mutual_match_count) AS mutual_match_count,
  SUM(u.chat_started_count) AS chat_started_count,
  SUM(u.repeat_attendee_count) AS repeat_attendee_count,
  SUM(u.listing_views) AS listing_views,
  SUM(u.search_appearances) AS search_appearances,
  SUM(u.event_views) AS event_views,
  SUM(u.organizer_saves) AS organizer_saves,
  SUM(u.event_saves) AS event_saves,
  SUM(u.contact_clicks) AS contact_clicks,
  SUM(u.claim_clicks) AS claim_clicks,
  SUM(u.outbound_clicks) AS outbound_clicks,
  SUM(u.outbound_booking_clicks) AS outbound_booking_clicks,
  SUM(u.link_clicks) AS link_clicks,
  CURRENT_TIMESTAMP() AS refreshed_at
FROM unioned u
LEFT JOIN clubs c ON c.club_id = u.club_id
LEFT JOIN event_dim ed ON ed.event_id = u.event_id
WHERE u.date BETWEEN @refresh_start AND @refresh_end
GROUP BY u.date, u.club_id, u.event_id
""",
analytics_project, analytics_dataset,
analytics_project, analytics_dataset,
analytics_project, analytics_dataset,
analytics_project, analytics_dataset,
analytics_project, analytics_dataset,
analytics_project, analytics_dataset,
analytics_project, analytics_dataset,
analytics_project, analytics_dataset,
analytics_project, marketplace_dataset,
analytics_project, analytics_dataset)
USING refresh_start AS refresh_start, refresh_end AS refresh_end;

-- Owner link clicks by organizer, link and traffic source (CAT-254). Only the
-- contract's fixed traffic sources reach the mart; anything else is "other".
EXECUTE IMMEDIATE FORMAT("""
CREATE TEMP TABLE refreshed_host_link_daily AS
SELECT
  event_date AS date,
  club_id,
  link_id,
  IF(traffic_source IN ('instagram', 'whatsapp', 'facebook', 'google', 'qr',
    'email', 'direct', 'other'), traffic_source, 'other') AS traffic_source,
  COUNT(DISTINCT analytics_event_id) AS link_clicks,
  CURRENT_TIMESTAMP() AS refreshed_at
FROM `%s.%s.host_analytics_events`
WHERE event_date BETWEEN @refresh_start AND @refresh_end
  AND event_name = 'linkClick'
  AND link_id IS NOT NULL
GROUP BY 1, 2, 3, 4
""", analytics_project, analytics_dataset)
USING refresh_start AS refresh_start, refresh_end AS refresh_end;

-- Build every replacement row before touching the published marts. If any
-- mutation fails, roll back the whole refresh and propagate the error.
BEGIN
  BEGIN TRANSACTION;

EXECUTE IMMEDIATE FORMAT("""
DELETE FROM `%s.%s.mart_host_event_daily`
WHERE date BETWEEN @refresh_start AND @refresh_end
""", analytics_project, analytics_dataset)
USING refresh_start AS refresh_start, refresh_end AS refresh_end;

EXECUTE IMMEDIATE FORMAT("""
INSERT INTO `%s.%s.mart_host_event_daily` (
  date,
  club_id,
  club_name,
  event_id,
  event_title,
  event_start_time,
  event_status,
  capacity_limit,
  booked_count,
  checked_in_count,
  waitlisted_count,
  gross_revenue_minor,
  currency,
  checkout_started_count,
  checkout_dropoff_count,
  payment_completed_count,
  payment_failed_count,
  payment_refunded_count,
  review_count,
  rating_total,
  verified_review_count,
  public_review_count,
  owner_response_count,
  demand_count,
  invite_open_count,
  mutual_match_count,
  chat_started_count,
  repeat_attendee_count,
  listing_views,
  search_appearances,
  event_views,
  organizer_saves,
  event_saves,
  contact_clicks,
  claim_clicks,
  outbound_clicks,
  outbound_booking_clicks,
  link_clicks,
  refreshed_at
)
SELECT
  date,
  club_id,
  club_name,
  event_id,
  event_title,
  event_start_time,
  event_status,
  capacity_limit,
  booked_count,
  checked_in_count,
  waitlisted_count,
  gross_revenue_minor,
  currency,
  checkout_started_count,
  checkout_dropoff_count,
  payment_completed_count,
  payment_failed_count,
  payment_refunded_count,
  review_count,
  rating_total,
  verified_review_count,
  public_review_count,
  owner_response_count,
  demand_count,
  invite_open_count,
  mutual_match_count,
  chat_started_count,
  repeat_attendee_count,
  listing_views,
  search_appearances,
  event_views,
  organizer_saves,
  event_saves,
  contact_clicks,
  claim_clicks,
  outbound_clicks,
  outbound_booking_clicks,
  link_clicks,
  refreshed_at
FROM refreshed_host_event_daily
""", analytics_project, analytics_dataset);

EXECUTE IMMEDIATE FORMAT("""
DELETE FROM `%s.%s.mart_host_link_daily`
WHERE date BETWEEN @refresh_start AND @refresh_end
""", analytics_project, analytics_dataset)
USING refresh_start AS refresh_start, refresh_end AS refresh_end;

EXECUTE IMMEDIATE FORMAT("""
INSERT INTO `%s.%s.mart_host_link_daily` (
  date,
  club_id,
  link_id,
  traffic_source,
  link_clicks,
  refreshed_at
)
SELECT date, club_id, link_id, traffic_source, link_clicks, refreshed_at
FROM refreshed_host_link_daily
""", analytics_project, analytics_dataset);

  COMMIT TRANSACTION;
EXCEPTION WHEN ERROR THEN
  ROLLBACK TRANSACTION;
  RAISE;
END;
