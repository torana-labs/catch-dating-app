import 'dart:ui';

import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_report_export.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/events/shared/attendance_sheet_view_model.dart';
import 'package:catch_dating_app/hosts/events/host_event_booking_controller.dart';
import 'package:catch_dating_app/pages/event/event_invite_share_copy.dart';
import 'package:catch_l10n/generated/app_localizations.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/device/clipboard.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/routing/app_deep_links.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_event_manage_controller.g.dart';

@riverpod
HostEventManageActions hostEventManageActions(Ref ref) =>
    HostEventManageController(ref);

abstract interface class HostEventManageActions {
  Future<String> createInviteLink({
    required Event event,
    required String inviteCode,
    required HostInviteLinkDraft draft,
  });

  Future<String> copyInviteLink({
    required Event event,
    required String inviteCode,
    required EventInviteLink link,
  });

  Future<String> disableInviteLink({
    required Event event,
    required EventInviteLink link,
  });

  Future<void> sharePrivateLink({
    required Organizer organizer,
    required Event event,
    required String inviteLink,
    required AppLocalizations l10n,
    Rect? origin,
  });

  Future<void> shareOpsReport({
    required AttendanceSheetViewModel viewModel,
    required Map<String, (String, String?)> profiles,
    Rect? origin,
  });

  Future<void> shareRevenueReport({
    required AttendanceSheetViewModel viewModel,
    required Map<String, (String, String?)> profiles,
    Rect? origin,
  });

  Future<void> cancelHostedEvent({required Event event});

  Future<void> deleteUnusedEvent({required Event event});
}

/// Each action reads everything it needs from [_ref] before its first
/// `await`: the provider is auto-disposed, and a widget that reads it without
/// listening can let it go while the action waits, after which the Ref throws.
/// The Firestore listeners an action changes (invite links, the event, its
/// roster) deliver the write themselves, so no action invalidates them.
class HostEventManageController implements HostEventManageActions {
  HostEventManageController(this._ref);

  static final createInviteLinkMutation = Mutation<String>();
  static final copyInviteLinkMutation = Mutation<String>();
  static final disableInviteLinkMutation = Mutation<String>();
  static final sharePrivateLinkMutation = Mutation<void>();
  static final shareOpsReportMutation = Mutation<void>();
  static final shareRevenueReportMutation = Mutation<void>();

  final Ref _ref;

  @override
  Future<String> createInviteLink({
    required Event event,
    required String inviteCode,
    required HostInviteLinkDraft draft,
  }) async {
    final events = _ref.read(eventRepositoryProvider);
    final clipboard = _ref.read(clipboardControllerProvider);
    final response = await events.createInviteLink(
      eventId: event.id,
      label: draft.label,
      source: draft.source,
    );
    final url = hostInviteLinkUrl(
      event: event,
      inviteCode: inviteCode,
      inviteLinkId: response.inviteToken,
    );
    await clipboard.copyText(url);
    return response.label;
  }

  @override
  Future<String> copyInviteLink({
    required Event event,
    required String inviteCode,
    required EventInviteLink link,
  }) async {
    final events = _ref.read(eventRepositoryProvider);
    final clipboard = _ref.read(clipboardControllerProvider);
    final token = await events.getInviteLinkToken(
      eventId: event.id,
      inviteLinkId: link.id,
    );
    final url = hostInviteLinkUrl(
      event: event,
      inviteCode: inviteCode,
      inviteLinkId: token,
    );
    await clipboard.copyText(url);
    return link.label;
  }

  @override
  Future<String> disableInviteLink({
    required Event event,
    required EventInviteLink link,
  }) async {
    await _ref
        .read(eventRepositoryProvider)
        .disableInviteLink(eventId: event.id, inviteLinkId: link.id);
    return link.label;
  }

