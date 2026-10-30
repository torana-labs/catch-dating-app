import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:cloud_functions/cloud_functions.dart';

final _hashPattern = RegExp(r'^[a-f0-9]{64}$');
final _idPattern = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$');
final _requestPattern = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$');

/// Manager-authorized snapshot; private suggestions never enter OrganizerHostDefaults.
class ManagerEventSetupDefaults {
  const ManagerEventSetupDefaults({
    required this.organizerId,
    required this.cityId,
    required this.marketId,
    required this.timezone,
    required this.organizerDefaultsRevision,
    required this.basicsReviewedHash,
    required this.preferencesRevision,
    required this.preferences,
    required this.preferencesHash,
    required this.reviewedDefaultsHash,
  });

  final String organizerId;
  final String? cityId;
  final String? marketId;
  final String? timezone;
  final int? organizerDefaultsRevision;
  final String basicsReviewedHash;
  final int preferencesRevision;
  final ManagerEventSetupPreferences preferences;
  final String preferencesHash;
  final String reviewedDefaultsHash;

  factory ManagerEventSetupDefaults.fromResponse(Object? response) {
    if (response is! Map) {
      throw const FormatException('Invalid manager defaults response');
    }
    final data = Map<String, Object?>.from(response);
    const keys = {
      'organizerId',
      'city',
      'timezone',
      'organizerDefaultsRevision',
      'basicsReviewedHash',
      'preferencesRevision',
      'preferences',
      'preferencesHash',
      'reviewedDefaultsHash',
    };
    if (data.length != keys.length ||
        data.keys.any((key) => !keys.contains(key))) {
      throw const FormatException('Invalid manager defaults response');
    }
    final cityRaw = data['city'];
    if (cityRaw != null && cityRaw is! Map) {
      throw const FormatException('Invalid organizer city');
    }
    final city = cityRaw == null
        ? null
        : Map<String, Object?>.from(cityRaw as Map);
    if (city != null &&
        (city.length != 2 ||
            city['cityId'] is! String ||
            city['marketId'] is! String ||
            !_idPattern.hasMatch(city['cityId'] as String) ||
            !_idPattern.hasMatch(city['marketId'] as String))) {
      throw const FormatException('Invalid organizer city');
    }
    final organizerId = data['organizerId'];
    final timezone = data['timezone'];
    final publicRevision = data['organizerDefaultsRevision'];
    final basicsHash = data['basicsReviewedHash'];
    final revision = data['preferencesRevision'];
    final preferenceRaw = data['preferences'];
    final preferenceHash = data['preferencesHash'];
    final reviewedHash = data['reviewedDefaultsHash'];
    if (organizerId is! String ||
        !_idPattern.hasMatch(organizerId) ||
        (timezone != null &&
            (timezone is! String ||
                timezone.isEmpty ||
                timezone.length > 100)) ||
        (publicRevision != null &&
            (publicRevision is! int ||
                publicRevision < 0 ||
                publicRevision > 1000000000)) ||
        basicsHash is! String ||
        !_hashPattern.hasMatch(basicsHash) ||
        revision is! int ||
        revision < 0 ||
        revision > 1000000000 ||
        preferenceRaw is! Map ||
        preferenceHash is! String ||
        !_hashPattern.hasMatch(preferenceHash) ||
        reviewedHash is! String ||
        !_hashPattern.hasMatch(reviewedHash)) {
      throw const FormatException('Invalid manager defaults response');
    }
    final preferences = ManagerEventSetupPreferences.fromSparseJson(
      Map<String, Object?>.from(preferenceRaw),
    );
    if (timezone != preferences.timezone ||
        (revision > 0 && publicRevision != revision)) {
      throw const FormatException('Manager defaults projection mismatch');
    }
    return ManagerEventSetupDefaults(
      organizerId: organizerId,
      cityId: city?['cityId'] as String?,
      marketId: city?['marketId'] as String?,
      timezone: timezone as String?,
      organizerDefaultsRevision: publicRevision as int?,
      basicsReviewedHash: basicsHash,
      preferencesRevision: revision,
      preferences: preferences,
      preferencesHash: preferenceHash,
      reviewedDefaultsHash: reviewedHash,
    );
  }
}

/// Exact frozen command. Each value is a set or clear, never a JSON null.
class ManagerEventSetupDefaultsUpdateRequest {
  const ManagerEventSetupDefaultsUpdateRequest({
    required this.organizerId,
    required this.requestId,
    required this.expectedRevision,
    required this.reviewedDefaultsHash,
    required this.changes,
  });

  final String organizerId;
  final String requestId;
  final int expectedRevision;
  final String reviewedDefaultsHash;
  final Map<String, Object?> changes;

  static const fieldNames = {
    'timezone',
    'usualDurationMinutes',
    'preferredVenueId',
    'offerValidityMinutes',
    'collectionPreference',
    'currency',
    'offerMessageTemplate',
    'paymentInstructions',
    'reusablePaymentPage',
  };

