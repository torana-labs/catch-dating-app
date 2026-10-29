import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/presentation/validators.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:flutter/material.dart';

enum HostEventEditRouteStatus { loading, error, notFound, unauthorized, ready }

@immutable
class HostEventEditState {
  const HostEventEditState({
    required this.status,
    this.uid,
    this.club,
    this.event,
    this.error,
  });

  factory HostEventEditState.resolve({
    required CatchAsyncState<String?> uid,
    required CatchAsyncState<Club?> club,
    required CatchAsyncState<Event?> event,
    Event? initialEvent,
  }) {
    final resolvedEvent = event.value ?? initialEvent;
    if (uid.status == CatchAsyncStatus.loading ||
        club.status == CatchAsyncStatus.loading ||
        (event.status == CatchAsyncStatus.loading && resolvedEvent == null)) {
      return const HostEventEditState(status: HostEventEditRouteStatus.loading);
    }

    final error = uid.error ?? club.error ?? event.error;
    if (error != null) {
      return HostEventEditState(
        status: HostEventEditRouteStatus.error,
        error: error,
      );
    }

    final resolvedUid = uid.value;
    final resolvedClub = club.value;
    if (resolvedClub == null || resolvedEvent == null) {
      return HostEventEditState(
        status: HostEventEditRouteStatus.notFound,
        uid: resolvedUid,
        club: resolvedClub,
        event: resolvedEvent,
      );
    }

    if (resolvedUid == null || !resolvedClub.isHostedBy(resolvedUid)) {
      return HostEventEditState(
        status: HostEventEditRouteStatus.unauthorized,
        uid: resolvedUid,
        club: resolvedClub,
        event: resolvedEvent,
      );
    }

    return HostEventEditState(
      status: HostEventEditRouteStatus.ready,
      uid: resolvedUid,
      club: resolvedClub,
      event: resolvedEvent,
    );
  }

  final HostEventEditRouteStatus status;
  final String? uid;
  final Club? club;
  final Event? event;
  final Object? error;

  static bool eventCanEdit(Event event) =>
      HostEventEditScreenState.eventCanEdit(event);

  static bool eventScheduleLocked(Event event, DateTime now) =>
      HostEventEditScreenState.eventScheduleLocked(event, now);

  static bool eventPolicyLocked(Event event, DateTime now) =>
      HostEventEditScreenState.eventPolicyLocked(event, now);
}

@immutable
class HostEventEditScreenState {
  const HostEventEditScreenState({
    required this.canEdit,
    required this.scheduleLocked,
    required this.policyLocked,
    required this.footer,
    required this.saveOutcome,
    required this.fields,
    required this.saveError,
  });

  final bool canEdit;
  final bool scheduleLocked;
  final bool policyLocked;
  final EditHostedEventFooterState footer;
  final HostEventEditSaveOutcomeState saveOutcome;
  final HostEventEditFieldDisplayState fields;
  final Object? saveError;

  bool get hasSaveError => saveError != null;

  static bool eventCanEdit(Event event) => !event.isCancelled;

  static bool eventScheduleLocked(Event event, DateTime now) =>
      !eventCanEdit(event) ||
      event.startTime.isBefore(now) ||
      event.signedUpCount > 0 ||
      event.waitlistCount > 0 ||
      event.attendedCount > 0;

  static bool eventPolicyLocked(Event event, DateTime now) =>
      eventScheduleLocked(event, now);

