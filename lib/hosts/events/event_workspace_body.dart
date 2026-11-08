import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/parts/host_event_poster.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_state.dart';
import 'package:catch_dating_app/hosts/events/widgets/host_event_tab_bar.dart';
import 'package:catch_kernel/country_markets.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// What the workspace's rows and buttons open or do.
enum HostEventWorkspaceAction {
  plan,
  publish,
  closeOut,
  edit,
  duplicate,
  team,
  practise,
  cancel,
}

/// The event workspace's overview in board order: the poster, the views,
/// Ready for tonight, the plan, booking and after-the-night links, Booked
/// and Ticket sales, Edit and the team, and Cancel this event.
class HostEventWorkspaceBody extends StatelessWidget {
  const HostEventWorkspaceBody({
    super.key,
    required this.state,
    required this.now,
    required this.onView,
    required this.onAction,
    required this.onRetry,
    this.cancelling = false,
  });

  final HostEventWorkspaceState state;

  /// The clock the poster reads tonight or a later day from.
  final DateTime now;
  final ValueChanged<HostEventView> onView;
  final ValueChanged<HostEventWorkspaceAction> onAction;
  final VoidCallback onRetry;

  /// The cancel command is on its way.
  final bool cancelling;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final event = state.event;
    switch (state.status) {
      case HostEventWorkspaceStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case HostEventWorkspaceStatus.missing:
        return CatchPageBody.screen(
          child: CatchEmptyState(
            icon: CatchIcons.eventUnavailable,
            title: l10n.hostEventsMissingTitle,
            message: l10n.hostEventsMissingBody,
          ),
        );
      case HostEventWorkspaceStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostEventsWorkspaceErrorTitle,
            message: l10n.hostEventsErrorBody,
            retryLabel: l10n.hostEventsRetry,
            onRetry: onRetry,
          ),
        );
      case HostEventWorkspaceStatus.ready:
        break;
    }
    if (event == null) {
      return const CatchPageBody.screen(child: CatchLoadingIndicator());
    }
    final over = !event.endTime.isAfter(now);
    final cancelled = event.status == EventLifecycleStatus.cancelled;
    return CatchPageBody.screen(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [
          HostEventPoster(
            event: event,
            now: now,
            newFaces: state.newFaces,
            people: state.people,
          ),
          HostEventTabBar(selected: HostEventView.overview, onView: onView),
          if (!over && !cancelled) _ready(context, event),
          _links(context, event),
          _stats(context, event),
          _manage(context),
          if (!over && !cancelled)
            CatchButton(
              label: l10n.hostEventsCancelEvent,
              variant: CatchButtonVariant.danger,
              fullWidth: true,
              onPressed: cancelling
                  ? null
                  : () => onAction(HostEventWorkspaceAction.cancel),
            ),
        ],
      ),
    );
  }

  Widget _ready(BuildContext context, Event event) {
    final l10n = context.l10n;
    const done = CatchMarker(
      variant: CatchMarkerVariant.check,
      tone: CatchMarkerTone.success,
    );
    const todo = CatchMarker(variant: CatchMarkerVariant.ring);
    final door = state.door;
    return CatchSection(
      title: l10n.hostEventsReadyTitle,
      note: l10n.hostEventsReadyNote(
        done: state.readyDone,
        total: HostEventWorkspaceState.readyTotal,
      ),
      children: [
        CatchIndexRow(
          key: const ValueKey<String>('host-event-ready-plan'),
          title: state.planSet
              ? l10n.hostEventsReadyPlanSet
              : l10n.hostEventsReadyPlanMissing,
          subtitle: state.planSet
              ? l10n.hostEventsReadyPlanSteps(
                  count: state.planSteps!,
                  time: EventFormatters.time(event.startTime),
                )
              : l10n.hostEventsReadyPlanMissingBody,
          leading: state.planSet ? done : todo,
          onTap: () => onAction(HostEventWorkspaceAction.plan),
        ),
        CatchIndexRow(
          key: const ValueKey<String>('host-event-ready-door'),
          title: door.isNotEmpty
              ? l10n.hostEventsReadyDoor(name: _firstName(door.first))
              : state.doorChecked
              ? l10n.hostEventsReadyDoorNobody
              : l10n.hostEventsReadyDoorChecking,
          subtitle: door.isNotEmpty
              ? l10n.hostEventsReadyDoorBody
              : l10n.hostEventsReadyDoorNobodyBody,
          leading: door.isNotEmpty ? done : todo,
          onTap: () => onAction(HostEventWorkspaceAction.team),
        ),
        CatchIndexRow(
          key: const ValueKey<String>('host-event-ready-practise'),
          title: l10n.hostEventsReadyPractise,
          subtitle: l10n.hostEventsReadyPractiseBody,
          leading: todo,
          onTap: null,
          action: CatchIndexRowAction(
            label: l10n.hostEventsReadyPractiseAction,
            onPressed: () => onAction(HostEventWorkspaceAction.practise),
          ),
        ),
      ],
    );
  }

  Widget _links(BuildContext context, Event event) {
    final l10n = context.l10n;
    final steps = state.planSteps;
    return CatchSection(
      children: [
        CatchIndexRow(
          key: const ValueKey<String>('host-event-link-plan'),
          title: l10n.hostEventsLinkPlan,
          subtitle: l10n.hostEventsLinkPlanBody,
          value: steps == null || steps == 0
              ? null
              : l10n.hostEventsSteps(count: steps),
          chevron: true,
          onTap: () => onAction(HostEventWorkspaceAction.plan),
        ),
        if (event.setupRevision != null)
          CatchIndexRow(
            key: const ValueKey<String>('host-event-link-publish'),
            title: l10n.hostEventsLinkPublish,
            subtitle: event.effectiveEventPolicy.usesInviteOnly
                ? l10n.hostEventsPublishInvite
                : l10n.hostEventsPublishEveryone,
            chevron: true,
            onTap: () => onAction(HostEventWorkspaceAction.publish),
          ),
        CatchIndexRow(
          key: const ValueKey<String>('host-event-link-close-out'),
          title: l10n.hostEventsLinkCloseOut,
          subtitle: l10n.hostEventsLinkCloseOutBody,
          chevron: true,
          onTap: () => onAction(HostEventWorkspaceAction.closeOut),
        ),
      ],
    );
  }

  Widget _stats(BuildContext context, Event event) {
    final l10n = context.l10n;
    final sales = state.ticketSalesMinor;
    return CatchStack(
      direction: CatchStackDirection.row,
      equal: true,
      children: [
        CatchMetricTile.stat(
          label: l10n.hostEventsBooked,
          value: event.capacityLimit > 0
              ? '${event.signedUpCount}/${event.capacityLimit}'
              : '${event.signedUpCount}',
          note: l10n.hostEventsOnWaitlist(count: event.waitlistCount),
        ),
        if (sales != null)
          CatchMetricTile.stat(
            label: l10n.hostEventsTicketSales,
            value: formatMinorCurrency(
              sales.round(),
              currencyCode: event.currency,
            ),
          ),
      ],
    );
  }

  Widget _manage(BuildContext context) {
    final l10n = context.l10n;
    final door = state.door;
    return CatchSection(
      children: [
        CatchIndexRow(
          key: const ValueKey<String>('host-event-edit'),
          title: l10n.hostEventsEdit,
          subtitle: l10n.hostEventsEditBody,
          chevron: true,
          onTap: () => onAction(HostEventWorkspaceAction.edit),
        ),
        CatchIndexRow(
          key: const ValueKey<String>('host-event-team'),
          title: l10n.hostEventsTeam,
          subtitle: door.isEmpty
              ? l10n.hostEventsTeamNobody
              : l10n.hostEventsTeamDoor(names: door.map(_firstName).join(', ')),
          trailing: door.isEmpty
              ? null
              : CatchAvatarRow(
                  items: [
                    for (final name in door) CatchPersonAvatarItem(name: name),
                  ],
                  size: GeneratedCatchSizeTokens.avatarSm,
                  countLabelBuilder: (count) =>
                      l10n.hostEventsTeamMore(count: count),
                ),
          onTap: () => onAction(HostEventWorkspaceAction.team),
        ),
      ],
    );
  }
}

String _firstName(String name) {
  final word = name.trim().split(RegExp(r'\s+')).first;
  return word.isEmpty ? name : word;
}
