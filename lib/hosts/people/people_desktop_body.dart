import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_state.dart';
import 'package:catch_dating_app/hosts/people/parts/people_duplicates_row.dart';
import 'package:catch_dating_app/hosts/people/people_body.dart';
import 'package:catch_dating_app/hosts/people/people_state.dart';
import 'package:catch_dating_app/hosts/people/person_body.dart';
import 'package:catch_dating_app/hosts/people/person_state.dart';
import 'package:catch_dating_app/hosts/people/widgets/people_list.dart';
import 'package:catch_dating_app/hosts/people/widgets/people_tab_bar.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// The People view on an expanded window: the list pane (pane header with
/// the count and Message, the views, search, the kicker and selectable
/// rows) beside the person it selects.
class HostPeopleDesktopBody extends StatelessWidget {
  const HostPeopleDesktopBody({
    super.key,
    required this.state,
    required this.person,
    required this.selectedContactId,
    required this.onView,
    required this.onSearch,
    required this.onSelectPerson,
    required this.onCompose,
    required this.onMessagePerson,
    required this.onAddTag,
    required this.onLoadMore,
    required this.onRetry,
    required this.onRetryPerson,
    this.messaging = false,
    this.undoing = false,
    this.onUndoMerge,
    this.duplicates,
    this.onOpenDuplicates,
    this.onExport,
  });

  final HostPeopleState state;

  /// The selected person; null when nobody is selected yet.
  final HostPersonState? person;
  final String? selectedContactId;
  final ValueChanged<HostPeopleView> onView;
  final ValueChanged<String> onSearch;
  final ValueChanged<HostAudienceContact> onSelectPerson;
  final VoidCallback onCompose;
  final VoidCallback onMessagePerson;
  final VoidCallback onAddTag;
  final VoidCallback onLoadMore;
  final VoidCallback onRetry;
  final VoidCallback onRetryPerson;
  final bool messaging;

  /// A merge into the selected person is being undone.
  final bool undoing;

  /// Undo one merge into the selected person.
  final ValueChanged<HostActiveContactMerge>? onUndoMerge;

  /// The Possible duplicates row; null while the review is read.
  final HostPeopleDuplicateSummary? duplicates;
  final VoidCallback? onOpenDuplicates;

  /// Exports this list (its filter and search) as a CSV; null while an
  /// export is running.
  final VoidCallback? onExport;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final numbers = NumberFormat.decimalPattern(
      Localizations.localeOf(context).toLanguageTag(),
    );
    final total = state.total;
    final list = CatchScrollView(
      primary: false,
      child: CatchPageBody(
        child: CatchStack(
          gap: CatchStackGap.g16,
          children: [
            CatchPaneHeader(
              title: l10n.hostPeopleTitle,
              count: total,
              trailing: CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g8,
                children: [
                  CatchIconAction.icon(
                    key: const ValueKey<String>('host-people-export'),
                    icon: CatchIcons.download,
                    tooltip: l10n.hostsHostAudienceExport,
                    onPressed: onExport,
                  ),
                  CatchButton(
                    label: l10n.hostPeopleMessage,
                    leading: CatchIcon(CatchIcons.chat, size: CatchIconSize.xs),
                    size: CatchButtonSize.sm,
                    onPressed: onCompose,
                  ),
                ],
              ),
            ),
            HostPeopleTabBar(selected: HostPeopleView.people, onView: onView),
            CatchSearchField.expanded(
              copy: catchSearchFieldCopy(l10n),
              value: state.search,
              contractExemption: 'Local People directory search query.',
              placeholder: total == null
                  ? l10n.hostPeopleSearchPlain
                  : l10n.hostPeopleSearch(count: numbers.format(total)),
              semanticLabel: l10n.hostPeopleSearchLabel,
              onChanged: onSearch,
            ),
            if ((duplicates, onOpenDuplicates) case (
              final summary?,
              final open?,
            ) when summary.visible)
              PeopleDuplicatesRow(summary: summary, onTap: open),
            HostPeopleList(
              state: state,
              kicker: state.search.trim().isEmpty
                  ? l10n.hostPeopleKickerPlain(
                      filter: hostPeopleFilterLabel(l10n, state.filter),
                    )
                  : hostPeopleKicker(l10n, numbers, state),
              selectedContactId: selectedContactId,
              onOpenPerson: onSelectPerson,
              onLoadMore: onLoadMore,
              onRetry: onRetry,
            ),
          ],
        ),
      ),
    );
    final selected = person;
    final detail = CatchScrollView(
      primary: false,
      child: CatchPageBody(
        child: selected == null
            ? CatchEmptyState(
                icon: CatchIcons.people,
                title: l10n.hostPeopleNobodySelected,
              )
            : HostPersonBody(
                key: ValueKey<String?>('host-person-pane-$selectedContactId'),
                state: selected,
                pane: true,
                messaging: messaging,
                undoing: undoing,
                onUndoMerge: onUndoMerge,
                onMessage: onMessagePerson,
                onAddTag: onAddTag,
                onRetry: onRetryPerson,
              ),
      ),
    );
    // Each pane keeps the page gutter on both sides of the divider.
    return CatchPaneLayout(
      pattern: CatchPaneLayoutMode.listDetail,
      children: [list, detail],
    );
  }
}
