# Credentials come from Application Default Credentials. In GitHub Actions,
# google-github-actions/auth writes short-lived Workload Identity Federation
# credentials; no key file exists. Every resource names its project, so the
# providers set no default project and one state covers dev, staging and prod.
provider "google" {}

provider "google-beta" {}
