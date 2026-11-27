import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_test_support/design_fixtures/host_operations_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Shared Audience header',
  type: HostAudienceHeader,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostAudienceHeaderStates(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'HostAudienceHeader',
      contractId: 'screen.host.customers',
      children: [
        const WidgetbookPageStateCard(
          label: 'no organizer',
          child: WidgetbookHostDeviceFrame(child: HostAudienceHeader()),
        ),
        WidgetbookPageStateCard(
          label: 'organizer actions',
          child: WidgetbookHostDeviceFrame(
            child: HostAudienceHeader(
              organizerId: HostOperationsFixtures.primaryOrganizer.id,
            ),
          ),
        ),
      ],
    );