  factory HostEventEditScreenState.from({
    required Event event,
    required DateTime now,
    required bool savePending,
    required AppLocalizations l10n,
    HostEventEditFieldDisplayState? fields,
    Object? saveError,
  }) {
    final canEdit = eventCanEdit(event);
    final requestControlsEnabled = canEdit && !savePending;
    final scheduleLocked = eventScheduleLocked(event, now);
    return HostEventEditScreenState(
      canEdit: requestControlsEnabled,
      scheduleLocked: scheduleLocked,
      policyLocked: eventPolicyLocked(event, now),
      footer: EditHostedEventFooterState(
        isLoading: savePending,
        isEnabled: canEdit && !savePending,
        label: l10n.hostsEventEditSaveChanges,
      ),
      saveOutcome: HostEventEditSaveOutcomeState.updated(l10n),
      fields:
          fields ??
          HostEventEditFieldDisplayState.fromEvent(
            event: event,
            canEdit: canEdit,
            scheduleLocked: scheduleLocked,
          ),
      saveError: saveError,
    );
  }
}

@immutable
class HostEventEditFieldDisplayState {
  const HostEventEditFieldDisplayState({
    required this.schedule,
    required this.locationDetails,
    required this.policy,
  });

  factory HostEventEditFieldDisplayState.fromEvent({
    required Event event,
    required bool canEdit,
    required bool scheduleLocked,
    String? scheduleErrorText,
  }) {
    final startingPoint = LocationCoordinate.fromNullable(
      latitude: event.effectiveStartingPointLat,
      longitude: event.effectiveStartingPointLng,
    );
    final policy = event.effectiveEventPolicy;
    return HostEventEditFieldDisplayState(
      schedule: HostEventEditScheduleFieldState.from(
        scheduleLocked: scheduleLocked,
        selectedDate: DateUtils.dateOnly(event.startTime),
        selectedStartTime: TimeOfDay.fromDateTime(event.startTime),
        durationMinutes: event.endTime.difference(event.startTime).inMinutes,
        scheduleErrorText: scheduleErrorText,
      ),
      locationDetails: HostEventEditLocationDetailsFieldState.from(
        canEdit: canEdit,
        isDistanceBased: event.eventFormat.activityKind.isDistanceBased,
        startingPoint: startingPoint,
        meetingPoint: event.locationName,
        locationDetails: event.locationNotes ?? '',
        distanceText: EventFormatters.distanceKm(
          event.distanceKm,
          includeUnit: false,
        ),
        selectedPace: event.pace,
        description: event.description,
      ),
      policy: HostEventEditPolicyFieldState.from(
        currencyCode: event.currency,
        admissionPreset: HostEventEditPolicyFieldState.admissionPresetForPolicy(
          policy,
        ),
        cohortCapsEnabled: policy.usesFixedCohortCaps,
        dynamicPricingEnabled: policy.usesDemandPricing,
        cancellationPolicyId: policy.cancellationPolicy.id,
      ),
    );
  }

  factory HostEventEditFieldDisplayState.fromForm({
    required bool canEdit,
    required bool scheduleLocked,
    required DateTime selectedDate,
    required TimeOfDay selectedStartTime,
    required int durationMinutes,
    required String? scheduleErrorText,
    required bool isDistanceBased,
    required LocationCoordinate? startingPoint,
    required String meetingPoint,
    required String locationDetails,
    required String distanceText,
    required PaceLevel selectedPace,
    required String description,
    required String currencyCode,
    required EventAdmissionPreset admissionPreset,
    required bool cohortCapsEnabled,
    required bool dynamicPricingEnabled,
    required EventCancellationPolicyId cancellationPolicyId,
  }) {
    return HostEventEditFieldDisplayState(
      schedule: HostEventEditScheduleFieldState.from(
        scheduleLocked: scheduleLocked,
        selectedDate: selectedDate,
        selectedStartTime: selectedStartTime,
        durationMinutes: durationMinutes,
        scheduleErrorText: scheduleErrorText,
      ),
      locationDetails: HostEventEditLocationDetailsFieldState.from(
        canEdit: canEdit,
        isDistanceBased: isDistanceBased,
        startingPoint: startingPoint,
        meetingPoint: meetingPoint,
        locationDetails: locationDetails,
        distanceText: distanceText,
        selectedPace: selectedPace,
        description: description,
      ),
      policy: HostEventEditPolicyFieldState.from(
        currencyCode: currencyCode,
        admissionPreset: admissionPreset,
        cohortCapsEnabled: cohortCapsEnabled,
        dynamicPricingEnabled: dynamicPricingEnabled,
        cancellationPolicyId: cancellationPolicyId,
      ),
    );
  }

