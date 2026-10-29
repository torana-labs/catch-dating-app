import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/geometry_preview.dart';

@widgetbook.UseCase(
  name: 'Geometry matrix',
  type: CatchTopBar,
  path: '[Geometry system]',
)
Widget topBarGeometryMatrix(BuildContext context) {
  return widgetbookGeometryPage(
    context,
    title: 'Top bars',
    contractIds: const ['catch.top_bar'],
    principles: const [
      'The primitive owns safe area, height, gutter, leading, and action lanes.',
      'Compact route and large editorial modes retain one alignment system.',
      'Search morphs inside the existing bar instead of replacing its row.',
    ],
    children: [
      _topBarSpecimen(
        context,
        label: 'Compact route',
        child: CatchTopBar.route(
          title: 'Event details',
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      _topBarSpecimen(
        context,
        label: 'Large editorial',
        child: const CatchTopBar.route(
          title: 'Upcoming events',
          subtitle: 'Review requests and keep the room balanced.',
        ),
      ),
      _topBarSpecimen(
        context,
        label: 'Identity and overflow',
        child: CatchTopBar.identity(
          identitySemanticLabel: context.l10n
              .coreCatchTopBarLabelViewNameProfile(
                name: 'Taylor from Sunday Social',
              ),
          identityName: 'Taylor from Sunday Social',
          identityPhotoUrl: null,
          onIdentityTap: widgetbookNoop,
          tone: CatchTopBarTone.surface,
          emphasis: CatchTopBarEmphasis.divided,
          actions: [
            CatchActionMenu<String>(
              tooltip: 'Conversation actions',
              onSelected: widgetbookIgnoreString,
              items: [
                CatchActionMenuItem(value: 'share', label: 'Share card'),
                CatchActionMenuItem(
                  value: 'block',
                  label: 'Block',
                  isDestructive: true,
                ),
              ],
            ),
          ],
        ),
      ),
      _topBarSpecimen(
        context,
        label: 'Expanding search',
        description:
            'Use the search action to inspect the in-place width morph and title fade.',
        child: CatchTopBar.route(
          title: 'Explore',
          search: CatchTopBarSearch(
            copy: catchSearchFieldCopy(context.l10n),
            value: '',
            placeholder: 'Search events and organizers',
            tooltip: 'Search Explore',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
    ],
  );
}

Widget _topBarSpecimen(
  BuildContext context, {
  required String label,
  required PreferredSizeWidget child,
  String? description,
}) {
  return widgetbookGeometrySpecimen(
    context,
    label: label,
    description: description,
    child: CatchSurface(
      tone: CatchSurfaceTone.raised,
      borderRole: CatchBorderRole.separator,
      clipBehavior: Clip.antiAlias,
      width: widgetbookGeometryPhoneWidth,
      child: child,
    ),
  );
}
