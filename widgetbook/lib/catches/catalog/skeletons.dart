import 'package:catch_dating_app/swipes/shared/profile_surface/profile_surface.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Profile skeleton states',
  type: ProfileSurfaceSkeleton,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget profileSurfaceSkeletonStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'ProfileSurfaceSkeleton',
    contractId: 'screen.catches.profile.skeleton',
    children: [
      WidgetbookPageStateCard(
        label: 'default',
        child: WidgetbookCatchesDeviceFrame(child: ProfileSurfaceSkeleton()),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Profile hero skeleton states',
  type: ProfileSurfaceHeroSkeleton,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget profileSurfaceHeroSkeletonStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'ProfileSurfaceHeroSkeleton',
    contractId: 'screen.catches.profile.hero_skeleton',
    children: [
      WidgetbookPageStateCard(
        label: 'portrait hero',
        child: WidgetbookCatchesSectionFrame(
          height: WidgetbookPreviewLayout.catchesSkeletonPreviewHeight,
          child: ProfileSurfaceHeroSkeleton(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Profile section skeleton states',
  type: ProfileSurfaceSectionSkeleton,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget profileSurfaceSectionSkeletonStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'ProfileSurfaceSectionSkeleton',
    contractId: 'screen.catches.profile.section_skeleton',
    children: [
      WidgetbookPageStateCard(
        label: 'prompt block',
        child: WidgetbookCatchesSectionFrame(
          height: WidgetbookPreviewLayout.catchesSectionPreviewHeight,
          child: ProfileSurfaceSectionSkeleton(lines: 3),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'compact block',
        child: WidgetbookCatchesSectionFrame(
          height: WidgetbookPreviewLayout.mediaPanelHeight,
          child: ProfileSurfaceSectionSkeleton(lines: 1),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Profile running skeleton states',
  type: ProfileSurfaceRunningSkeleton,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget profileSurfaceRunningSkeletonStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'ProfileSurfaceRunningSkeleton',
    contractId: 'screen.catches.profile.running_skeleton',
    children: [
      WidgetbookPageStateCard(
        label: 'running rhythm',
        child: WidgetbookCatchesSectionFrame(
          height: WidgetbookPreviewLayout.stateViewportHeight,
          child: ProfileSurfaceRunningSkeleton(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Profile photo skeleton states',
  type: ProfileSurfacePhotoSkeleton,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget profileSurfacePhotoSkeletonStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'ProfileSurfacePhotoSkeleton',
    contractId: 'screen.catches.profile.photo_skeleton',
    children: [
      WidgetbookPageStateCard(
        label: 'portrait photo block',
        child: WidgetbookCatchesSectionFrame(
          height: WidgetbookPreviewLayout.tallRouteViewportHeight,
          child: ProfileSurfacePhotoSkeleton(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Profile facts skeleton states',
  type: ProfileSurfaceFactsSkeleton,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget profileSurfaceFactsSkeletonStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'ProfileSurfaceFactsSkeleton',
    contractId: 'screen.catches.profile.facts_skeleton',
    children: [
      WidgetbookPageStateCard(
        label: 'fact rows',
        child: WidgetbookCatchesSectionFrame(
          height: WidgetbookPreviewLayout.routeViewportHeight,
          child: ProfileSurfaceFactsSkeleton(),
        ),
      ),
    ],
  );
}
