import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_practice_role_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_delivery_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_groups_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_guest_link_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_help_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_movement_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_practice_role_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_settings_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_setup_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_simulator_body.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_staff_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_sweep_section.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_actions.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Practice tools, on the night theme: what a rehearsal adds to the
/// rebuilt console, the way Night tools adds to a real night. The
/// rehearsal's run and virtual clock, made-up guests' behaviour and
/// faults, the help, delivery and sweep queues, settings, groups and
/// checkpoints, staff and the role to practise as, the guest phone link,
/// setup, the roster and the recap. Each section is the rehearsal's own,
/// reused as it is, and runs only rehearsal commands.
class HostRehearsalPracticeToolsScreen extends ConsumerWidget {
  const HostRehearsalPracticeToolsScreen({
    super.key,
    required this.organizerId,
    required this.sessionId,
  });

  final String organizerId;
  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final rehearsal = ref.watch(eventRehearsalProvider(sessionId)).value;
    final staff = rehearsal?.staffReview;
    final role = staff == null
        ? null
        : ref.watch(
            eventRehearsalPracticeRoleControllerProvider((
              sessionId: sessionId,
              clockId: staff.clockId,
            )),
          );
    final busy = HostRehearsalPracticeActions.busy(ref, sessionId);
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: HostRehearsalPracticeActions.mutations,
      errorContext: AppErrorContext.event,
    );
    final actions = HostRehearsalPracticeActions(
      context: context,
      ref: ref,
      organizerId: organizerId,
      sessionId: sessionId,
    );
    return CatchRoot(
      theme: CatchThemeMode.night,
      child: CatchScreen(
        key: const ValueKey<String>('host-rehearsal-practice-tools-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostLiveBack),
          kicker: rehearsal?.session.setup.title,
          title: l10n.hostEventsRehearsalPracticeTools,
        ),
        body: rehearsal == null
            ? const CatchPageBody.screen(child: CatchLoadingIndicator())
            : CatchPageBody.screen(
                child: CatchStack(
                  gap: CatchStackGap.section,
                  children: hostRehearsalPracticeTools(
                    rehearsal,
                    role: role,
                    busy: busy,
                    actions: actions,
                  ),
                ),
              ),
      ),
    );
  }
}

/// The practice tools [rehearsal] uses, in the order the screen shows
/// them. [role] is the staff role being practised; null is the host.
List<Widget> hostRehearsalPracticeTools(
  EventRehearsalBootstrap rehearsal, {
  required String? role,
  required bool busy,
  required HostRehearsalPracticeActions actions,
}) {
  final session = rehearsal.session;
  final staff = rehearsal.staffReview;
  return [
    EventRehearsalRunSection(
      session: session,
      isLoading: busy,
      onControl: (action, minutes) =>
          actions.control(session, action, minutes: minutes),
    ),
    EventRehearsalSimulatorBody(
      rehearsal: rehearsal,
      isLoading: busy,
      onBehavior: (actorId, behavior) =>
          actions.behave(session, actorId, behavior),
      onFault: (fault) => actions.fault(session, fault),
    ),
    EventRehearsalHelpSection(sessionId: session.id, practiceOperatorId: role),
    EventRehearsalDeliverySection(
      sessionId: session.id,
      practiceOperatorId: role,
    ),
    if (session.setup.modules.contains(EventRehearsalModule.accountability))
      EventRehearsalSweepSection(
        rehearsal: rehearsal,
        practiceOperatorId: role,
      ),
    if (rehearsal.settingsReview case final review? when role == null)
      EventRehearsalSettingsSection(sessionId: session.id, review: review),
    if ((rehearsal.movementReview?.groups.isNotEmpty ?? false) &&
        (session.setup.movementSimulation?.itinerary.any(
              (stop) => stop.location != null,
            ) ??
            false))
      EventRehearsalMovementSection(
        rehearsal: rehearsal,
        practiceOperatorId: role,
      ),
    if (rehearsal.membershipReviews?.rows.any(
          (row) => row.facts.groups.isNotEmpty,
        ) ??
        false)
      EventRehearsalGroupsSection(
        rehearsal: rehearsal,
        practiceOperatorId: role,
      ),
    if (staff != null) ...[
      EventRehearsalPracticeRoleSection(
        scope: (sessionId: session.id, clockId: staff.clockId),
      ),
      EventRehearsalStaffSection(sessionId: session.id),
    ],
    EventRehearsalGuestLinkSection(
      guestUrl: rehearsal.guestUrl,
      isLoading: busy,
      onCopy: () => unawaited(actions.copyGuestLink(rehearsal.guestUrl)),
      onShare: () => actions.shareGuestLink(rehearsal.guestUrl),
      onRotate: () => unawaited(actions.rotateGuestLink()),
    ),
    EventRehearsalSetupSection(
      session: session,
      isLoading: busy,
      onSave: (setup, scenario, actorCount) =>
          actions.saveSetup(session, setup, scenario, actorCount),
    ),
    EventRehearsalRosterSection(rehearsal: rehearsal),
    EventRehearsalRecapSection(
      rehearsal: rehearsal,
      isLoading: busy,
      onReset: () => unawaited(actions.reset()),
      onFork: () => unawaited(actions.fork()),
      onExport: () => unawaited(actions.export()),
    ),
  ];
}

/// Opens practice tools over the practice console.
void openHostRehearsalPracticeTools(
  BuildContext context, {
  required String organizerId,
  required String sessionId,
}) => unawaited(
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => HostRehearsalPracticeToolsScreen(
        organizerId: organizerId,
        sessionId: sessionId,
      ),
    ),
  ),
);
