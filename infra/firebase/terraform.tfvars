# Firebase Android apps under Terraform. Everything here is public: app IDs
# from firebase/<env>/**/google-services.json and signing certificate
# fingerprints. Never put a secret in this file.
#
# display_name and the hash lists are blank until the owner runs the
# "Firebase Android fingerprints" workflow (.github/workflows/
# play-signing-fingerprints.yml) after bootstrap. It reads the live values
# and the Play app-signing fingerprints, and prints a complete replacement for
# this file into its job summary. Commit that output in a PR; until then every
# plan fails validation, so nothing can be applied with incomplete lists.
# See docs/infrastructure_as_code.md.

android_apps = {
  "prod-consumer" = {
    project       = "catch-dating-app-64e51"
    app_id        = "1:574779808785:android:81edbfa0d4aba7c48ea5b0"
    package_name  = "com.catchdates.app"
    display_name  = ""
    sha1_hashes   = []
    sha256_hashes = []
  }
  "prod-host" = {
    project       = "catch-dating-app-64e51"
    app_id        = "1:574779808785:android:0093178ee6681c828ea5b0"
    package_name  = "com.catchdates.host"
    display_name  = ""
    sha1_hashes   = []
    sha256_hashes = []
  }
  "staging-consumer" = {
    project       = "catchdates-staging"
    app_id        = "1:822303414140:android:e843ef30968cea960c76f9"
    package_name  = "com.catchdates.app.staging"
    display_name  = ""
    sha1_hashes   = []
    sha256_hashes = []
  }
  "staging-host" = {
    project       = "catchdates-staging"
    app_id        = "1:822303414140:android:87fbdade02a935810c76f9"
    package_name  = "com.catchdates.host.staging"
    display_name  = ""
    sha1_hashes   = []
    sha256_hashes = []
  }
  "dev-consumer" = {
    project       = "catchdates-dev"
    app_id        = "1:619661127800:android:d90f9bb4d89afbd7077d8d"
    package_name  = "com.catchdates.app.dev"
    display_name  = ""
    sha1_hashes   = []
    sha256_hashes = []
  }
  "dev-host" = {
    project       = "catchdates-dev"
    app_id        = "1:619661127800:android:0255790772b062ff077d8d"
    package_name  = "com.catchdates.host.dev"
    display_name  = ""
    sha1_hashes   = []
    sha256_hashes = []
  }
}

allow_fingerprint_removal = false
