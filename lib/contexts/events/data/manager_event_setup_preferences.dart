/// Manager-only suggestions for future events. This object must come from an
/// authorized setup-preferences read, never from the public organizer document.
/// It is not a payment capability or an event-specific amount.
enum EventCollectionPreference {
  manualInstructions,
  reusablePage,
  personalRequest,
  catchCheckout,
}

class ReusableOrganizerPaymentPage {
  const ReusableOrganizerPaymentPage(
    this.url, {
    required this.reusableForEvents,
  });

  final String url;
  /// Explicit Host attestation; a pasted personal request is never reusable.
  final bool reusableForEvents;
}

/// Accept only canonical, public HTTPS URLs before asking the Host to attest
/// that the page can be reused across guests and events.
bool isCanonicalPublicPaymentPageUrl(String value) {
  if (value.isEmpty || value.length > 2048 || value.trim() != value) {
    return false;
  }
  final uri = Uri.tryParse(value);
  if (uri == null ||
      uri.scheme != 'https' ||
      uri.host.isEmpty ||
      uri.userInfo.isNotEmpty ||
      uri.hasFragment ||
      uri.hasPort ||
      uri.toString() != value) {
    return false;
  }
  final host = uri.host.toLowerCase();
  if (host == 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.contains(':') ||
      RegExp(r'^[0-9.]+$').hasMatch(host)) {
    return false;
  }
  final labels = host.split('.');
  if (labels.length < 2 ||
      labels.any((label) =>
          label.isEmpty ||
          label.length > 63 ||
          !RegExp(r'^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$').hasMatch(label))) {
    return false;
  }
  return RegExp(r'^[a-z]{2,}$').hasMatch(labels.last);
}

const _unchangedPreference = Object();

class ManagerEventSetupPreferences {
  const ManagerEventSetupPreferences({
    this.timezone,
    this.usualDurationMinutes,
    this.preferredVenueId,
    this.offerValidityMinutes,
    this.collectionPreference,
    this.currency,
    this.offerMessageTemplate,
    this.paymentInstructions,
    this.reusablePaymentPage,
  });

  final String? timezone;
  final int? usualDurationMinutes;
  final String? preferredVenueId;
  final int? offerValidityMinutes;
  final EventCollectionPreference? collectionPreference;
  final String? currency;
  final String? offerMessageTemplate;
  final String? paymentInstructions;
  final ReusableOrganizerPaymentPage? reusablePaymentPage;

  /// The private server projection is sparse: missing means no suggestion.
  /// A present null is invalid and must never be treated as a clear command.
  factory ManagerEventSetupPreferences.fromSparseJson(
    Map<String, Object?> json,
  ) {
    const keys = {
      'timezone', 'usualDurationMinutes', 'preferredVenueId', 'offerValidityMinutes',
      'collectionPreference', 'currency', 'offerMessageTemplate',
      'paymentInstructions', 'reusablePaymentPage',
    };
    if (json.keys.any((key) => !keys.contains(key)) ||
        json.values.any((value) => value == null)) {
      throw const FormatException('Invalid private setup preferences');
    }
    final collection = json['collectionPreference'];
    final page = json['reusablePaymentPage'];
    if (collection != null &&
        (collection is! String ||
            !EventCollectionPreference.values.any((v) => v.name == collection))) {
      throw const FormatException('Invalid collection preference');
    }
    if (page != null && page is! Map) {
      throw const FormatException('Invalid reusable payment page');
    }
    final pageData = page == null ? null : Map<String, Object?>.from(page as Map);
    if (pageData != null &&
        (pageData.length != 2 ||
            pageData['url'] is! String ||
            pageData['reusableForEvents'] != true)) {
      throw const FormatException('Invalid reusable payment page');
    }
    final preferences = ManagerEventSetupPreferences(
      timezone: json['timezone'] as String?,
      usualDurationMinutes: json['usualDurationMinutes'] as int?,
      preferredVenueId: json['preferredVenueId'] as String?,
      offerValidityMinutes: json['offerValidityMinutes'] as int?,
      collectionPreference: collection == null ? null :
          EventCollectionPreference.values.byName(collection as String),
      currency: json['currency'] as String?,
      offerMessageTemplate: json['offerMessageTemplate'] as String?,
      paymentInstructions: json['paymentInstructions'] as String?,
      reusablePaymentPage: pageData == null ? null :
          ReusableOrganizerPaymentPage(
            pageData['url'] as String, reusableForEvents: true),
    );
    if (!preferences.isValid) {
      throw const FormatException('Invalid private setup preferences');
    }
    return preferences;
  }