  final HostEventEditScheduleFieldState schedule;
  final HostEventEditLocationDetailsFieldState locationDetails;
  final HostEventEditPolicyFieldState policy;
}

@immutable
class HostEventEditScheduleFieldState {
  const HostEventEditScheduleFieldState({
    required this.scheduleLocked,
    required this.dateValue,
    required this.startTimeValue,
    required this.durationMinutes,
    required this.errorText,
  });

  factory HostEventEditScheduleFieldState.from({
    required bool scheduleLocked,
    required DateTime selectedDate,
    required TimeOfDay selectedStartTime,
    required int durationMinutes,
    required String? scheduleErrorText,
  }) {
    return HostEventEditScheduleFieldState(
      scheduleLocked: scheduleLocked,
      dateValue: hostEventEditDateLabel(selectedDate),
      startTimeValue: AppTimeFormatters.clockTime(
        hour: selectedStartTime.hour,
        minute: selectedStartTime.minute,
      ),
      durationMinutes: durationMinutes,
      errorText: scheduleErrorText,
    );
  }

  final bool scheduleLocked;
  final String dateValue;
  final String startTimeValue;
  final int durationMinutes;
  final String? errorText;

  bool get hasError => errorText != null;
}

@immutable
class HostEventEditLocationDetailsFieldState {
  const HostEventEditLocationDetailsFieldState({
    required this.location,
    required this.isDistanceBased,
    required this.locationDetails,
    required this.distanceText,
    required this.selectedPace,
    required this.description,
  });

  factory HostEventEditLocationDetailsFieldState.from({
    required bool canEdit,
    required bool isDistanceBased,
    required LocationCoordinate? startingPoint,
    required String meetingPoint,
    required String locationDetails,
    required String distanceText,
    required PaceLevel selectedPace,
    required String description,
  }) {
    return HostEventEditLocationDetailsFieldState(
      location: HostEventEditLocationState.from(
        canEdit: canEdit,
        startingPoint: startingPoint,
        meetingPoint: meetingPoint,
      ),
      isDistanceBased: isDistanceBased,
      locationDetails: locationDetails,
      distanceText: distanceText,
      selectedPace: selectedPace,
      description: description,
    );
  }

  final HostEventEditLocationState location;
  final bool isDistanceBased;
  final String locationDetails;
  final String distanceText;
  final PaceLevel selectedPace;
  final String description;
}

@immutable
class HostEventEditPolicyFieldState {
  const HostEventEditPolicyFieldState({
    required this.currencyCode,
    required this.admissionPreset,
    required this.cohortCapsEnabled,
    required this.dynamicPricingEnabled,
    required this.cancellationPolicyId,
    required this.cancellationSummary,
    required this.showInviteCode,
    required this.showCohortCapsToggle,
    required this.showCohortCapsFields,
    required this.showRequestToJoinCopy,
    required this.showDynamicPricingToggle,
    required this.showDynamicPricingFields,
  });

  factory HostEventEditPolicyFieldState.from({
    required String currencyCode,
    required EventAdmissionPreset admissionPreset,
    required bool cohortCapsEnabled,
    required bool dynamicPricingEnabled,
    required EventCancellationPolicyId cancellationPolicyId,
  }) {
    return HostEventEditPolicyFieldState(
      currencyCode: currencyCode,
      admissionPreset: admissionPreset,
      cohortCapsEnabled: cohortCapsEnabled,
      dynamicPricingEnabled: dynamicPricingEnabled,
      cancellationPolicyId: cancellationPolicyId,
      cancellationSummary: policyFor(cancellationPolicyId).attendeeSummary,
      showInviteCode: admissionPreset == EventAdmissionPreset.inviteOnly,
      showCohortCapsToggle:
          admissionPreset == EventAdmissionPreset.openCapacity,
      showCohortCapsFields:
          admissionPreset == EventAdmissionPreset.openCapacity &&
          cohortCapsEnabled,
      showRequestToJoinCopy: admissionPreset.requiresReview,
      showDynamicPricingToggle:
          admissionPreset == EventAdmissionPreset.balancedSingles,
      showDynamicPricingFields:
          admissionPreset == EventAdmissionPreset.balancedSingles &&
          dynamicPricingEnabled,
    );
  }

