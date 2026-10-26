import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Presentation-only first-save fields. The route owns draft and command state.
class HostPrivateEventBasicsSection extends StatelessWidget {
  const HostPrivateEventBasicsSection({
    super.key,
    required this.nameController,
    required this.timezoneController,
    required this.city,
    required this.date,
    required this.start,
    required this.organizerLocation,
    required this.savedCityLabel,
    required this.suggestedTimezone,
    required this.cityAccordion,
    required this.cityLocked,
    required this.canRestoreCity,
    required this.hasSavedCity,
    required this.cityInherited,
    required this.timezoneInherited,
    required this.showErrors,
    required this.saving,
    required this.moreBasicsOpen,
    required this.onChooseCity,
    required this.onRestoreCity,
    required this.onRestoreTimezone,
    required this.onTimezoneEdited,
    required this.onPickDate,
    required this.onPickStart,
    required this.onToggleMoreBasics,
  });
  final TextEditingController nameController;
  final TextEditingController timezoneController;
  final CityOption? city;
  final DateTime? date;
  final TimeOfDay? start;
  final String organizerLocation;
  final String? savedCityLabel;
  final String? suggestedTimezone;
  final CatchAccordionController cityAccordion;
  final bool cityLocked;
  final bool canRestoreCity;
  final bool hasSavedCity;
  final bool cityInherited;
  final bool timezoneInherited;
  final bool showErrors;
  final bool saving;
  final bool moreBasicsOpen;
  final ValueChanged<CityOption> onChooseCity;
  final VoidCallback onRestoreCity;
  final VoidCallback onRestoreTimezone;
  final VoidCallback onTimezoneEdited;
  final VoidCallback onPickDate;
  final VoidCallback onPickStart;
  final VoidCallback onToggleMoreBasics;

  @override
  Widget build(BuildContext context) {
    final city = this.city;
    final date = this.date;
    final start = this.start;
    final fieldCopy = catchFieldCopy(context.l10n);
    final cityOptions = defaultCityOptions
        .where((option) => option.eventCreatable)
        .toList();
    return CatchSectionList(
      emptyStateOmitted: true,
      children: [
        CatchSection.fieldRows(
          first: true,
          title: context.l10n.hostsPrivateEventBasicsHeading,
          children: [
            CatchField.input(
              copy: fieldCopy,
              key: const ValueKey('private-event-name'),
              title: context.l10n.hostsEventDetailsStepTitleEventName,
              contractExemption:
                  'Private event first-save schema is owned by the event setup command.',
              controller: nameController,
              inputHint: context.l10n.hostsEventDetailsStepPlaceholderEventName,
              textCapitalization: TextCapitalization.words,
              error: showErrors && nameController.text.trim().isEmpty
                  ? context.l10n.hostsEventDetailsStepVisiblecopyRequired
                  : null,
            ),
            if (cityLocked)
              CatchField.read(
                copy: fieldCopy,
                key: const ValueKey('private-event-city'),
                title: context.l10n.hostsPrivateEventCity,
                body: city?.label ?? savedCityLabel ?? organizerLocation,
                icon: CatchIcons.location,
              )
            else
              CatchField<CityOption>.control(
                copy: fieldCopy,
                key: const ValueKey('private-event-city'),
                title: context.l10n.hostsPrivateEventCity,
                contractExemption:
                    'Private event city is validated by the event setup command.',
                body: cityInherited
                    ? '${city?.label ?? organizerLocation} · ${context.l10n.hostsPrivateEventFromOrganizer}'
                    : city?.label ??
                          savedCityLabel ??
                          context.l10n.hostsPrivateEventChooseCity,
                disclosureMode: cityAccordion.isExpanded('city')
                    ? CatchFieldMode.controlledExpanded
                    : CatchFieldMode.controlledCollapsed,
                onOpenChanged: (open) {
                  if (open) {
                    cityAccordion.toggle('city');
                  } else {
                    cityAccordion.collapse();
                  }
                },
                icon: CatchIcons.location,
                error:
                    showErrors &&
                        city == null &&
                        !hasSavedCity &&
                        !cityInherited
                    ? context.l10n.hostsPrivateEventChooseCity
                    : null,
                child: CatchChoiceInput<CityOption>(
                  values: cityOptions,
                  itemLabelBuilder: (option) => option.label,
                  selected: city == null ? const <CityOption>{} : {city},
                  mode: CatchChipMode.single,
                  autoClose: true,
                  onChanged: (selection) {
                    if (selection.isNotEmpty) onChooseCity(selection.single);
                  },
                ),
              ),
            if (canRestoreCity)
              CatchField.action(
                copy: fieldCopy,
                title: context.l10n.hostsPrivateEventUseOrganizerCity,
                body: city?.label ?? organizerLocation,
                onTap: onRestoreCity,
              ),
            CatchField.nav(
              copy: fieldCopy,
              key: const ValueKey('private-event-date'),
              title: context.l10n.hostsWhenStepLabelDate,
              body: date == null
                  ? context.l10n.hostsWhenStepPlaceholderSelectADate
                  : MaterialLocalizations.of(context).formatMediumDate(date),
              icon: CatchIcons.date,
              error: showErrors && date == null
                  ? context.l10n.hostsWhenStepVisiblecopyPleaseSelectADate
                  : null,
              onTap: saving ? null : onPickDate,
            ),
            CatchField.nav(
              copy: fieldCopy,
              key: const ValueKey('private-event-start'),
              title: context.l10n.hostsWhenStepLabelStartTime,
              body: start == null
                  ? context.l10n.hostsWhenStepPlaceholderSelectStartTime
                  : start.format(context),
              icon: CatchIcons.time,
              error: showErrors && start == null
                  ? context.l10n.hostsWhenStepVisiblecopyRequired
                  : null,
              onTap: saving ? null : onPickStart,
            ),
            CatchField.input(
              copy: fieldCopy,
              key: const ValueKey('private-event-timezone'),
              title: context.l10n.hostsPrivateEventTimezone,
              contractExemption:
                  'Private event IANA timezone schema is pending generated constraints.',
              controller: timezoneController,
              inputHint: context.l10n.hostsPrivateEventTimezoneHint,
              helperText: context.l10n.hostsPrivateEventTimezoneSuggestion,
              onChanged: (_) => onTimezoneEdited(),
              error:
                  showErrors &&
                      timezoneController.text.trim().isEmpty &&
                      !timezoneInherited
                  ? context.l10n.hostsWhenStepVisiblecopyRequired
                  : null,
            ),
            if (timezoneInherited)
              CatchField.read(
                copy: fieldCopy,
                title: context.l10n.hostsPrivateEventFromOrganizer,
                body: suggestedTimezone,
              )
            else if (suggestedTimezone != null)
              CatchField.action(
                copy: fieldCopy,
                title: context.l10n.hostsPrivateEventUseOrganizerTimezone,
                body: suggestedTimezone,
                onTap: onRestoreTimezone,
              ),
            CatchField.nav(
              copy: fieldCopy,
              title: context.l10n.hostsPrivateEventMoreBasics,
              body: context.l10n.hostsPrivateEventMoreBasicsBody,
              icon: CatchIcons.filters,
              onTap: onToggleMoreBasics,
            ),
            if (moreBasicsOpen)
              CatchField.read(
                copy: fieldCopy,
                title: context.l10n.hostsPrivateEventAfterSave,
                body: context.l10n.hostsPrivateEventAfterSaveBody,
              ),
          ],
        ),
      ],
    );
  }
}
