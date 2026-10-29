import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_hero_top_bar.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_photo_rail.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

final _logoOnlyHeroClub = widgetbookClubMinimalClub.copyWith(
  id: 'widgetbook-logo-only-club',
  name: 'Bandra Dawn Club',
  logoPhoto: widgetbookClubPhoto('club-logo-dawn', 0),
);

@widgetbook.UseCase(
  name: 'Photo strip states',
  type: ClubPhotoRail,
  path: '[Club Detail]/Sections',
)
Widget clubPhotoStripStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubPhotoRail',
    catalogId: 'section.club.photos',
    children: [
      WidgetbookPageStateCard(
        label: 'three photos',
        child: ClubPhotoRail(club: widgetbookClubClub),
      ),
      WidgetbookPageStateCard(
        label: 'single photo',
        child: ClubPhotoRail(
          club: widgetbookClubClub.copyWith(
            clubPhotos: [widgetbookClubClub.clubPhotos.first],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Hero states',
  type: ClubHeroTopBar,
  path: '[Club Detail]/Sections',
)
Widget clubHeroAppBarStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubHeroTopBar',
    catalogId: 'section.club.hero',
    children: [
      WidgetbookPageStateCard(
        label: 'photo polaroid',
        child: WidgetbookClubSliverFrame(
          height: WidgetbookPreviewLayout.profileExpandedEditorHeight,
          slivers: [
            ClubHeroTopBar(
              club: widgetbookClubClub,
              isHost: false,
              onShareClub: _ignoreShare,
            ),
            const SliverToBoxAdapter(
              child: SizedBox(height: WidgetbookPreviewLayout.mediaPanelHeight),
            ),
          ],
        ),
      ),
      WidgetbookPageStateCard(
        label: 'logo masthead',
        child: WidgetbookClubSliverFrame(
          height: WidgetbookPreviewLayout.clubExpandedPreviewHeight,
          slivers: [
            ClubHeroTopBar(
              club: _logoOnlyHeroClub,
              isHost: false,
              onShareClub: _ignoreShare,
            ),
            const SliverToBoxAdapter(
              child: SizedBox(height: WidgetbookPreviewLayout.mediaPanelHeight),
            ),
          ],
        ),
      ),
      WidgetbookPageStateCard(
        label: 'art polaroid',
        child: WidgetbookClubSliverFrame(
          height: WidgetbookPreviewLayout.profileExpandedEditorHeight,
          slivers: [
            ClubHeroTopBar(
              club: widgetbookClubMinimalClub,
              isHost: false,
              onShareClub: _ignoreShare,
            ),
            const SliverToBoxAdapter(
              child: SizedBox(height: WidgetbookPreviewLayout.mediaPanelHeight),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Hero module states',
  type: ClubHeroHeader,
  path: '[Club Detail]/Sections',
)
Widget clubHeroModuleStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubHeroHeader',
    catalogId: 'section.club.hero.module',
    children: [
      WidgetbookPageStateCard(
        label: 'photo polaroid module',
        child: WidgetbookClubDeviceFrame(
          height: WidgetbookPreviewLayout.tallRouteViewportHeight,
          child: ClubHeroHeader(
            club: widgetbookClubClub,
            variant: ClubHeroVariant.poster,
            mediaHeight: 280,
            captionExtent: CatchLayout.clubDetailHeroCaptionExtent,
            kickerLabel: 'BANDRA · MUMBAI',
            locationLabel: 'Bandstand promenade',
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'logo masthead module',
        child: WidgetbookClubDeviceFrame(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          child: ClubHeroHeader(
            club: _logoOnlyHeroClub,
            variant: ClubHeroVariant.masthead,
            mediaHeight: 220,
            captionExtent: CatchLayout.clubDetailHeroCaptionExtent,
            kickerLabel: 'DINNER · MUMBAI',
            locationLabel: 'Khar Social',
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'art polaroid module',
        child: WidgetbookClubDeviceFrame(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          child: ClubHeroHeader(
            club: widgetbookClubMinimalClub,
            variant: ClubHeroVariant.poster,
            mediaHeight: 220,
            captionExtent: CatchLayout.clubDetailHeroCaptionExtent,
            kickerLabel: 'DINNER · MUMBAI',
            locationLabel: 'Khar Social',
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'full review module',
        child: WidgetbookClubDeviceFrame(
          height: WidgetbookPreviewLayout.tallRouteViewportHeight,
          child: ClubHeroHeader(
            club: widgetbookClubClub,
            variant: ClubHeroVariant.full,
            mediaHeight: 280,
            captionExtent: CatchLayout.clubDetailHeroCaptionExtent,
            kickerLabel: 'BANDRA · MUMBAI',
            locationLabel: 'Bandstand promenade',
          ),
        ),
      ),
    ],
  );
}

Future<void> _ignoreShare(BuildContext context, Club club) async {}
