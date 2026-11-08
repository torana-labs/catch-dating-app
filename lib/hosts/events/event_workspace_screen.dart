import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_screen.dart';
import 'package:catch_dating_app/hosts/events/event_guests_screen.dart';
import 'package:catch_dating_app/hosts/events/event_plan_screen.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_body.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_prefill.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
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
    final organizer = ref.watch(fetchOrganizerProvider(organizerId)).value;
    final cancelling = ref
        .watch(HostEventBookingController.hostCancelEventMutation)
        .isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [HostEventBookingController.hostCancelEventMutation],
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
                cancelling: cancelling,
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
class HostEventWorkspaceMenu extends StatelessWidget {
  const HostEventWorkspaceMenu({
    super.key,
    required this.canCancel,
    required this.onSelected,
  });

  final bool canCancel;
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
        if (canCancel)
          CatchMenuItem(
            value: HostEventWorkspaceAction.cancel,
            label: l10n.hostEventsMenuCancel,
            icon: CatchIcons.delete,
            danger: true,
          ),
      ],
      onSelected: (action, _) => onSelected(action),
      builder: (context, controller, _) => CatchIconAction(
        tooltip: l10n.hostEventsMenuLabel,
        variant: CatchIconActionVariant.plain,
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
    if (context.canPop()) {
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
        _push(
          HostEventGuestsScreen(
            request: HostEventRequest(
              organizerId: organizerId,
              eventId: event.id,
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
        _push(HostEventPlanScreen(request: request));
      case HostEventWorkspaceAction.publish:
        context.pushNamed(
          Routes.hostEventPublicationScreen.name,
          pathParameters: _path,
        );
      case HostEventWorkspaceAction.closeOut:
        _push(HostEventCloseOutScreen(request: request));
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
            promptForDrafts: false,
          ),
        );
      case HostEventWorkspaceAction.team:
        context.pushNamed(
          Routes.hostOrganizerTeamScreen.name,
          queryParameters: {'organizerId': organizerId},
        );
      case HostEventWorkspaceAction.practise:
        context.pushNamed(
          Routes.hostEventRehearsalStartScreen.name,
          pathParameters: {'organizerId': organizerId},
          queryParameters: {'eventId': event.id},
        );
      case HostEventWorkspaceAction.cancel:
        unawaited(_cancel(event));
    }
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

  void _push(Widget screen) => unawaited(
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen)),
  );
}
