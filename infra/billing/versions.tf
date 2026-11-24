terraform {
  # Same version and provider pins as infra/firebase (tool/ci/toolchain.env).
  required_version = "1.16.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "8.7.0"
    }
  }

  # The bucket infra/bootstrap/bootstrap.sh created for infra/firebase, under
  # its own prefix, so this root never shares a state or a lock with it.
  backend "gcs" {
    bucket = "catch-dating-app-64e51-terraform-state"
    prefix = "billing"
  }
}
