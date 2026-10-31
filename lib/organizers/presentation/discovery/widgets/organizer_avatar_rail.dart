import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/presentation/discovery/widgets/organizer_list_tile.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class OrganizerAvatarRail extends StatelessWidget {
  const OrganizerAvatarRail({
    super.key,
    required this.organizers,
    this.fullBleed = false,
    this.headerPadding,
    this.listPadding,
    bool? showDivider,
  }) : showDivider = showDivider ?? fullBleed;

  final List<Organizer> organizers;
  final bool fullBleed;
  final EdgeInsets? headerPadding;
  final EdgeInsetsGeometry? listPadding;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    return CatchSection.horizontal(
      title: context.l10n.organizersOrganizerAvatarRailTitleYourOrganizers,
      height: null,
      spacing: CatchSpacing.micro14,
      fullBleed: fullBleed,
      showDivider: showDivider,
      headerPadding: headerPadding,
      listPadding: listPadding,
      itemCount: organizers.length,
      itemBuilder: (context, index) {
        final organizer = organizers[index];
        return AvatarChip(
          organizer: organizer,
          showLiveBadge: organizer.nextEventLabel != null,
          onTap: () => _openOrganizerDetail(context, organizer),
        );
      },
    );
  }
}

void _openOrganizerDetail(BuildContext context, Organizer organizer) {
  context.pushNamed(
    Routes.organizerDetailScreen.name,
    pathParameters: {'organizerId': organizer.id},
    extra: organizer,
  );
}
