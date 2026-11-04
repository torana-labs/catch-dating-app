import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_platform/schema_contracts/generated/event_success_presence_policy.g.dart';

/// Room presence timing from
/// `contracts/catalogs/event_success_presence_policy.json`, the values the
/// heartbeat callable and the server's rotation and late-placement checks use.
const eventSuccessPresencePolicy = EventSuccessPresencePolicy(
  heartbeatIntervalSeconds:
      EventSuccessPresencePolicyCatalog.heartbeatIntervalSeconds,
  presentWindowSeconds: EventSuccessPresencePolicyCatalog.presentWindowSeconds,
  likelyDepartedAfterSeconds:
      EventSuccessPresencePolicyCatalog.likelyDepartedAfterSeconds,
);
