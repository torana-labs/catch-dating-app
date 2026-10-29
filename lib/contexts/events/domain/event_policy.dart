import 'dart:math' as math;

import 'package:catch_dating_app/contexts/profiles/profiles.dart';

part 'event_policy/cohort.dart';
part 'event_policy/admission.dart';
part 'event_policy/pricing.dart';
part 'event_policy/cancellation.dart';
part 'event_policy/settlement.dart';
part 'event_policy/bundle.dart';
part 'event_policy/engine.dart';
part 'event_policy/json_helpers.dart';

/// IN DEVELOPMENT: parallel event policy engine.
///
/// This domain layer owns the production policy snapshot shape while the
/// migration from legacy EventConstraints/priceInPaise/capacityLimit is in
/// progress. Keep backward-compatible fallbacks until older event documents are
/// migrated.
const eventPolicyEngineDevelopmentStatus =
    'production_migration_policy_snapshot_v1';
