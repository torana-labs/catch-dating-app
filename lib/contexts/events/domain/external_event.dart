import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:catch_dating_app/organizers/domain/organizer_supply_capabilities.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'external_event.freezed.dart';
part 'external_event.g.dart';

@freezed
abstract class ExternalEvent with _$ExternalEvent {
  const ExternalEvent._();

  const factory ExternalEvent({
    required String id,
    required String canonicalHostId,
    required String compatibilityClubId,
    required String title,
    required String description,
    @TimestampConverter() required DateTime startTime,
    @NullableTimestampConverter() DateTime? endTime,
    String? timezone,
    required String meetingPoint,
    String? locationDetails,
    String? photoUrl,
    double? latitude,
    double? longitude,
    required ActivityKind activityKind,
    required EventInteractionModel interactionModel,
    String? priceDisplayText,
    int? parsedPriceInPaise,
    @Default(defaultCurrencyCode) String currency,
    required String status,
    required String publicationStatus,
    @Default(OrganizerSupplyCapabilities.unclaimedReadOnly())
    OrganizerSupplyCapabilities organizerCapabilities,
    String? citySlug,
    required List<ExternalEventLink> externalLinks,
    String? sourcePlatform,
  }) = _ExternalEvent;

  factory ExternalEvent.fromJson(Map<String, dynamic> json) {
    final meetingLocation = _map(json['meetingLocation']);
    final activity = _map(json['activity']);
    final price = _map(json['price']);
    final booking = _map(json['booking']);
    final discovery = _map(json['discovery']);
    final externalSource = _map(json['externalSource']);

    return _ExternalEvent(
      id: _string(json['eventId']) ?? '',
      canonicalHostId: _string(json['canonicalHostId']) ?? '',
      compatibilityClubId: _string(json['compatibilityClubId']) ?? '',
      title: _string(json['title']) ?? '',
      description: _string(json['description']) ?? '',
      startTime: _requiredTimestamp(json['startTime'], 'startTime'),
      endTime: _nullableTimestamp(json['endTime']),
      timezone: _string(json['timezone']),
      meetingPoint:
          _string(meetingLocation['name']) ??
          _string(json['meetingPoint']) ??
          '',
      locationDetails:
          _string(meetingLocation['notes']) ?? _string(json['locationDetails']),
      photoUrl: _string(json['photoUrl']),
      latitude: _number(meetingLocation['latitude']),
      longitude: _number(meetingLocation['longitude']),
      activityKind: _enumByName(
        ActivityKind.values,
        _string(activity['activityKind']),
        ActivityKind.openActivity,
      ),
      interactionModel: _enumByName(
        EventInteractionModel.values,
        _string(activity['interactionModel']),
        ActivityKind.openActivity.defaultInteractionModel,
      ),
      priceDisplayText: _string(price['displayText']),
      parsedPriceInPaise: _integer(price['parsedPriceInPaise']),
      currency: _string(price['currency']) ?? defaultCurrencyCode,
      status: _string(json['status']) ?? '',
      publicationStatus: _string(json['publicationStatus']) ?? '',
      organizerCapabilities: OrganizerSupplyCapabilities.fromJson(
        _map(json['organizerCapabilities']),
      ),
      citySlug: _string(discovery['citySlug']),
      externalLinks: (_list(booking['externalLinks']))
          .map(ExternalEventLink.fromJson)
          .where((link) => link.url.isNotEmpty)
          .toList(growable: false),
      sourcePlatform: _string(externalSource['platform']),
    );
  }

  bool get isPublic => publicationStatus == 'public';
  bool get isActive => status == 'active';
  bool isUpcomingAt(DateTime now) => isActive && startTime.isAfter(now);
  bool isDiscoverableAt(DateTime now) => isPublic && isUpcomingAt(now);
  bool get isBookableOnCatch => organizerCapabilities.bookable;
  bool get canJoinCatchWaitlist => organizerCapabilities.waitlistEnabled;
  bool get canContactHostOnCatch => organizerCapabilities.hostContactEnabled;
  bool get canRequestOrganizerClaim => organizerCapabilities.claimable;
  bool isReviewableAt(DateTime now) {
    final eventEnd = endTime;
    return eventEnd != null &&
        organizerCapabilities.reviewableAt(eventEnd: eventEnd, now: now);
  }

  ExternalEventLink? get primaryExternalLink {
    for (final link in externalLinks) {
      if (link.primary) return link;
    }
    return externalLinks.firstOrNull;
  }

  Uri? get primaryExternalUri {
    final url = primaryExternalLink?.url.trim();
    if (url == null || url.isEmpty) return null;
    final uri = Uri.tryParse(url);
    if (uri == null || !uri.hasScheme) return null;
    return uri;
  }

  String get platformLabel =>
      platformDisplayLabel(primaryExternalLink?.platform ?? sourcePlatform);
}

@freezed
abstract class ExternalEventLink with _$ExternalEventLink {
  const factory ExternalEventLink({
    @Default('') String platform,
    @Default('') String url,
    @Default('') String linkType,
    @Default('') String sourceEventKey,
    @Default('') String candidateId,
    required bool primary,
  }) = _ExternalEventLink;

  factory ExternalEventLink.fromJson(Map<String, dynamic> json) =>
      _$ExternalEventLinkFromJson(json);
}

String platformDisplayLabel(String? platform) {
  return switch (platform) {
    'bookMyShow' => 'BookMyShow',
    'district' => 'District',
    'luma' => 'Luma',
    'partiful' => 'Partiful',
    'sortMyScene' => 'Sort My Scene',
    _ => 'Source',
  };
}

DateTime _requiredTimestamp(Object? value, String field) {
  return dateTimeFromFirestoreValue(value, field: field);
}

DateTime? _nullableTimestamp(Object? value) {
  return nullableDateTimeFromFirestoreValue(value);
}

Map<String, dynamic> _map(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, value) => MapEntry('$key', value));
  }
  return const {};
}

List<Map<String, dynamic>> _list(Object? value) {
  if (value is! List) return const [];
  return [
    for (final item in value)
      if (item is Map<String, dynamic>)
        item
      else if (item is Map)
        item.map((key, value) => MapEntry('$key', value)),
  ];
}

String? _string(Object? value) {
  if (value is! String) return null;
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

double? _number(Object? value) {
  if (value is num) return value.toDouble();
  return null;
}

int? _integer(Object? value) {
  if (value is num) return value.toInt();
  return null;
}

T _enumByName<T extends Enum>(List<T> values, String? name, T fallback) {
  if (name == null) return fallback;
  for (final value in values) {
    if (value.name == name) return value;
  }
  return fallback;
}
