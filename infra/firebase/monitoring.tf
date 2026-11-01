# Production alerting (docs/infrastructure_as_code.md, "Monitoring").
#
# The two Functions log alerts were made by hand in the console; they are
# adopted here with import blocks. The uptime check and its alert are new.
# All of them email the existing production alerts channel, which is read,
# not managed, so its address stays out of this public repository.

locals {
  monitoring_project = "catch-dating-app-64e51"
  # Matches a Functions (gen 1 or gen 2) log entry that reports running out
  # of memory. The errors alert excludes these, so one event alerts once.
  functions_logs = "((resource.type=\"cloud_run_revision\" AND labels.\"goog-managed-by\"=\"cloudfunctions\") OR resource.type=\"cloud_function\")"
  oom_pattern    = "(textPayload=~\"(?i)(memory limit|out of memory|oomkilled|heap out of memory)\" OR jsonPayload.message=~\"(?i)(memory limit|out of memory|oomkilled|heap out of memory)\")"
}

data "google_monitoring_notification_channel" "prod_alerts" {
  project      = local.monitoring_project
  type         = "email"
  display_name = "Catch production Functions alerts — Suvrat"
}

import {
  to = google_monitoring_alert_policy.functions_oom
  id = "projects/catch-dating-app-64e51/alertPolicies/17031181742705077104"
}

resource "google_monitoring_alert_policy" "functions_oom" {
  project      = local.monitoring_project
  display_name = "Catch prod Functions OOM"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Catch prod Functions OOM"
    condition_matched_log {
      filter = "${local.functions_logs} AND ${local.oom_pattern}"
    }
  }

  alert_strategy {
    auto_close = "1800s"
    notification_rate_limit {
      period = "3600s"
    }
  }

  documentation {
    content   = "A production Cloud Function exceeded memory. Inspect the affected function and invocation in Cloud Logging; do not raise limits across the fleet without measurement."
    mime_type = "text/markdown"
  }

  notification_channels = [data.google_monitoring_notification_channel.prod_alerts.name]
}

import {
  to = google_monitoring_alert_policy.functions_errors
  id = "projects/catch-dating-app-64e51/alertPolicies/82753548912916789"
}

resource "google_monitoring_alert_policy" "functions_errors" {
  project      = local.monitoring_project
  display_name = "Catch prod Functions errors"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Catch prod Functions errors"
    condition_matched_log {
      filter = "${local.functions_logs} AND severity>=ERROR AND NOT ${local.oom_pattern}"
    }
  }

  alert_strategy {
    auto_close = "1800s"
    notification_rate_limit {
      period = "3600s"
    }
  }

  documentation {
    content   = "A production Cloud Function emitted an error. Inspect the affected function and request in Cloud Logging. Memory-limit events are handled by the OOM policy."
    mime_type = "text/markdown"
  }

  notification_channels = [data.google_monitoring_notification_channel.prod_alerts.name]
}

# The public catalog read on the Hosting origin, which also serves the
# website's pages. It answers on web.app without passing Cloudflare, whose bot
# protection refuses Google's checkers on the public domain.
resource "google_monitoring_uptime_check_config" "website_origin" {
  project      = local.monitoring_project
  display_name = "Catch prod website origin"
  timeout      = "10s"
  period       = "300s"

  http_check {
    path           = "/api/public-catalog"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
    accepted_response_status_codes {
      status_value = 200
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = local.monitoring_project
      host       = "catch-dating-app-64e51.web.app"
    }
  }
}

resource "google_monitoring_alert_policy" "website_origin_down" {
  project      = local.monitoring_project
  display_name = "Catch prod website origin down"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Uptime check failing from two or more regions"
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.check_id=\"${google_monitoring_uptime_check_config.website_origin.uptime_check_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "600s"
      aggregations {
        alignment_period     = "1200s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.project_id", "resource.label.host"]
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content   = "The production website origin (https://catch-dating-app-64e51.web.app/api/public-catalog) has failed its uptime check from two or more regions for ten minutes. Check Firebase Hosting and the website's Functions in Cloud Logging."
    mime_type = "text/markdown"
  }

  notification_channels = [data.google_monitoring_notification_channel.prod_alerts.name]
}
