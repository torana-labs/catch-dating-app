terraform {
  # Keep equal to TERRAFORM_VERSION in tool/ci/toolchain.env;
  # tool/ci/check_toolchain_consistency.sh fails when they differ.
  required_version = "1.16.6"

  required_providers {
    # google_firebase_app_check_play_integrity_config is GA.
    google = {
      source  = "hashicorp/google"
      version = "8.7.0"
    }
    # google_firebase_android_app exists only in the beta provider.
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "8.7.0"
    }
  }

  # Created by infra/bootstrap/bootstrap.sh: versioned, uniform bucket-level
  # access, public access prevention enforced. The plan identity can only read
  # it, so plans run with -lock=false; only the apply identity can write state
  # or take the lock.
  backend "gcs" {
    bucket = "catch-dating-app-64e51-terraform-state"
    prefix = "firebase"
  }
}
