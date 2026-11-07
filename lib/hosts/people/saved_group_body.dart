import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/hosts/people/saved_group_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// A saved group in board order: the rule tile (Went to, At least N times,
/// In the last N days), how many people match with the first few, and the
/// name field while the group is new.
class HostSavedGroupBody extends StatelessWidget {
  const HostSavedGroupBody({
    super.key,
    required this.state,
    required this.atLeast,
    required this.onAtLeast,
    required this.onOpenPerson,
    required this.onRetry,
    this.name,
    this.busy = false,
  });

  final HostSavedGroupState state;

  /// The draft's At least value.
  final int atLeast;
  final ValueChanged<int> onAtLeast;
  final ValueChanged<HostSavedAudiencePreviewContact> onOpenPerson;
  final VoidCallback onRetry;

  /// The new group's name field; null for a saved group.
  final TextEditingController? name;

  /// A save or delete is on its way.
  final bool busy;

  /// The stepper's range.
  static const int fewest = 1;
  static const int most = 20;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostSavedGroupStatus.loading:
        return const CatchPageBody(child: CatchLoadingIndicator());
      case HostSavedGroupStatus.error:
        return CatchPageBody(
          child: CatchErrorState(
            title: l10n.hostPeopleGroupErrorTitle,
            message: l10n.hostPeopleGroupErrorBody,
            retryLabel: l10n.hostPeopleRetry,
            onRetry: onRetry,
          ),
        );
      case HostSavedGroupStatus.ready:
        break;
    }
    final numbers = NumberFormat.decimalPattern(
      Localizations.localeOf(context).toLanguageTag(),
    );
    final eventTitle = state.eventTitle;
    final within = state.withinDays;
    final rules = CatchSurface(
      child: CatchStack(
        gap: CatchStackGap.g4,
        children: [
          CatchText(
            l10n.hostPeopleGroupPeopleWho,
            variant: CatchTextVariant.labelKicker,
            tone: CatchTextTone.secondary,
          ),
          if (state.handPicked)
            CatchIndexRow(
              title: l10n.hostPeopleGroupHandPicked,
              value: state.definition == null
                  ? null
                  : numbers.format(state.definition!.selectedContactIds.length),
              onTap: null,
            )
          else ...[
            if (state.attendedEventId != null)
              CatchIndexRow(
                title: l10n.hostPeopleGroupWentTo,
                value: eventTitle ?? l10n.hostPeopleGroupAnEvent,
                onTap: null,
              ),
            CatchIndexRow(
              key: const ValueKey<String>('host-group-at-least'),
              title: l10n.hostPeopleGroupAtLeast,
              trailing: CatchStepper(
                value: atLeast,
                min: fewest,
                max: most,
                enabled: !busy,
                decreaseSemanticLabel: l10n.hostPeopleGroupFewer,
                increaseSemanticLabel: l10n.hostPeopleGroupMore,
                valueLabelBuilder: (value) =>
                    l10n.hostPeopleGroupTimes(count: value.toInt()),
                onChanged: (value) => onAtLeast(value.toInt()),
              ),
              onTap: null,
            ),
            if (within != null)
              CatchIndexRow(
                title: l10n.hostPeopleGroupInTheLast,
                value: l10n.hostPeopleGroupDays(count: within),
                onTap: null,
              ),
            if (state.otherRules > 0)
              CatchIndexRow(
                title: l10n.hostPeopleGroupOtherRules(count: state.otherRules),
                onTap: null,
              ),
          ],
        ],
      ),
    );
    final preview = state.preview;
    final audience = state.audience;
    final Widget? match = audience == null
        ? null
        : preview == null
        ? (state.previewFailed
              ? CatchErrorState(
                  title: l10n.hostPeopleGroupCountError,
                  message: l10n.hostPeopleGroupCountErrorBody,
                  retryLabel: l10n.hostPeopleRetry,
                  onRetry: onRetry,
                  mode: CatchErrorStateMode.inline,
                )
              : const CatchLoadingIndicator())
        : CatchSection(
            title: l10n.hostPeopleGroupMatch(
              count: preview.matchCount,
              people: numbers.format(preview.matchCount),
            ),
            empty: l10n.hostPeopleGroupMatchEmpty,
            children: [
              for (final person in preview.sample)
                CatchIndexRow(
                  key: ValueKey<String>(
                    'host-group-person-${person.contactId}',
                  ),
                  title: person.displayName,
                  leading: CatchAvatar.system(
                    size: CatchAvatarSize.md,
                    name: person.displayName,
                  ),
                  density: CatchIndexRowSize.compact,
                  onTap: () => onOpenPerson(person),
                ),
            ],
          );
    final nameField = name;
    return CatchPageBody(
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          if (nameField != null)
            CatchFieldLanes.single(
              child: CatchField.input(
                key: const ValueKey<String>('host-group-name'),
                copy: catchFieldCopy(l10n),
                title: l10n.hostPeopleGroupName,
                contractExemption: 'Saved group name the host types.',
                controller: nameField,
                placeholder: l10n.hostPeopleGroupNamePlaceholder,
                maxLength: 80,
                textCapitalization: TextCapitalization.sentences,
              ),
            ),
          rules,
          ?match,
        ],
      ),
    );
  }
}
