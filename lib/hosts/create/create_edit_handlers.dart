import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:flutter/foundation.dart';

/// What editing a saved event adds to [CreateHandlers]: Save, and the
/// fields only an edit shows, as callbacks the edit screen supplies. The
/// admission fields come through [CreateHandlers.policy], as when creating.
@immutable
class CreateEditHandlers {
  const CreateEditHandlers({
    required this.onSave,
    required this.onPlaceName,
    required this.onRoutePlan,
  });

  /// Check the edit and send it.
  final VoidCallback onSave;

  /// The place's name as guests see it.
  final ValueChanged<String> onPlaceName;

  /// The route plan of a moving event; null turns it off.
  final ValueChanged<RouteEventPlan?> onRoutePlan;
}
