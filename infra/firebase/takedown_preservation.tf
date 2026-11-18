# Restricted bucket for organiser takedown preservation snapshots
# (docs/release_operations.md, "Organiser takedown";
# docs/infrastructure_as_code.md, "Takedown preservation bucket").
#
# tool/data/organizer_takedown.mjs reads each case file from, and writes each
# preservation snapshot, manifest and BigQuery export to, cases/<caseId>/ here,
# never to a GitHub artifact. The bucket is separate from every app bucket:
# uniform bucket-level access, public access prevention enforced, no
# versioning and no soft delete (so destruction at the end of the hold is
# final and can be certified), and a 180-day retention policy so nothing can
# be deleted or overwritten before the hold ends. The policy stays unlocked:
# locking is irreversible and is the owner's decision with counsel. A case
# that must be held longer gets a temporary hold on its objects (runbook).
#
# Access: the environment's deploy identity, which the takedown workflow runs
# as, may create and read objects and nothing else; project owners keep their
# project-level access. No other principal is granted anything here.

locals {
  takedown_preservation_retention_seconds = "15552000" # 180 days; the provider takes seconds as a string
}

resource "google_storage_bucket" "takedown_preservation" {
  for_each = var.takedown_preservation_environments

  project  = each.value.project
  name     = "${each.value.project}-takedown-preservation"
  location = "ASIA-SOUTH1"

  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false
  default_event_based_hold    = false

  versioning {
    enabled = false
  }

  retention_policy {
    retention_period = local.takedown_preservation_retention_seconds
    is_locked        = false
  }

  soft_delete_policy {
    retention_duration_seconds = 0
  }

  labels = {
    managed-by = "terraform"
    purpose    = "takedown-preservation"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# The takedown workflow writes snapshots and manifests and reads case files
# and earlier manifests. It cannot delete, overwrite (the retention policy
# refuses) or change holds.
resource "google_storage_bucket_iam_member" "takedown_preservation_writer" {
  for_each = var.takedown_preservation_environments

  bucket = google_storage_bucket.takedown_preservation[each.key].name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${each.value.deploy_service_account}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_storage_bucket_iam_member" "takedown_preservation_reader" {
  for_each = var.takedown_preservation_environments

  bucket = google_storage_bucket.takedown_preservation[each.key].name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${each.value.deploy_service_account}"

  lifecycle {
    prevent_destroy = true
  }
}
