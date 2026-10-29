import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/private_event_details_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/field_value_validation.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_details_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Listing fields on the existing private-event editor. Local terms stay a
/// draft until saved together; setting a price does not open registration.
class HostPrivateEventListingSection extends StatefulWidget {
  const HostPrivateEventListingSection({
    super.key,
    required this.state,
    required this.controller,
  });
  final PrivateEventDetailsState state;
  final PrivateEventDetailsController controller;

  @override
  State<HostPrivateEventListingSection> createState() =>
      _HostPrivateEventListingSectionState();
}

class _HostPrivateEventListingSectionState
    extends State<HostPrivateEventListingSection> {
  late String _capacity;
  late String _price;
  late String _currency;
  late String _cancellation;
  bool _dirty = false;
  String? _savedTermsSignature;

  @override
  void initState() {
    super.initState();
    _readSavedTerms();
  }

  @override
  void didUpdateWidget(covariant HostPrivateEventListingSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    final incoming = widget.state.event!.eventDetails.admissionTerms
        ?.toJson()
        .toString();
    if (incoming != _savedTermsSignature &&
        (!_dirty || incoming == _terms?.toJson().toString())) {
      _readSavedTerms();
    }
  }

  void _readSavedTerms() {
    final event = widget.state.event!;
    final terms = event.eventDetails.admissionTerms;
    _savedTermsSignature = terms?.toJson().toString();
    _dirty = false;
    _currency =
        terms?.currency ??
        defaultCityOptions
            .where((city) => city.effectiveCityId == event.city.cityId)
            .firstOrNull
            ?.currencyCode ??
        'INR';
    _capacity = terms?.capacityLimit.toString() ?? '';
    _price = CreateEventPolicyState.minorUnitsText(
      terms?.priceInPaise,
      currencyCode: _currency,
    );
    _cancellation = terms?.cancellationPolicyId == 'notApplicable'
        ? 'standard'
        : terms?.cancellationPolicyId ?? 'standard';
  }

  PrivateEventAdmissionTerms? get _terms {
    final capacity = int.tryParse(_capacity.trim());
    final price = CreateEventPolicyState.currencyTextInMinorUnits(
      _price.trim(),
      currencyCode: _currency,
    );
    if (capacity == null || price == null) return null;
    final terms = PrivateEventAdmissionTerms(
      capacityLimit: capacity,
      priceInPaise: price,
      currency: _currency,
      cancellationPolicyId: price == 0 ? 'notApplicable' : _cancellation,
    );
    return terms.isValid ? terms : null;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final controller = widget.controller;
    final state = widget.state;
    final details = state.event!.eventDetails;
    final editable = state.canEdit;
    final mode = editable
        ? CatchTextInputMode.editable
        : CatchTextInputMode.inactive;
    final price = CreateEventPolicyState.currencyTextInMinorUnits(
      _price,
      currencyCode: _currency,
    );
    return CatchSectionList(
      emptyStateOmitted: true,
      children: [
        CatchSection.fieldRows(
          title: l10n.hostsEventDetailsStepTitleDescription,
          children: [
            CatchField.input(
              copy: copy,
              title: l10n.hostsEventDetailsStepTitleDescription,
              contract: CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsDescription,
              labelMode: CatchFieldLabelTextMode.optional,
              initialValue: details.description ?? '',

              inputMode: mode,
              maxLines: 6,
              onSubmitted: editable
                  ? (value) => unawaited(
                      controller.save(
                        PrivateEventDetailsPatch(description: value.trim()),
                      ),
                    )
                  : null,
            ),
            if (details.eventFormat?.isDistanceBased == true) ...[
              CatchField.input(
                copy: copy,
                title: l10n.hostsEventDetailsStepTitleDistanceKm,
                contract: CatchContractConstraints
                    .updatePrivateEventDetailsCallablePayloadDetailsDistanceKm,
                initialValue: details.distanceKm?.toString() ?? '',
                inputMode: mode,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                onValidate: (value) {
                  final km = double.tryParse(value?.trim() ?? '');
                  return acceptsContractValue(
                        CatchContractConstraints
                            .updatePrivateEventDetailsCallablePayloadDetailsDistanceKm,
                        km,
                      )
                      ? null
                      : l10n.hostsEventPreferenceInvalidValue;
                },
                onSubmitted: editable
                    ? (value) {
                        final km = double.tryParse(value.trim());
                        if (!acceptsContractValue(
                          CatchContractConstraints
                              .updatePrivateEventDetailsCallablePayloadDetailsDistanceKm,
                          km,
                        )) {
                          return;
                        }
                        unawaited(
                          controller.save(
                            PrivateEventDetailsPatch(distanceKm: km),
                          ),
                        );
                      }
                    : null,
              ),
              CatchField<PaceLevel>.control(
                copy: copy,
                title: l10n.hostsEventDetailsStepLabelPaceLevel,
                contract: CatchContractConstraints
                    .updatePrivateEventDetailsCallablePayloadDetailsPace,
                child: CatchChoiceInput<PaceLevel>(
                  values: PaceLevel.values,
                  itemLabelBuilder: (pace) => pace.label,
                  selected: {
                    for (final pace in PaceLevel.values)
                      if (pace.name == details.pace) pace,
                  },
                  mode: CatchChipMode.single,
                  autoClose: true,
                  onChanged: editable
                      ? (values) {
                          if (values.isEmpty) return;
                          unawaited(
                            controller.save(
                              PrivateEventDetailsPatch(
                                pace: values.single.name,
                              ),
                            ),
                          );
                        }
                      : null,
                ),
              ),
            ],
          ],
        ),
        CatchSection.fieldRows(
          title: l10n.hostsPrivateEventAdmissionTerms,
          children: [
            CatchField.read(
              copy: copy,
              title: l10n.hostsPrivateEventAdmissionTerms,
              body: l10n.hostsPrivateEventAdmissionTermsHint,
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostsEditHostedEventScreenLabelCapacity,
              contract: CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsCapacityLimit,
              initialValue: _capacity,
              inputMode: mode,

              keyboardType: TextInputType.number,
              onChanged: (value) => setState(() {
                _capacity = value;
                _dirty = true;
              }),
              onValidate: (value) {
                final count = int.tryParse(value?.trim() ?? '');
                return acceptsContractValue(
                      CatchContractConstraints
                          .updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsCapacityLimit,
                      count,
                    )
                    ? null
                    : l10n.hostsEventPreferenceInvalidValue;
              },
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostsEventPolicyStepTitleBasePriceCurrencycode(
                currencyCode: _currency,
              ),
              contractExemption:
                  'Explicit minor-unit price uses the shared currency parser.',
              initialValue: _price,
              inputMode: mode,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              onChanged: (value) => setState(() {
                _price = value;
                _dirty = true;
              }),
              onValidate: (value) {
                final amount = CreateEventPolicyState.currencyTextInMinorUnits(
                  value ?? '',
                  currencyCode: _currency,
                );
                return acceptsContractValue(
                      CatchContractConstraints
                          .updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsPriceInPaise,
                      amount,
                    )
                    ? null
                    : l10n.hostsEventPreferenceInvalidValue;
              },
            ),
            if (price != null && price > 0)
              CatchField<String>.control(
                copy: copy,
                title: l10n.hostsEditHostedEventScreenLabelCancellationPolicy,
                contractExemption:
                    'Cash-refund cutoff; credits are not offered.',
                child: CatchChoiceInput<String>(
                  values: CatchContractConstraints
                      .updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsCancellationPolicyId
                      .enumValues!
                      .where((value) => value != 'notApplicable')
                      .toList(),
                  itemLabelBuilder: (value) =>
                      l10n.hostsPrivateEventRefundCutoff(
                        hours: value == 'flexible'
                            ? 6
                            : value == 'strict'
                            ? 72
                            : 24,
                      ),
                  selected: {_cancellation},
                  mode: CatchChipMode.single,
                  autoClose: true,
                  onChanged: editable
                      ? (values) {
                          if (values.isEmpty) return;
                          setState(() {
                            _cancellation = values.single;
                            _dirty = true;
                          });
                        }
                      : null,
                ),
              ),
            if (_dirty)
              CatchField.action(
                copy: copy,
                title: l10n.hostsPrivateEventSaveTerms,
                onTap: editable && _terms != null
                    ? () => unawaited(
                        controller.save(
                          PrivateEventDetailsPatch(admissionTerms: _terms),
                        ),
                      )
                    : null,
              ),
          ],
        ),
      ],
    );
  }
}
