import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_focus_page_body.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_focus_screen.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_section.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_state.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalized_layout.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

@widgetbook.UseCase(
  name: 'Covered by focus choice',
  type: HostTodayFocusScreen,
  path: '[P1 product surfaces]/Host Today',
)
Widget hostTodayFocusScreenPreview(BuildContext context) =>
    hostTodayFocusChoices(context);

@widgetbook.UseCase(
  name: 'Choose a focus',
  type: HostTodayFocusPageBody,
  path: '[P1 product surfaces]/Host Today',
)
Widget hostTodayFocusChoices(BuildContext context) => CatchRouteScaffold(
  topBarBuilder: (_, _) => const CatchTopBar.route(title: 'Your focus'),
  body: CatchRouteBody.standardConstrained(
    child: HostTodayFocusPageBody(
      selected: HostTodayFocus.audience,
      pending: false,
      onSelect: (_) {},
      onContinue: () {},
      onSkip: () {},
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Covered by quiet roadmap',
  type: HostTodayPersonalizedLayout,
  path: '[P1 product surfaces]/Host Today',
)
Widget hostTodayPersonalizedLayoutPreview(BuildContext context) =>
    hostTodayQuietRoadmap(context);

@widgetbook.UseCase(
  name: 'Quiet day roadmap',
  type: HostTodayPersonalizationSection,
  path: '[P1 product surfaces]/Host Today',
)
Widget hostTodayQuietRoadmap(BuildContext context) =>
    CatchRootScreenScaffold.sections(
      title: const Text('Today'),
      children: [
        SliverToBoxAdapter(
          child: HostTodayPersonalizationSection(
            state: buildHostTodayPersonalizationState(
              today: const HostTodayState(status: HostTodayStatus.empty),
              preference: const HostTodayPreference.selected(
                HostTodayFocus.audience,
              ),
              evidence: const HostTodayRoadmapEvidence(
                audience: HostTodayMilestoneProgress.complete,
                rehearsal: HostTodayMilestoneProgress.incomplete,
                organizerPage: HostTodayMilestoneProgress.unknown,
                canManagePayouts: true,
              ),
            ),
            onChangeFocus: () {},
            onAction: (_) {},
          ),
        ),
      ],
    );
