import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/presentation/discovery/widgets/organizer_list_tile.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Returns the slivers for the club directory section. Returns multiple
/// slivers so the parent can spread them flat — nesting `SliverMainAxisGroup`
/// inside another `SliverMainAxisGroup` produces inconsistent build
/// behaviour for items past the first viewport.
List<Widget> buildOrganizerDirectorySlivers({
  required BuildContext context,
  required List<Organizer> organizers,
  required Set<String> joinedOrganizerIds,
}) {
  return [
    SliverToBoxAdapter(
      child: CatchSectionHeader(
        title:
            context.l10n.organizersOrganizerDiscoverListTitleOrganizerDirectory,
        titleStyle: CatchTextStyles.titleL(context),
        padding: CatchInsets.sectionHeader,
      ),
    ),
    SliverPadding(
      padding: CatchInsets.pageHorizontal,
      sliver: SliverList.list(
        children: [
          for (var index = 0; index < organizers.length; index += 1) ...[
            if (index > 0) gapH14,
            OrganizerIndexRow(
              organizer: organizers[index],
              isJoined: joinedOrganizerIds.contains(organizers[index].id),
              onTap: () => _openOrganizerDetail(context, organizers[index]),
            ),
          ],
        ],
      ),
    ),
  ];
}

void _openOrganizerDetail(BuildContext context, Organizer organizer) {
  context.pushNamed(
    Routes.organizerDetailScreen.name,
    pathParameters: {'organizerId': organizer.id},
    extra: organizer,
  );
}
