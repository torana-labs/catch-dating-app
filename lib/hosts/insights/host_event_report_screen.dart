import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/events/shared/attendance_sheet_view_model.dart';
import 'package:catch_dating_app/hosts/insights/host_event_report_body.dart';
import 'package:catch_dating_app/hosts/insights/host_event_report_state.dart';
import 'package:catch_dating_app/hosts/insights/host_insights_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The report for one event after it ends: how it went, what guests said,
/// bringing them back to the next event, and the guest and payment exports.
///
/// It watches [hostEventReportControllerProvider] and turns the body's
/// callbacks into the existing commands: messages to the event's guests,
/// the audience picker, the event's workspace for every review, and the
/// guest-list and payments exports.
class HostEventReportScreen extends ConsumerWidget {
  const HostEventReportScreen({
    super.key,
    required this.organizer,
    required this.event,
    this.onBack,
    this.now,
  });

  final Organizer organizer;
  final Event event;

  /// Null pops the nearest navigator.
  final VoidCallback? onBack;

  /// A fixed clock for previews and tests; null reads the time.
  final DateTime? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final request = HostEventReportRequest(
      event: event,
      now: now ?? DateTime.now(),
      cityName: organizer.location,
    );
    final state = ref.watch(hostEventReportControllerProvider(request));
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        HostEventManageController.shareOpsReportMutation,
        HostEventManageController.shareRevenueReportMutation,
      ],
      errorContext: AppErrorContext.event,
    );
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-event-report-scroll-view'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(onPressed: onBack),
          actions: [
            CatchIconAction.toolbar(
              key: const ValueKey<String>('host-event-report-share'),
              icon: CatchIcons.share,
              tooltip: l10n.hostEventReportShare,
              onPressed: state.status == HostEventReportStatus.content
                  ? () => unawaited(_share(context, ref, state))
                  : null,
            ),
          ],
        ),
        body: state.status == HostEventReportStatus.error
            ? CatchLocalizedErrorState(
                state.error!,
                context: AppErrorContext.event,
                onRetry: () => retryHostEventReport(ref, request),
              )
            : HostEventReportBody(
                state: state,
                onAllReviews: () => context.pushNamed(
                  Routes.hostAppEventManageScreen.name,
                  pathParameters: {
                    'organizerId': organizer.id,
                    'eventId': event.id,
                  },
                  queryParameters: const {'section': 'setup'},
                  extra: event,
                ),
                onInviteAll: () => context.pushNamed(
                  Routes.hostInboxScreen.name,
                  queryParameters: {'eventId': event.id},
                  extra: organizer,
                ),
                onChoose: () => context.pushNamed(
                  Routes.hostAudienceScreen.name,
                  queryParameters: {'organizerId': organizer.id},
                ),
                onDownload: (download) =>
                    unawaited(_download(context, ref, download)),
              ),
      ),
    );
  }

  Future<void> _share(
    BuildContext context,
    WidgetRef ref,
    HostEventReportState state,
  ) {
    final l10n = context.l10n;
    final origin = _origin(context);
    return ref
        .read(externalShareControllerProvider)
        .shareText(
          subject: event.title,
          text: l10n.hostEventReportShareText(
            event: event.title,
            came: state.came ?? 0,
            newFaces: state.newFaces ?? 0,
          ),
          origin: origin,
        );
  }

  Future<void> _download(
    BuildContext context,
    WidgetRef ref,
    HostEventReportDownload download,
  ) async {
    final origin = _origin(context);
    final viewModel = AttendanceSheetViewModel(
      event: event,
      attendeeIds: const [],
      attendedIds: const {},
      waitlistedIds: const [],
      profileIds: const [],
      participationsByUid: const {},
    );
    try {
      switch (download) {
        case HostEventReportDownload.guestList:
          await HostEventManageController.shareOpsReportMutation.run(
            ref,
            (tx) => tx
                .get(hostEventManageActionsProvider)
                .shareOpsReport(
                  viewModel: viewModel,
                  profiles: const {},
                  origin: origin,
                ),
          );
        case HostEventReportDownload.payments:
          await HostEventManageController.shareRevenueReportMutation.run(
            ref,
            (tx) => tx
                .get(hostEventManageActionsProvider)
                .shareRevenueReport(
                  viewModel: viewModel,
                  profiles: const {},
                  origin: origin,
                ),
          );
      }
    } on Object {
      // listenToCatchMutationErrors shows the failure.
    }
  }

  Rect? _origin(BuildContext context) {
    final box = context.findRenderObject();
    if (box is! RenderBox || !box.hasSize) return null;
    return box.localToGlobal(Offset.zero) & box.size;
  }
}