  static EventAdmissionPreset admissionPresetForPolicy(
    EventPolicyBundle policy,
  ) {
    if (policy.usesInviteOnly) return EventAdmissionPreset.inviteOnly;
    if (policy.admissionPolicy.manualApprovalRequired) {
      return policy.admissionPolicy.approvedMembersSkipReview
          ? EventAdmissionPreset.requestToJoinMembersExempt
          : EventAdmissionPreset.requestToJoin;
    }
    if (policy.usesBalancedRatio) {
      return EventAdmissionPreset.balancedSingles;
    }
    return EventAdmissionPreset.openCapacity;
  }

  final String currencyCode;
  final EventAdmissionPreset admissionPreset;
  final bool cohortCapsEnabled;
  final bool dynamicPricingEnabled;
  final EventCancellationPolicyId cancellationPolicyId;
  final String cancellationSummary;
  final bool showInviteCode;
  final bool showCohortCapsToggle;
  final bool showCohortCapsFields;
  final bool showRequestToJoinCopy;
  final bool showDynamicPricingToggle;
  final bool showDynamicPricingFields;
}

@immutable
class EditHostedEventFooterState {
  const EditHostedEventFooterState({
    required this.isLoading,
    required this.isEnabled,
    required this.label,
  });

  final bool isLoading;
  final bool isEnabled;
  final String label;
}

@immutable
class HostEventEditSaveOutcomeState {
  const HostEventEditSaveOutcomeState({
    required this.successMessage,
    required this.popRouteOnSuccess,
    required this.missingStartingPointMessage,
    required this.invalidScheduleMessage,
  });

  HostEventEditSaveOutcomeState.updated(AppLocalizations l10n)
    : successMessage = l10n.hostsEventEditUpdated,
      popRouteOnSuccess = true,
      missingStartingPointMessage = l10n.hostsEventEditMissingStartingPoint,
      invalidScheduleMessage = l10n.hostsEventEditInvalidSchedule;

  final String successMessage;
  final bool popRouteOnSuccess;
  final String missingStartingPointMessage;
  final String invalidScheduleMessage;
}

@immutable
class HostEventEditPrivateAccessState {
  const HostEventEditPrivateAccessState({
    required this.shouldWatch,
    required this.shouldMarkLoaded,
    required this.privateAccess,
    required this.inviteCodeSeed,
  });

  final bool shouldWatch;
  final bool shouldMarkLoaded;
  final CatchAsyncState<EventPrivateAccess?> privateAccess;
  final String? inviteCodeSeed;

  factory HostEventEditPrivateAccessState.from({
    required EventAdmissionPreset admissionPreset,
    required bool loadedPrivateAccess,
    required CatchAsyncState<EventPrivateAccess?> privateAccess,
  }) {
    final shouldWatch = admissionPreset == EventAdmissionPreset.inviteOnly;
    final CatchAsyncState<EventPrivateAccess?> resolvedPrivateAccess =
        shouldWatch
        ? privateAccess
        : const CatchAsyncState<EventPrivateAccess?>.data(null);
    return HostEventEditPrivateAccessState(
      shouldWatch: shouldWatch,
      shouldMarkLoaded: shouldWatch && !loadedPrivateAccess,
      privateAccess: resolvedPrivateAccess,
      inviteCodeSeed: shouldWatch && !loadedPrivateAccess
          ? _trimInviteCode(privateAccess.value?.inviteCode)
          : null,
    );
  }
}

