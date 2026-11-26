import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_rules.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_delivery_outcome.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_late_join_form.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_late_join_section.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_late_join_state.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_scores_screen.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_screen.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_tools_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../event_rehearsal/rehearsal_settings_use_cases.dart'
    show loadRehearsalSettingsPreviewFixture;

// Rehearsal practice: the rebuilt console, its scores and practice tools on
// the shared rehearsal fixture's made-up guests and virtual clock.

const _path = '[P1 product surfaces]/Host/Rehearsal practice';

@widgetbook.UseCase(
  name: 'A rehearsal on the live console',
  type: HostRehearsalPracticeScreen,
  path: _path,
)
Widget hostRehearsalPracticeScreenUseCase(BuildContext context) =>
    _PracticePreview(
      builder: (session) => HostRehearsalPracticeScreen(
        organizerId: session.organizerId,
        sessionId: session.id,
      ),
    );

@widgetbook.UseCase(
  name: 'A practice round',
  type: HostRehearsalPracticeScoresScreen,
  path: _path,
)
Widget hostRehearsalPracticeScoresScreenUseCase(BuildContext context) =>
    _PracticePreview(
      builder: (session) => HostRehearsalPracticeScoresScreen(
        organizerId: session.organizerId,
        sessionId: session.id,
        onGuests: () {},
      ),
    );

@widgetbook.UseCase(
  name: 'Practice tools',
  type: HostRehearsalPracticeToolsScreen,
  path: _path,
)
Widget hostRehearsalPracticeToolsScreenUseCase(BuildContext context) =>
    _PracticePreview(
      builder: (session) => HostRehearsalPracticeToolsScreen(
        organizerId: session.organizerId,
        sessionId: session.id,
      ),
    );

@widgetbook.UseCase(
  name: 'Late joiners in practice tools',
  type: HostRehearsalLateJoinSection,
  path: _path,
)
Widget hostRehearsalLateJoinSectionUseCase(BuildContext context) =>
    FutureBuilder<EventRehearsalBootstrap>(
      future: loadRehearsalSettingsPreviewFixture(),
      builder: (context, async) {
        if (async.hasError) return Text('Preview unavailable: ${async.error}');
        if (!async.hasData) return const CatchLoadingIndicator();
        return CatchPageBody.screen(
          child: HostRehearsalLateJoinSection(
            rehearsal: async.requireData,
            onOpen: (_) {},
          ),
        );
      },
    );

@widgetbook.UseCase(
  name: 'Directions for one late joiner',
  type: HostRehearsalLateJoinForm,
  path: _path,
)
Widget hostRehearsalLateJoinFormUseCase(BuildContext context) =>
    CatchPageBody.screen(
      child: HostRehearsalLateJoinForm(
        view: HostRehearsalLateJoinView(
          status: HostRehearsalLateJoinStatus.automatic,
          remainingOutcomes: 2,
          latestText: 'Join us at the studio.',
          groups: const [(groupId: 'event:whole', label: 'Whole event')],
          groupId: 'event:whole',
          points: [
            (
              alternativeId: 'alternative:${'a' * 64}',
              target: const AssistanceFixedPlace(
                placeId: 'studio',
                lateEntry: AssistanceLateEntry.allowed,
              ),
              label: 'Studio',
              text: 'Join us at the studio.',
            ),
            (
              alternativeId: 'alternative:${'b' * 64}',
              target: const AssistanceFixedPlace(
                placeId: 'park',
                lateEntry: AssistanceLateEntry.allowed,
              ),
              label: 'Park gate',
              text: 'Meet us at the park gate.',
            ),
          ],
          pointId: 'alternative:${'a' * 64}',
          mode: HostRehearsalLateJoinMode.automatic,
          rules: AssistanceLateJoinRules(
            destination: const LateJoinConfirmedProgress(),
            cutoff: const LateJoinEventEnd(),
            maxMessagesPerEpisode: 3,
            minimumMinutesBetweenMessages: 10,
            unanswered: LateJoinUnansweredRule.keepUnknownUntilCutoff,
          ),
          routes: const [AssistanceMessageRoute.catchEventSms],
          outcomes: const [
            RehearsalDeliveryConfirmed(RehearsalConfirmedDelivery.delivered),
          ],
          previewKind: HostRehearsalLateJoinPreviewKind.confirmed,
          previewText: 'Join us at the studio.',
        ),
        onGroup: (_) {},
        onPoint: (_) {},
        onLater: (_) {},
        onMode: (_) {},
        onRules: () {},
        onChannels: () {},
        onDeadline: () {},
        onClearDeadline: () {},
        onOutcomes: (_) {},
        onRetry: () {},
        onReload: () {},
        onPublish: () {},
        onSave: () {},
        onPause: () {},
      ),
    );

/// Loads the shared rehearsal fixture once and renders one practice screen
/// over it, with the rehearsal read answered from the fixture.
class _PracticePreview extends StatelessWidget {
  const _PracticePreview({required this.builder});

  final Widget Function(EventRehearsalSession session) builder;

  @override
  Widget build(BuildContext context) => FutureBuilder<EventRehearsalBootstrap>(
    future: loadRehearsalSettingsPreviewFixture(),
    builder: (context, async) {
      if (async.hasError) return Text('Preview unavailable: ${async.error}');
      if (!async.hasData) return const CatchLoadingIndicator();
      final rehearsal = async.requireData;
      return ProviderScope(
        overrides: [
          eventRehearsalProvider(
            rehearsal.session.id,
          ).overrideWith((ref) => Stream.value(rehearsal)),
        ],
        child: builder(rehearsal.session),
      );
    },
  );
}
