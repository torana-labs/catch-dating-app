# Offline tests for the plan guards. Mock providers stand in for Google, so
# these run with no credentials: terraform init -backend=false && terraform test
#
# The mocked live app has one registered SHA-1 and one SHA-256 (the "upload
# key"); the Play app-signing key adds one of each.

mock_provider "google" {}

mock_provider "google-beta" {
  mock_data "google_firebase_android_app" {
    defaults = {
      package_name  = "com.catchdates.app"
      sha1_hashes   = ["1111111111111111111111111111111111111111"]
      sha256_hashes = ["1111111111111111111111111111111111111111111111111111111111111111"]
    }
  }
}

# Mock providers cannot import, so the imported resources are overridden
# with the live values the import would read.
override_resource {
  target = google_firebase_android_app.app
  values = {
    app_id        = "1:574779808785:android:81edbfa0d4aba7c48ea5b0"
    package_name  = "com.catchdates.app"
    sha1_hashes   = ["1111111111111111111111111111111111111111"]
    sha256_hashes = ["1111111111111111111111111111111111111111111111111111111111111111"]
  }
}

override_resource {
  target = google_firebase_app_check_play_integrity_config.app
}

variables {
  android_apps = {
    "prod-consumer" = {
      project       = "catch-dating-app-64e51"
      app_id        = "1:574779808785:android:81edbfa0d4aba7c48ea5b0"
      package_name  = "com.catchdates.app"
      display_name  = "Catch Prod Android"
      sha1_hashes   = ["1111111111111111111111111111111111111111", "2222222222222222222222222222222222222222"]
      sha256_hashes = ["1111111111111111111111111111111111111111111111111111111111111111", "2222222222222222222222222222222222222222222222222222222222222222"]
    }
  }
}

run "adding_play_signing_fingerprints_plans" {
  command = plan

  assert {
    condition     = google_firebase_android_app.app["prod-consumer"].sha256_hashes[1] == "2222222222222222222222222222222222222222222222222222222222222222"
    error_message = "The Play app-signing SHA-256 must be appended after the live fingerprints."
  }
}

run "the_committed_blank_inventory_cannot_plan" {
  command = plan

  variables {
    android_apps = {
      "prod-consumer" = {
        project       = "catch-dating-app-64e51"
        app_id        = "1:574779808785:android:81edbfa0d4aba7c48ea5b0"
        package_name  = "com.catchdates.app"
        display_name  = ""
        sha1_hashes   = []
        sha256_hashes = []
      }
    }
  }

  expect_failures = [var.android_apps]
}

run "removing_a_live_sha1_is_refused" {
  command = plan

  variables {
    android_apps = {
      "prod-consumer" = {
        project       = "catch-dating-app-64e51"
        app_id        = "1:574779808785:android:81edbfa0d4aba7c48ea5b0"
        package_name  = "com.catchdates.app"
        display_name  = "Catch Prod Android"
        sha1_hashes   = ["2222222222222222222222222222222222222222"]
        sha256_hashes = ["1111111111111111111111111111111111111111111111111111111111111111"]
      }
    }
  }

  expect_failures = [google_firebase_android_app.app["prod-consumer"]]
}

run "removing_a_live_sha256_is_refused" {
  command = plan

  variables {
    android_apps = {
      "prod-consumer" = {
        project       = "catch-dating-app-64e51"
        app_id        = "1:574779808785:android:81edbfa0d4aba7c48ea5b0"
        package_name  = "com.catchdates.app"
        display_name  = "Catch Prod Android"
        sha1_hashes   = ["1111111111111111111111111111111111111111"]
        sha256_hashes = ["2222222222222222222222222222222222222222222222222222222222222222"]
      }
    }
  }

  expect_failures = [google_firebase_android_app.app["prod-consumer"]]
}

run "a_reviewed_key_retirement_may_remove_fingerprints" {
  command = plan

  variables {
    allow_fingerprint_removal = true
    android_apps = {
      "prod-consumer" = {
        project       = "catch-dating-app-64e51"
        app_id        = "1:574779808785:android:81edbfa0d4aba7c48ea5b0"
        package_name  = "com.catchdates.app"
        display_name  = "Catch Prod Android"
        sha1_hashes   = ["2222222222222222222222222222222222222222"]
        sha256_hashes = ["2222222222222222222222222222222222222222222222222222222222222222"]
      }
    }
  }
}

run "fingerprint_comparison_ignores_case" {
  command = plan

  override_data {
    target = data.google_firebase_android_app.live["prod-consumer"]
    values = {
      package_name  = "com.catchdates.app"
      sha1_hashes   = ["ABCDEF1111111111111111111111111111111111"]
      sha256_hashes = ["ABCDEF1111111111111111111111111111111111111111111111111111111111"]
    }
  }

  variables {
    android_apps = {
      "prod-consumer" = {
        project       = "catch-dating-app-64e51"
        app_id        = "1:574779808785:android:81edbfa0d4aba7c48ea5b0"
        package_name  = "com.catchdates.app"
        display_name  = "Catch Prod Android"
        sha1_hashes   = ["abcdef1111111111111111111111111111111111"]
        sha256_hashes = ["abcdef1111111111111111111111111111111111111111111111111111111111"]
      }
    }
  }
}

run "a_mismatched_package_is_refused" {
  command = plan

  variables {
    android_apps = {
      "prod-consumer" = {
        project       = "catch-dating-app-64e51"
        app_id        = "1:574779808785:android:81edbfa0d4aba7c48ea5b0"
        package_name  = "com.catchdates.host"
        display_name  = "Catch Prod Android"
        sha1_hashes   = ["1111111111111111111111111111111111111111"]
        sha256_hashes = ["1111111111111111111111111111111111111111111111111111111111111111"]
      }
    }
  }

  expect_failures = [google_firebase_android_app.app["prod-consumer"]]
}

run "keys_must_name_environment_and_role" {
  command = plan

  variables {
    android_apps = {
      "production" = {
        project       = "catch-dating-app-64e51"
        app_id        = "1:574779808785:android:81edbfa0d4aba7c48ea5b0"
        package_name  = "com.catchdates.app"
        display_name  = "Catch Prod Android"
        sha1_hashes   = ["1111111111111111111111111111111111111111"]
        sha256_hashes = ["1111111111111111111111111111111111111111111111111111111111111111"]
      }
    }
  }

  expect_failures = [var.android_apps]
}