@immutable
class HostEventEditLocationState {
  const HostEventEditLocationState({
    required this.canPick,
    required this.startingPoint,
    required this.selectedLabel,
    required this.pickerInitialLabel,
  });

  final bool canPick;
  final LocationCoordinate? startingPoint;
  final String selectedLabel;
  final String? pickerInitialLabel;

  bool get hasStartingPoint => startingPoint != null;

  factory HostEventEditLocationState.from({
    required bool canEdit,
    required LocationCoordinate? startingPoint,
    required String meetingPoint,
  }) {
    final normalizedMeetingPoint = meetingPoint.trim();
    return HostEventEditLocationState(
      canPick: canEdit,
      startingPoint: startingPoint,
      selectedLabel: normalizedMeetingPoint,
      pickerInitialLabel: _trimTextToNull(normalizedMeetingPoint),
    );
  }
}

@immutable
class HostEventEditScheduleValidationState {
  const HostEventEditScheduleValidationState({required this.errorText});

  final String? errorText;

  bool get isValid => errorText == null;

  factory HostEventEditScheduleValidationState.from({
    required bool scheduleLocked,
    required DateTime selectedStartDateTime,
    required DateTime now,
    required String invalidScheduleMessage,
  }) {
    return HostEventEditScheduleValidationState(
      errorText: scheduleLocked || selectedStartDateTime.isAfter(now)
          ? null
          : invalidScheduleMessage,
    );
  }
}

sealed class HostEventEditIntent {
  const HostEventEditIntent();
}

final class HostEventEditPickDateIntent extends HostEventEditIntent {
  const HostEventEditPickDateIntent();
}

final class HostEventEditPickStartTimeIntent extends HostEventEditIntent {
  const HostEventEditPickStartTimeIntent();
}

final class HostEventEditDurationChangedIntent extends HostEventEditIntent {
  const HostEventEditDurationChangedIntent(this.durationMinutes);

  final int durationMinutes;
}

final class HostEventEditMeetingPointChangedIntent extends HostEventEditIntent {
  const HostEventEditMeetingPointChangedIntent(this.value);

  final String value;
}

final class HostEventEditPickLocationIntent extends HostEventEditIntent {
  const HostEventEditPickLocationIntent();
}

final class HostEventEditPaceChangedIntent extends HostEventEditIntent {
  const HostEventEditPaceChangedIntent(this.pace);

  final PaceLevel pace;
}

final class HostEventEditAdmissionPresetChangedIntent
    extends HostEventEditIntent {
  const HostEventEditAdmissionPresetChangedIntent(this.preset);

  final EventAdmissionPreset preset;
}

final class HostEventEditCohortCapsChangedIntent extends HostEventEditIntent {
  const HostEventEditCohortCapsChangedIntent(this.enabled);

  final bool enabled;
}

final class HostEventEditDynamicPricingChangedIntent
    extends HostEventEditIntent {
  const HostEventEditDynamicPricingChangedIntent(this.enabled);

  final bool enabled;
}

final class HostEventEditCancellationPolicyChangedIntent
    extends HostEventEditIntent {
  const HostEventEditCancellationPolicyChangedIntent(this.policyId);

  final EventCancellationPolicyId policyId;
}

final class HostEventEditSaveIntent extends HostEventEditIntent {
  const HostEventEditSaveIntent();
}

String hostEventEditDateLabel(DateTime date) {
  return '${date.day.toString().padLeft(2, '0')}/'
      '${date.month.toString().padLeft(2, '0')}/'
      '${date.year}';
}

String? _trimInviteCode(String? value) {
  return _trimTextToNull(value);
}

String? _trimTextToNull(String? value) {
  final normalized = value?.trim();
  if (normalized == null || normalized.isEmpty) return null;
  return normalized;
}
