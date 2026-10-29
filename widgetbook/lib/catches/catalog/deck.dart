import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/design_fixtures/catches_surface_fixtures.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_screen.dart';
import 'package:catch_dating_app/swipes/presentation/widgets/catches_pass_button.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_surface.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Deck composition',
  type: CatchesProfileBody,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget catchesProfileReviewStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CatchesProfileBody',
    contractId: 'screen.catches.event sections',
    children: [
      WidgetbookPageStateCard(
        label: 'profile review',
        child: WidgetbookCatchesDeviceFrame(
          child: CatchesProfileBody(
            profile: CatchesSurfaceFixtures.candidates.first,
            remainingCount: CatchesSurfaceFixtures.candidates.length,
            viewerProfile: CatchesSurfaceFixtures.viewer,
            sharedRunTitle: CatchesSurfaceFixtures.openWindowEvent().title,
            onBack: widgetbookNoop,
            onFilters: widgetbookNoop,
            onPass: widgetbookNoop,
            onReact: widgetbookCatchesNoopReaction,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: WidgetbookCatchesDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: CatchesProfileBody(
              profile: CatchesSurfaceFixtures.candidates.last,
              remainingCount: 1,
              viewerProfile: CatchesSurfaceFixtures.viewer,
              sharedRunTitle: CatchesSurfaceFixtures.closingSoonEvent().title,
              onBack: widgetbookNoop,
              onFilters: widgetbookNoop,
              onPass: widgetbookNoop,
              onReact: widgetbookCatchesNoopReaction,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catches profile states',
  type: ProfileSurface,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget catchesProfileSurfaceStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProfileSurface',
    contractId: 'screen.catches.event.profile_surface',
    children: [
      WidgetbookPageStateCard(
        label: 'reactable catches mode',
        child: WidgetbookCatchesDeviceFrame(
          child: ProfileSurface(
            profile: CatchesSurfaceFixtures.candidates.first,
            mode: ProfileSurfaceMode.catches,
            viewerProfile: CatchesSurfaceFixtures.viewer,
            sharedRunTitle: CatchesSurfaceFixtures.openWindowEvent().title,
            bottomPadding: CatchLayout.catchesProfileBottomPadding,
            onReact: widgetbookCatchesNoopReaction,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reaction pending',
        child: WidgetbookCatchesDeviceFrame(
          child: ProfileSurface(
            profile: CatchesSurfaceFixtures.candidates.first,
            mode: ProfileSurfaceMode.catches,
            viewerProfile: CatchesSurfaceFixtures.viewer,
            sharedRunTitle: CatchesSurfaceFixtures.openWindowEvent().title,
            bottomPadding: CatchLayout.catchesProfileBottomPadding,
            onReact: widgetbookCatchesNoopReaction,
            reactionsEnabled: false,
            reactionsPending: true,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Top overlay states',
  type: CatchesTopOverlay,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget catchesTopOverlayStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'CatchesTopOverlay',
    contractId: 'screen.catches.event.top_overlay',
    children: [
      WidgetbookPageStateCard(
        label: 'default',
        child: WidgetbookCatchesDeckChromeFrame(
          height: WidgetbookPreviewLayout.catchesCardPreviewHeight,
          child: CatchesTopOverlay(
            remainingCount: 7,
            onBack: widgetbookNoop,
            onFilters: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Bottom scrim states',
  type: CatchesScrimOverlay,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget catchesBottomScrimStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'CatchesScrimOverlay',
    contractId: 'screen.catches.event.bottom_scrim',
    children: [
      WidgetbookPageStateCard(
        label: 'default',
        child: WidgetbookCatchesDeckChromeFrame(
          height: WidgetbookPreviewLayout.stateViewportHeight,
          child: CatchesScrimOverlay(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Pass button states',
  type: CatchesPassButton,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget catchesPassButtonStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'CatchesPassButton',
    contractId: 'screen.catches.event.pass_button',
    children: [
      WidgetbookPageStateCard(
        label: 'default',
        child: WidgetbookCatchesSectionFrame(
          height: WidgetbookPreviewLayout.compactPanelHeight,
          child: Center(child: CatchesPassButton(onPressed: widgetbookNoop)),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'pending',
        child: WidgetbookCatchesSectionFrame(
          height: WidgetbookPreviewLayout.compactPanelHeight,
          child: Center(
            child: CatchesPassButton(
              onPressed: widgetbookNoop,
              isPending: true,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'disabled',
        child: WidgetbookCatchesSectionFrame(
          height: WidgetbookPreviewLayout.compactPanelHeight,
          child: Center(child: CatchesPassButton(onPressed: null)),
        ),
      ),
    ],
  );
}
