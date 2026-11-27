import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/create/create_event_prefill.dart';
import 'package:catch_dating_app/hosts/create/create_route_screen.dart';
import 'package:catch_dating_app/hosts/events/access/event_door_screen.dart';
import 'package:catch_dating_app/hosts/events/access/event_guest_sources_screen.dart';
import 'package:catch_dating_app/hosts/events/access/event_share_screen.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_screen.dart';
import 'package:catch_dating_app/hosts/events/event_guests_screen.dart';
import 'package:catch_dating_app/hosts/events/event_plan_screen.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_body.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_state.dart';
import 'package:catch_dating_app/hosts/events/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/events/host_event_manage_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// One event's workspace: the poster, the views, what is ready for
/// tonight, the plan, booking and after-the-night links, the numbers, and
/// editing, duplicating or cancelling the event.
///
/// It watches [hostEventWorkspaceControllerProvider], checks the signed-in
/// account hosts the organizer, and turns the body's callbacks into
/// navigation and the existing cancel command. Every read behind it is a
/// listener or a cached read.
class HostEventWorkspaceScreen extends ConsumerWidget {
  const HostEventWorkspaceScreen({
    super.key,
    required this.organizerId,
    required this.eventId,
    this.now,
  });

  final String organizerId;
  final String eventId;

  /// A fixed clock for previews and tests; null reads the device clock.
  final DateTime? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final request = HostEventRequest(
      organizerId: organizerId,
      eventId: eventId,
    );
    final state = ref.watch(hostEventWorkspaceControllerProvider(request));
    final uid = ref.watch(uidProvider).value;
    final organizer = ref.watch(watchOrganizerProvider(organizerId)).value;
    final cancelling = ref
        .watch(HostEventBookingController.hostCancelEventMutation)
        .isPending;
    final deleting = ref
        .watch(HostEventBookingController.deleteEventMutation)
        .isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        HostEventBookingController.hostCancelEventMutation,
        HostEventBookingController.deleteEventMutation,
      ],
      errorContext: AppErrorContext.event,
    );
    final event = state.event;
    final denied =
        organizer != null && uid != null && !organizer.isHostedBy(uid);
    final actions = _HostEventWorkspaceActions(
      context: context,
      ref: ref,
      organizerId: organizerId,
      organizer: organizer,
      event: event,
    );
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-event-workspace-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          kicker: event == null ? null : hostEventKicker(event),
          title: event?.title,
          back: CatchTopBarBack(
            label: l10n.hostEventsBackToEvents,
            onPressed: actions.back,
          ),
          actions: [
            if (event != null && !denied)
              HostEventWorkspaceMenu(
                canCancel:
                    event.status == EventLifecycleStatus.active &&
                    event.endTime.isAfter(now ?? DateTime.now()),
                canDelete: !deleting && hostEventCanDelete(event),
                onSelected: actions.act,
              ),
          ],
        ),
        bodyScrolls: false,
        body: denied
            ? CatchPageBody.screen(
                child: CatchEmptyState(
                  icon: CatchIcons.block,
                  title: l10n.hostEventsDeniedTitle,
                  message: l10n.hostEventsDeniedBody,
                ),
              )
            : HostEventWorkspaceBody(
                state: state,
                now: now ?? DateTime.now(),
                cancelling: cancelling || deleting,
                onView: actions.view,
                onAction: actions.act,
                onRetry: () => retryHostEventWorkspaceReads(ref, request),
              ),
      ),
    );
  }
}

/// The tool top bar's kicker: the event's day, date and start time.
String hostEventKicker(Event event) {
  final start = event.startTime;
  return '${EventFormatters.shortWeekday(start)} ${start.day} '
      '${EventFormatters.shortMonth(start)} · ${EventFormatters.time(start)}';
}

/// The workspace's Event actions menu: edit, duplicate and cancel.
/// Whether the event can be deleted rather than cancelled: it is not
/// cancelled and nobody has booked, checked in or joined the waitlist. The
/// server checks again and refuses an event with bookings, payments or
/// reviews.
bool hostEventCanDelete(Event event) =>
    !event.isCancelled &&
    event.signedUpCount == 0 &&
    event.attendedCount == 0 &&
    event.waitlistCount == 0;

