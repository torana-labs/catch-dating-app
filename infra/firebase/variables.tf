variable "android_apps" {
  description = <<-EOT
    Every Firebase Android app this configuration manages, keyed
    "<environment>-<role>". Values are public identifiers and public signing
    certificate fingerprints, never secrets. Keep each hash list in the order
    the Firebase Management API returns it and append new fingerprints at the
    end: the provider compares the lists in order, so reordering shows a diff.
  EOT
  type = map(object({
    project       = string
    app_id        = string
    package_name  = string
    display_name  = string
    sha1_hashes   = list(string)
    sha256_hashes = list(string)
  }))

  validation {
    condition     = alltrue([for key in keys(var.android_apps) : can(regex("^(dev|staging|prod)-(consumer|host)$", key))])
    error_message = "android_apps keys must be <dev|staging|prod>-<consumer|host>."
  }

  validation {
    condition     = alltrue([for app in values(var.android_apps) : trimspace(app.display_name) != ""])
    error_message = "Every app needs its live display_name. Run the Firebase Android fingerprints workflow and commit the terraform.tfvars it prints."
  }

  validation {
    condition = alltrue(flatten([for app in values(var.android_apps) : [
      for hash in app.sha1_hashes : can(regex("^[0-9A-Fa-f]{40}$", hash))
    ]]))
    error_message = "sha1_hashes entries must be 40 hex characters without colons."
  }

  validation {
    condition = alltrue(flatten([for app in values(var.android_apps) : [
      for hash in app.sha256_hashes : can(regex("^[0-9A-Fa-f]{64}$", hash))
    ]]))
    error_message = "sha256_hashes entries must be 64 hex characters without colons."
  }

  validation {
    # App Check Play Integrity validates tokens against the registered SHA-256
    # fingerprints, so an app without one cannot pass App Check.
    condition     = alltrue([for app in values(var.android_apps) : length(app.sha256_hashes) > 0])
    error_message = "Every app needs at least one SHA-256 fingerprint. Run the Firebase Android fingerprints workflow and commit the terraform.tfvars it prints."
  }

  validation {
    condition = alltrue([for app in values(var.android_apps) :
      length(distinct([for hash in app.sha1_hashes : lower(hash)])) == length(app.sha1_hashes) &&
      length(distinct([for hash in app.sha256_hashes : lower(hash)])) == length(app.sha256_hashes)
    ])
    error_message = "A fingerprint is listed twice for the same app."
  }
}

variable "allow_fingerprint_removal" {
  description = <<-EOT
    Plans refuse to drop a fingerprint that is registered on the live app,
    because a removed fingerprint breaks sign-in and App Check for every build
    signed with that key. Set this to true only in the reviewed PR that retires
    a signing key, and set it back to false in the same or the next PR.
  EOT
  type        = bool
  default     = false
}

variable "form_payment_environments" {
  description = <<-EOT
    Environments whose Functions take Forms payments through the Razorpay
    Platform Partner application, keyed by GitHub environment (dev, prod).
    functions_runtime_service_account is the identity the payment Functions
    run as; they set no serviceAccount, so it is the project's default
    compute identity. The deploy readiness gate compares it with the observed
    runtime identity.
  EOT
  type = map(object({
    project                           = string
    functions_runtime_service_account = string
  }))

  validation {
    condition     = alltrue([for key in keys(var.form_payment_environments) : contains(["dev", "prod"], key)])
    error_message = "form_payment_environments keys must be dev or prod."
  }

  validation {
    condition = alltrue([for settings in values(var.form_payment_environments) :
      can(regex("^[a-z0-9-]+@[a-z0-9.-]+\\.gserviceaccount\\.com$", settings.functions_runtime_service_account))
    ])
    error_message = "functions_runtime_service_account must be a service account email."
  }
}
