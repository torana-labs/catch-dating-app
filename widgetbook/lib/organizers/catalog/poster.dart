import 'package:catch_dating_app/organizers/shared/organizer_host_identity_row.dart';
import 'package:catch_dating_app/organizers/shared/organizer_placeholder_cover.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';

@widgetbook.UseCase(
  name: 'Poster states',
  type: CatchPoster,
  path: '[Club Discovery]/Cards',
)
Widget catchOrganizerPosterStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'CatchPoster',
    catalogId: 'card.organizer.poster',
    children: [
      WidgetbookPageStateCard(
        label: 'editorial paper',
        child: CatchPoster(
          media: OrganizerPlaceholderCover(organizer: widgetbookOrganizerOrganizer),
          kicker: 'Run club · Mumbai',
          title: widgetbookOrganizerOrganizer.name,
          tagline: widgetbookOrganizerOrganizer.description,
          meta: 'Every Wednesday · 6:45 AM',
          footer: OrganizerTagList(
            tags: visibleOrganizerTags(widgetbookOrganizerOrganizer, limit: 3),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'photo ink',
        child: CatchPoster(
          media: OrganizerPlaceholderCover(organizer: widgetbookOrganizerOrganizer),
          kicker: 'Run club · Mumbai',
          title: widgetbookOrganizerOrganizer.name,
          tagline: widgetbookOrganizerOrganizer.description,
          meta: 'Every Wednesday · 6:45 AM',
          variant: CatchPosterVariant.photo,
          tone: CatchPosterTone.ink,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'split signal',
        child: CatchPoster(
          media: OrganizerPlaceholderCover(organizer: widgetbookOrganizerOrganizer),
          kicker: 'Run club · Mumbai',
          title: widgetbookOrganizerOrganizer.name,
          tagline: widgetbookOrganizerOrganizer.description,
          meta: 'Every Wednesday · 6:45 AM',
          variant: CatchPosterVariant.split,
          tone: CatchPosterTone.signal,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'minimal paper',
        child: CatchPoster(
          media: OrganizerPlaceholderCover(organizer: widgetbookOrganizerOrganizer),
          kicker: 'Run club · Mumbai',
          title: widgetbookOrganizerOrganizer.name,
          tagline: widgetbookOrganizerOrganizer.description,
          meta: 'Every Wednesday · 6:45 AM',
          variant: CatchPosterVariant.minimal,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Poster artwork states',
  type: OrganizerPlaceholderCover,
  path: '[Club Discovery]/Cards',
)
Widget organizerPlaceholderCoverStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubPlaceholderCover',
    catalogId: 'card.organizer.poster_artwork',
    children: [
      WidgetbookPageStateCard(
        label: 'standard',
        child: AspectRatio(
          aspectRatio: 1,
          child: OrganizerPlaceholderCover(organizer: widgetbookOrganizerOrganizer),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'compact',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.organizerAvatarPreviewExtent,
          child: OrganizerPlaceholderCover(
            organizer: widgetbookOrganizerMinimalOrganizer,
            compact: true,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Image states',
  type: CatchPosterImage,
  path: '[Club Discovery]/Cards',
)
Widget catchPosterImageStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'CatchPosterImage',
    catalogId: 'card.organizer.poster.image',
    children: [
      WidgetbookPageStateCard(
        label: 'rounded media',
        child: SizedBox(
          height: WidgetbookPreviewLayout.mediaPanelHeight,
          child: CatchPosterImage(
            media: OrganizerPlaceholderCover(organizer: widgetbookOrganizerOrganizer),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'square media',
        child: SizedBox(
          height: WidgetbookPreviewLayout.mediaPanelHeight,
          child: CatchPosterImage(
            media: OrganizerPlaceholderCover(organizer: widgetbookOrganizerOrganizer),
            radius: 0,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Header states',
  type: CatchPosterHeader,
  path: '[Club Discovery]/Cards',
)
Widget catchPosterHeaderStates(BuildContext context) {
  CatchPosterHeader header(CatchPosterHeaderMode mode, CatchPosterTone tone) =>
      CatchPosterHeader(
        kicker: 'Run club · Mumbai',
        title: widgetbookOrganizerOrganizer.name,
        tagline: widgetbookOrganizerOrganizer.description,
        meta: 'Every Wednesday · 6:45 AM',
        mode: mode,
        tone: tone,
      );
  return WidgetbookScrollCatalogFrame(
    title: 'CatchPosterHeader',
    catalogId: 'card.organizer.poster.header',
    children: [
      WidgetbookPageStateCard(
        label: 'regular paper',
        child: header(CatchPosterHeaderMode.regular, CatchPosterTone.paper),
      ),
      WidgetbookPageStateCard(
        label: 'compact signal',
        child: ColoredBox(
          color: CatchTokens.of(context).primary,
          child: header(CatchPosterHeaderMode.compact, CatchPosterTone.signal),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'on photo ink',
        child: ColoredBox(
          color: CatchTokens.of(context).ink,
          child: header(CatchPosterHeaderMode.onPhoto, CatchPosterTone.ink),
        ),
      ),
    ],
  );
}
