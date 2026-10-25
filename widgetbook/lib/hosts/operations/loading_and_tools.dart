import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/domain/host_attendance_window.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_tools_rail.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_loading_skeleton.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/participant_table.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Report loading',
  type: HostAnalyticsReportLoadingIndicator,
  path: '[P1 product surfaces]/Host operations/Components',
)
@widgetbook.UseCase(
  name: 'Inline icon loading',
  type: HostInlineIconSkeleton,
  path: '[P1 product surfaces]/Host operations/Components',
)
Widget hostLoadingStatesCatalog(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'Host loading states',
    contractId: 'component.host.loading_skeletons',
    children: [
      WidgetbookPageStateCard(
        label: 'unresolved report',
        child: HostAnalyticsReportLoadingIndicator(),
      ),
      WidgetbookPageStateCard(
        label: 'unresolved icon',
        child: HostInlineIconSkeleton(),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Roster primitive states',
  type: ParticipantRowAction,
  path: '[P1 product surfaces]/Host operations/Components',
)
@widgetbook.UseCase(
  name: 'Roster primitive states',
  type: ParticipantDecisionButton,
  path: '[P1 product surfaces]/Host operations/Components',
)
Widget hostRosterPrimitiveCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'Catch roster primitives',
    contractId: 'component.host.roster_primitives',
    children: [
      WidgetbookPageStateCard(
        label: 'decision row',
        child: ParticipantTable(
          columns: const ['Guest', 'Signal', 'Host action'],
          rows: [
            ParticipantRow(
              person: 'Rhea Kapoor',
              meta: 'Arriving 7:10 PM',
              signal: 'Request',
              tone: CatchBadgeTone.brand,
              action: ParticipantDecideAction(
                onProfile: () {},
                onApprove: () {},
                onDecline: () {},
              ),
            ),
            ParticipantRow(
              person: 'Aarav Mehta',
              meta: 'Checked in',
              signal: 'In',
              tone: CatchBadgeTone.success,
              action: ParticipantButtonAction(label: 'Undo', onPressed: () {}),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Tool card states',
  type: HostEventToolsRail,
  path: '[P1 product surfaces]/Host operations/Components',
)
@widgetbook.UseCase(
  name: 'Tool card states',
  type: HostEventToolsPageIndicator,
  path: '[P1 product surfaces]/Host operations/Components',
)
@widgetbook.UseCase(
  name: 'Tool card states',
  type: HostEventToolCard,
  path: '[P1 product surfaces]/Host operations/Components',
)
Widget hostToolCardCatalogStates(BuildContext context) {
  final tools = [
    HostEventToolItem(
      event: HostOperationsFixtures.upcomingEvent,
      attendanceState: HostEventAttendanceState.open,
    ),
    HostEventToolItem(
      event: HostOperationsFixtures.privateEvent,
      attendanceState: HostEventAttendanceState.closed,
    ),
  ];
  return WidgetbookPageCatalogFrame(
    title: 'Host tool cards',
    contractId: 'component.host.tool_cards',
    children: [
      WidgetbookPageStateCard(
        label: 'event tools carousel',
        child: HostEventToolsRail(
          tools: tools,
          onManageEvent: (_) {},
          onTakeAttendance: (_) {},
          onViewReport: (_) {},
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event tool card',
        child: HostEventToolCard(
          item: tools.first,
          cardIndex: 0,
          cardCount: tools.length,
          onManageEvent: (_) {},
          onTakeAttendance: (_) {},
          onViewReport: (_) {},
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'page indicator',
        child: HostEventToolsPageIndicator(selectedIndex: 0, itemCount: 2),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Action card states',
  type: CatchEmptyState,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostEmptyStateStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CatchEmptyState',
    contractId: 'component.host.empty_action_card',
    children: [
      WidgetbookPageStateCard(
        label: 'single action',
        child: WidgetbookHostHomeSectionFrame(
          child: CatchEmptyState(
            title: 'Create your first club',
            message:
                'Create a club to publish events, manage attendees, and run Event Success.',
            padding: EdgeInsets.zero,
            actions: [
              CatchButton(
                label: 'Create club',
                leading: Icon(CatchIcons.addRounded, size: CatchIcon.md),
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'two actions',
        child: WidgetbookHostHomeSectionFrame(
          child: CatchEmptyState(
            title: 'No active events yet',
            message:
                'Create an event for ${HostOperationsFixtures.primaryClub.name} to start filling the host dashboard.',
            padding: EdgeInsets.zero,
            actions: [
              Wrap(
                alignment: WrapAlignment.center,
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  CatchButton(
                    label: 'New event',
                    leading: Icon(CatchIcons.addRounded, size: CatchIcon.sm),
                    onPressed: () {},
                  ),
                  CatchButton(
                    label: 'Events',
                    variant: CatchButtonVariant.secondary,
                    size: CatchButtonSize.md,
                    onPressed: () {},
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'pending action',
        child: WidgetbookHostHomeSectionFrame(
          child: CatchEmptyState(
            title: 'No host profile yet',
            message:
                'Create a professional host identity before editing profile details.',
            padding: EdgeInsets.zero,
            actions: [
              CatchButton(
                label: 'Create host profile',
                leading: Icon(CatchIcons.businessOutlined, size: CatchIcon.md),
                status: CatchButtonStatus.loading,
                onPressed: null,
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Covered by host event manage route states',
  type: HostEventManageScreen,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
// Exact host coverage entries. These point narrow promoted classes at the
// catalog route/component state that renders the owning workflow.
@widgetbook.UseCase(
  name: 'Exact catalog',
  type: ParticipantRowAction,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictCatchRosterActionCellCatalogStates(BuildContext context) =>
    hostRosterPrimitiveCatalogStates(context);

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: ParticipantDecisionButton,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictCatchRosterDecideTargetCatalogStates(BuildContext context) =>
    hostRosterPrimitiveCatalogStates(context);

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostAnalyticsReportLoadingIndicator,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostAnalyticsReportLoadingIndicatorCatalogStates(
  BuildContext context,
) => hostLoadingStatesCatalog(context);

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventToolCard,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventToolCardCatalogStates(BuildContext context) =>
    hostToolCardCatalogStates(context);

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventToolsRail,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventToolsCarouselCatalogStates(BuildContext context) =>
    hostToolCardCatalogStates(context);

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventToolsPageIndicator,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventToolsPageIndicatorCatalogStates(
  BuildContext context,
) => hostToolCardCatalogStates(context);

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostInlineIconSkeleton,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostInlineSkeletonIconCatalogStates(BuildContext context) =>
    hostLoadingStatesCatalog(context);
