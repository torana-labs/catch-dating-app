import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';

const eventPreferenceFields = <String>{
  'usualDurationMinutes',
  'preferredVenueId',
  'offerValidityMinutes',
  'collectionPreference',
  'currency',
  'offerMessageTemplate',
  'paymentInstructions',
  'reusablePaymentPage',
  'admissionPreset',
  'expectedAmountMinor',
};

final _idPattern = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$');
final _requestPattern = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$');
final _hashPattern = RegExp(r'^[a-f0-9]{64}$');

/// Parses a Host-entered override before constructing the full ten-field
/// command. URL reuse still requires separate, explicit Host attestation.
Map<String, Object?> privateEventPreferenceSetIntentForInput(
  String field,
  String value,
) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) throw const FormatException('Empty event preference');
  switch (field) {
    case 'usualDurationMinutes':
    case 'offerValidityMinutes':
    case 'expectedAmountMinor':
      final minutesOrAmount = int.tryParse(trimmed);
      if (minutesOrAmount == null) {
        throw const FormatException('Invalid numeric event preference');
      }
      return {'mode': 'set', 'value': minutesOrAmount};
    case 'currency':
      return {'mode': 'set', 'value': trimmed.toUpperCase()};
    case 'reusablePaymentPage':
      if (!isCanonicalPublicPaymentPageUrl(trimmed)) {
        throw const FormatException('Invalid reusable event payment page');
      }
      return {
        'mode': 'set',
        'value': {'url': trimmed, 'reusableForEvents': true},
      };
    default:
      return {'mode': 'set', 'value': trimmed};
  }
}

/// All ten event-local intentions are required by the command. A null field
/// has no meaning: inherit, set and clear must remain distinguishable.
class PrivateEventPreferenceIntents {
  const PrivateEventPreferenceIntents({
    this.usualDurationMinutes = const EventSetupValue.inherit(),
    this.preferredVenueId = const EventSetupValue.inherit(),
    this.offerValidityMinutes = const EventSetupValue.inherit(),
    this.collectionPreference = const EventSetupValue.inherit(),
    this.currency = const EventSetupValue.inherit(),
    this.offerMessageTemplate = const EventSetupValue.inherit(),
    this.paymentInstructions = const EventSetupValue.inherit(),
    this.reusablePaymentPage = const EventSetupValue.inherit(),
    this.admissionPreset = const EventSetupValue.inherit(),
    this.expectedAmountMinor = const EventSetupValue.clear(),
  });

  final EventSetupValue<int> usualDurationMinutes;
  final EventSetupValue<String> preferredVenueId;
  final EventSetupValue<int> offerValidityMinutes;
  final EventSetupValue<EventCollectionPreference> collectionPreference;
  final EventSetupValue<String> currency;
  final EventSetupValue<String> offerMessageTemplate;
  final EventSetupValue<String> paymentInstructions;
  final EventSetupValue<ReusableOrganizerPaymentPage> reusablePaymentPage;
  final EventSetupValue<String> admissionPreset;
  final EventSetupValue<int> expectedAmountMinor;

  static const _admissionValues = <String>{
    'openCapacity',
    'inviteOnly',
    'balancedSingles',
    'fixedCohortCaps',
  };

  bool get isValid {
    final amount = expectedAmountMinor;
    if (amount.mode == EventSetupValueMode.inherit ||
        (amount.mode == EventSetupValueMode.set &&
            (amount.value == null ||
                amount.value! < 0 ||
                amount.value! > 100000000))) {
      return false;
    }
    try {
      return _hasValidSetValues();
    } catch (_) {
      return false;
    }
  }

  bool _hasValidSetValues() {
    final json = toJson();
    for (final entry in json.entries) {
      final intent = Map<String, Object?>.from(entry.value as Map);
      if (intent['mode'] != 'set') continue;
      final value = intent['value'];
      if (entry.key == 'admissionPreset') {
        if (value is! String || !_admissionValues.contains(value)) return false;
      } else if (entry.key != 'expectedAmountMinor') {
        try {
          ManagerEventSetupPreferences.fromSparseJson({entry.key: value});
        } catch (_) {
          return false;
        }
      }
    }
    return true;
  }

  Map<String, Object?> toJson() => {
    'usualDurationMinutes': usualDurationMinutes.toJson((value) => value),
    'preferredVenueId': preferredVenueId.toJson((value) => value),
    'offerValidityMinutes': offerValidityMinutes.toJson((value) => value),
    'collectionPreference': collectionPreference.toJson((value) => value.name),
    'currency': currency.toJson((value) => value),
    'offerMessageTemplate': offerMessageTemplate.toJson((value) => value),
    'paymentInstructions': paymentInstructions.toJson((value) => value),
    'reusablePaymentPage': reusablePaymentPage.toJson(
      (value) => {
        'url': value.url,
        'reusableForEvents': value.reusableForEvents,
      },
    ),
    'admissionPreset': admissionPreset.toJson((value) => value),
    'expectedAmountMinor': expectedAmountMinor.toJson((value) => value),
  };

