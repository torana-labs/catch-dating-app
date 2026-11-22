DECLARE analytics_project STRING DEFAULT @@project_id;
DECLARE user_dataset STRING DEFAULT "catch_user_analytics";
DECLARE host_dataset STRING DEFAULT "catch_analytics";
DECLARE marketplace_dataset STRING DEFAULT "catch_marketplace_metrics";
DECLARE ga4_dataset STRING DEFAULT "analytics_526484083";
DECLARE refresh_start DATE DEFAULT DATE_SUB(CURRENT_DATE("Asia/Kolkata"), INTERVAL 400 DAY);
DECLARE refresh_end DATE DEFAULT CURRENT_DATE("Asia/Kolkata");
DECLARE ga4_dataset_exists BOOL DEFAULT FALSE;
DECLARE ga4_events_exist BOOL DEFAULT FALSE;

CREATE TEMP TABLE ga4_user_daily (
  date DATE NOT NULL,
  uid STRING NOT NULL,
  app_active_minutes INT64 NOT NULL,
  app_event_count INT64 NOT NULL
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
  INSERT INTO ga4_user_daily (
    date,
    uid,
    app_active_minutes,
    app_event_count
  )
  SELECT
    PARSE_DATE('%%Y%%m%%d', event_date) AS date,
    user_id AS uid,
    COUNT(DISTINCT CONCAT(
      COALESCE(user_pseudo_id, user_id),
      ':',
      CAST(DIV(event_timestamp, 60000000) AS STRING)
    )) AS app_active_minutes,
    COUNT(1) AS app_event_count
  FROM `%s.%s.events_*`
  WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%%Y%%m%%d', @refresh_start)
    AND FORMAT_DATE('%%Y%%m%%d', @refresh_end)
    AND user_id IS NOT NULL
  GROUP BY date, uid
  """, analytics_project, ga4_dataset)
  USING refresh_start AS refresh_start, refresh_end AS refresh_end;
END IF;

EXECUTE IMMEDIATE FORMAT("""
CREATE TEMP TABLE refreshed_user_analytics_daily AS
WITH
participant_signals AS (
  SELECT
    JSON_VALUE(data, '$.uid') AS uid,
    JSON_VALUE(data, '$.type') AS type,
    JSON_VALUE(data, '$.direction') AS direction,
    COALESCE(SAFE_CAST(JSON_VALUE(data, '$.value') AS FLOAT64), 1) AS value,
    DATE(COALESCE(
      TIMESTAMP_MICROS(
        SAFE_CAST(JSON_VALUE(data, '$.occurredAt._seconds') AS INT64) * 1000000 +
        DIV(COALESCE(SAFE_CAST(JSON_VALUE(data, '$.occurredAt._nanoseconds') AS INT64), 0), 1000)
      ),
      TIMESTAMP_MICROS(
        SAFE_CAST(JSON_VALUE(data, '$.createdAt._seconds') AS INT64) * 1000000 +
        DIV(COALESCE(SAFE_CAST(JSON_VALUE(data, '$.createdAt._nanoseconds') AS INT64), 0), 1000)
      )
    ), "Asia/Kolkata") AS date
  FROM `%s.%s.participant_signal_facts_raw_latest`
  WHERE JSON_VALUE(data, '$.uid') IS NOT NULL
),
signal_daily AS (
  SELECT
    date,
    uid,
    SUM(IF(type = 'outgoing_like', value, 0)) AS outgoing_like_count,
    SUM(IF(type = 'incoming_like', value, 0)) AS incoming_like_count,
    SUM(IF(type = 'private_interest_sent', value, 0)) AS private_interest_sent_count,
    SUM(IF(type = 'private_interest_received', value, 0)) AS private_interest_received_count,
    SUM(IF(type = 'match_created', value, 0)) AS match_count,
    SUM(IF(type = 'chat_started' AND direction = 'sent', value, 0)) AS chat_started_sent_count,
    SUM(IF(type = 'chat_started' AND direction = 'received', value, 0)) AS chat_started_received_count,
    SUM(IF(type = 'chat_message_sent', value, 0)) AS chat_message_sent_count,
    SUM(IF(type = 'chat_message_received', value, 0)) AS chat_message_received_count,
    SUM(IF(type = 'event_feedback_submitted', value, 0)) AS feedback_submitted_count
  FROM participant_signals
  WHERE date BETWEEN @refresh_start AND @refresh_end
  GROUP BY date, uid
),
participation_events AS (
  SELECT
    JSON_VALUE(data, '$.uid') AS uid,
    DATE(COALESCE(
      TIMESTAMP_MICROS(
        SAFE_CAST(JSON_VALUE(data, '$.signedUpAt._seconds') AS INT64) * 1000000 +
        DIV(COALESCE(SAFE_CAST(JSON_VALUE(data, '$.signedUpAt._nanoseconds') AS INT64), 0), 1000)
      ),
      TIMESTAMP_MICROS(
        SAFE_CAST(JSON_VALUE(data, '$.createdAt._seconds') AS INT64) * 1000000 +
        DIV(COALESCE(SAFE_CAST(JSON_VALUE(data, '$.createdAt._nanoseconds') AS INT64), 0), 1000)
      )
    ), "Asia/Kolkata") AS date,
    1 AS events_booked_count,
    0 AS events_attended_count
  FROM `%s.%s.event_bookings_raw_latest`
  WHERE JSON_VALUE(data, '$.uid') IS NOT NULL
    AND JSON_VALUE(data, '$.status') IN ('signedUp', 'attended')

  UNION ALL

  SELECT
    JSON_VALUE(data, '$.uid') AS uid,
    DATE(TIMESTAMP_MICROS(
      SAFE_CAST(JSON_VALUE(data, '$.attendedAt._seconds') AS INT64) * 1000000 +
      DIV(COALESCE(SAFE_CAST(JSON_VALUE(data, '$.attendedAt._nanoseconds') AS INT64), 0), 1000)
    ), "Asia/Kolkata") AS date,
    0 AS events_booked_count,
    1 AS events_attended_count
  FROM `%s.%s.event_bookings_raw_latest`
  WHERE JSON_VALUE(data, '$.uid') IS NOT NULL
    AND JSON_VALUE(data, '$.status') = 'attended'
    AND JSON_VALUE(data, '$.attendedAt._seconds') IS NOT NULL
),
participation_daily AS (
  SELECT
    date,
    uid,
    SUM(events_booked_count) AS events_booked_count,
    SUM(events_attended_count) AS events_attended_count
  FROM participation_events
  WHERE date BETWEEN @refresh_start AND @refresh_end
  GROUP BY date, uid
),
exposure_photo_scores AS (
  SELECT
    event_date AS date,
    subject_uid AS uid,
    photo_id,
    COUNTIF(event_name = 'photoImpression') +
      SUM(IF(event_name = 'photoDwell', COALESCE(dwell_ms, 0), 0)) / 30000.0 AS photo_score
  FROM `%s.%s.user_profile_exposure_events`
  WHERE event_date BETWEEN @refresh_start AND @refresh_end
    AND subject_uid IS NOT NULL
    AND photo_id IS NOT NULL
  GROUP BY date, uid, photo_id
),
top_photos AS (
  SELECT
    date,
    uid,
    ARRAY_AGG(STRUCT(photo_id, photo_score) ORDER BY photo_score DESC, photo_id LIMIT 1)[OFFSET(0)] AS top_photo
  FROM exposure_photo_scores
  GROUP BY date, uid
),
exposure_daily AS (
  SELECT
    event_date AS date,
    subject_uid AS uid,
    COUNTIF(event_name IN ('profileImpression', 'profileView')) AS profile_view_count,
    COUNT(DISTINCT IF(event_name IN ('profileImpression', 'profileView'), viewer_uid, NULL)) AS unique_profile_viewer_count,
    SUM(IF(event_name = 'profileDwell', COALESCE(dwell_ms, 0), 0)) AS profile_dwell_ms,
    COUNTIF(event_name = 'photoImpression') AS photo_impression_count,
    SUM(IF(event_name = 'photoDwell', COALESCE(dwell_ms, 0), 0)) AS photo_dwell_ms
  FROM `%s.%s.user_profile_exposure_events`
  WHERE event_date BETWEEN @refresh_start AND @refresh_end
    AND subject_uid IS NOT NULL
  GROUP BY date, uid
),
all_user_days AS (
  SELECT date, uid FROM signal_daily
  UNION DISTINCT
  SELECT date, uid FROM participation_daily
  UNION DISTINCT
  SELECT date, uid FROM exposure_daily
  UNION DISTINCT
  SELECT date, uid FROM ga4_user_daily
),
base AS (
  SELECT
    d.date,
    d.uid,
    COALESCE(CAST(p.events_booked_count AS INT64), 0) AS events_booked_count,
    COALESCE(CAST(p.events_attended_count AS INT64), 0) AS events_attended_count,
    COALESCE(CAST(s.outgoing_like_count AS INT64), 0) AS outgoing_like_count,
    COALESCE(CAST(s.incoming_like_count AS INT64), 0) AS incoming_like_count,
    COALESCE(CAST(s.private_interest_sent_count AS INT64), 0) AS private_interest_sent_count,
    COALESCE(CAST(s.private_interest_received_count AS INT64), 0) AS private_interest_received_count,
    COALESCE(CAST(s.match_count AS INT64), 0) AS match_count,
    COALESCE(CAST(s.chat_started_sent_count AS INT64), 0) AS chat_started_sent_count,
    COALESCE(CAST(s.chat_started_received_count AS INT64), 0) AS chat_started_received_count,
    COALESCE(CAST(s.chat_message_sent_count AS INT64), 0) AS chat_message_sent_count,
    COALESCE(CAST(s.chat_message_received_count AS INT64), 0) AS chat_message_received_count,
    COALESCE(CAST(s.feedback_submitted_count AS INT64), 0) AS feedback_submitted_count,
    COALESCE(e.profile_view_count, 0) AS profile_view_count,
    COALESCE(e.unique_profile_viewer_count, 0) AS unique_profile_viewer_count,
    COALESCE(e.profile_dwell_ms, 0) AS profile_dwell_ms,
    COALESCE(e.photo_impression_count, 0) AS photo_impression_count,
    COALESCE(e.photo_dwell_ms, 0) AS photo_dwell_ms,
    tp.top_photo.photo_id AS top_photo_id,
    COALESCE(tp.top_photo.photo_score, 0) AS top_photo_score,
    COALESCE(g.app_active_minutes, 0) AS app_active_minutes,
    COALESCE(g.app_event_count, 0) AS app_event_count
  FROM all_user_days d
  LEFT JOIN signal_daily s USING (date, uid)
  LEFT JOIN participation_daily p USING (date, uid)
  LEFT JOIN exposure_daily e USING (date, uid)
  LEFT JOIN top_photos tp USING (date, uid)
  LEFT JOIN ga4_user_daily g USING (date, uid)
),
scored AS (
  SELECT
    *,
    incoming_like_count +
      private_interest_received_count * 2.0 +
      match_count * 3.0 +
      profile_view_count * 0.1 +
      profile_dwell_ms / 60000.0 AS profile_pull_score,
    match_count +
      chat_started_sent_count * 2.0 +
      chat_started_received_count * 1.5 +
      chat_message_sent_count * 0.2 AS connection_followthrough_score,
    events_attended_count * 2.0 +
      feedback_submitted_count +
      outgoing_like_count * 0.25 AS event_anchor_score,
    (
      IF(
        outgoing_like_count + incoming_like_count + match_count +
          chat_started_sent_count + chat_started_received_count > 0,
        0.4,
        0
      ) +
      IF(events_booked_count + events_attended_count > 0, 0.25, 0) +
      IF(profile_view_count + photo_impression_count + profile_dwell_ms > 0, 0.25, 0) +
      IF(app_active_minutes > 0, 0.1, 0)
    ) AS data_completeness_score
  FROM base
)
SELECT
  date,
  uid,
  events_booked_count,
  events_attended_count,
  outgoing_like_count,
  incoming_like_count,
  private_interest_sent_count,
  private_interest_received_count,
  match_count,
  chat_started_sent_count,
  chat_started_received_count,
  chat_message_sent_count,
  chat_message_received_count,
  feedback_submitted_count,
  profile_view_count,
  unique_profile_viewer_count,
  profile_dwell_ms,
  photo_impression_count,
  photo_dwell_ms,
  top_photo_id,
  top_photo_score,
  app_active_minutes,
  app_event_count,
  profile_pull_score,
  connection_followthrough_score,
  event_anchor_score,
  ROUND(PERCENT_RANK() OVER (
    PARTITION BY date
    ORDER BY profile_pull_score + connection_followthrough_score + event_anchor_score
  ) * 100, 2) AS internal_desirability_percentile,
  data_completeness_score,
  CURRENT_TIMESTAMP() AS refreshed_at
FROM scored
WHERE date BETWEEN @refresh_start AND @refresh_end
""",
analytics_project, marketplace_dataset,
analytics_project, host_dataset,
analytics_project, host_dataset,
analytics_project, user_dataset,
analytics_project, user_dataset)
USING refresh_start AS refresh_start, refresh_end AS refresh_end;

-- Build every replacement row before touching the published mart. If either
-- mutation fails, roll back the whole refresh and propagate the error.
BEGIN
  BEGIN TRANSACTION;

EXECUTE IMMEDIATE FORMAT("""
DELETE FROM `%s.%s.mart_user_analytics_daily`
WHERE date BETWEEN @refresh_start AND @refresh_end
""", analytics_project, user_dataset)
USING refresh_start AS refresh_start, refresh_end AS refresh_end;

EXECUTE IMMEDIATE FORMAT("""
INSERT INTO `%s.%s.mart_user_analytics_daily` (
  date,
  uid,
  events_booked_count,
  events_attended_count,
  outgoing_like_count,
  incoming_like_count,
  private_interest_sent_count,
  private_interest_received_count,
  match_count,
  chat_started_sent_count,
  chat_started_received_count,
  chat_message_sent_count,
  chat_message_received_count,
  feedback_submitted_count,
  profile_view_count,
  unique_profile_viewer_count,
  profile_dwell_ms,
  photo_impression_count,
  photo_dwell_ms,
  top_photo_id,
  top_photo_score,
  app_active_minutes,
  app_event_count,
  profile_pull_score,
  connection_followthrough_score,
  event_anchor_score,
  internal_desirability_percentile,
  data_completeness_score,
  refreshed_at
)
SELECT
  date,
  uid,
  events_booked_count,
  events_attended_count,
  outgoing_like_count,
  incoming_like_count,
  private_interest_sent_count,
  private_interest_received_count,
  match_count,
  chat_started_sent_count,
  chat_started_received_count,
  chat_message_sent_count,
  chat_message_received_count,
  feedback_submitted_count,
  profile_view_count,
  unique_profile_viewer_count,
  profile_dwell_ms,
  photo_impression_count,
  photo_dwell_ms,
  top_photo_id,
  top_photo_score,
  app_active_minutes,
  app_event_count,
  profile_pull_score,
  connection_followthrough_score,
  event_anchor_score,
  internal_desirability_percentile,
  data_completeness_score,
  refreshed_at
FROM refreshed_user_analytics_daily
""", analytics_project, user_dataset);

  COMMIT TRANSACTION;
EXCEPTION WHEN ERROR THEN
  ROLLBACK TRANSACTION;
  RAISE;
END;