  factory ManagerEventSetupDefaultsUpdateRequest.forChange({
    required ManagerEventSetupDefaults current,
    required String requestId,
    required ManagerEventSetupPreferences next,
  }) {
    if (!next.isValid) throw ArgumentError.value(next, 'next');
    final before = current.preferences.toSparseJson();
    final after = next.toSparseJson();
    final changes = <String, Object?>{};
    for (final field in fieldNames) {
      if (_equalValue(before[field], after[field])) continue;
      changes[field] = after.containsKey(field)
          ? {'mode': 'set', 'value': after[field]}
          : {'mode': 'clear'};
    }
    return ManagerEventSetupDefaultsUpdateRequest(
      organizerId: current.organizerId,
      requestId: requestId,
      expectedRevision: current.preferencesRevision,
      reviewedDefaultsHash: current.reviewedDefaultsHash,
      changes: changes,
    );
  }

  factory ManagerEventSetupDefaultsUpdateRequest.fromJson(
    Map<String, dynamic> json,
  ) {
    final changesRaw = json['changes'];
    if (changesRaw is! Map) {
      throw const FormatException('Invalid pending defaults update');
    }
    final request = ManagerEventSetupDefaultsUpdateRequest(
      organizerId: json['organizerId'] as String,
      requestId: json['requestId'] as String,
      expectedRevision: json['expectedRevision'] as int,
      reviewedDefaultsHash: json['reviewedDefaultsHash'] as String,
      changes: Map<String, Object?>.from(changesRaw),
    );
    if (!request.isValid) {
      throw const FormatException('Invalid pending defaults update');
    }
    return request;
  }

  bool get isValid {
    if (!_idPattern.hasMatch(organizerId) ||
        !_requestPattern.hasMatch(requestId) ||
        expectedRevision < 0 ||
        expectedRevision > 1000000000 ||
        !_hashPattern.hasMatch(reviewedDefaultsHash) ||
        changes.isEmpty ||
        changes.length > 9 ||
        changes.keys.any((key) => !fieldNames.contains(key))) {
      return false;
    }
    for (final entry in changes.entries) {
      final raw = entry.value;
      if (raw is! Map) return false;
      final change = Map<String, Object?>.from(raw);
      if (change['mode'] == 'clear') {
        if (change.length != 1) return false;
      } else if (change['mode'] == 'set') {
        if (change.length != 2 || !change.containsKey('value')) return false;
        try {
          ManagerEventSetupPreferences.fromSparseJson({
            entry.key: change['value'],
          });
        } catch (_) {
          return false;
        }
      } else {
        return false;
      }
    }
    return true;
  }

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'requestId': requestId,
    'expectedRevision': expectedRevision,
    'reviewedDefaultsHash': reviewedDefaultsHash,
    'changes': changes,
  };
}

bool _equalValue(Object? a, Object? b) {
  if (a is Map && b is Map) {
    if (a.length != b.length) return false;
    return a.keys.every((key) => _equalValue(a[key], b[key]));
  }
  return a == b;
}

class ManagerEventSetupDefaultsUpdateReceipt {
  const ManagerEventSetupDefaultsUpdateReceipt({
    required this.appliedRevision,
    required this.current,
    required this.replayed,
  });

  final int appliedRevision;
  final ManagerEventSetupDefaults current;
  final bool replayed;

  factory ManagerEventSetupDefaultsUpdateReceipt.fromResponse(
    Object? response,
  ) {
    if (response is! Map) {
      throw const FormatException('Invalid defaults receipt');
    }
    final data = Map<String, Object?>.from(response);
    final revision = data['appliedRevision'];
    final replayed = data['replayed'];
    if (data.length != 3 ||
        revision is! int ||
        revision < 1 ||
        replayed is! bool) {
      throw const FormatException('Invalid defaults receipt');
    }
    final current = ManagerEventSetupDefaults.fromResponse(data['current']);
    if (current.preferencesRevision < revision) {
      throw const FormatException('Invalid defaults receipt revision');
    }
    return ManagerEventSetupDefaultsUpdateReceipt(
      appliedRevision: revision,
      current: current,
      replayed: replayed,
    );
  }
}

class ManagerEventSetupDefaultsRepository {
  const ManagerEventSetupDefaultsRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<ManagerEventSetupDefaults> get(String organizerId) {
    if (!_idPattern.hasMatch(organizerId)) {
      throw ArgumentError.value(organizerId, 'organizerId');
    }
    return withBackendErrorContext(
      () async {
        final response = await _functions
            .httpsCallable('getOrganizerEventSetupDefaults')
            .call<Object?>({'organizerId': organizerId});
        final projection = ManagerEventSetupDefaults.fromResponse(
          response.data,
        );
        if (projection.organizerId != organizerId) {
          throw const FormatException('Manager defaults identity changed');
        }
        return projection;
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'read organizer event defaults',
        resource: 'getOrganizerEventSetupDefaults',
      ),
    );
  }

  Future<ManagerEventSetupDefaultsUpdateReceipt> update(
    ManagerEventSetupDefaultsUpdateRequest request,
  ) {
    if (!request.isValid) throw ArgumentError.value(request, 'request');
    return withBackendErrorContext(
      () async {
        final response = await _functions
            .httpsCallable('updateOrganizerEventSetupDefaults')
            .call<Object?>(request.toJson());
        final receipt = ManagerEventSetupDefaultsUpdateReceipt.fromResponse(
          response.data,
        );
        if (receipt.current.organizerId != request.organizerId ||
            receipt.appliedRevision <= request.expectedRevision) {
          throw const FormatException(
            'Manager defaults receipt changed identity',
          );
        }
        return receipt;
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'update organizer event defaults',
        resource: 'updateOrganizerEventSetupDefaults',
      ),
    );
  }
}
