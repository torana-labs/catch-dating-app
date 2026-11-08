import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:flutter/foundation.dart';

/// What the create screens do when the host acts, as callbacks the route
/// screen supplies, so the step screens and bodies stay provider-free.
@immutable
class CreateHandlers {
  const CreateHandlers({
    required this.onBack,
    required this.onNext,
    required this.onSaveDraft,
    required this.onStep,
    required this.onName,
    required this.onFormat,
    required this.onDescription,
    required this.onDistance,
    required this.onPace,
    required this.onAddPhoto,
    required this.onDate,
    required this.onPickDate,
    required this.onStart,
    required this.onEnd,
    required this.onPlace,
    required this.onDirections,
    required this.onSellElsewhere,
    required this.onPrice,
    required this.onPlaces,
    required this.onAdmission,
    required this.onTemplate,
    required this.onBlank,
    required this.onEditStep,
    required this.onAddStep,
    required this.onCopyLink,
    required this.onPrint,
    required this.onShareStory,
    required this.onShareWhatsApp,
    required this.onDone,
    this.onWaitlist,
    this.onApproveEach,
    this.onPlanVisible,
    this.onRepeat,
  });

  /// Back a step, or close on the first.
  final VoidCallback onBack;

  /// Next, or Publish on the plan.
  final VoidCallback onNext;
  final VoidCallback onSaveDraft;
  final ValueChanged<CreateStep> onStep;
  final ValueChanged<String> onName;
  final ValueChanged<CreateFormat> onFormat;
  final ValueChanged<String> onDescription;
  final ValueChanged<String> onDistance;
  final ValueChanged<String> onPace;
  final VoidCallback onAddPhoto;
  final ValueChanged<DateTime> onDate;
  final VoidCallback onPickDate;
  final VoidCallback onStart;
  final VoidCallback onEnd;
  final VoidCallback onPlace;
  final ValueChanged<String> onDirections;
  final ValueChanged<bool> onSellElsewhere;
  final ValueChanged<String> onPrice;
  final ValueChanged<int> onPlaces;
  final ValueChanged<CreateAdmission> onAdmission;
  final VoidCallback onTemplate;
  final VoidCallback onBlank;
  final ValueChanged<EventItineraryItem> onEditStep;
  final VoidCallback onAddStep;
  final VoidCallback onCopyLink;
  final VoidCallback onPrint;
  final VoidCallback onShareStory;
  final VoidCallback onShareWhatsApp;

  /// Share is done: back to Today.
  final VoidCallback onDone;
  final ValueChanged<bool>? onWaitlist;
  final ValueChanged<bool>? onApproveEach;
  final ValueChanged<bool>? onPlanVisible;
  final ValueChanged<bool>? onRepeat;
}