class HostEventWorkspaceMenu extends StatelessWidget {
  const HostEventWorkspaceMenu({
    super.key,
    required this.canCancel,
    required this.onSelected,
    this.canDelete = false,
  });

  final bool canCancel;

  /// Nobody has booked yet, so the event can be deleted outright.
  final bool canDelete;
  final ValueChanged<HostEventWorkspaceAction> onSelected;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchMenu<HostEventWorkspaceAction>.anchored(
      items: [
        CatchMenuItem(
          value: HostEventWorkspaceAction.edit,
          label: l10n.hostEventsMenuEdit,
          icon: CatchIcons.edit,
        ),
        CatchMenuItem(
          value: HostEventWorkspaceAction.duplicate,
          label: l10n.hostEventsMenuDuplicate,
          icon: CatchIcons.copy,
        ),
        CatchMenuItem(
          value: HostEventWorkspaceAction.chat,
          label: l10n.hostEventsMenuChat,
          icon: CatchIcons.chat,
        ),
        if (canCancel)
          CatchMenuItem(
            value: HostEventWorkspaceAction.cancel,
            label: l10n.hostEventsMenuCancel,
            icon: CatchIcons.delete,
            danger: true,
          ),
        if (canDelete)
          CatchMenuItem(
            value: HostEventWorkspaceAction.delete,
            label: l10n.hostEventsMenuDelete,
            icon: CatchIcons.delete,
            danger: true,
          ),
      ],
      onSelected: (action, _) => onSelected(action),
      builder: (context, controller, _) => CatchIconAction(
        tooltip: l10n.hostEventsMenuLabel,
        size: GeneratedCatchSizeTokens.controlMd,
        onPressed: controller.isOpen ? controller.close : controller.open,
        child: CatchIcon(CatchIcons.more),
      ),
    );
  }
}

/// What the workspace's views, rows and menu do.
class _HostEventWorkspaceActions {
  const _HostEventWorkspaceActions({
    required this.context,
    required this.ref,
    required this.organizerId,
    required this.organizer,
    required this.event,
  });

  final BuildContext context;
  final WidgetRef ref;
  final String organizerId;
  final Organizer? organizer;
  final Event? event;

  Map<String, String> get _path => {
    'organizerId': organizerId,
    'eventId': ?event?.id,
  };

  void back() {
    // Opened beside Today or in the wide split view, Back returns to that
    // list rather than switching tabs.
    final workspaceBack = CatchWorkspaceBackScope.maybeOf(context);
    if (workspaceBack != null) {
      workspaceBack();
    } else if (context.canPop()) {
      context.pop();
    } else {
      context.goNamed(Routes.hostEventsScreen.name);
    }
  }

