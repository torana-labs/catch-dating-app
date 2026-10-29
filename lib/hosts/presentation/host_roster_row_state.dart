import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';

class HostSetupRosterRowDisplayState {
  const HostSetupRosterRowDisplayState({
    required this.meta,
    required this.signal,
    required this.tone,
    required this.showRequestActions,
    required this.showWaitlistOfferAction,
  });

  factory HostSetupRosterRowDisplayState.resolve({
    required AppLocalizations l10n,
    required EventParticipation? participation,
    required bool usesRequestApproval,
  }) {
    final status = participation?.status;
    return HostSetupRosterRowDisplayState(
      meta: _setupMeta(participation, usesRequestApproval, l10n),
      signal: _setupSignal(participation, usesRequestApproval, l10n).label,
      tone: _setupSignal(participation, usesRequestApproval, l10n).tone,
      showRequestActions:
          usesRequestApproval && status == EventParticipationStatus.waitlisted,
      showWaitlistOfferAction:
          !usesRequestApproval && status == EventParticipationStatus.waitlisted,
    );
  }

  final String meta;
  final String signal;
  final CatchBadgeTone tone;
  final bool showRequestActions;
  final bool showWaitlistOfferAction;
}

class HostLiveRosterRowDisplayState {
  const HostLiveRosterRowDisplayState({
    required this.meta,
    required this.signal,
    required this.tone,
    required this.showAttendanceToggle,
    required this.attendanceButtonLabel,
    required this.attendanceButtonPrimary,
    required this.showWaitlistOfferAction,
  });

  factory HostLiveRosterRowDisplayState.resolve({
    required AppLocalizations l10n,
    required EventParticipation? participation,
    required bool attended,
    required bool usesRequestApproval,
  }) {
    final status = participation?.status;
    final signal = _liveSignal(
      participation,
      attended,
      usesRequestApproval,
      l10n,
    );
    final showAttendanceToggle =
        status == EventParticipationStatus.signedUp ||
        status == EventParticipationStatus.attended;
    return HostLiveRosterRowDisplayState(
      meta: attended
          ? participation?.attendedAt == null
                ? l10n.hostsHostEventManageScreenStateVisiblecopyCheckedIn
                : EventFormatters.time(participation!.attendedAt!)
          : _reportMeta(participation, l10n),
      signal: signal.label,
      tone: signal.tone,
      showAttendanceToggle: showAttendanceToggle,
      attendanceButtonLabel: attended
          ? l10n.hostsHostEventManageScreenStateVisiblecopyUndo
          : l10n.hostsHostEventManageScreenStateVisiblecopyCheckIn,
      attendanceButtonPrimary: !attended,
      showWaitlistOfferAction:
          status == EventParticipationStatus.waitlisted && !usesRequestApproval,
    );
  }

  final String meta;
  final String signal;
  final CatchBadgeTone tone;
  final bool showAttendanceToggle;
  final String attendanceButtonLabel;
  final bool attendanceButtonPrimary;
  final bool showWaitlistOfferAction;
}

class HostReportRosterRowDisplayState {
  const HostReportRosterRowDisplayState({
    required this.meta,
    required this.signal,
    required this.tone,
    required this.payment,
  });

  factory HostReportRosterRowDisplayState.resolve({
    required AppLocalizations l10n,
    required EventParticipation? participation,
    required bool attended,
    required int priceInPaise,
    required String currencyCode,
  }) {
    final attendance = _reportAttendance(participation, attended, l10n);
    final status = participation?.status;
    return HostReportRosterRowDisplayState(
      meta: _reportMeta(participation, l10n),
      signal: attendance.label,
      tone: attendance.tone,
      payment: status == EventParticipationStatus.waitlisted
          ? '-'
          : priceInPaise == 0
          ? l10n.hostsHostEventManageScreenStateVisiblecopyFree
          : EventFormatters.priceInPaise(
              priceInPaise,
              currencyCode: currencyCode,
            ),
    );
  }

  final String meta;
  final String signal;
  final CatchBadgeTone tone;
  final String payment;
}

({String label, CatchBadgeTone tone}) _liveSignal(
  EventParticipation? participation,
  bool attended,
  bool usesRequestApproval,
  AppLocalizations l10n,
) {
  final status = participation?.status;
  return switch (status) {
    EventParticipationStatus.waitlisted
        when participation?.waitlistOfferStatus ==
            EventWaitlistOfferStatus.active =>
      (
        label: l10n.hostsHostEventManageScreenStateLabelOffered,
        tone: CatchBadgeTone.brand,
      ),
    EventParticipationStatus.waitlisted
        when participation?.waitlistOfferStatus ==
            EventWaitlistOfferStatus.accepted =>
      (
        label: l10n.hostsHostEventManageScreenStateLabelAccepted,
        tone: CatchBadgeTone.success,
      ),
    EventParticipationStatus.waitlisted when usesRequestApproval => (
      label: l10n.hostsHostEventManageScreenStateLabelRequest,
      tone: CatchBadgeTone.brand,
    ),
    EventParticipationStatus.waitlisted => (
      label: l10n.hostsHostEventManageScreenStateLabelWait,
      tone: CatchBadgeTone.warning,
    ),
    _ when attended => (
      label: l10n.hostsHostEventManageScreenStateLabelIn,
      tone: CatchBadgeTone.success,
    ),
    _ => (
      label: l10n.hostsHostEventManageScreenStateLabelDue,
      tone: CatchBadgeTone.neutral,
    ),
  };
}

