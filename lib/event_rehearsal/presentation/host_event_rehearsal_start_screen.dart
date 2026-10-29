import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_configuration.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_copy.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_entry_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_customise_sheet.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_entry_scaffold.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_source_sheet.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class HostEventRehearsalStartScreen extends ConsumerStatefulWidget {
  const HostEventRehearsalStartScreen({
    super.key,
    required this.clubId,
    this.sourceEventId,
    this.startFromOrganizerDefaults = false,
  });
  final String clubId;
  final String? sourceEventId;
  final bool startFromOrganizerDefaults;

  @override
  ConsumerState<HostEventRehearsalStartScreen> createState() =>
      _HostEventRehearsalStartScreenState();
}

class _HostEventRehearsalStartScreenState
    extends ConsumerState<HostEventRehearsalStartScreen> {
  EventRehearsalConfiguration? _configuration;
  bool _loadingSource = false;

  @override
  Widget build(BuildContext context) {
    final provider = eventRehearsalEntryProvider(
      widget.clubId,
      widget.sourceEventId,
    );
    final mutation = ref.watch(EventRehearsalController.createMutation);
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [EventRehearsalController.createMutation],
      errorContext: AppErrorContext.event,
    );
    return CatchAsyncBoundary<EventRehearsalEntryData>(
      value: ref.watch(provider),
      errorContext: AppErrorContext.event,
      onRetry: () => ref.invalidate(provider),
      loadingBuilder: (_) => const EventRehearsalEntryStateScaffold(
        child: CatchLoadingIndicator(),
      ),
      errorBuilder: (_, error, stack, retry) =>
          EventRehearsalEntryStateScaffold(
            child: CatchLocalizedErrorState(
              error,
              context: AppErrorContext.event,
              onRetry: retry,
            ),
          ),
      builder: (context, data) {
        final configuration =
            _configuration ??
            (widget.startFromOrganizerDefaults
                ? EventRehearsalConfiguration.defaults(
                    organizerDefaults: data.organizerDefaults,
                  )
                : data.initialConfiguration);
        return EventRehearsalEntryScaffold(
          configuration: configuration,
          isPending: _loadingSource || mutation.isPending,
          onChooseSource: () => _chooseSource(data, configuration),
          onChooseScenario: () => _chooseScenario(configuration),
          onCustomise: () => _customise(configuration),
          onStart: () => _start(configuration),
        );
      },
    );
  }

  Future<void> _chooseSource(
    EventRehearsalEntryData data,
    EventRehearsalConfiguration current,
  ) async {
    final source = await showCatchBottomSheet<EventRehearsalSourceChoice>(
      context: context,
      builder: (_) => EventRehearsalSourceSheet(
        events: data.events,
        configuration: current,
      ),
    );
    if (source == null || !mounted) return;
    if (source.eventId == current.sourceEvent?.id &&
        source.activityKind == current.sampleActivityKind) {
      return;
    }
    if (source.activityKind case final kind?) {
      setState(
        () => _configuration = EventRehearsalConfiguration.defaults(
          organizerDefaults: data.organizerDefaults,
          activityKind: kind,
          scenario: current.scenario,
        ),
      );
      return;
    }
    final event = data.events.firstWhere((event) => event.id == source.eventId);
    setState(() => _loadingSource = true);
    try {
      final plan = await ref.refresh(
        eventRehearsalSourcePlanProvider(event.id).future,
      );
      if (!mounted) return;
      setState(
        () => _configuration = EventRehearsalConfiguration.defaults(
          organizerDefaults: data.organizerDefaults,
          event: event,
          plan: plan.plan,
          sourceGuestCount: plan.guestCount,
          scenario: current.scenario,
        ),
      );
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.event,
        );
      }
    } finally {
      if (mounted) setState(() => _loadingSource = false);
    }
  }

  Future<void> _chooseScenario(EventRehearsalConfiguration current) async {
    final scenario = await showCatchSelectionSheet<EventRehearsalScenario>(
      context: context,
      title: context.l10n.hostEventRehearsalScenario,
      value: current.scenario,
      items: [
        for (final scenario in EventRehearsalScenario.values)
          CatchSelectionMenuItem(
            value: scenario,
            label: eventRehearsalScenarioTitle(context.l10n, scenario),
            sublabel: eventRehearsalScenarioBody(context.l10n, scenario),
          ),
      ],
    );
    if (scenario != null && mounted) {
      setState(() => _configuration = current.changeScenario(scenario));
    }
  }

  Future<void> _customise(EventRehearsalConfiguration current) async {
    final updated = await showCatchBottomSheet<EventRehearsalConfiguration>(
      context: context,
      builder: (_) => EventRehearsalCustomiseSheet(configuration: current),
    );
    if (updated != null && mounted) setState(() => _configuration = updated);
  }

  Future<void> _start(EventRehearsalConfiguration configuration) async {
    final setup = eventRehearsalConfigurationSetup(context.l10n, configuration);
    late final EventRehearsalCreated created;
    try {
      created = await EventRehearsalController.createMutation.run(
        ref,
        (tx) => tx
            .get(eventRehearsalControllerProvider.notifier)
            .create(
              organizerId: widget.clubId,
              sourceEventId: configuration.sourceEvent?.id,
              scenario: configuration.scenario,
              actorCount: configuration.actorCount,
              setup: setup,
              guestSource: configuration.useSimulatedGuests
                  ? 'simulated'
                  : 'event',
              startImmediately: true,
            ),
      );
    } on Object {
      return;
    }
    if (!mounted) return;
    context.goNamed(
      Routes.hostEventRehearsalScreen.name,
      pathParameters: {'clubId': widget.clubId, 'sessionId': created.sessionId},
    );
  }
}

class EventRehearsalEntryStateScaffold extends StatelessWidget {
  const EventRehearsalEntryStateScaffold({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => CatchRouteScaffold(
    topBarBuilder: (context, scrolled) => CatchTopBar.route(
      title: context.l10n.hostEventRehearsalTitle,
      navigation: const CatchTopBarNavigation(
        mode: CatchTopBarNavigationMode.back,
      ),
      emphasis: scrolled
          ? CatchTopBarEmphasis.divided
          : CatchTopBarEmphasis.plain,
    ),
    body: CatchRouteBody.standardViewport(child: child),
  );
}