  factory PrivateEventPreferenceIntents.fromJson(Map<String, Object?> json) {
    if (json.keys.toSet().difference(eventPreferenceFields).isNotEmpty ||
        json.length != eventPreferenceFields.length) {
      throw const FormatException('Invalid event preference fields');
    }
    EventSetupValue<T> read<T>(String key, T Function(Object?) decode) {
      final raw = json[key];
      if (raw is! Map) throw const FormatException('Invalid preference intent');
      final intent = Map<String, Object?>.from(raw);
      if (intent.length == 1 && intent['mode'] == 'inherit') {
        return const EventSetupValue.inherit();
      }
      if (intent.length == 1 && intent['mode'] == 'clear') {
        return const EventSetupValue.clear();
      }
      if (intent.length == 2 &&
          intent['mode'] == 'set' &&
          intent.containsKey('value')) {
        return EventSetupValue.set(decode(intent['value']));
      }
      throw const FormatException('Invalid preference intent');
    }

    int integer(Object? value) {
      if (value is! int) {
        throw const FormatException('Invalid integer preference');
      }
      return value;
    }

    String string(Object? value) {
      if (value is! String) {
        throw const FormatException('Invalid text preference');
      }
      return value;
    }

    EventCollectionPreference collection(Object? value) =>
        EventCollectionPreference.values.byName(string(value));
    ReusableOrganizerPaymentPage page(Object? value) {
      if (value is! Map) throw const FormatException('Invalid reusable page');
      final data = Map<String, Object?>.from(value);
      if (data.length != 2 ||
          data['url'] is! String ||
          data['reusableForEvents'] != true) {
        throw const FormatException('Invalid reusable page');
      }
      return ReusableOrganizerPaymentPage(
        data['url'] as String,
        reusableForEvents: true,
      );
    }

    final intents = PrivateEventPreferenceIntents(
      usualDurationMinutes: read('usualDurationMinutes', integer),
      preferredVenueId: read('preferredVenueId', string),
      offerValidityMinutes: read('offerValidityMinutes', integer),
      collectionPreference: read('collectionPreference', collection),
      currency: read('currency', string),
      offerMessageTemplate: read('offerMessageTemplate', string),
      paymentInstructions: read('paymentInstructions', string),
      reusablePaymentPage: read('reusablePaymentPage', page),
      admissionPreset: read('admissionPreset', string),
      expectedAmountMinor: read('expectedAmountMinor', integer),
    );
    if (!intents.isValid) {
      throw const FormatException('Invalid event preferences');
    }
    return intents;
  }
}

/// Manager-only saved event projection. The server returns effective values
/// and their origin; this restores the edit intentions after app restart.
class PrivateEventPreferencesSnapshot {
  const PrivateEventPreferencesSnapshot({
    required this.revision,
    required this.intents,
    required this.resolvedValues,
    required this.paymentTerms,
  });

  final int revision;
  final PrivateEventPreferenceIntents intents;
  final Map<String, Object?> resolvedValues;
  final Map<String, Object?> paymentTerms;

  factory PrivateEventPreferencesSnapshot.fromResponse(Object? response) {
    if (response is! Map) {
      throw const FormatException('Invalid event preferences');
    }
    final data = Map<String, Object?>.from(response);
    final revision = data['revision'];
    final rawPreferences = data['preferences'];
    final rawTerms = data['paymentTerms'];
    if (data.length != 3 ||
        revision is! int ||
        revision < 1 ||
        rawPreferences is! Map ||
        rawTerms is! Map) {
      throw const FormatException('Invalid event preferences');
    }
    final preferences = Map<String, Object?>.from(rawPreferences);
    final terms = Map<String, Object?>.from(rawTerms);
    if (preferences.keys.toSet().difference({
          ...eventPreferenceFields,
          'defaultsRevision',
          'defaultsHash',
        }).isNotEmpty ||
        preferences.length != eventPreferenceFields.length + 2 ||
        preferences['defaultsRevision'] is! int ||
        preferences['defaultsHash'] is! String ||
        !_hashPattern.hasMatch(preferences['defaultsHash'] as String) ||
        terms['revision'] != revision ||
        terms['sourceDefaultsHash'] != preferences['defaultsHash'] ||
        terms['sourceDefaultsRevision'] != preferences['defaultsRevision']) {
      throw const FormatException('Invalid event preference snapshot');
    }
    final intentsJson = <String, Object?>{};
    final resolvedValues = <String, Object?>{};
    for (final key in eventPreferenceFields) {
      final rawField = preferences[key];
      if (rawField is! Map) {
        throw const FormatException('Invalid resolved field');
      }
      final field = Map<String, Object?>.from(rawField);
      if (field.length != 2 || !field.containsKey('value')) {
        throw const FormatException('Invalid resolved field');
      }
      final source = field['source'];
      final value = field['value'];
      if (source == 'organizer' && key != 'expectedAmountMinor') {
        intentsJson[key] = {'mode': 'inherit'};
      } else if (source == 'event' && value != null) {
        intentsJson[key] = {'mode': 'set', 'value': value};
      } else if (source == 'cleared' && value == null) {
        intentsJson[key] = {'mode': 'clear'};
      } else {
        throw const FormatException('Invalid preference source');
      }
      resolvedValues[key] = value;
    }
    return PrivateEventPreferencesSnapshot(
      revision: revision,
      intents: PrivateEventPreferenceIntents.fromJson(intentsJson),
      resolvedValues: resolvedValues,
      paymentTerms: terms,
    );
  }
}