  void view(HostEventView view) {
    final event = this.event;
    if (event == null) return;
    switch (view) {
      case HostEventView.overview:
        return;
      case HostEventView.guests:
        // The roster route is the door; the guest lists open beside it.
        final request = HostEventRequest(
          organizerId: organizerId,
          eventId: event.id,
        );
        unawaited(
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => HostEventGuestsScreen(request: request),
            ),
          ),
        );
      case HostEventView.live || HostEventView.report:
        context.pushNamed(
          Routes.hostAppEventManageScreen.name,
          pathParameters: _path,
          queryParameters: {
            'section': view == HostEventView.live ? 'live' : 'report',
          },
          extra: event,
        );
    }
  }

  void act(HostEventWorkspaceAction action) {
    final event = this.event;
    if (event == null) return;
    final request = HostEventRequest(
      organizerId: organizerId,
      eventId: event.id,
    );
    switch (action) {
      case HostEventWorkspaceAction.plan:
        unawaited(
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => HostEventPlanScreen(request: request),
            ),
          ),
        );
      case HostEventWorkspaceAction.publish:
        context.pushNamed(
          Routes.hostEventPublicationScreen.name,
          pathParameters: _path,
        );
      case HostEventWorkspaceAction.share:
        unawaited(
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => HostEventShareScreen(request: request),
            ),
          ),
        );
      case HostEventWorkspaceAction.sources:
        unawaited(
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => HostEventGuestSourcesScreen(request: request),
            ),
          ),
        );
      case HostEventWorkspaceAction.moments:
        context.pushNamed(
          Routes.hostAppEventMomentsScreen.name,
          pathParameters: _path,
          extra: event,
        );
      case HostEventWorkspaceAction.chat:
        context.pushNamed(
          Routes.eventChatScreen.name,
          pathParameters: {'eventId': event.id},
          queryParameters: {'organizerId': organizerId},
        );
      case HostEventWorkspaceAction.closeOut:
        unawaited(
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => HostEventCloseOutScreen(request: request),
            ),
          ),
        );
      case HostEventWorkspaceAction.edit:
        context.pushNamed(
          Routes.hostAppEditEventScreen.name,
          pathParameters: _path,
          extra: event,
        );
      case HostEventWorkspaceAction.duplicate:
        final organizer = this.organizer;
        if (organizer == null) return;
        context.pushNamed(
          Routes.hostCreateEventScreen.name,
          pathParameters: {'organizerId': organizerId},
          extra: HostCreateEventRouteArguments(
            initialOrganizer: organizer,
            initialPrefill: CreateEventPrefill.repeat(
              event: event,
              createdAt: DateTime.now(),
            ),
          ),
        );
      case HostEventWorkspaceAction.team:
        unawaited(
          Navigator.of(context)
              .push(
                MaterialPageRoute<void>(
                  builder: (_) => HostEventDoorScreen(request: request),
                ),
              )
              // A grant made there shows on the Team row.
              .then((_) {
                if (context.mounted) {
                  ref.invalidate(hostEventWorkspaceStaffProvider(request));
                }
              }),
        );
      case HostEventWorkspaceAction.practise:
        context.pushNamed(
          Routes.hostEventRehearsalStartScreen.name,
          pathParameters: {'organizerId': organizerId},
          queryParameters: {'eventId': event.id},
        );
      case HostEventWorkspaceAction.cancel:
        unawaited(_cancel(event));
      case HostEventWorkspaceAction.delete:
        unawaited(_delete(event));
    }
  }

  Future<void> _delete(Event event) async {
    final l10n = context.l10n;
    final confirmed = await showCatchAdaptiveDialog<bool>(
      context: context,
      title: l10n.hostEventsDeleteTitle,
      message: l10n.hostEventsDeleteBody,
      actions: [
        CatchDialogAction(
          label: l10n.hostEventsCancelKeep,
          value: false,
          isDefault: true,
        ),
        CatchDialogAction(
          label: l10n.hostEventsDeleteConfirm,
          value: true,
          isDestructive: true,
        ),
      ],
    );
    if (confirmed != true || !context.mounted) return;
    final done = l10n.hostEventsDeleted;
    final router = GoRouter.of(context);
    try {
      await HostEventBookingController.deleteEventMutation.run(
        ref,
        (tx) => tx
            .get(hostEventManageActionsProvider)
            .deleteUnusedEvent(event: event),
      );
    } on Object {
      // The delete mutation's error notice, set up in build, says why.
      return;
    }
    if (context.mounted) showCatchNotice(context, done);
    router.goNamed(Routes.hostEventsScreen.name);
  }

  Future<void> _cancel(Event event) async {
    final l10n = context.l10n;
    final confirmed = await showCatchAdaptiveDialog<bool>(
      context: context,
      title: l10n.hostEventsCancelTitle,
      message: l10n.hostEventsCancelBody,
      actions: [
        CatchDialogAction(
          label: l10n.hostEventsCancelKeep,
          value: false,
          isDefault: true,
        ),
        CatchDialogAction(
          label: l10n.hostEventsCancelConfirm,
          value: true,
          isDestructive: true,
        ),
      ],
    );
    if (confirmed != true || !context.mounted) return;
    final done = l10n.hostEventsCancelled;
    unawaited(
      HostEventBookingController.hostCancelEventMutation
          .run(ref, (tx) async {
            await tx
                .get(hostEventManageActionsProvider)
                .cancelHostedEvent(event: event);
            if (context.mounted) showCatchNotice(context, done);
          })
          .then<void>((_) {}, onError: (Object _) {}),
    );
  }
}
