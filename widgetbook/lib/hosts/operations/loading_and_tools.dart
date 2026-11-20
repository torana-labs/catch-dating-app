import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';

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
                leading: Icon(CatchIcons.add, size: CatchIconSize.md),
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
                'Create an event for ${HostOperationsFixtures.primaryOrganizer.name} to start filling the host dashboard.',
            padding: EdgeInsets.zero,
            actions: [
              Wrap(
                alignment: WrapAlignment.center,
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  CatchButton(
                    label: 'New event',
                    leading: Icon(CatchIcons.add, size: CatchIconSize.sm),
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
                leading: Icon(CatchIcons.business, size: CatchIconSize.md),
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

// Exact host coverage entries. These point narrow promoted classes at the
// catalog route/component state that renders the owning workflow.
