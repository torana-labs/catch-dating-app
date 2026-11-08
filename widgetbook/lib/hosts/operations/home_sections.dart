import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_organizer_switcher_sheet.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';

Widget _hostHomeExactCatalog(BuildContext context, String focus) {
  return WidgetbookPageCatalogFrame(
    title: focus,
    contractId: 'component.host.home.${widgetbookHostComponentSlug(focus)}',
    children: [
      WidgetbookPageStateCard(
        label: 'exact component',
        child: WidgetbookHostHomeSectionFrame(
          child: _hostHomePreviewFor(context, focus),
        ),
      ),
    ],
  );
}

Widget _hostHomePreviewFor(BuildContext context, String focus) {
  final organizer = HostOperationsFixtures.primaryOrganizer;
  return switch (focus) {
    'CatchEmptyState' => CatchEmptyState(
      title: 'No clubs yet',
      message: 'Create a club to start hosting events.',
      padding: EdgeInsets.zero,
      actions: [
        CatchButton(
          label: 'Create club',
          leading: Icon(CatchIcons.add, size: CatchIconSize.md),
          onPressed: () {},
        ),
      ],
    ),
    'HostOrganizerAvatar' => HostOrganizerAvatar(
      organizer: organizer.copyWith(
        profileImageUrl: 'assets/fixtures/club_hero_portrait.jpg',
      ),
      size: CatchLayout.appShellNavigationIdentityExtent,
      selected: true,
    ),
    _ => Text('No exact preview registered for $focus.'),
  };
}

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: CatchEmptyState,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictCatchEmptyStateCatalogStates(BuildContext context) =>
    _hostHomeExactCatalog(context, 'CatchEmptyState');
