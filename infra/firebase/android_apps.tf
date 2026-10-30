# Firebase Android apps and their App Check Play Integrity configuration.
#
# Phase 1 adopts existing apps only. Every app is imported (the import blocks
# below), so adding an entry to var.android_apps imports an existing app and
# never creates one; an app ID that does not exist fails the plan. App Check
# service enforcement stays outside Terraform: deleting a
# google_firebase_app_check_service_config resource turns enforcement OFF.
# See docs/infrastructure_as_code.md.

locals {
  live_sha1_hashes = {
    for key, app in data.google_firebase_android_app.live :
    key => toset([for hash in(app.sha1_hashes == null ? [] : app.sha1_hashes) : lower(hash)])
  }
  live_sha256_hashes = {
    for key, app in data.google_firebase_android_app.live :
    key => toset([for hash in(app.sha256_hashes == null ? [] : app.sha256_hashes) : lower(hash)])
  }
  removed_sha1_hashes = {
    for key, app in var.android_apps :
    key => setsubtract(local.live_sha1_hashes[key], [for hash in app.sha1_hashes : lower(hash)])
  }
  removed_sha256_hashes = {
    for key, app in var.android_apps :
    key => setsubtract(local.live_sha256_hashes[key], [for hash in app.sha256_hashes : lower(hash)])
  }
}

# Read the live registration independently of state so a plan can refuse to
# remove a fingerprint that is registered today, including on the first plan
# that imports the app.
data "google_firebase_android_app" "live" {
  provider = google-beta
  for_each = var.android_apps

  project = each.value.project
  app_id  = each.value.app_id
}

import {
  for_each = var.android_apps

  to = google_firebase_android_app.app[each.key]
  id = "projects/${each.value.project}/androidApps/${each.value.app_id}"
}

resource "google_firebase_android_app" "app" {
  provider = google-beta
  for_each = var.android_apps

  project       = each.value.project
  display_name  = each.value.display_name
  package_name  = each.value.package_name
  sha1_hashes   = each.value.sha1_hashes
  sha256_hashes = each.value.sha256_hashes

  # deletion_policy is deliberately left unset: setting it would add a
  # state-only change to the first plan. prevent_destroy below and the plan
  # guard (infra/scripts/plan_guard.sh), which rejects any delete or replace,
  # stop Terraform from removing an app.

  lifecycle {
    prevent_destroy = true

    precondition {
      condition     = data.google_firebase_android_app.live[each.key].package_name == each.value.package_name
      error_message = "android_apps[\"${each.key}\"] package_name does not match the live Firebase app ${each.value.app_id}."
    }

    precondition {
      condition     = var.allow_fingerprint_removal || length(local.removed_sha1_hashes[each.key]) == 0
      error_message = "android_apps[\"${each.key}\"] would remove live SHA-1 fingerprints ${join(", ", sort(local.removed_sha1_hashes[each.key]))}. Keep them, or set allow_fingerprint_removal = true in a reviewed key-retirement PR."
    }

    precondition {
      condition     = var.allow_fingerprint_removal || length(local.removed_sha256_hashes[each.key]) == 0
      error_message = "android_apps[\"${each.key}\"] would remove live SHA-256 fingerprints ${join(", ", sort(local.removed_sha256_hashes[each.key]))}. Keep them, or set allow_fingerprint_removal = true in a reviewed key-retirement PR."
    }
  }
}

import {
  for_each = var.android_apps

  to = google_firebase_app_check_play_integrity_config.app[each.key]
  id = "projects/${each.value.project}/apps/${each.value.app_id}/playIntegrityConfig"
}

resource "google_firebase_app_check_play_integrity_config" "app" {
  for_each = var.android_apps

  project = each.value.project
  app_id  = google_firebase_android_app.app[each.key].app_id

  # token_ttl is optional and read from the API when unset, so leaving it out
  # keeps the live value. Provider 8.7.0 does not expose the newer
  # appIntegrity, accountDetails or deviceIntegrity settings; Terraform neither
  # reads nor changes them.

  lifecycle {
    # Deleting this resource only forgets it (the provider has no delete
    # call), but nothing in phase 1 should remove it.
    prevent_destroy = true
  }
}
