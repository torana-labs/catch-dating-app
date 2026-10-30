import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// The no-organizer state for all four Audience destinations.
class HostAudienceNoOrganizerEmptyState extends StatelessWidget {
  const HostAudienceNoOrganizerEmptyState({
    super.key,
    required this.selected,
    this.onChanged,
  });

  final HostAudienceView selected;
  final ValueChanged<HostAudienceView>? onChanged;

  @override
  Widget build(BuildContext context) {
    final forms =
        selected == HostAudienceView.forms ||
        selected == HostAudienceView.responses;
    return HostAudienceStateScaffold(
      selected: selected,
      scrollKey: forms
          ? const PageStorageKey<String>('host-forms-no-organizer')
          : const PageStorageKey<String>('host-customers-no-organizer'),
      onChanged: onChanged,
      slivers: [
        CatchSliverEmptyState(
          icon: forms ? CatchIcons.document : CatchIcons.people,
          title: forms
              ? context.l10n.hostFormsNoOrganizerTitle
              : context
                    .l10n
                    .hostsHostEventsScaffoldTitleCreateYourFirstOrganizer,
          message: forms
              ? context.l10n.hostFormsNoOrganizerBody
              : context.l10n.hostsHostEventsScaffoldBodyCreateAOrganizerTo,
          actions: [
            CatchButton(
              label: forms
                  ? context.l10n.hostFormsCreateOrganizer
                  : context.l10n.hostsHostEventsScaffoldLabelCreateOrganizer,
              size: forms ? CatchButtonSize.md : CatchButtonSize.lg,
              onPressed: () =>
                  context.pushNamed(Routes.hostCreateOrganizerScreen.name),
            ),
          ],
        ),
      ],
    );
  }
}
