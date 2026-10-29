import 'dart:ui';

import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_report_export.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/core/clipboard.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/events/shared/attendance_sheet_view_model.dart';
import 'package:catch_dating_app/events/shared/event_invite_share_copy.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/routing/app_deep_links.dart';
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
    required Club club,
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
    final response = await _ref
        .read(eventRepositoryProvider)
        .createInviteLink(
          eventId: event.id,
          label: draft.label,
          source: draft.source,
        );
    final url = hostInviteLinkUrl(
      event: event,
      inviteCode: inviteCode,
      inviteLinkId: response.inviteToken,
    );
    await _ref.read(clipboardControllerProvider).copyText(url);
    _ref.invalidate(watchEventInviteLinksProvider(event.id));
    return response.label;
  }

  @override
  Future<String> copyInviteLink({
    required Event event,
    required String inviteCode,
    required EventInviteLink link,
  }) async {
    final token = await _ref
        .read(eventRepositoryProvider)
        .getInviteLinkToken(eventId: event.id, inviteLinkId: link.id);
    final url = hostInviteLinkUrl(
      event: event,
      inviteCode: inviteCode,
      inviteLinkId: token,
    );
    await _ref.read(clipboardControllerProvider).copyText(url);
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
    _ref.invalidate(watchEventInviteLinksProvider(event.id));
    return link.label;
  }

  @override
  Future<void> sharePrivateLink({
    required Club club,
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
            clubName: club.name,
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
    final reportData = await _loadReportExportData(
      viewModel: viewModel,
      profiles: profiles,
    );
    final export = buildHostOpsReportExport(
      event: viewModel.event,
      participations: reportData.participations,
      namesByUid: reportData.namesByUid,
      exportedAt: DateTime.now(),
    );
    await _shareExport(export: export, origin: origin);
  }

  @override
  Future<void> shareRevenueReport({
    required AttendanceSheetViewModel viewModel,
    required Map<String, (String, String?)> profiles,
    Rect? origin,
  }) async {
    final reportData = await _loadReportExportData(
      viewModel: viewModel,
      profiles: profiles,
    );
    final export = buildHostRevenueReportExport(
      event: viewModel.event,
      participations: reportData.participations,
      namesByUid: reportData.namesByUid,
      exportedAt: DateTime.now(),
    );
    await _shareExport(export: export, origin: origin);
  }

  @override
  Future<void> cancelHostedEvent({required Event event}) async {
    await _ref
        .read(hostEventBookingControllerProvider.notifier)
        .cancelHostedEvent(event: event);
    _invalidateHostedEvent(event.id);
  }

  @override
  Future<void> deleteUnusedEvent({required Event event}) async {
    await _ref
        .read(hostEventBookingControllerProvider.notifier)
        .deleteHostedEvent(event: event);
    _invalidateHostedEvent(event.id);
  }

  void _invalidateHostedEvent(String eventId) {
    _ref.invalidate(watchEventProvider(eventId));
    _ref.invalidate(watchEventParticipationRosterProvider(eventId));
  }

  Future<
    ({List<EventParticipation> participations, Map<String, String> namesByUid})
  >
  _loadReportExportData({
    required AttendanceSheetViewModel viewModel,
    required Map<String, (String, String?)> profiles,
  }) async {
    final participations = await _ref
        .read(eventParticipationRepositoryProvider)
        .fetchHostReportParticipationsForEvent(eventId: viewModel.event.id);
    final profileIds = _uniqueOrdered([
      ...participations.map((participation) => participation.uid),
      ...profiles.keys,
    ]);
    final exportProfiles = await _ref
        .read(publicProfileRepositoryProvider)
        .fetchPublicProfiles(profileIds);
    final namesByUid = <String, String>{
      for (final entry in profiles.entries) entry.key: entry.value.$1,
      for (final profile in exportProfiles) profile.uid: profile.name,
    };
    return (participations: participations, namesByUid: namesByUid);
  }

  Future<void> _shareExport({
    required HostReportExport export,
    required Rect? origin,
  }) {
    return _ref
        .read(externalShareControllerProvider)
        .shareCsvFile(
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
    clubId: event.clubId,
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
