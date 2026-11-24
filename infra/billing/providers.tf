# The owner applies this root with their own Application Default Credentials
# (gcloud auth application-default login): a budget lives on the billing
# account, and the CI plan and apply identities deliberately hold no billing
# account role (docs/infrastructure_as_code.md, "Billing budget and export").
#
# The Billing Budgets API needs a quota project when called with user
# credentials, so requests bill their quota to the production project.
provider "google" {
  billing_project       = "catch-dating-app-64e51"
  user_project_override = true
}