class PrivateEventPreferencesUpdateRequest {
  const PrivateEventPreferencesUpdateRequest({
    required this.organizerId,
    required this.eventId,
    required this.requestId,
    required this.expectedSetupRevision,
    required this.expectedPreferencesRevision,
    required this.reviewedDefaultsHash,
    required this.intents,
    this.expectedActorUid,
  });

  final String? expectedActorUid;
  final String organizerId;
  final String eventId;
  final String requestId;
  final int expectedSetupRevision;
  final int expectedPreferencesRevision;
  final String reviewedDefaultsHash;
  final PrivateEventPreferenceIntents intents;

  bool get isValid =>
      (expectedActorUid == null || _idPattern.hasMatch(expectedActorUid!)) &&
      _idPattern.hasMatch(organizerId) &&
      _idPattern.hasMatch(eventId) &&
      _requestPattern.hasMatch(requestId) &&
      expectedSetupRevision >= 1 &&
      expectedSetupRevision <= 1000000000 &&
      expectedPreferencesRevision >= 0 &&
      expectedPreferencesRevision <= 1000000000 &&
      _hashPattern.hasMatch(reviewedDefaultsHash) &&
      intents.isValid;

  Map<String, Object?> toJson() => {
    if (expectedActorUid != null) 'expectedActorUid': expectedActorUid,
    'organizerId': organizerId,
    'eventId': eventId,
    'requestId': requestId,
    'expectedSetupRevision': expectedSetupRevision,
    'expectedPreferencesRevision': expectedPreferencesRevision,
    'reviewedDefaultsHash': reviewedDefaultsHash,
    'intents': intents.toJson(),
  };

  factory PrivateEventPreferencesUpdateRequest.fromJson(
    Map<String, dynamic> json,
  ) {
    final rawIntents = json['intents'];
    if (rawIntents is! Map) {
      throw const FormatException('Invalid preferences command');
    }
    final request = PrivateEventPreferencesUpdateRequest(
      expectedActorUid: json['expectedActorUid'] as String?,
      organizerId: json['organizerId'] as String,
      eventId: json['eventId'] as String,
      requestId: json['requestId'] as String,
      expectedSetupRevision: json['expectedSetupRevision'] as int,
      expectedPreferencesRevision: json['expectedPreferencesRevision'] as int,
      reviewedDefaultsHash: json['reviewedDefaultsHash'] as String,
      intents: PrivateEventPreferenceIntents.fromJson(
        Map<String, Object?>.from(rawIntents),
      ),
    );
    if (!request.isValid) {
      throw const FormatException('Invalid preferences command');
    }
    return request;
  }
}

class PrivateEventPreferencesRepository {
  const PrivateEventPreferencesRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<PrivateEventCreateReceipt> update(
    PrivateEventPreferencesUpdateRequest request,
  ) {
    if (!request.isValid) throw ArgumentError.value(request, 'request');
    return withBackendErrorContext(
      () async {
        final response = await _functions
            .httpsCallable('updatePrivateEventPreferences')
            .call<Object?>(request.toJson());
        final receipt = PrivateEventCreateReceipt.fromResponse(response.data);
        if (receipt.eventId != request.eventId ||
            receipt.setupRevision <= request.expectedSetupRevision) {
          throw const FormatException(
            'Preferences receipt changed event identity',
          );
        }
        return receipt;
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'update private event preferences',
        resource: 'updatePrivateEventPreferences',
      ),
    );
  }
}
