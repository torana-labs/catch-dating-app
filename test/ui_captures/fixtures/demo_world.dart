import 'dart:convert';
import 'dart:io';

/// Reader for demo world scenarios (schemaVersion 2). A world stores guest
/// records with timestamps; per-moment counts are derived here with the same
/// rules as tool/demo/lib/demo_world.mjs, which validates every world in CI.
/// See docs/plans/demo_world_scenarios_spec.md.
class DemoWorld {
  DemoWorld._(this._json);

  factory DemoWorld.load(String path) {
    final json = jsonDecode(File(path).readAsStringSync());
    if (json is! Map<String, Object?> || json['schemaVersion'] != 2) {
      throw FormatException('$path is not a schemaVersion 2 demo world.');
    }
    return DemoWorld._(json);
  }

  static bool isDemoWorld(Object? json) =>
      json is Map && json['schemaVersion'] == 2;

  final Map<String, Object?> _json;

  String get id => _json['id']! as String;
  String get timeZone => _json['timeZone']! as String;
  String get currency => _json['currency']! as String;
  Map<String, Object?> get host => _map(_json['host']);
  Map<String, Object?> get organizer => _map(_json['organizer']);
  Map<String, String> get moments => _map(
    _json['moments'],
  ).map((key, value) => MapEntry(key, value! as String));

  List<String> get personaIds => [
    for (final person in _list(_json['people']))
      _map(person)['personaId']! as String,
  ];

  String personaIdFor(String personId) =>
      _map(
            _list(_json['people']).firstWhere(
              (person) => _map(person)['id'] == personId,
              orElse: () => throw StateError('$id has no person $personId.'),
            ),
          )['personaId']!
          as String;

  Map<String, Object?> event(String eventId) => _map(
    _list(_json['events']).firstWhere(
      (event) => _map(event)['id'] == eventId,
      orElse: () => throw StateError('$id has no event $eventId.'),
    ),
  );

  Map<String, Object?> venueFor(String eventId) {
    final venueId = event(eventId)['venueId'];
    return _map(
      _list(_json['venues']).firstWhere(
        (venue) => _map(venue)['id'] == venueId,
        orElse: () => throw StateError('$id has no venue $venueId.'),
      ),
    );
  }

  DateTime civil(String date, String time) =>
      DateTime.parse('${date}T$time:00');

  /// Guests booked and checked in at a named moment.
  ({int booked, int checkedIn}) stateAt(String eventId, String moment) {
    final at = moments[moment];
    if (at == null) throw StateError('$id has no moment $moment.');
    var booked = 0;
    var checkedIn = 0;
    for (final item in _list(event(eventId)['attendance'])) {
      final record = _map(item);
      final cancelledAt = record['cancelledAt'] as String?;
      final checkedInAt = record['checkedInAt'] as String?;
      if ((record['bookedAt']! as String).compareTo(at) > 0) continue;
      if (cancelledAt != null && cancelledAt.compareTo(at) <= 0) continue;
      booked += 1;
      if (checkedInAt != null && checkedInAt.compareTo(at) <= 0) checkedIn += 1;
    }
    return (booked: booked, checkedIn: checkedIn);
  }

  static Map<String, Object?> _map(Object? value) {
    if (value is Map<String, Object?>) return value;
    if (value is Map) return value.map((key, child) => MapEntry('$key', child));
    throw const FormatException('Expected an object in the demo world.');
  }

  static List<Object?> _list(Object? value) =>
      value is List ? value : const <Object?>[];
}
