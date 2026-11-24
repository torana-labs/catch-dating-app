# Monthly budget alert for the Catch billing account (FIX-17).
#
# The ceiling is ₹2,000 a month across every project on the billing account
# that pays for production. Emails go out at 50%, 90% and 100% of actual
# spend to the billing account's administrators and users, who are the
# project's billing contacts. A budget only alerts; it never stops a service.
#
# The billing account is read from the production project, so its id stays
# out of this public repository.

locals {
  billing_project             = "catch-dating-app-64e51"
  monthly_budget_inr          = 2000
  budget_alert_spend_fraction = [0.5, 0.9, 1.0]
}

data "google_project" "billing" {
  project_id = local.billing_project
}

resource "google_project_service" "billing_budgets" {
  project = local.billing_project
  service = "billingbudgets.googleapis.com"

  # Removing this block leaves the API on; other tools may rely on it.
  disable_on_destroy = false
}

resource "google_billing_budget" "monthly" {
  billing_account = data.google_project.billing.billing_account
  display_name    = "Catch monthly ceiling (INR 2,000)"

  budget_filter {
    # Net of credits: the ceiling is what the bill actually charges.
    calendar_period        = "MONTH"
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      # Must match the billing account's currency; apply fails otherwise.
      currency_code = "INR"
      units         = tostring(local.monthly_budget_inr)
    }
  }

  dynamic "threshold_rules" {
    for_each = local.budget_alert_spend_fraction
    content {
      threshold_percent = threshold_rules.value
      spend_basis       = "CURRENT_SPEND"
    }
  }

  all_updates_rule {
    # Email the billing account administrators and users.
    disable_default_iam_recipients = false
  }

  depends_on = [google_project_service.billing_budgets]

  lifecycle {
    prevent_destroy = true
  }
}
