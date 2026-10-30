import 'package:catch_dating_app/dashboard/presentation/widgets/empty_hero_card.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class DashboardEmptySliverBody extends StatelessWidget {
  const DashboardEmptySliverBody({super.key});

  @override
  Widget build(BuildContext context) {
    return const SliverMainAxisGroup(
      slivers: [
        SliverToBoxAdapter(child: EmptyHeroCard(fullBleed: true)),
        SliverToBoxAdapter(child: HowCatchWorksSection()),
      ],
    );
  }
}

/// Shared explainer for both the signed-out and signed-in idle Home states.
class HowCatchWorksSection extends StatelessWidget {
  const HowCatchWorksSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          maxWidth: CatchLayout.maxContentWidth,
        ),
        child: CatchSectionList.inset(
          emptyStateOmitted: true,
          padding: CatchInsets.pageBody.copyWith(
            top: CatchSpacing.s5,
            bottom: 0,
          ),
          children: [
            CatchSection.divided(
              title: context.l10n.dashboardDashboardEmptyTitleHowCatchWorks,
              first: true,
              bodyGap: CatchSpacing.s4,
              child: CatchStepList(steps: _howCatchWorksSteps(context.l10n)),
            ),
          ],
        ),
      ),
    );
  }
}

List<CatchStepRowData> _howCatchWorksSteps(AppLocalizations l10n) => [
  CatchStepRowData(
    title: l10n.dashboardDashboardEmptyTitleBookAGroupEvent,
    body: l10n.dashboardDashboardEmptyBodyPickAOrganizerNear,
  ),
  CatchStepRowData(
    title: l10n.dashboardDashboardEmptyTitleActuallyShowUp,
    body: l10n.dashboardDashboardEmptyBodyMeetTheOrganizerAt,
  ),
  CatchStepRowData(
    title: l10n.dashboardDashboardEmptyTitleCatchWithin24Hours,
    body: l10n.dashboardDashboardEmptyBodyYouGetTheRoster,
  ),
  CatchStepRowData(
    title: l10n.dashboardDashboardEmptyTitleTheyCatchYouBack,
    body: l10n.dashboardDashboardEmptyBodyMatchMessagePlanThe,
  ),
];
