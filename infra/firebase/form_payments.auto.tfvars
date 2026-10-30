# Forms payments through the Razorpay Platform Partner application. Kept
# apart from terraform.tfvars, which the fingerprints workflow regenerates.
#
# The payment Functions set no serviceAccount, so they run as each project's
# default compute identity. See docs/infrastructure_as_code.md, "Forms
# payment secrets".
form_payment_environments = {
  dev = {
    project                           = "catchdates-dev"
    functions_runtime_service_account = "619661127800-compute@developer.gserviceaccount.com"
  }
  prod = {
    project                           = "catch-dating-app-64e51"
    functions_runtime_service_account = "574779808785-compute@developer.gserviceaccount.com"
  }
}
