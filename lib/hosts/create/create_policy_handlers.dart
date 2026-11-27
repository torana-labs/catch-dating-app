import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/hosts/create/create_event_policy_state.dart';
import 'package:flutter/foundation.dart';

/// What the admission fields do when the host changes them: the format, the
/// invite code, cohort caps, demand pricing, the age range and the
/// cancellation policy. The create and edit screens both supply them, so
/// [CreateHandlers] carries one for either.
@immutable
class CreatePolicyHandlers {
  const CreatePolicyHandlers({
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
