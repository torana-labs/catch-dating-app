import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Header content',
  type: CatchTopBar,
  path: '[P1 product surfaces]/Dashboard home',
)
Widget dashboardHeaderContentReview(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CatchTopBar',
    contractId: 'dashboard.home.header_content',
    children: [
      WidgetbookPageStateCard(
        label: 'copy only',
        child: const WidgetbookDashboardPrimitiveFrame(
          child: CatchTopBar.primaryRail(
            title: 'Good evening, Subrath',
            actions: [],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'notification action',
        child: WidgetbookDashboardPrimitiveFrame(
          child: CatchTopBar.primaryRail(
            title: 'Three plans ready',
            actions: [
              CatchIconAction.counted(
                icon: CatchIcons.notifications,
                count: 3,
                size: CatchIconAction.navSize,
                tooltip: 'Notifications',
                onPressed: widgetbookNoop,
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Counted notification action',
  type: CatchIconAction,
  path: '[P1 product surfaces]/Dashboard primitives',
)
Widget dashboardCountedNotificationActionReviewStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CatchIconAction.counted',
    contractId: 'catch.icon_button',
    children: [
      WidgetbookPageStateCard(
        label: 'no unread',
        child: WidgetbookDashboardPrimitiveFrame(
          child: CatchIconAction.counted(
            icon: CatchIcons.notifications,
            count: 0,
            size: CatchIconAction.navSize,
            tooltip: 'Notifications',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'unread count',
        child: WidgetbookDashboardPrimitiveFrame(
          child: CatchIconAction.counted(
            icon: CatchIcons.notifications,
            count: 3,
            size: CatchIconAction.navSize,
            tooltip: 'Notifications',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'overflow badge',
        child: WidgetbookDashboardPrimitiveFrame(
          child: CatchIconAction.counted(
            icon: CatchIcons.notifications,
            count: 124,
            size: CatchIconAction.navSize,
            tooltip: 'Notifications',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}
