import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/core/time_zone_catalog.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// A searchable disclosure using Catch's existing field and choice rows.
/// The form owns selection, search and expansion; search text is never saved.
class ProgramTimezoneField extends StatelessWidget {
  const ProgramTimezoneField({
    super.key,
    required this.fieldCopy,
    required this.searchCopy,
    required this.title,
    required this.placeholder,
    required this.searchPlaceholder,
    required this.emptyMessage,
    required this.indiaLabel,
    required this.helperText,
    required this.selected,
    required this.query,
    required this.date,
    required this.open,
    required this.enabled,
    required this.onOpenChanged,
    required this.onQueryChanged,
    required this.onSelected,
    this.error,
  });

  final CatchFieldCopy fieldCopy;
  final CatchSearchFieldCopy searchCopy;
  final String title;
  final String placeholder;
  final String searchPlaceholder;
  final String emptyMessage;
  final String indiaLabel;
  final String helperText;
  final String selected;
  final String query;
  final DateTime date;
  final bool open;
  final bool enabled;
  final ValueChanged<bool> onOpenChanged;
  final ValueChanged<String> onQueryChanged;
  final ValueChanged<String> onSelected;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final options = ianaTimeZoneOptions(selected: selected, query: query);
    String label(String identifier) => [
      identifier == 'Asia/Kolkata' ? indiaLabel : timeZonePlace(identifier),
      timeZoneUtcOffset(identifier, date),
    ].join(' · ');
    final validSelection = ianaTimeZoneOptions(
      selected: selected,
    ).contains(selected);
    return CatchFieldLanes.single(
      child: CatchField.control(
        copy: fieldCopy,
        key: const ValueKey('program-create-timezone'),
        title: title,
        body: validSelection ? label(selected) : placeholder,
        contract: CatchContractConstraints
            .createOrganizerProgramCallablePayloadTimezone,
        disclosureMode: open
            ? CatchFieldMode.controlledExpanded
            : CatchFieldMode.controlledCollapsed,
        states: {if (!enabled) WidgetState.disabled},
        onOpenChanged: onOpenChanged,
        helperText: helperText,
        error: error,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchSearchField.expanded(
              key: const ValueKey('program-timezone-search'),
              copy: searchCopy,
              contractExemption:
                  'Local filtering of the bundled timezone catalog',
              placeholder: searchPlaceholder,
              value: query,
              enabled: enabled,
              onChanged: onQueryChanged,
            ),
            const SizedBox(height: CatchSpacing.s2),
            if (options.isEmpty)
              CatchText(emptyMessage, variant: CatchTextVariant.supporting)
            else
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: CatchLayout.menuMaxHeightFor(
                    MediaQuery.sizeOf(context).height,
                  ),
                ),
                child: ListView.builder(
                  shrinkWrap: true,
                  primary: false,
                  itemCount: options.length,
                  itemBuilder: (context, index) {
                    final identifier = options[index];
                    return CatchMenuRow<String>.sheet(
                      key: ValueKey('program-timezone-option-$identifier'),
                      item: CatchMenuItem(
                        value: identifier,
                        label: label(identifier),
                        sublabel: identifier,
                        enabled: enabled,
                        selected: identifier == selected,
                        variant: CatchMenuItemVariant.choice,
                      ),
                      onSelected: enabled
                          ? (identifier, _) => onSelected(identifier)
                          : null,
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
