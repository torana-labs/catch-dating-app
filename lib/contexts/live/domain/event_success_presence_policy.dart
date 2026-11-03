import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';

/// Room presence timing from
/// `contracts/catalogs/event_success_presence_policy.json`, the values the
/// heartbeat callable and the server's rotation and late-placement checks use.
/// `test/contexts/live/event_success_presence_derivation_test.dart` fails when
/// they differ.
const eventSuccessPresencePolicy = EventSuccessPresencePolicy(
  heartbeatIntervalSeconds: 30,
  presentWindowSeconds: 90,
  likelyDepartedAfterSeconds: 300,
);
