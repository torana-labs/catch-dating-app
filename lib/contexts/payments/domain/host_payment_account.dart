enum HostPaymentOnboardingStatus { notStarted, pending, complete, restricted }

enum HostPaymentProvider { razorpay, stripe }

HostPaymentProvider defaultHostPaymentProviderForCountry(String country) =>
    country.toUpperCase() == 'IN'
    ? HostPaymentProvider.razorpay
    : HostPaymentProvider.stripe;

enum RazorpayHostBusinessType {
  individual,
  proprietorship,
  partnership,
  privateLimited,
  publicLimited,
  llp,
  trust,
  society,
  ngo,
}

extension RazorpayHostBusinessTypeWireValue on RazorpayHostBusinessType {
  String get wireValue => switch (this) {
    RazorpayHostBusinessType.privateLimited => 'private_limited',
    RazorpayHostBusinessType.publicLimited => 'public_limited',
    _ => name,
  };
}

class RazorpayHostOnboardingDetails {
  const RazorpayHostOnboardingDetails({
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
  final RazorpayHostBusinessType businessType;
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
    'legalBusinessName': legalBusinessName.trim(),
    'businessType': businessType.wireValue,
    'contactName': contactName.trim(),
    'email': email.trim(),
    'phone': phone.trim(),
    'businessModel': businessModel.trim(),
    'businessPan': businessPan.trim().toUpperCase(),
    'bankAccountNumber': bankAccountNumber.trim(),
    'ifscCode': ifscCode.trim().toUpperCase(),
    'beneficiaryName': beneficiaryName.trim(),
    'stakeholderName': stakeholderName.trim(),
    'stakeholderEmail': stakeholderEmail.trim(),
    'stakeholderPhone': stakeholderPhone.trim(),
    'stakeholderPan': stakeholderPan.trim().toUpperCase(),
    'stakeholderOwnershipPercent': stakeholderOwnershipPercent,
    'stakeholderIsDirector': stakeholderIsDirector,
    'stakeholderIsExecutive': stakeholderIsExecutive,
    'termsAccepted': termsAccepted,
  };
}

class HostPaymentAccount {
  const HostPaymentAccount({
    required this.userId,
    this.provider = HostPaymentProvider.stripe,
    required this.country,
    required this.defaultCurrency,
    this.providerAccountId = '',
    this.stripeAccountId = '',
    this.razorpayAccountId = '',
    this.razorpayProductId,
    required this.chargesEnabled,
    required this.payoutsEnabled,
    required this.detailsSubmitted,
    required this.onboardingStatus,
    this.disabledReason,
    this.requirementsCurrentlyDue = const [],
    this.requirementsPastDue = const [],
    this.requirementsPendingVerification = const [],
  });

  factory HostPaymentAccount.fromJson(Map<String, dynamic> json) {
    return HostPaymentAccount(
      userId: json['userId'] as String? ?? '',
      provider: _providerFromName(json['provider'] as String?),
      country: json['country'] as String? ?? '',
      defaultCurrency: json['defaultCurrency'] as String? ?? '',
      providerAccountId: json['providerAccountId'] as String? ?? '',
      stripeAccountId: json['stripeAccountId'] as String? ?? '',
      razorpayAccountId: json['razorpayAccountId'] as String? ?? '',
      razorpayProductId: json['razorpayProductId'] as String?,
      chargesEnabled: json['chargesEnabled'] as bool? ?? false,
      payoutsEnabled: json['payoutsEnabled'] as bool? ?? false,
      detailsSubmitted: json['detailsSubmitted'] as bool? ?? false,
      onboardingStatus: _statusFromName(json['onboardingStatus'] as String?),
      disabledReason: json['disabledReason'] as String?,
      requirementsCurrentlyDue: _stringList(json['requirementsCurrentlyDue']),
      requirementsPastDue: _stringList(json['requirementsPastDue']),
      requirementsPendingVerification: _stringList(
        json['requirementsPendingVerification'],
      ),
    );
  }

  final String userId;
  final HostPaymentProvider provider;
  final String country;
  final String defaultCurrency;
  final String providerAccountId;
  final String stripeAccountId;
  final String razorpayAccountId;
  final String? razorpayProductId;
  final bool chargesEnabled;
  final bool payoutsEnabled;
  final bool detailsSubmitted;
  final HostPaymentOnboardingStatus onboardingStatus;
  final String? disabledReason;
  final List<String> requirementsCurrentlyDue;
  final List<String> requirementsPastDue;
  final List<String> requirementsPendingVerification;

  String get accountId {
    if (providerAccountId.isNotEmpty) return providerAccountId;
    return switch (provider) {
      HostPaymentProvider.razorpay => razorpayAccountId,
      HostPaymentProvider.stripe => stripeAccountId,
    };
  }

  bool get canAcceptPayments =>
      chargesEnabled &&
      payoutsEnabled &&
      onboardingStatus == HostPaymentOnboardingStatus.complete;

  bool get canAcceptInternationalPayments =>
      provider == HostPaymentProvider.stripe && canAcceptPayments;

  bool supportsCurrency(String currency) => switch (provider) {
    HostPaymentProvider.razorpay => currency.toUpperCase() == 'INR',
    HostPaymentProvider.stripe => currency.toUpperCase() != 'INR',
  };
}

HostPaymentProvider _providerFromName(String? value) {
  for (final provider in HostPaymentProvider.values) {
    if (provider.name == value) return provider;
  }
  return HostPaymentProvider.stripe;
}

HostPaymentOnboardingStatus _statusFromName(String? value) {
  for (final status in HostPaymentOnboardingStatus.values) {
    if (status.name == value) return status;
  }
  return HostPaymentOnboardingStatus.notStarted;
}

List<String> _stringList(Object? value) {
  if (value is! List) return const [];
  return value.whereType<String>().toList(growable: false);
}
