import 'package:catch_dating_app/contexts/events/domain/private_event_setup_basics.dart';

final _setupInventoryId = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$');
final _setupInventoryCursor = RegExp(r'^[A-Za-z0-9_-]{1,1024}$');

enum PrivateEventSetupScope { upcoming, past, cancelled }

class PrivateEventSetupInventoryItem {
  const PrivateEventSetupInventoryItem({
    required this.eventId,
    required this.name,
    required this.city,
    required this.localDate,
    required this.localStartTime,
    required this.timezone,
    required this.startTimeMillis,
    required this.setupRevision,
    required this.detailsConfigured,
    this.status = 'active',
  });

  final String eventId;
  final String name;
  final EventSetupCity city;
  final String localDate;
  final String localStartTime;
  final String timezone;
  final int startTimeMillis;
  final int setupRevision;
  final bool detailsConfigured;
  final String status;

  factory PrivateEventSetupInventoryItem.fromResponse(Object? response) {
    if (response is! Map) {
      throw const FormatException('Invalid private event inventory item');
    }
    final data = Map<String, Object?>.from(response);
    const keys = {
      'eventId',
      'name',
      'city',
      'localDate',
      'localStartTime',
      'timezone',
      'startTimeMillis',
      'setupRevision',
      'status',
      'detailsConfigured',
    };
    final rawCity = data['city'];
    if (data.length != keys.length ||
        data.keys.any((key) => !keys.contains(key)) ||
        rawCity is! Map) {
      throw const FormatException('Invalid private event inventory item');
    }
    final city = Map<String, Object?>.from(rawCity);
    final eventId = data['eventId'];
    final name = data['name'];
    final localDate = data['localDate'];
    final localStartTime = data['localStartTime'];
    final timezone = data['timezone'];
    final startTimeMillis = data['startTimeMillis'];
    final revision = data['setupRevision'];
    final configured = data['detailsConfigured'];
    if (city.length != 2 ||
        city['cityId'] is! String ||
        city['marketId'] is! String ||
        eventId is! String ||
        !_setupInventoryId.hasMatch(eventId) ||
        name is! String ||
        name.trim().isEmpty ||
        name.length > 120 ||
        localDate is! String ||
        localStartTime is! String ||
        timezone is! String ||
        timezone.isEmpty ||
        timezone.length > 100 ||
        startTimeMillis is! int ||
        revision is! int ||
        revision < 1 ||
        !const ['active', 'cancelled'].contains(data['status']) ||
        configured is! bool) {
      throw const FormatException('Invalid private event inventory item');
    }
    final basics = PrivateEventBasics(
      name: name,
      city: EventSetupValue.set(
        EventSetupCity(
          cityId: city['cityId'] as String,
          marketId: city['marketId'] as String,
        ),
      ),
      localDate: localDate,
      localStartTime: localStartTime,
      timezone: EventSetupValue.set(timezone),
    );
    if (!basics.isValid ||
        !_setupInventoryId.hasMatch(city['cityId'] as String) ||
        !_setupInventoryId.hasMatch(city['marketId'] as String)) {
      throw const FormatException('Invalid private event inventory item');
    }
    return PrivateEventSetupInventoryItem(
      eventId: eventId,
      name: name,
      city: basics.city.value!,
      localDate: localDate,
      localStartTime: localStartTime,
      timezone: timezone,
      startTimeMillis: startTimeMillis,
      setupRevision: revision,
      detailsConfigured: configured,
      status: data['status'] as String,
    );
  }
}

class PrivateEventSetupInventoryPage {
  const PrivateEventSetupInventoryPage({
    required this.events,
    required this.nextCursor,
  });

  final List<PrivateEventSetupInventoryItem> events;
  final String? nextCursor;

  factory PrivateEventSetupInventoryPage.fromResponse(Object? response) {
    if (response is! Map) {
      throw const FormatException('Invalid private event inventory');
    }
    final data = Map<String, Object?>.from(response);
    final rawEvents = data['events'];
    final cursor = data['nextCursor'];
    if (data.length != 2 ||
        rawEvents is! List ||
        rawEvents.length > 50 ||
        (cursor != null &&
            (cursor is! String || !_setupInventoryCursor.hasMatch(cursor)))) {
      throw const FormatException('Invalid private event inventory');
    }
    final events = rawEvents
        .map(PrivateEventSetupInventoryItem.fromResponse)
        .toList(growable: false);
    if (events.map((event) => event.eventId).toSet().length != events.length) {
      throw const FormatException('Duplicate private event inventory item');
    }
    return PrivateEventSetupInventoryPage(
      events: events,
      nextCursor: cursor as String?,
    );
  }
}

/// Request validation shares the inventory wire constraints with decoding.
bool isValidPrivateEventInventoryRequest({
  required String organizerId,
  required int limit,
  String? cursor,
}) =>
    _setupInventoryId.hasMatch(organizerId) &&
    limit >= 1 &&
    limit <= 50 &&
    (cursor == null || _setupInventoryCursor.hasMatch(cursor));
