import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Guest source and runtime access; ticketing rules belong to EventPolicyStep.
class CreateEventGuestsSection extends StatefulWidget {
  const CreateEventGuestsSection({
    super.key,
    this.autovalidateMode = AutovalidateMode.disabled,
    this.externalBookingProvider = ExternalBookingProvider.generic,
    required this.externalEventUrlController,
    required this.externalEventIdController,
    this.runtimeWalkInPolicy = EventRuntimeWalkInPolicy.hostApproval,
    this.onExternalBookingProviderChanged,
    this.onRuntimeWalkInPolicyChanged,
    this.rosterFileName,
    this.rosterReadyCount,
    this.rosterNeedsReviewCount = 0,
    this.rosterExcludedCount = 0,
    this.rosterAttached = false,
    this.onPickRoster,
  });
  final AutovalidateMode autovalidateMode;
  final ExternalBookingProvider externalBookingProvider;
  final TextEditingController externalEventUrlController;
  final TextEditingController externalEventIdController;
  final EventRuntimeWalkInPolicy runtimeWalkInPolicy;
  final ValueChanged<ExternalBookingProvider>? onExternalBookingProviderChanged;
  final ValueChanged<EventRuntimeWalkInPolicy>? onRuntimeWalkInPolicyChanged;
  final String? rosterFileName;
  final int? rosterReadyCount;
  final int rosterNeedsReviewCount;
  final int rosterExcludedCount;
  final bool rosterAttached;
  final VoidCallback? onPickRoster;

  @override
  State<CreateEventGuestsSection> createState() =>
      _CreateEventGuestsSectionState();
}

class _CreateEventGuestsSectionState extends State<CreateEventGuestsSection> {
  static const _secureUrlScheme = 'https';
  static const _externalProviderField = 'external-provider';
  static const _walkInPolicyField = 'walk-in-policy';
  bool _showBookingDetails = false;
  final CatchAccordionController _accordion = CatchAccordionController();

  @override
  void initState() {
    super.initState();
    _showBookingDetails = _sourceNeedsCorrection;
    _accordion.addListener(_handleAccordionChanged);
  }

