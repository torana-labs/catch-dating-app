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
      labels.any(
        (label) =>
            label.isEmpty ||
            label.length > 63 ||
            !RegExp(r'^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$').hasMatch(label),
      )) {
    return false;
  }
  return RegExp(r'^[a-z]{2,}$').hasMatch(labels.last);
}

const _unchangedPreference = Object();

/// The cancellation policies paid events can start with: flexible refunds up
/// to 24 hours before, standard up to 3 days before, strict never.
const eventRefundPolicies = <String>{'flexible', 'standard', 'strict'};

/// Which automatic messages new events send.
class EventAutoMessages {
  const EventAutoMessages({required this.thankYou, required this.arrival});

  /// The thank-you the morning after.
  final bool thankYou;

  /// The reminder the day before.
  final bool arrival;

  Map<String, Object?> toJson() => {'thankYou': thankYou, 'arrival': arrival};

  @override
  bool operator ==(Object other) =>
      other is EventAutoMessages &&
      other.thankYou == thankYou &&
      other.arrival == arrival;

  @override
  int get hashCode => Object.hash(thankYou, arrival);
}

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
    this.bookingMode,
    this.startingPriceMinor,
    this.places,
    this.waitlistEnabled,
    this.refundPolicy,
    this.askedAtBooking,
    this.autoMessages,
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

  /// `anyone`, `followersFirst` or `askFirst`.
  final String? bookingMode;

  /// Price per place new events start with, in minor units.
  final int? startingPriceMinor;
  final int? places;
  final bool? waitlistEnabled;

  /// One of [eventRefundPolicies].
  final String? refundPolicy;

  /// Ids of the questions guests answer when they book.
  final List<String>? askedAtBooking;
  final EventAutoMessages? autoMessages;

  /// The private server projection is sparse: missing means no suggestion.
  /// A present null is invalid and must never be treated as a clear command.
  factory ManagerEventSetupPreferences.fromSparseJson(
    Map<String, Object?> json,
  ) {
    const keys = {
      'timezone',
      'usualDurationMinutes',
      'preferredVenueId',
      'offerValidityMinutes',
      'collectionPreference',
      'currency',
      'offerMessageTemplate',
      'paymentInstructions',
      'reusablePaymentPage',
      'bookingMode',
      'startingPriceMinor',
      'places',
      'waitlistEnabled',
      'refundPolicy',
      'askedAtBooking',
      'autoMessages',
    };
    if (json.keys.any((key) => !keys.contains(key)) ||
        json.values.any((value) => value == null)) {
      throw const FormatException('Invalid private setup preferences');
    }
    final collection = json['collectionPreference'];
    final page = json['reusablePaymentPage'];
    if (collection != null &&
        (collection is! String ||
            !EventCollectionPreference.values.any(
              (v) => v.name == collection,
            ))) {
      throw const FormatException('Invalid collection preference');
    }
    if (page != null && page is! Map) {
      throw const FormatException('Invalid reusable payment page');
    }
    final pageData = page == null
        ? null
        : Map<String, Object?>.from(page as Map);
    if (pageData != null &&
        (pageData.length != 2 ||
            pageData['url'] is! String ||
            pageData['reusableForEvents'] != true)) {
      throw const FormatException('Invalid reusable payment page');
    }
    final questions = json['askedAtBooking'];
    final messages = json['autoMessages'];
    if ((json['bookingMode'] != null && json['bookingMode'] is! String) ||
        (json['startingPriceMinor'] != null &&
            json['startingPriceMinor'] is! int) ||
        (json['places'] != null && json['places'] is! int) ||
        (json['waitlistEnabled'] != null && json['waitlistEnabled'] is! bool) ||
        (json['refundPolicy'] != null && json['refundPolicy'] is! String) ||
        (questions != null &&
            (questions is! List || questions.any((id) => id is! String))) ||
        (messages != null &&
            (messages is! Map ||
                messages.length != 2 ||
                messages['thankYou'] is! bool ||
                messages['arrival'] is! bool))) {
      throw const FormatException('Invalid event defaults');
    }
    final preferences = ManagerEventSetupPreferences(
      bookingMode: json['bookingMode'] as String?,
      startingPriceMinor: json['startingPriceMinor'] as int?,
      places: json['places'] as int?,
      waitlistEnabled: json['waitlistEnabled'] as bool?,
      refundPolicy: json['refundPolicy'] as String?,
      askedAtBooking: questions == null
          ? null
          : List<String>.unmodifiable(questions as List),
      autoMessages: messages == null
          ? null
          : EventAutoMessages(
              thankYou: (messages as Map)['thankYou'] as bool,
              arrival: messages['arrival'] as bool,
            ),
      timezone: json['timezone'] as String?,
      usualDurationMinutes: json['usualDurationMinutes'] as int?,
      preferredVenueId: json['preferredVenueId'] as String?,
      offerValidityMinutes: json['offerValidityMinutes'] as int?,
      collectionPreference: collection == null
          ? null
          : EventCollectionPreference.values.byName(collection as String),
      currency: json['currency'] as String?,
      offerMessageTemplate: json['offerMessageTemplate'] as String?,
      paymentInstructions: json['paymentInstructions'] as String?,
      reusablePaymentPage: pageData == null
          ? null
          : ReusableOrganizerPaymentPage(
              pageData['url'] as String,
              reusableForEvents: true,
            ),
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
              isCanonicalPublicPaymentPageUrl(reusablePaymentPage!.url))) &&
      (bookingMode == null ||
          const {
            'anyone',
            'followersFirst',
            'askFirst',
          }.contains(bookingMode)) &&
      (startingPriceMinor == null ||
          (startingPriceMinor! >= 0 && startingPriceMinor! <= 100000000)) &&
      (places == null || (places! >= 1 && places! <= 1000)) &&
      (refundPolicy == null || eventRefundPolicies.contains(refundPolicy)) &&
      (askedAtBooking == null ||
          (askedAtBooking!.length <= 20 &&
              askedAtBooking!.toSet().length == askedAtBooking!.length &&
              askedAtBooking!.every(_validId)));

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
    if (paymentInstructions != null) 'paymentInstructions': paymentInstructions,
    if (reusablePaymentPage != null)
      'reusablePaymentPage': {
        'url': reusablePaymentPage!.url,
        'reusableForEvents': true,
      },
    if (bookingMode != null) 'bookingMode': bookingMode,
    if (startingPriceMinor != null) 'startingPriceMinor': startingPriceMinor,
    if (places != null) 'places': places,
    if (waitlistEnabled != null) 'waitlistEnabled': waitlistEnabled,
    if (refundPolicy != null) 'refundPolicy': refundPolicy,
    if (askedAtBooking != null) 'askedAtBooking': askedAtBooking,
    if (autoMessages != null) 'autoMessages': autoMessages!.toJson(),
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
    Object? bookingMode = _unchangedPreference,
    Object? startingPriceMinor = _unchangedPreference,
    Object? places = _unchangedPreference,
    Object? waitlistEnabled = _unchangedPreference,
    Object? refundPolicy = _unchangedPreference,
    Object? askedAtBooking = _unchangedPreference,
    Object? autoMessages = _unchangedPreference,
  }) => ManagerEventSetupPreferences(
    bookingMode: identical(bookingMode, _unchangedPreference)
        ? this.bookingMode
        : bookingMode as String?,
    startingPriceMinor: identical(startingPriceMinor, _unchangedPreference)
        ? this.startingPriceMinor
        : startingPriceMinor as int?,
    places: identical(places, _unchangedPreference)
        ? this.places
        : places as int?,
    waitlistEnabled: identical(waitlistEnabled, _unchangedPreference)
        ? this.waitlistEnabled
        : waitlistEnabled as bool?,
    refundPolicy: identical(refundPolicy, _unchangedPreference)
        ? this.refundPolicy
        : refundPolicy as String?,
    askedAtBooking: identical(askedAtBooking, _unchangedPreference)
        ? this.askedAtBooking
        : askedAtBooking as List<String>?,
    autoMessages: identical(autoMessages, _unchangedPreference)
        ? this.autoMessages
        : autoMessages as EventAutoMessages?,
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
