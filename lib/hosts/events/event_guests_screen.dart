import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/events/shared/attendance_sheet_view_model.dart';
import 'package:catch_dating_app/hosts/events/event_guests_body.dart';
import 'package:catch_dating_app/hosts/events/event_guests_controller.dart';
import 'package:catch_dating_app/hosts/events/event_guests_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_screen.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The event's guests: booked, asked, waitlisted and cancelled, with Let in
/// for a guest who asked, Offer for a guest waiting, Message all and
/// Download the list.
///
/// It watches [hostEventGuestsControllerProvider] and turns the body's
/// callbacks into the existing join-request approval, waitlist offer and
/// list export commands, and the event's messages.
class HostEventGuestsScreen extends ConsumerStatefulWidget {
  const HostEventGuestsScreen({super.key, required this.request});

  final HostEventRequest request;

  @override
  ConsumerState<HostEventGuestsScreen> createState() =>
      _HostEventGuestsScreenState();
}

class _HostEventGuestsScreenState extends ConsumerState<HostEventGuestsScreen> {
  HostEventGuestList _list = HostEventGuestList.booked;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final request = widget.request;
    final state = ref.watch(hostEventGuestsControllerProvider(request));
    final event = state.event;
    final pending = <String>{
      for (final guest in [
        ...state.listOf(HostEventGuestList.asked),
        ...state.listOf(HostEventGuestList.waitlist),
      ])
        if (guest.uid case final uid?)
          if (ref
                  .watch(
                    HostEventBookingController.approveJoinRequestMutation(
                      HostEventBookingController.approveJoinRequestMutationKey(
                        eventId: request.eventId,
                        userId: uid,
                      ),
                    ),
                  )
                  .isPending ||
              ref
                  .watch(
                    HostEventBookingController.createWaitlistOfferMutation(
                      HostEventBookingController.waitlistOfferMutationKey(
                        eventId: request.eventId,
                        userId: uid,
                      ),
                    ),
                  )
                  .isPending)
            guest.id,
    };
    final downloading = ref
        .watch(HostEventManageController.shareOpsReportMutation)
        .isPending;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-event-guests-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostEventsBack),
          kicker: event == null ? null : hostEventKicker(event),
          title: event?.title,
        ),
        bodyScrolls: false,
        body: HostEventGuestsBody(
          state: state,
          list: _list,
          pending: pending,
          downloading: downloading,
          onView: _view,
          onList: (list) => setState(() => _list = list),
          onLetIn: _letIn,
          onOffer: _offer,
          onMessageAll: () => context.pushNamed(
            Routes.hostInboxScreen.name,
            queryParameters: {'eventId': request.eventId},
          ),
          onDownload: () => unawaited(_download()),
          onRetry: () => retryHostEventGuestsReads(ref, request),
        ),
      ),
    );
  }

  Map<String, String> get _path => {
    'organizerId': widget.request.organizerId,
    'eventId': widget.request.eventId,
  };

  void _view(HostEventView view) {
    switch (view) {
      case HostEventView.guests:
        return;
      case HostEventView.overview:
        if (context.canPop()) {
          context.pop();
        } else {
          context.goNamed(
            Routes.hostAppEventManageScreen.name,
            pathParameters: _path,
          );
        }
      case HostEventView.live || HostEventView.report:
        context.pushNamed(
          Routes.hostAppEventManageScreen.name,
          pathParameters: _path,
          queryParameters: {
            'section': view == HostEventView.live ? 'live' : 'report',
          },
        );
    }
  }

  void _letIn(HostEventGuest guest) {
    final uid = guest.uid;
    if (uid == null) return;
    final eventId = widget.request.eventId;
    _quietly(
      HostEventBookingController.approveJoinRequestMutation(
        HostEventBookingController.approveJoinRequestMutationKey(
          eventId: eventId,
          userId: uid,
        ),
      ).run(
        ref,
        (tx) => tx
            .get(hostEventBookingControllerProvider.notifier)
            .approveJoinRequest(eventId: eventId, userId: uid),
      ),
    );
  }

  void _offer(HostEventGuest guest) {
    final uid = guest.uid;
    if (uid == null) return;
    final eventId = widget.request.eventId;
    _quietly(
      HostEventBookingController.createWaitlistOfferMutation(
        HostEventBookingController.waitlistOfferMutationKey(
          eventId: eventId,
          userId: uid,
        ),
      ).run(
        ref,
        (tx) => tx
            .get(hostEventBookingControllerProvider.notifier)
            .createWaitlistOffers(eventId: eventId, userIds: [uid]),
      ),
    );
  }

  /// Shares the guest list through the existing list export.
  Future<void> _download() async {
    final l10n = context.l10n;
    final box = context.findRenderObject() as RenderBox?;
    final origin = box == null
        ? null
        : box.localToGlobal(Offset.zero) & box.size;
    final viewModel = ref
        .read(attendanceSheetViewModelProvider(widget.request.eventId))
        .value;
    if (viewModel == null) return;
    try {
      final ids = [...viewModel.profileIds]..sort();
      final profiles = await ref.read(
        hostEventGuestNamesProvider(ids.join(',')).future,
      );
      await HostEventManageController.shareOpsReportMutation.run(
        ref,
        (tx) => tx
            .get(hostEventManageActionsProvider)
            .shareOpsReport(
              viewModel: viewModel,
              profiles: profiles,
              origin: origin,
            ),
      );
    } on Object catch (error, stackTrace) {
      ref
          .read(errorLoggerProvider)
          .logError(error, stackTrace, reason: 'share the guest list');
      if (mounted) {
        showCatchNotice(context, l10n.hostEventsGuestsDownloadFailed);
      }
      return;
    }
    if (mounted) showCatchNotice(context, l10n.hostEventsGuestsDownloaded);
  }

  void _quietly(Future<Object?> command) =>
      unawaited(command.then<void>((_) {}, onError: (Object _) {}));
}