  bool get isValid =>
      (timezone == null || (timezone!.isNotEmpty && timezone!.length <= 100)) &&
      (usualDurationMinutes == null ||
          (usualDurationMinutes! >= 15 && usualDurationMinutes! <= 240)) &&
      (preferredVenueId == null || _validId(preferredVenueId!)) &&
      (offerValidityMinutes == null ||
          (offerValidityMinutes! >= 5 && offerValidityMinutes! <= 10080)) &&
      (currency == null || RegExp(r'^[A-Z]{3}$').hasMatch(currency!)) &&
      (offerMessageTemplate == null ||
          (offerMessageTemplate!.isNotEmpty &&
              offerMessageTemplate!.length <= 1000)) &&
      (paymentInstructions == null ||
          (paymentInstructions!.isNotEmpty &&
              paymentInstructions!.length <= 1000)) &&
      (reusablePaymentPage == null ||
          (reusablePaymentPage!.reusableForEvents &&
              isCanonicalPublicPaymentPageUrl(reusablePaymentPage!.url)));

  Map<String, Object?> toSparseJson() => {
    if (timezone != null) 'timezone': timezone,
    if (usualDurationMinutes != null)
      'usualDurationMinutes': usualDurationMinutes,
    if (preferredVenueId != null) 'preferredVenueId': preferredVenueId,
    if (offerValidityMinutes != null)
      'offerValidityMinutes': offerValidityMinutes,
    if (collectionPreference != null)
      'collectionPreference': collectionPreference!.name,
    if (currency != null) 'currency': currency,
    if (offerMessageTemplate != null)
      'offerMessageTemplate': offerMessageTemplate,
    if (paymentInstructions != null)
      'paymentInstructions': paymentInstructions,
    if (reusablePaymentPage != null)
      'reusablePaymentPage': {
        'url': reusablePaymentPage!.url,
        'reusableForEvents': true,
      },
  };

  ManagerEventSetupPreferences copyWith({
    Object? timezone = _unchangedPreference,
    Object? usualDurationMinutes = _unchangedPreference,
    Object? preferredVenueId = _unchangedPreference,
    Object? offerValidityMinutes = _unchangedPreference,
    Object? collectionPreference = _unchangedPreference,
    Object? currency = _unchangedPreference,
    Object? offerMessageTemplate = _unchangedPreference,
    Object? paymentInstructions = _unchangedPreference,
    Object? reusablePaymentPage = _unchangedPreference,
  }) => ManagerEventSetupPreferences(
    timezone: identical(timezone, _unchangedPreference)
        ? this.timezone
        : timezone as String?,
    usualDurationMinutes: identical(usualDurationMinutes, _unchangedPreference)
        ? this.usualDurationMinutes
        : usualDurationMinutes as int?,
    preferredVenueId: identical(preferredVenueId, _unchangedPreference)
        ? this.preferredVenueId
        : preferredVenueId as String?,
    offerValidityMinutes: identical(offerValidityMinutes, _unchangedPreference)
        ? this.offerValidityMinutes
        : offerValidityMinutes as int?,
    collectionPreference: identical(collectionPreference, _unchangedPreference)
        ? this.collectionPreference
        : collectionPreference as EventCollectionPreference?,
    currency: identical(currency, _unchangedPreference)
        ? this.currency
        : currency as String?,
    offerMessageTemplate: identical(offerMessageTemplate, _unchangedPreference)
        ? this.offerMessageTemplate
        : offerMessageTemplate as String?,
    paymentInstructions: identical(paymentInstructions, _unchangedPreference)
        ? this.paymentInstructions
        : paymentInstructions as String?,
    reusablePaymentPage: identical(reusablePaymentPage, _unchangedPreference)
        ? this.reusablePaymentPage
        : reusablePaymentPage as ReusableOrganizerPaymentPage?,
  );
}

bool _validId(String value) =>
    RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$').hasMatch(value);
