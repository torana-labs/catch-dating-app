# Secret Manager containers and IAM for Forms payments through the Razorpay
# Platform Partner OAuth application (docs/host_forms.md, "Payments").
#
# Terraform creates only the secret containers and their IAM. It never
# creates a secret version, so no credential ever enters Terraform state or a
# plan: the plan guard rejects google_secret_manager_secret_version outright.
# The owner adds the partner config value with
# infra/scripts/store_razorpay_partner_secret.sh, and the Functions runtime
# writes merchant credentials into the vault itself.
# See docs/infrastructure_as_code.md, "Forms payment secrets".

locals {
  # Secret IDs match ^[A-Za-z0-9_-]{1,255}$, which the Functions runtime and
  # the deploy materializer require. The partner config's credentialSecretId
  # names the vault.
  form_razorpay_partner_secret_id = "FORM_RAZORPAY_PARTNER_CONFIG"
  form_razorpay_vault_secret_id   = "FORM_RAZORPAY_MERCHANT_CREDENTIALS"

  form_payment_secrets = merge([
    for environment, settings in var.form_payment_environments : {
      "${environment}-partner" = {
        environment = environment
        project     = settings.project
        secret_id   = local.form_razorpay_partner_secret_id
        purpose     = "razorpay-partner-config"
      }
      "${environment}-vault" = {
        environment = environment
        project     = settings.project
        secret_id   = local.form_razorpay_vault_secret_id
        purpose     = "razorpay-merchant-credentials"
      }
    }
  ]...)
}

resource "google_secret_manager_secret" "form_payment" {
  for_each = local.form_payment_secrets

  project   = each.value.project
  secret_id = each.value.secret_id

  labels = {
    managed-by = "terraform"
    purpose    = each.value.purpose
  }

  # The same automatic replication the Firebase CLI uses for Functions secrets.
  replication {
    auto {}
  }

  deletion_protection = true

  lifecycle {
    prevent_destroy = true
  }
}

# The partner OAuth application's config: the runtime reads one pinned
# version (FORM_RAZORPAY_PARTNER_CONFIG_VERSION) and nothing else.
resource "google_secret_manager_secret_iam_member" "form_partner_runtime_access" {
  for_each = var.form_payment_environments

  project   = each.value.project
  secret_id = google_secret_manager_secret.form_payment["${each.key}-partner"].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${each.value.functions_runtime_service_account}"

  lifecycle {
    prevent_destroy = true
  }
}

# The merchant credential vault: the runtime adds a version per connected
# organizer, reads pinned versions and disables superseded ones. The custom
# role (created by infra/bootstrap/bootstrap.sh, because the apply identity
# must not be able to edit roles) holds exactly versions.add, versions.access
# and versions.disable; it cannot destroy versions or change the secret.
resource "google_secret_manager_secret_iam_member" "form_vault_runtime_access" {
  for_each = var.form_payment_environments

  project   = each.value.project
  secret_id = google_secret_manager_secret.form_payment["${each.key}-vault"].secret_id
  role      = "projects/${each.value.project}/roles/catchFormCredentialVault"
  member    = "serviceAccount:${each.value.functions_runtime_service_account}"

  lifecycle {
    prevent_destroy = true
  }
}
