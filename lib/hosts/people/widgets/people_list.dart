import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/hosts/people/parts/people_person_row.dart';
import 'package:catch_dating_app/hosts/people/people_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The kicker over the list and the people the filter holds, with the
/// loading, error and empty states and Show more at the end. Shared by the
/// phone list and the list pane beside a person.
class HostPeopleList extends StatelessWidget {
  const HostPeopleList({
    super.key,
    required this.state,
    required this.kicker,
    required this.onOpenPerson,
    required this.onLoadMore,
    required this.onRetry,
    this.selectedContactId,
  });

  final HostPeopleState state;
  final String kicker;
  final ValueChanged<HostAudienceContact> onOpenPerson;
  final VoidCallback onLoadMore;
  final VoidCallback onRetry;

  /// The person open beside the list, highlighted.
  final String? selectedContactId;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final Widget content = switch (state.status) {
      HostPeopleStatus.loading => const CatchLoadingIndicator(),
      HostPeopleStatus.error => CatchErrorState(
        title: l10n.hostPeopleErrorTitle,
        message: l10n.hostPeopleErrorBody,
        retryLabel: l10n.hostPeopleRetry,
        onRetry: onRetry,
        mode: CatchErrorStateMode.inline,
      ),
      HostPeopleStatus.ready => CatchSection(
        empty: state.search.trim().isEmpty
            ? l10n.hostPeopleEmpty
            : l10n.hostPeopleEmptySearch,
        children: [
          for (final contact in state.people)
            PeoplePersonRow(
              key: ValueKey<String>('host-people-row-${contact.contactId}'),
              contact: contact,
              selected: contact.contactId == selectedContactId,
              onTap: () => onOpenPerson(contact),
            ),
        ],
      ),
    };
    return CatchStack(
      gap: CatchStackGap.g4,
      children: [
        CatchText(
          kicker,
          variant: CatchTextVariant.labelKicker,
          tone: CatchTextTone.secondary,
        ),
        content,
        if (state.canLoadMore)
          CatchButton(
            label: l10n.hostPeopleShowMore,
            variant: CatchButtonVariant.quiet,
            size: CatchButtonSize.sm,
            status: state.loadingMore
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: state.loadingMore ? null : onLoadMore,
          ),
      ],
    );
  }
}
