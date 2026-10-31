# Recovery settings for the production Firestore database
# (docs/infrastructure_as_code.md, "Firestore recovery").
#
# The database itself is adopted with an import block and never created or
# deleted here. Terraform manages only two settings on it, point-in-time
# recovery and delete protection, plus one daily backup schedule.

locals {
  firestore_prod_project = "catch-dating-app-64e51"
}

import {
  to = google_firestore_database.prod
  id = "projects/${local.firestore_prod_project}/databases/(default)"
}

resource "google_firestore_database" "prod" {
  project = local.firestore_prod_project
  name    = "(default)"

  # Live values. Changing location_id or type would replace the database, which
  # prevent_destroy and the plan guard both refuse.
  location_id                 = "asia-south1"
  type                        = "FIRESTORE_NATIVE"
  concurrency_mode            = "PESSIMISTIC"
  app_engine_integration_mode = "DISABLED"

  # Seven days of versions to read or restore from, at any minute.
  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_ENABLED"
  # The database cannot be deleted while this is on, by anyone.
  delete_protection_state = "DELETE_PROTECTION_ENABLED"
  # Removing this block forgets the database instead of deleting it.
  deletion_policy = "ABANDON"

  lifecycle {
    prevent_destroy = true
  }
}

# One backup a day, kept for 14 days: a restore point older than the seven
# days point-in-time recovery reaches.
resource "google_firestore_backup_schedule" "prod_daily" {
  project  = local.firestore_prod_project
  database = google_firestore_database.prod.name

  retention = "1209600s"

  daily_recurrence {}

  lifecycle {
    prevent_destroy = true
  }
}
