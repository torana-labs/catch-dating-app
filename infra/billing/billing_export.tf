# The BigQuery dataset that receives the Cloud Billing export (FIX-17).
#
# Google offers no API to switch the export on: after this dataset exists,
# the owner selects it once in the console under Billing > Billing export >
# BigQuery export (standard usage cost). Rows then arrive within a day.

resource "google_bigquery_dataset" "billing_export" {
  project     = local.billing_project
  dataset_id  = "billing_export"
  location    = "asia-south1"
  description = "Cloud Billing standard usage cost export (FIX-17). Written by Google; read for cost reviews."

  # Billing rows are the only history of spend; never let Terraform drop them.
  delete_contents_on_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}
