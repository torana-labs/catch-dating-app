import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:flutter/foundation.dart';

/// What editing a saved event adds to [CreateHandlers]: Save, and the
/// fields only an edit shows, as callbacks the edit screen supplies.
@immutable
class CreateEditHandlers {
  const CreateEditHandlers({
    required this.onSave,
    required this.onPlaceName,
    required this.onIncluded,
    required this.onAccessibility,
    required this.onRoutePlan,
    required this.onAdmission,
    required this.onInviteCode,
    required this.onCohortCaps,
    required this.onMaxMen,
    required this.onMaxWomen,
    required this.onDemandPricing,
    required this.onDemandStep,
    required this.onDemandMax,
    required this.onAgeRange,
    required this.onCancellationPolicy,
  });

  /// Check the edit and send it.
  final VoidCallback onSave;

  /// The place's name as guests see it.
  final ValueChanged<String> onPlaceName;
  final ValueChanged<String> onIncluded;
  final ValueChanged<String> onAccessibility;

  /// The route plan of a moving event; null turns it off.
  final ValueChanged<RouteEventPlan?> onRoutePlan;
  final ValueChanged<EventAdmissionPreset> onAdmission;
  final ValueChanged<String> onInviteCode;
  final ValueChanged<bool> onCohortCaps;
  final ValueChanged<String> onMaxMen;
  final ValueChanged<String> onMaxWomen;
  final ValueChanged<bool> onDemandPricing;
  final ValueChanged<String> onDemandStep;
  final ValueChanged<String> onDemandMax;
  final void Function(int minAge, int maxAge) onAgeRange;
  final ValueChanged<EventCancellationPolicyId> onCancellationPolicy;
}
