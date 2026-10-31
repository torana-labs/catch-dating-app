import 'package:catch_dating_app/reviews/shared/reviews_section.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';

@widgetbook.UseCase(
  name: 'Review states',
  type: OrganizerReviewsSection,
  path: '[Club Detail]/Sections',
)
Widget organizerReviewsSectionStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'OrganizerReviewsSection',
    catalogId: 'section.club.reviews',
    children: [
      WidgetbookPageStateCard(
        label: 'published reviews',
        child: CatchSection.divided(
          title: 'Reviews',
          first: true,
          child: OrganizerReviewsSection(
            reviews: widgetbookOrganizerReviews,
            currentUid: widgetbookOrganizerViewerUid,
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'empty',
        child: CatchSection.divided(
          title: 'Reviews',
          first: true,
          child: OrganizerReviewsSection(
            reviews: [],
            currentUid: widgetbookOrganizerViewerUid,
          ),
        ),
      ),
    ],
  );
}
