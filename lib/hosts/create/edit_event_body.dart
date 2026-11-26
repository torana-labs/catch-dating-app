import 'package:catch_dating_app/hosts/create/create_edit_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_step_form.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Editing a saved event on a phone: what can still change and the last
/// save error, then the four steps' forms on one page under their titles,
/// so one Save sends everything.
class EditEventBody extends StatelessWidget {
  const EditEventBody({
    super.key,
    required this.state,
    required this.handlers,
    required this.edit,
    required this.today,
    this.enableNetworkTiles = true,
  });

  final CreateFlowState state;
  final CreateHandlers handlers;
  final CreateEditHandlers edit;
  final DateTime today;

  /// False draws the map's no-network fallback (previews and captures).
  final bool enableNetworkTiles;

  @override
  Widget build(BuildContext context) => CatchStack(
    gap: CatchStackGap.g32,
    children: [
      EditEventScopeNotice(state: state),
      for (final step in const [
        CreateStep.basics,
        CreateStep.when,
        CreateStep.tickets,
        CreateStep.plan,
      ])
        CreateStepForm(
          state: state,
          handlers: handlers,
          step: step,
          today: today,
          edit: edit,
          showTitle: true,
          enableNetworkTiles: enableNetworkTiles,
        ),
    ],
  );
}

/// Why some of a saved event can no longer change: it was cancelled, or
/// guests have booked, or else what stays editable until they do. The last
/// save error shows under it.
class EditEventScopeNotice extends StatelessWidget {
  const EditEventScopeNotice({super.key, required this.state});

  final CreateFlowState state;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final facts = state.edit!;
    final error = state.error;
    final cancelled = facts.cancelled;
    final locked = facts.scheduleLocked;
    return CatchStack(
      children: [
        CatchNotice.inline(
          key: const ValueKey<String>('edit-event-scope'),
          tone: cancelled ? CatchNoticeTone.danger : CatchNoticeTone.status,
          icon: cancelled
              ? CatchIcons.block
              : locked
              ? CatchIcons.locked
              : CatchIcons.info,
          title: cancelled
              ? l10n.hostsEditHostedEventScreenTitleCancelledEvent
              : locked
              ? l10n.hostsEditHostedEventScreenTitleScheduleLocked
              : l10n.hostsEditHostedEventScreenTitlePublishedEvent,
          body: cancelled
              ? l10n.hostsEditHostedEventScreenMessageCancelledEventsCannotBe
              : locked
              ? l10n.hostsEditHostedEventScreenMessageYouCanStillUpdate
              : facts.policyLocked
              ? l10n.hostsEditHostedEventScreenMessageYouCanEditThe
              : l10n.hostsEditHostedEventScreenMessageYouCanEditSchedule,
        ),
        if (error != null)
          CatchLocalizedErrorBanner(error, context: AppErrorContext.event),
      ],
    );
  }
}
