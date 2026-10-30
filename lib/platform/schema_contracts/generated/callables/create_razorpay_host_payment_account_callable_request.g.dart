// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_razorpay_host_payment_account_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Creates or continues an India host's Razorpay Route linked-account setup. Legal, stakeholder, and settlement details are sent to Razorpay and are never persisted in Catch Firestore.
final class CreateRazorpayHostPaymentAccountCallableRequest {
  const CreateRazorpayHostPaymentAccountCallableRequest({
    required this.legalBusinessName,
    required this.businessType,
    required this.contactName,
    required this.email,
    required this.phone,
    required this.businessModel,
    required this.businessPan,
    required this.bankAccountNumber,
    required this.ifscCode,
    required this.beneficiaryName,
    required this.stakeholderName,
    required this.stakeholderEmail,
    required this.stakeholderPhone,
    required this.stakeholderPan,
    required this.stakeholderOwnershipPercent,
    required this.stakeholderIsDirector,
    required this.stakeholderIsExecutive,
    required this.termsAccepted,
  });

  final String legalBusinessName;
  final String businessType;
  final String contactName;
  final String email;
  final String phone;
  final String businessModel;
  final String businessPan;
  final String bankAccountNumber;
  final String ifscCode;
  final String beneficiaryName;
  final String stakeholderName;
  final String stakeholderEmail;
  final String stakeholderPhone;
  final String stakeholderPan;
  final double stakeholderOwnershipPercent;
  final bool stakeholderIsDirector;
  final bool stakeholderIsExecutive;
  final bool termsAccepted;

  Map<String, Object?> toJson() => {
    'legalBusinessName': legalBusinessName,
    'businessType': businessType,
    'contactName': contactName,
    'email': email,
    'phone': phone,
    'businessModel': businessModel,
    'businessPan': businessPan,
    'bankAccountNumber': bankAccountNumber,
    'ifscCode': ifscCode,
    'beneficiaryName': beneficiaryName,
    'stakeholderName': stakeholderName,
    'stakeholderEmail': stakeholderEmail,
    'stakeholderPhone': stakeholderPhone,
    'stakeholderPan': stakeholderPan,
    'stakeholderOwnershipPercent': stakeholderOwnershipPercent,
    'stakeholderIsDirector': stakeholderIsDirector,
    'stakeholderIsExecutive': stakeholderIsExecutive,
    'termsAccepted': termsAccepted,
  };
}
