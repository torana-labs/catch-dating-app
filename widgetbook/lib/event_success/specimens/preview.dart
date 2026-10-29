import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_compatibility_response.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_conversation_cue_card.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_defaults_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_questionnaire_config_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_setup_body.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_structure_config_editor.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

import '../../support/widgetbook_harness.dart';
import '../companion/screen.dart';
import 'coverage_states.dart';

enum EventSuccessStrictSurface {
  companion,
  defaults,
  featureBlocks,
  host,
  liveReveal,
  questionnaire,
  setup,
  structure,
}

Widget eventSuccessStrictPreview(
  BuildContext context, {
  required EventSuccessStrictSurface surface,
  required String componentName,
}) {
  return switch (surface) {
    EventSuccessStrictSurface.companion => eventSuccessCompanionScreenStates(
      context,
    ),
    EventSuccessStrictSurface.defaults => StrictCoverageScaffold(
      componentName: componentName,
      child: EventSuccessDefaultsSection(
        defaults: EventSuccessDefaults.recommendedForActivity(
          ActivityKind.socialRun,
          enabled: true,
          targetAttendeeCount: 24,
          attendeePrompt: "Ask three people what made them choose this event.",
        ),
        activityKind: ActivityKind.socialRun,
        targetAttendeeCount: 24,
        onChanged: (_) {},
        title: context.l10n.hostsEventSuccessStepTitleLiveEventGuide,
        subtitle: context.l10n.hostsEventSuccessStepSubtitleSaveASimplePlan,
      ),
    ),
    EventSuccessStrictSurface.featureBlocks => StrictCoverageScaffold(
      componentName: componentName,
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [EventSuccessReportSectionList()],
      ),
    ),
    EventSuccessStrictSurface.host => StrictCoverageScaffold(
      componentName: componentName,
      child: WidgetbookFixtureScope(
        overrides: const [],
        child: HostCoverageStates(),
      ),
    ),
    EventSuccessStrictSurface.liveReveal => StrictCoverageScaffold(
      componentName: componentName,
      child: WidgetbookFixtureScope(
        overrides: const [],
        child: LiveRevealCoverageStates(),
      ),
    ),
    EventSuccessStrictSurface.questionnaire => StrictCoverageScaffold(
      componentName: componentName,
      child: EventSuccessQuestionnaireConfigEditor(
        value: const EventSuccessQuestionnaireConfig.defaultTemplate(),
        onChanged: (_) {},
      ),
    ),
    EventSuccessStrictSurface.setup => StrictCoverageScaffold(
      componentName: componentName,
      child: EventSuccessSetupBody(
        draft: EventSuccessHostDraft.fromPlaybook(
          EventSuccessPlaybookLibrary.socialRun,
          targetAttendeeCount: 24,
        ),
        eventFormat: EventFormatSnapshot.fromActivityKind(
          ActivityKind.socialRun,
        ),
        targetAttendeeCount: 24,
        attendeePrompt:
            "Notice who arrived solo and make the first hello easy.",
        onChanged: (_) {},
        onAttendeePromptChanged: (_) {},
        showResetToRecommended: true,
        onResetToRecommended: () {},
      ),
    ),
    EventSuccessStrictSurface.structure => StrictCoverageScaffold(
      componentName: componentName,
      child: EventSuccessStructureConfigEditor(
        value: const EventSuccessStructureConfig(
          unitKind: EventSuccessUnitKind.pods,
          unitSize: 4,
          unitCount: 3,
          rotationIntervalMinutes: 15,
          revealCountdownSeconds: 10,
        ),
        targetAttendeeCount: 24,
        enabled: true,
        onChanged: (_) {},
      ),
    ),
  };
}

class StrictCoverageScaffold extends StatelessWidget {
  const StrictCoverageScaffold({
    super.key,
    required this.componentName,
    required this.child,
  });

  final String componentName;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Scaffold(
      backgroundColor: t.bg,
      body: SafeArea(
        child: ListView(
          padding: CatchInsets.content,
          children: [
            Text(componentName, style: CatchTextStyles.titleL(context)),
            gapH12,
            CatchSurface(
              borderRole: CatchBorderRole.separator,
              padding: CatchInsets.content,
              child: child,
            ),
          ],
        ),
      ),
    );
  }
}
