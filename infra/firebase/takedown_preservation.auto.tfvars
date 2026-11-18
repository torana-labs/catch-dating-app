# Organiser takedown preservation buckets. Kept apart from terraform.tfvars,
# which the fingerprints workflow regenerates. The deploy identities are the
# environments' GCP_SERVICE_ACCOUNT_EMAIL (docs/release_operations.md).
# See docs/infrastructure_as_code.md, "Takedown preservation bucket".
takedown_preservation_environments = {
  dev = {
    project                = "catchdates-dev"
    deploy_service_account = "github-actions-deploy@catchdates-dev.iam.gserviceaccount.com"
  }
  prod = {
    project                = "catch-dating-app-64e51"
    deploy_service_account = "github-actions-deploy@catch-dating-app-64e51.iam.gserviceaccount.com"
  }
}
