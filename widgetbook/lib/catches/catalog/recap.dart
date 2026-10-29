import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/design_fixtures/catches_surface_fixtures.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen_state.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Loading composition',
  type: EventRecapLoadingBody,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget eventRecapLoadingBodyStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'EventRecapLoadingBody',
    contractId: 'screen.catches.recap.loading',
    children: [
      WidgetbookPageStateCard(
        label: 'content skeleton',
        child: WidgetbookCatchesDeviceFrame(child: EventRecapLoadingBody()),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Ready body states',
  type: EventRecapReadyBody,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget eventRecapReadyBodyStates(BuildContext context) {
  final event = CatchesSurfaceFixtures.closedWindowEvent();
  final attendeeIds = CatchesSurfaceFixtures.candidates
      .map((profile) => profile.uid)
      .toList(growable: false);

  return WidgetbookPageCatalogFrame(
    title: 'EventRecapReadyBody',
    contractId: 'screen.catches.recap.ready_body',
    children: [
      WidgetbookPageStateCard(
        label: 'checked-in roster',
        child: WidgetbookCatchesDeviceFrame(
          child: WidgetbookCatchesRecapReadyBodyPreview(
            event: event,
            attendeeIds: attendeeIds,
            selectedVibeIds: const <String>{},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'selected vibe tile',
        child: WidgetbookCatchesDeviceFrame(
          child: WidgetbookCatchesRecapReadyBodyPreview(
            event: event,
            attendeeIds: attendeeIds,
            selectedVibeIds: const {CatchesSurfaceFixtures.secondCandidateUid},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty roster',
        child: WidgetbookCatchesDeviceFrame(
          child: WidgetbookCatchesRecapReadyBodyPreview(
            event: event,
            attendeeIds: const <String>[],
            selectedVibeIds: const <String>{},
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Header states',
  type: RecapHeader,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget recapHeaderStates(BuildContext context) {
  RecapHeader header(Event event, int checkedInCount) => RecapHeader(
    state: EventRecapHeaderState.fromEvent(
      event: event,
      checkedInCount: checkedInCount,
      now: CatchesSurfaceFixtures.now,
      l10n: context.l10n,
    ),
  );

  return WidgetbookPageCatalogFrame(
    title: 'RecapHeader',
    contractId: 'screen.catches.recap.header',
    children: [
      WidgetbookPageStateCard(
        label: 'window open',
        child: header(CatchesSurfaceFixtures.openWindowEvent(), 12),
      ),
      WidgetbookPageStateCard(
        label: 'window closed',
        child: header(CatchesSurfaceFixtures.closedWindowEvent(), 3),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Header skeleton',
  type: RecapHeaderSkeleton,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget recapHeaderSkeletonStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'RecapHeaderSkeleton',
    contractId: 'screen.catches.recap.header_loading',
    children: [
      WidgetbookPageStateCard(label: 'loading', child: RecapHeaderSkeleton()),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Stat tile states',
  type: RecapStatTile,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget recapStatTileStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'RecapStatTile',
    contractId: 'screen.catches.recap.stat_tile',
    children: [
      WidgetbookPageStateCard(
        label: 'three stats on the dark header',
        child: CatchSurface(
          backgroundColor: CatchTokens.of(context).ink,
          padding: CatchInsets.content,
          child: const Row(
            children: [
              RecapStatTile(label: 'Checked in', value: '12'),
              RecapStatTile(label: 'Distance', value: '5 km'),
              RecapStatTile(label: 'When', value: 'Sat'),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Stat tile skeleton',
  type: RecapStatTileSkeleton,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget recapStatTileSkeletonStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'RecapStatTileSkeleton',
    contractId: 'screen.catches.recap.stat_tile_loading',
    children: [
      WidgetbookPageStateCard(
        label: 'loading row',
        child: Row(
          children: [
            Expanded(child: RecapStatTileSkeleton()),
            Expanded(child: RecapStatTileSkeleton()),
            Expanded(child: RecapStatTileSkeleton()),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Vibe grid states',
  type: VibeGrid,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget eventRecapVibeGridStates(BuildContext context) {
  final event = CatchesSurfaceFixtures.closedWindowEvent();
  final attendeeIds = CatchesSurfaceFixtures.candidates
      .map((profile) => profile.uid)
      .toList(growable: false);
  final partialAttendeeIds = [
    CatchesSurfaceFixtures.candidateUid,
    widgetbookCatchesMissingRecapProfileUid,
  ];
  final partialRoster = {
    CatchesSurfaceFixtures.candidateUid:
        CatchesSurfaceFixtures.candidates.first,
  };

  return WidgetbookPageCatalogFrame(
    title: 'VibeGrid',
    contractId: 'component.catches.recap.vibe_grid',
    children: [
      WidgetbookPageStateCard(
        label: 'profile tiles',
        child: VibeGrid(
          rows: widgetbookCatchesRecapReadyState(
            context,
            event: event,
            attendeeIds: attendeeIds,
          ).attendeeRows,
          onToggleVibe: widgetbookIgnoreString,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'selected and fallback',
        child: VibeGrid(
          rows: widgetbookCatchesRecapReadyState(
            context,
            event: event,
            attendeeIds: partialAttendeeIds,
            rosterProfiles: partialRoster,
            selectedVibeIds: const {CatchesSurfaceFixtures.candidateUid},
          ).attendeeRows,
          onToggleVibe: widgetbookIgnoreString,
        ),
      ),
    ],
  );
}
