import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/event_photo_recovery.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/core/celebration/celebration_effects_controller.dart';
import 'package:catch_dating_app/core/celebration/celebration_screen.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_photo_recovery_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/app_deep_links.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CreateEventSuccessScreen extends ConsumerStatefulWidget {
  const CreateEventSuccessScreen({
    super.key,
    required this.club,
    required this.event,
    this.inviteCode,
    this.eventDisplayName,
    required this.onManageEvent,
    required this.onDone,
    this.rosterImportResult,
    this.rosterImportFailed = false,
    this.photoRecovery,
    this.onRetryPhotos,
    this.onReselectPhotos,
  });

  final Club club;
  final Event event;
  final String? inviteCode;
  final String? eventDisplayName;
  final VoidCallback onManageEvent;
  final VoidCallback onDone;
  final EventAttendeeImportResult? rosterImportResult;
  final bool rosterImportFailed;
  final CreateEventRecoveryState? photoRecovery;
  final VoidCallback? onRetryPhotos;
  final VoidCallback? onReselectPhotos;

  @override
  ConsumerState<CreateEventSuccessScreen> createState() =>
      _CreateEventSuccessScreenState();
}

class _CreateEventSuccessScreenState
    extends ConsumerState<CreateEventSuccessScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || widget.event.status != EventLifecycleStatus.active) {
        return;
      }
      unawaited(
        ref
            .read(celebrationEffectsControllerProvider)
            .play(CelebrationMomentKind.eventCreated),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final club = widget.club;
    final event = widget.event;
    final inviteCode = widget.inviteCode;
    final eventDisplayName = widget.eventDisplayName;
    final onManageEvent = widget.onManageEvent;
    final onDone = widget.onDone;
    final rosterImportResult = widget.rosterImportResult;
    final rosterImportFailed = widget.rosterImportFailed;
    final normalizedInviteCode = inviteCode?.trim();
    final inviteLink =
        normalizedInviteCode == null || normalizedInviteCode.isEmpty
        ? null
        : AppDeepLinks.event(
            clubId: club.id,
            eventId: event.id,
            inviteCode: normalizedInviteCode,
          ).toString();
    final displayName = _eventCreatedDisplayName(event, eventDisplayName);
    final message = event.status != EventLifecycleStatus.active
        ? context.l10n.hostsEventPhotoRecoveryInactive
        : inviteLink == null
        ? context.l10n
              .hostsCreateEventSuccessScreenMessageDisplaynameIsNowListed(
                displayName: displayName,
                name: club.name,
              )
        : context.l10n
              .hostsCreateEventSuccessScreenMessageDisplaynameIsNowListed244c65(
                displayName: displayName,
                name: club.name,
              );
    final rosterErrors = rosterImportResult?.errors.length ?? 0;
    final rosterNote = rosterImportFailed
        ? context.l10n.hostsCreateEventRosterImportFailed
        : rosterErrors > 0
        ? context.l10n.hostsCreateEventRosterImportPartial(count: rosterErrors)
        : event.isExternalCompanion
        ? context.l10n.hostsCreateEventExternalSuccessNote
        : context
              .l10n
              .hostsCreateEventSuccessScreenNoteBookingsWaitlistAndAttendance;

    final l10n = context.l10n;
    final recovery = widget.photoRecovery;
    final receipt = recovery?.receipt;
    final phase = receipt?.phase;
    final active = recovery?.event?.status == EventLifecycleStatus.active;
    final unknown = phase == EventPhotoRecoveryPhase.attachmentUnknown;
    final conflict = phase == EventPhotoRecoveryPhase.conflict;
    final resolved = receipt?.isResolved ?? false;
    final cleanup =
        phase == EventPhotoRecoveryPhase.cleanupPending ||
        (phase == EventPhotoRecoveryPhase.complete && !resolved);
    final canRetry = active || unknown || conflict || cleanup || resolved;
    final recoveryMessage = !active && !canRetry
        ? l10n.hostsEventPhotoRecoveryInactive
        : !(recovery?.isDurable ?? true)
        ? l10n.hostsEventPhotoRecoveryStorage
        : (recovery?.working ?? false)
        ? l10n.hostsEventPhotoRecoveryUploading
        : resolved
        ? l10n.hostsEventPhotoRecoveryRefresh
        : conflict
        ? l10n.hostsEventPhotoRecoveryConflict
        : unknown
        ? l10n.hostsEventPhotoRecoveryUnknown
        : cleanup
        ? l10n.hostsEventPhotoRecoveryCleanup
        : l10n.hostsEventPhotoRecoveryFailed;

    return PaperCelebrationScaffold(
      icon: CatchIcons.celebrate,
      eyebrow: context.l10n.hostsCreateEventSuccessScreenEyebrowEventCreated,
      title: event.status == EventLifecycleStatus.active
          ? context.l10n.hostsCreateEventSuccessScreenTitleYourEventIsLive
          : context.l10n.hostsEventPhotoRecoverySavedTitle,
      message: message,
      details: [
        CelebrationDetail(
          icon: CatchIcons.date,
          label: context.l10n.hostsCreateEventSuccessScreenLabelWhen,
          value: _eventCreatedWhenLabel(event),
        ),
        CelebrationDetail(
          icon: CatchIcons.location,
          label: context.l10n.hostsCreateEventSuccessScreenLabelWhere,
          value: event.locationName,
        ),
        CelebrationDetail(
          icon: CatchIcons.activity,
          label: context.l10n.hostsCreateEventSuccessScreenLabelEvent,
          value: _eventCreatedActivityLabel(event),
        ),
        CelebrationDetail(
          icon: CatchIcons.people,
          label: context.l10n.hostsCreateEventSuccessScreenLabelCapacity,
          value: context.l10n
              .hostsCreateEventSuccessScreenVisiblecopyCapacitylimitAttendees(
                capacityLimit: event.capacityLimit,
              ),
        ),
        if (normalizedInviteCode != null && normalizedInviteCode.isNotEmpty)
          CelebrationDetail(
            icon: CatchIcons.key,
            label: context.l10n.hostsCreateEventSuccessScreenLabelInviteCode,
            value: normalizedInviteCode,
          ),
        if (inviteLink != null)
          CelebrationDetail(
            icon: CatchIcons.link,
            label: context.l10n.hostsCreateEventSuccessScreenLabelPrivateLink,
            value: inviteLink,
          ),
        if (rosterImportResult case final result?)
          CelebrationDetail(
            icon: CatchIcons.people,
            label: context.l10n.hostsCreateEventRosterDetailLabel,
            value: context.l10n.hostsCreateEventRosterImportSuccess(
              created: result.createdCount,
              updated: result.updatedCount,
              skipped: result.skippedCount,
            ),
          ),
      ],
      note: rosterNote,
      supplementalChildren: [
        if (recovery?.hasPhotoRecovery ?? false) ...[
          CatchBanner(
            title: resolved
                ? l10n.hostsEventPhotoRecoverySavedTitle
                : l10n.hostsEventPhotoRecoveryTitle,
            message: recoveryMessage,
            tone: CatchBannerTone.warning,
            actions: [
              if (canRetry)
                CatchButton(
                  label: unknown || conflict || resolved
                      ? l10n.hostsEventPhotoRecoveryCheck
                      : cleanup
                      ? l10n.hostsEventPhotoRecoveryCleanupAction
                      : l10n.hostsEventPhotoRecoveryRetry,
                  onPressed: (recovery?.working ?? false)
                      ? null
                      : widget.onRetryPhotos,
                  status: (recovery?.working ?? false)
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                ),
              if (active && !unknown && !conflict && !cleanup && !resolved)
                CatchButton(
                  label: l10n.hostsEventPhotoRecoveryReselect,
                  variant: CatchButtonVariant.secondary,
                  onPressed: (recovery?.working ?? false)
                      ? null
                      : widget.onReselectPhotos,
                ),
            ],
          ),
          if ((recovery?.requiresPhotoReselection ?? false))
            CatchBanner(
              message: l10n.hostsEventPhotoRecoveryMissing,
              tone: CatchBannerTone.neutral,
            ),
          if (receipt?.abandonedUploads.isNotEmpty ?? false)
            CatchBanner(
              message: l10n.hostsEventPhotoRecoveryUnsettled,
              tone: CatchBannerTone.warning,
            ),
          if (recovery?.photoError case final error?)
            CatchLocalizedErrorBanner(error),
        ],
      ],
      primaryAction: CelebrationAction(
        label: context.l10n.hostsCreateEventSuccessScreenLabelManageEvent,
        onPressed: onManageEvent,
      ),
      secondaryAction: CelebrationAction(
        label: context.l10n.hostsCreateEventSuccessScreenLabelBackToClub,
        onPressed: onDone,
      ),
      onClose: onDone,
      showCloseButton: false,
    );
  }
}

String _eventCreatedDisplayName(Event event, String? override) {
  final trimmed = override?.trim();
  if (trimmed != null && trimmed.isNotEmpty) return trimmed;
  return event.title;
}

String _eventCreatedWhenLabel(Event event) {
  final day = EventFormatters.shortWeekday(event.startTime);
  final month = EventFormatters.shortMonth(event.startTime);
  final time = EventFormatters.timeRange(event.startTime, event.endTime);
  return '$day, ${event.startTime.day} $month · $time';
}

String _eventCreatedActivityLabel(Event event) {
  if (!event.eventFormat.isDistanceBased) return event.activitySummaryLabel;
  final distance = EventFormatters.distanceKm(
    event.distanceKm,
  ).replaceFirst('km', ' km');
  return '$distance ${event.pace.label.toLowerCase()} ${event.eventFormat.label.toLowerCase()}';
}