({String label, CatchBadgeTone tone}) _reportAttendance(
  EventParticipation? participation,
  bool attended,
  AppLocalizations l10n,
) {
  final status = participation?.status;
  final offerStatus = participation?.waitlistOfferStatus;
  return switch (status) {
    EventParticipationStatus.waitlisted
        when offerStatus == EventWaitlistOfferStatus.active =>
      (
        label: l10n.hostsHostEventManageScreenStateLabelOffered,
        tone: CatchBadgeTone.brand,
      ),
    EventParticipationStatus.waitlisted
        when offerStatus == EventWaitlistOfferStatus.accepted =>
      (
        label: l10n.hostsHostEventManageScreenStateLabelAccepted,
        tone: CatchBadgeTone.success,
      ),
    EventParticipationStatus.waitlisted
        when offerStatus == EventWaitlistOfferStatus.expired =>
      (
        label: l10n.hostsHostEventManageScreenStateLabelExpired,
        tone: CatchBadgeTone.neutral,
      ),
    EventParticipationStatus.waitlisted => (
      label: l10n.hostsHostEventManageScreenStateLabelWait,
      tone: CatchBadgeTone.warning,
    ),
    _ when attended => (
      label: l10n.hostsHostEventManageScreenStateLabelAttended,
      tone: CatchBadgeTone.success,
    ),
    _ => (
      label: l10n.hostsHostEventManageScreenStateLabelNoShow,
      tone: CatchBadgeTone.neutral,
    ),
  };
}

({String label, CatchBadgeTone tone}) _setupSignal(
  EventParticipation? participation,
  bool usesRequestApproval,
  AppLocalizations l10n,
) {
  final offerStatus = participation?.waitlistOfferStatus;
  if (participation?.status == EventParticipationStatus.waitlisted &&
      offerStatus == EventWaitlistOfferStatus.active) {
    return (
      label: l10n.hostsHostEventManageScreenStateLabelOffered,
      tone: CatchBadgeTone.brand,
    );
  }
  if (participation?.status == EventParticipationStatus.waitlisted &&
      offerStatus == EventWaitlistOfferStatus.accepted) {
    return (
      label: l10n.hostsHostEventManageScreenStateLabelAccepted,
      tone: CatchBadgeTone.success,
    );
  }
  return switch (participation?.status) {
    EventParticipationStatus.attended || EventParticipationStatus.signedUp => (
      label: l10n.hostsHostEventManageScreenStateLabelBooked,
      tone: CatchBadgeTone.success,
    ),
    EventParticipationStatus.waitlisted when usesRequestApproval => (
      label: l10n.hostsHostEventManageScreenStateLabelRequest,
      tone: CatchBadgeTone.brand,
    ),
    EventParticipationStatus.waitlisted => (
      label: l10n.hostsHostEventManageScreenStateLabelWait,
      tone: CatchBadgeTone.warning,
    ),
    _ => (
      label: l10n.hostsHostEventManageScreenStateLabelNew,
      tone: CatchBadgeTone.neutral,
    ),
  };
}

String _setupMeta(
  EventParticipation? participation,
  bool usesRequestApproval,
  AppLocalizations l10n,
) {
  final offerStatus = participation?.waitlistOfferStatus;
  if (participation?.status == EventParticipationStatus.waitlisted &&
      offerStatus == EventWaitlistOfferStatus.active) {
    return l10n.hostsHostEventManageScreenStateVisiblecopyOfferSent;
  }
  if (participation?.status == EventParticipationStatus.waitlisted &&
      offerStatus == EventWaitlistOfferStatus.accepted) {
    return l10n.hostsHostEventManageScreenStateVisiblecopyAcceptedOffer;
  }
  if (participation?.status == EventParticipationStatus.waitlisted &&
      offerStatus == EventWaitlistOfferStatus.expired) {
    return l10n.hostsHostEventManageScreenStateVisiblecopyOfferExpired;
  }
  return switch (participation?.status) {
    EventParticipationStatus.attended || EventParticipationStatus.signedUp =>
      l10n.hostsHostEventManageScreenStateVisiblecopyApproved,
    EventParticipationStatus.waitlisted when usesRequestApproval =>
      l10n.hostsHostEventManageScreenStateVisiblecopyViewProfile,
    EventParticipationStatus.waitlisted =>
      l10n.hostsHostEventManageScreenStateVisiblecopyWaitlisted,
    _ => l10n.hostsHostEventManageScreenStateVisiblecopyProfileReady,
  };
}

String _reportMeta(EventParticipation? participation, AppLocalizations l10n) {
  final status = participation?.status;
  final offerStatus = participation?.waitlistOfferStatus;
  if (status == EventParticipationStatus.waitlisted &&
      offerStatus == EventWaitlistOfferStatus.active) {
    return l10n.hostsHostEventManageScreenStateVisiblecopyOfferSent;
  }
  if (status == EventParticipationStatus.waitlisted &&
      offerStatus == EventWaitlistOfferStatus.accepted) {
    return l10n.hostsHostEventManageScreenStateVisiblecopyAcceptedOffer;
  }
  if (status == EventParticipationStatus.waitlisted &&
      offerStatus == EventWaitlistOfferStatus.expired) {
    return l10n.hostsHostEventManageScreenStateVisiblecopyOfferExpired;
  }
  return switch (status) {
    EventParticipationStatus.waitlisted =>
      l10n.hostsHostEventManageScreenStateVisiblecopyWaitlisted,
    EventParticipationStatus.attended || EventParticipationStatus.signedUp =>
      l10n.hostsHostEventManageScreenStateVisiblecopyBooked,
    EventParticipationStatus.cancelled =>
      l10n.hostsHostEventManageScreenStateVisiblecopyCancelled,
    EventParticipationStatus.deleted =>
      l10n.hostsHostEventManageScreenStateVisiblecopyDeleted,
    null => l10n.hostsHostEventManageScreenStateVisiblecopyParticipant,
  };
}
