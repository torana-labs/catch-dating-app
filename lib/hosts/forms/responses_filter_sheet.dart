import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/forms/responses_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The most published versions the sheet offers as chips; older ones are
/// typed by number.
const hostResponsesVersionChips = 50;

/// Narrows one form's answers: which published version they answered, and
/// what they answered to the questions the form lets the host filter by.
/// Answer filters show for every version, or for one chosen version, as
/// the server only compares answers to one version's questions. Reset all
/// clears both.
class HostResponsesFilterSheet extends StatelessWidget {
  const HostResponsesFilterSheet({
    super.key,
    required this.version,
    required this.options,
    required this.answers,
    required this.onVersion,
    required this.onAnswers,
    required this.onReset,
  });

  /// The form's published versions and the one listed; null hides them.
  final HostResponsesVersion? version;
  final List<HostFormResponseFilterOption> options;

  /// The values chosen per question id.
  final Map<String, Set<String>> answers;

  /// Lists one published version, or every version for null.
  final ValueChanged<int?> onVersion;
  final void Function(String questionId, Set<String> values) onAnswers;

  /// Clears every filter; null when nothing is narrowed.
  final VoidCallback? onReset;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final version = this.version;
    final maxQuestions =
        CatchContractConstraints
            .listOrganizerFormResponsesCallablePayloadAnswerFilters
            .maxItems ??
        options.length;
    final maxValues = CatchContractConstraints
        .listOrganizerFormResponsesCallablePayloadAnswerFiltersItemsValues
        .maxItems;
    final numbers = version == null
        ? const <int>[]
        : [
            for (
              var number = version.published;
              number >= 1 &&
                  number > version.published - hostResponsesVersionChips;
              number--
            )
              number,
            if (version.selected case final selected?
                when selected <= version.published - hostResponsesVersionChips)
              selected,
          ];
    return CatchSheet.standard(
      title: l10n.hostCustomersFilters,
      footer: CatchButton(
        key: const ValueKey<String>('host-responses-filters-reset'),
        label: l10n.hostFiltersResetAll,
        variant: CatchButtonVariant.secondary,
        fullWidth: true,
        onPressed: onReset,
      ),
      child: CatchStack(
        gap: CatchStackGap.g24,
        children: [
          if (version != null)
            CatchSection(
              title: l10n.hostFormsResponsesVersionTitle,
              dividers: CatchSectionPlacement.none,
              children: [
                CatchStack(
                  direction: CatchStackDirection.row,
                  gap: CatchStackGap.g8,
                  wrap: true,
                  children: [
                    CatchChip.choice(
                      key: const ValueKey<String>('response-version-all'),
                      label: l10n.hostFormsResponsesAllVersions,
                      selected: version.selected == null,
                      mode: CatchChipMode.single,
                      size: CatchChipSize.sm,
                      onPressed: () => onVersion(null),
                    ),
                    for (final number in numbers)
                      CatchChip.choice(
                        key: ValueKey<String>('response-version-$number'),
                        label: l10n.hostFormsResponsesVersion(version: number),
                        selected: version.selected == number,
                        mode: CatchChipMode.single,
                        size: CatchChipSize.sm,
                        onPressed: () => onVersion(number),
                      ),
                  ],
                ),
                if (version.published > hostResponsesVersionChips)
                  CatchFieldLanes.single(
                    child: CatchField.input(
                      key: const ValueKey<String>('response-version-number'),
                      copy: catchFieldCopy(l10n),
                      title: l10n.hostFormsResponsesOlderVersion,
                      helperText: l10n.hostFormsResponsesOlderVersionHelp(
                        version: version.published,
                      ),
                      keyboardType: TextInputType.number,
                      maxLength: 7,
                      contractExemption:
                          'A published version number, bounded by the form '
                          'version the server reports.',
                      onSubmitted: (value) {
                        final number = int.tryParse(value.trim());
                        if (number == null ||
                            number < 1 ||
                            number > version.published) {
                          return;
                        }
                        onVersion(number);
                      },
                    ),
                  ),
              ],
            ),
          if (version == null || version.selected != null)
            for (final option in options)
              CatchSection(
                key: ValueKey<String>('response-filter-${option.questionId}'),
                title: option.label,
                dividers: CatchSectionPlacement.none,
                children: [
                  CatchStack(
                    direction: CatchStackDirection.row,
                    gap: CatchStackGap.g8,
                    wrap: true,
                    children: [
                      for (final MapEntry(key: value, value: label)
                          in option.options.entries)
                        CatchChip.choice(
                          key: ValueKey<String>(
                            'response-filter-${option.questionId}-$value',
                          ),
                          label: label,
                          selected:
                              answers[option.questionId]?.contains(value) ??
                              false,
                          mode: CatchChipMode.multiple,
                          size: CatchChipSize.sm,
                          onPressed:
                              !answers.containsKey(option.questionId) &&
                                  answers.length >= maxQuestions
                              ? null
                              : () {
                                  final chosen = {
                                    ...?answers[option.questionId],
                                  };
                                  if (!chosen.remove(value)) {
                                    if (maxValues != null &&
                                        chosen.length >= maxValues) {
                                      showCatchNotice(
                                        context,
                                        l10n.hostResponseFilterSelectionLimit(
                                          count: maxValues,
                                        ),
                                      );
                                      return;
                                    }
                                    chosen.add(value);
                                  }
                                  onAnswers(option.questionId, chosen);
                                },
                        ),
                    ],
                  ),
                ],
              ),
        ],
      ),
    );
  }
}