  @override
  void didUpdateWidget(covariant CreateEventGuestsSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_sourceNeedsCorrection) _showBookingDetails = true;
  }

  bool get _sourceNeedsCorrection {
    if (widget.autovalidateMode == AutovalidateMode.disabled) return false;
    final value = widget.externalEventUrlController.text.trim();
    if (value.isEmpty) return false;
    final uri = Uri.tryParse(value);
    return uri == null || uri.scheme != _secureUrlScheme || uri.host.isEmpty;
  }

  @override
  void dispose() {
    _accordion
      ..removeListener(_handleAccordionChanged)
      ..dispose();
    super.dispose();
  }

  void _handleAccordionChanged() {
    if (mounted) setState(() {});
  }

  void _setOpen(String field, bool open) {
    if (open && !_accordion.isExpanded(field)) {
      _accordion.toggle(field);
    } else if (!open && _accordion.isExpanded(field)) {
      _accordion.collapse();
    }
  }

  String _walkInPolicyLabel(EventRuntimeWalkInPolicy policy) =>
      switch (policy) {
        EventRuntimeWalkInPolicy.deny =>
          context.l10n.hostsEventDetailsStepExternalWalkInDeny,
        EventRuntimeWalkInPolicy.hostApproval =>
          context.l10n.hostsEventDetailsStepExternalWalkInApproval,
        EventRuntimeWalkInPolicy.autoCreate =>
          context.l10n.hostsEventDetailsStepExternalWalkInAutomatic,
      };

  String _externalBookingProviderLabel(ExternalBookingProvider provider) =>
      switch (provider) {
        ExternalBookingProvider.catchPlatform =>
          context.l10n.hostsEventDetailsStepExternalProviderCatch,
        ExternalBookingProvider.generic =>
          context.l10n.hostsEventDetailsStepExternalProviderOther,
        ExternalBookingProvider.luma =>
          context.l10n.hostsEventDetailsStepExternalProviderLuma,
        ExternalBookingProvider.eventbrite =>
          context.l10n.hostsEventDetailsStepExternalProviderEventbrite,
        ExternalBookingProvider.partiful =>
          context.l10n.hostsEventDetailsStepExternalProviderPartiful,
        ExternalBookingProvider.posh =>
          context.l10n.hostsEventDetailsStepExternalProviderPosh,
        ExternalBookingProvider.bookmyshow =>
          context.l10n.hostsEventDetailsStepExternalProviderBookMyShow,
        ExternalBookingProvider.district =>
          context.l10n.hostsEventDetailsStepExternalProviderDistrict,
        ExternalBookingProvider.sortmyscene =>
          context.l10n.hostsEventDetailsStepExternalProviderSortMyScene,
        ExternalBookingProvider.airbnb =>
          context.l10n.hostsEventDetailsStepExternalProviderAirbnbExperiences,
      };

  @override
  Widget build(BuildContext context) => CatchSectionList(
    emptyStateOmitted: true,
    gap: 0,
    children: [
      CatchSection.fieldRows(
        children: [
          CatchField.action(
            copy: catchFieldCopy(context.l10n),
            key: const ValueKey('host.create_event.roster_file'),
            title: context.l10n.hostsCreateEventRosterTitle,
            body: widget.rosterFileName == null
                ? context.l10n.hostsCreateEventRosterLater
                : widget.rosterAttached
                ? context.l10n.hostsCreateEventRosterAttached(
                    fileName: widget.rosterFileName!,
                    ready: widget.rosterReadyCount ?? 0,
                    review: widget.rosterNeedsReviewCount,
                    excluded: widget.rosterExcludedCount,
                  )
                : context.l10n.hostsCreateEventRosterReattach(
                    fileName: widget.rosterFileName!,
                  ),
            bodyMaxLines: 4,
            valueText: widget.rosterFileName == null
                ? context.l10n.hostsCreateEventRosterChoose
                : context.l10n.hostsCreateEventRosterReplace,
            icon: CatchIcons.upload,
            onTap: widget.onPickRoster,
          ),
          CatchField<EventRuntimeWalkInPolicy>.choices(
            copy: catchFieldCopy(context.l10n),
            key: CreateEventFormKeys.runtimeWalkInPolicy,
            title: context.l10n.hostsEventDetailsStepExternalWalkInTitle,
            contract: CatchContractConstraints
                .createEventCallablePayloadRuntimeWalkInPolicy,
            contractValueBuilder: (policy) => policy.name,
            body: _walkInPolicyLabel(widget.runtimeWalkInPolicy),
            values: EventRuntimeWalkInPolicy.values,
            itemLabelBuilder: _walkInPolicyLabel,
            selected: <EventRuntimeWalkInPolicy>{widget.runtimeWalkInPolicy},
            onSelectionChanged: (selection) =>
                widget.onRuntimeWalkInPolicyChanged?.call(selection.single),
            disclosureMode: _accordion.isExpanded(_walkInPolicyField)
                ? CatchFieldMode.controlledExpanded
                : CatchFieldMode.controlledCollapsed,
            onOpenChanged: (open) => _setOpen(_walkInPolicyField, open),
            icon: CatchIcons.people,
          ),
        ],
      ),
      CatchSection.fieldRows(
        children: [
          Semantics(
            expanded: _showBookingDetails,
            child: CatchField.action(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host.create_event.booking_details'),
              title: context.l10n.hostsCreateEventExternalDetailsTitle,
              body: _externalBookingProviderLabel(
                widget.externalBookingProvider,
              ),
              valueText: _showBookingDetails
                  ? context.l10n.hostsCreateEventHideDetails
                  : context.l10n.hostsCreateEventShowDetails,
              onTap: () =>
                  setState(() => _showBookingDetails = !_showBookingDetails),
            ),
          ),
          if (_showBookingDetails) ...[
            CatchField<ExternalBookingProvider>.choices(
              copy: catchFieldCopy(context.l10n),
              key: CreateEventFormKeys.externalBookingProvider,
              title: context.l10n.hostsEventDetailsStepExternalProviderTitle,
              contract: CatchContractConstraints
                  .createEventCallablePayloadExternalOriginProvider,
              contractValueBuilder: (provider) => provider.name,
              body: _externalBookingProviderLabel(
                widget.externalBookingProvider,
              ),
              values: ExternalBookingProviderX.externalValues,
              itemLabelBuilder: _externalBookingProviderLabel,
              selected: <ExternalBookingProvider>{
                widget.externalBookingProvider,
              },
              onSelectionChanged: (selection) => widget
                  .onExternalBookingProviderChanged
                  ?.call(selection.single),
              disclosureMode: _accordion.isExpanded(_externalProviderField)
                  ? CatchFieldMode.controlledExpanded
                  : CatchFieldMode.controlledCollapsed,
              onOpenChanged: (open) => _setOpen(_externalProviderField, open),
              icon: CatchIcons.link,
            ),
            CatchField.input(
              copy: catchFieldCopy(context.l10n),
              key: CreateEventFormKeys.externalEventUrl,
              title: context.l10n.hostsEventDetailsStepExternalEventUrlTitle,
              contract: CatchContractConstraints
                  .createEventCallablePayloadExternalOriginExternalEventUrl,
              controller: widget.externalEventUrlController,
              labelMode: CatchFieldLabelTextMode.optional,
              inputHint:
                  context.l10n.hostsEventDetailsStepExternalEventUrlPlaceholder,
              icon: CatchIcons.link,
              keyboardType: TextInputType.url,
              textInputAction: TextInputAction.next,
              onValidate: (value) {
                final normalized = value?.trim() ?? '';
                if (normalized.isEmpty) return null;
                final uri = Uri.tryParse(normalized);
                if (uri == null ||
                    uri.scheme != _secureUrlScheme ||
                    uri.host.isEmpty) {
                  return context
                      .l10n
                      .hostsEventDetailsStepExternalEventUrlInvalid;
                }
                return null;
              },
            ),
            CatchField.input(
              copy: catchFieldCopy(context.l10n),
              key: CreateEventFormKeys.externalEventId,
              title: context.l10n.hostsEventDetailsStepExternalEventIdTitle,
              contract: CatchContractConstraints
                  .createEventCallablePayloadExternalOriginExternalEventId,
              controller: widget.externalEventIdController,
              labelMode: CatchFieldLabelTextMode.optional,
              inputHint:
                  context.l10n.hostsEventDetailsStepExternalEventIdPlaceholder,
              icon: CatchIcons.ticket,
              textInputAction: TextInputAction.next,
            ),
          ],
        ],
      ),
    ],
  );
}
