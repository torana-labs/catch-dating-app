import 'package:catch_dating_app/design_fixtures/catches_surface_fixtures.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Ready body states',
  type: EventRecapReadyBody,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget eventRecapReadyBodyStates(BuildContext context) {
  final openEvent = CatchesSurfaceFixtures.openWindowEvent();
  final closedEvent = CatchesSurfaceFixtures.closedWindowEvent();
  final attendeeIds = CatchesSurfaceFixtures.candidates
      .map((profile) => profile.uid)
      .toList(growable: false);

  return WidgetbookPageCatalogFrame(
    title: 'EventRecapReadyBody',
    contractId: 'screen.catches.recap.ready_body',
    children: [
      WidgetbookPageStateCard(
        label: 'picks open',
        child: WidgetbookCatchesDeviceFrame(
          child: WidgetbookCatchesRecapReadyBodyPreview(
            event: openEvent,
            attendeeIds: attendeeIds,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'one person picked',
        child: WidgetbookCatchesDeviceFrame(
          child: WidgetbookCatchesRecapReadyBodyPreview(
            event: openEvent,
            attendeeIds: attendeeIds,
            pickedIds: const {CatchesSurfaceFixtures.secondCandidateUid},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'picks closed',
        child: WidgetbookCatchesDeviceFrame(
          child: WidgetbookCatchesRecapReadyBodyPreview(
            event: closedEvent,
            attendeeIds: attendeeIds,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'nobody to pick',
        child: WidgetbookCatchesDeviceFrame(
          child: WidgetbookCatchesRecapReadyBodyPreview(
            event: openEvent,
            attendeeIds: const <String>[],
          ),
        ),
      ),
    ],
  );
}