  @override
  Future<void> sharePrivateLink({
    required Organizer organizer,
    required Event event,
    required String inviteLink,
    required AppLocalizations l10n,
    Rect? origin,
  }) {
    return _ref
        .read(externalShareControllerProvider)
        .shareText(
          text: EventInviteShareCopy.hostPrivateInviteText(
            event: event,
            l10n: l10n,
            organizerName: organizer.name,
            inviteLink: inviteLink,
          ),
          subject: EventInviteShareCopy.subject(event, l10n),
          origin: origin,
        );
  }

  @override
  Future<void> shareOpsReport({
    required AttendanceSheetViewModel viewModel,
    required Map<String, (String, String?)> profiles,
    Rect? origin,
  }) async {
    final clock = _ref.read(appClockProvider);
    final share = _ref.read(externalShareControllerProvider);
    final reportData = await _loadReportExportData(
      viewModel: viewModel,
      profiles: profiles,
    );
    final export = buildHostOpsReportExport(
      event: viewModel.event,
      participations: reportData.participations,
      namesByUid: reportData.namesByUid,
      exportedAt: clock.now(),
    );
    await _shareExport(share, export: export, origin: origin);
  }

  @override
  Future<void> shareRevenueReport({
    required AttendanceSheetViewModel viewModel,
    required Map<String, (String, String?)> profiles,
    Rect? origin,
  }) async {
    final clock = _ref.read(appClockProvider);
    final share = _ref.read(externalShareControllerProvider);
    final reportData = await _loadReportExportData(
      viewModel: viewModel,
      profiles: profiles,
    );
    final export = buildHostRevenueReportExport(
      event: viewModel.event,
      participations: reportData.participations,
      namesByUid: reportData.namesByUid,
      exportedAt: clock.now(),
    );
    await _shareExport(share, export: export, origin: origin);
  }

  @override
  Future<void> cancelHostedEvent({required Event event}) => _ref
      .read(hostEventBookingControllerProvider.notifier)
      .cancelHostedEvent(event: event);

  @override
  Future<void> deleteUnusedEvent({required Event event}) => _ref
      .read(hostEventBookingControllerProvider.notifier)
      .deleteHostedEvent(event: event);

  Future<
    ({List<EventParticipation> participations, Map<String, String> namesByUid})
  >
  _loadReportExportData({
    required AttendanceSheetViewModel viewModel,
    required Map<String, (String, String?)> profiles,
  }) async {
    final participationReads = _ref.read(eventParticipationRepositoryProvider);
    final publicProfiles = _ref.read(publicProfileRepositoryProvider);
    final participations = await participationReads
        .fetchHostReportParticipationsForEvent(eventId: viewModel.event.id);
    final profileIds = _uniqueOrdered([
      ...participations.map((participation) => participation.uid),
      ...profiles.keys,
    ]);
    final exportProfiles = await publicProfiles.fetchPublicProfiles(profileIds);
    final namesByUid = <String, String>{
      for (final entry in profiles.entries) entry.key: entry.value.$1,
      for (final profile in exportProfiles) profile.uid: profile.name,
    };
    return (participations: participations, namesByUid: namesByUid);
  }

  Future<void> _shareExport(
    ExternalShareController share, {
    required HostReportExport export,
    required Rect? origin,
  }) {
    return share.shareCsvFile(
      csv: export.csv,
      fileName: export.fileName,
      subject: export.subject,
      text: export.subject,
      origin: origin,
    );
  }
}

class HostInviteLinkDraft {
  const HostInviteLinkDraft({required this.label, this.source});

  final String label;
  final String? source;
}

String hostInviteLinkUrl({
  required Event event,
  required String inviteCode,
  required String inviteLinkId,
}) {
  return AppDeepLinks.event(
    organizerId: event.organizerId,
    eventId: event.id,
    inviteCode: inviteCode,
    inviteLinkId: inviteLinkId,
  ).toString();
}

List<String> _uniqueOrdered(Iterable<String> values) {
  final seen = <String>{};
  return [
    for (final value in values)
      if (seen.add(value)) value,
  ];
}
