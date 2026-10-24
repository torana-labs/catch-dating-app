import 'dart:math';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/domain/program_lodging_setup.dart';
import 'package:catch_dating_app/programs/domain/program_models.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

part 'program_lodging_setup_form.dart';

/// Staged, provider-free form mechanics. Persistence and authority lifetime
/// remain with the routed controller. No household creates sharing choices.
class ProgramLodgingSetupPageBody extends StatefulWidget {
  const ProgramLodgingSetupPageBody({
    super.key,
    required this.initial,
    required this.resolveDates,
    required this.onSave,
    required this.onCancel,
    this.busy = false,
    this.error,
  });
  final ProgramLodgingDraft initial;
  final Future<({int startsAtMillis, int endsAtMillis})> Function(
    String arrival,
    String departure,
  )
  resolveDates;
  final Future<void> Function(
    ProgramLodgingDraft draft,
    List<Map<String, Object?>> adoptions,
  )
  onSave;
  final VoidCallback onCancel;
  final bool busy;
  final Object? error;

  @override
  State<ProgramLodgingSetupPageBody> createState() =>
      _ProgramLodgingSetupPageBodyState();
}

class _ProgramLodgingSetupPageBodyState
    extends State<ProgramLodgingSetupPageBody>
    with _ProgramLodgingSetupForm {
  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final catalog = _draft.catalog;
    String label(String key, String id) =>
        catalog.row(key, id)['label']! as String;
    return AbsorbPointer(
      absorbing: _busy,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_error ?? widget.error case final error?)
            CatchLocalizedErrorBanner(error, context: AppErrorContext.event),
          CatchText(
            l10n.programsLodgingSharingHint,
            variant: CatchTextVariant.supporting,
          ),
          CatchText(catalog.timezone, variant: CatchTextVariant.supporting),
          CatchSection.containedFieldRows(
            title: l10n.programsLodgingDemand,
            children: [
              CatchField<String>.choices(
                copy: copy,
                title: l10n.programsGuestsNameLabel,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentDemandItemsGuestId,
                contractValueBuilder: (v) => v,
                values: catalog
                    .rows('guests')
                    .map((g) => requiredString(g, 'id'))
                    .toList(),
                itemLabelBuilder: (id) => label('guests', id),
                selected: {?_guest},
                onSelectionChanged: (v) =>
                    setState(() => _selectGuest(v.firstOrNull)),
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingArrival,
                controller: _arrival,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentInventoryItemsAvailabilityItemsArrival,
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingDeparture,
                controller: _departure,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentInventoryItemsAvailabilityItemsDeparture,
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingBeds,
                controller: _demandBeds,
                keyboardType: TextInputType.number,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentDemandItemsBeds,
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingFeatures,
                controller: _demandFeatures,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentDemandItemsRequiredFeaturesItems,
              ),
              CatchButton(
                label: l10n.programsLodgingAddDemand,
                onPressed: _demand,
              ),
              for (final row in _draft.rows('demand'))
                CatchText(
                  label('guests', requiredString(row, 'guestId')),
                  variant: CatchTextVariant.supporting,
                ),
              CatchButton(
                label: l10n.programsLodgingRemove,
                variant: CatchButtonVariant.ghost,
                onPressed: _guest == null
                    ? null
                    : () => _change(() => _draft.withoutDemand(_guest!)),
              ),
            ],
          ),
          CatchSection.containedFieldRows(
            title: l10n.programsLodgingParties,
            children: [
              CatchField<String>.choices(
                copy: copy,
                title: l10n.programsLodgingParty,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentPartiesItemsId,
                contractValueBuilder: (v) => v,
                values: _draft
                    .rows('parties')
                    .map((p) => requiredString(p, 'id'))
                    .toList(),
                selected: {?_party},
                allowEmptySelection: true,
                emptyValueText: l10n.programsLodgingAdd,
                itemLabelBuilder: (id) => stringList(
                  _draft
                      .rows('parties')
                      .singleWhere((p) => p['id'] == id)['guestIds'],
                ).map((g) => label('guests', g)).join(', '),
                onSelectionChanged: (v) => setState(() {
                  _party = v.firstOrNull;
                  final selected = _draft
                      .rows('parties')
                      .where((p) => p['id'] == _party);
                  _sharing = selected.isEmpty
                      ? {}
                      : stringList(selected.single['guestIds']).toSet();
                  _confirmed =
                      selected.isNotEmpty &&
                      selected.single['confirmed'] == true;
                  _priority.text = selected.isEmpty
                      ? '0'
                      : selected.single['priority'].toString();
                  _partyType.text = selected.isEmpty
                      ? ''
                      : selected.single['requiredRoomType'] as String? ?? '';
                  final pin = selected.isEmpty ? null : selected.single['pin'];
                  _pinHotel = pin is Map ? pin['hotelId'] as String? : null;
                  _pinRoom = pin is Map ? pin['inventoryId'] as String? : null;
                  _pinZone.text = pin is Map
                      ? pin['zoneId'] as String? ?? ''
                      : '';
                }),
              ),
              CatchField<String>.choices(
                copy: copy,
                title: l10n.programsLodgingDemand,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentPartiesItemsGuestIds,
                contractValueBuilder: (v) => v,
                mode: CatchChipMode.multiple,
                values: _draft
                    .rows('demand')
                    .map((d) => requiredString(d, 'guestId'))
                    .toList(),
                selected: _sharing,
                itemLabelBuilder: (id) => label('guests', id),
                onSelectionChanged: (v) => setState(() => _sharing = v),
              ),
              CatchField.toggle(
                copy: copy,
                title: l10n.programsLodgingConfirmed,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentPartiesItemsConfirmed,
                value: _confirmed,
                onChanged: (v) => setState(() => _confirmed = v),
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingPriority,
                controller: _priority,
                keyboardType: TextInputType.number,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentPartiesItemsPriority,
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingRoomType,
                controller: _partyType,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentPartiesItemsRequiredRoomType,
              ),
              CatchField<String>.choices(
                copy: copy,
                title: l10n.programsLodgingPinHotel,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentPartiesItemsPinHotelId,
                contractValueBuilder: (v) => v,
                allowEmptySelection: true,
                values: catalog
                    .rows('hotels')
                    .map((h) => requiredString(h, 'id'))
                    .toList(),
                selected: {?_pinHotel},
                itemLabelBuilder: (id) => label('hotels', id),
                onSelectionChanged: (v) =>
                    setState(() => _pinHotel = v.firstOrNull),
              ),
              CatchField<String>.choices(
                copy: copy,
                title: l10n.programsLodgingPinRoom,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentPartiesItemsPinInventoryId,
                contractValueBuilder: (v) => v,
                allowEmptySelection: true,
                values: _draft
                    .rows('inventory')
                    .map((u) => requiredString(u, 'id'))
                    .toList(),
                selected: {?_pinRoom},
                itemLabelBuilder: (id) =>
                    _draft
                            .rows('labels')
                            .singleWhere(
                              (l) => l['inventoryId'] == id,
                            )['roomLabel']
                        as String? ??
                    id,
                onSelectionChanged: (v) =>
                    setState(() => _pinRoom = v.firstOrNull),
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingPinZone,
                controller: _pinZone,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentPartiesItemsPinZoneId,
              ),
              CatchButton(
                label: l10n.programsLodgingAddParty,
                onPressed: () => _change(() {
                  final pin = <String, Object?>{
                    if (_pinHotel != null) 'hotelId': _pinHotel,
                    if (_pinRoom != null) 'inventoryId': _pinRoom,
                    if (_text(_pinZone) != null) 'zoneId': _text(_pinZone),
                  };
                  return _draft.withParty(
                    id: _party ?? _id(),
                    guestIds: _sharing.toList(),
                    confirmed: _confirmed,
                    priority: int.parse(_priority.text),
                    requiredRoomType: _text(_partyType),
                    pin: pin.isEmpty ? null : pin,
                  );
                }),
              ),
              CatchButton(
                label: l10n.programsLodgingRemove,
                variant: CatchButtonVariant.ghost,
                onPressed: _party == null
                    ? null
                    : () => _change(() => _draft.withoutParty(_party!)),
              ),
            ],
          ),
          CatchSection.containedFieldRows(
            title: l10n.programsLodgingInventory,
            children: [
              CatchText(
                l10n.programsLodgingInventoryHint,
                variant: CatchTextVariant.supporting,
              ),
              CatchField<String>.choices(
                copy: copy,
                title: l10n.programsLodgingInventory,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentInventoryItemsId,
                contractValueBuilder: (v) => v,
                allowEmptySelection: true,
                values: _draft
                    .rows('inventory')
                    .map((u) => requiredString(u, 'id'))
                    .toList(),
                selected: {?_unit},
                emptyValueText: l10n.programsLodgingAdd,
                itemLabelBuilder: (id) =>
                    _draft
                            .rows('labels')
                            .singleWhere(
                              (l) => l['inventoryId'] == id,
                            )['roomLabel']
                        as String? ??
                    id,
                onSelectionChanged: (v) =>
                    setState(() => _selectUnit(v.firstOrNull)),
              ),
              CatchField<String>.choices(
                copy: copy,
                title: l10n.programsLodgingContract,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentInventoryItemsContractId,
                contractValueBuilder: (v) => v,
                values: catalog
                    .rows('contracts')
                    .map((c) => requiredString(c, 'id'))
                    .toList(),
                selected: {?_contract},
                itemLabelBuilder: (id) => label('contracts', id),
                onSelectionChanged: (v) => setState(() {
                  _contract = v.firstOrNull;
                  if (_contract != null && _unit == null) {
                    final block = catalog.row('contracts', _contract!);
                    _inventoryArrival.text = catalog.calendarDate(
                      requiredInt(block, 'startsAtMillis'),
                    );
                    _inventoryDeparture.text = catalog.calendarDate(
                      requiredInt(block, 'endsAtMillis'),
                    );
                  }
                }),
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingZone,
                controller: _zone,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentRoomsItemsZoneId,
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingBuilding,
                controller: _building,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentRoomsItemsBuilding,
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingFloor,
                controller: _floor,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentRoomsItemsFloor,
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingWing,
                controller: _wing,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentRoomsItemsWing,
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingRoomLabel,
                controller: _label,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentLabelsItemsRoomLabel,
              ),
              CatchField.input(
                copy: copy,
                key: const ValueKey('lodging-inventory-room-type'),
                title: l10n.programsLodgingRoomType,
                controller: _type,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentRoomsItemsRoomType,
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingBeds,
                controller: _beds,
                keyboardType: TextInputType.number,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentRoomsItemsBeds,
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingOccupants,
                controller: _occupants,
                keyboardType: TextInputType.number,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentRoomsItemsMaxOccupants,
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingFeatures,
                controller: _features,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentRoomsItemsVerifiedFeaturesItems,
              ),
              CatchText(
                l10n.programsLodgingResourcesHint,
                variant: CatchTextVariant.supporting,
              ),
              CatchField<String>.choices(
                copy: copy,
                title: l10n.programsLodgingResources,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentRoomsItemsResourceIds,
                contractValueBuilder: (v) => v,
                mode: CatchChipMode.multiple,
                allowEmptySelection: true,
                values: _draft
                    .rows('rooms')
                    .map((r) => requiredString(r, 'id'))
                    .toList(),
                selected: _components,
                itemLabelBuilder: _roomLabel,
                onSelectionChanged: (v) => setState(() => _components = v),
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingArrival,
                controller: _inventoryArrival,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentInventoryItemsAvailabilityItemsArrival,
              ),
              CatchField.input(
                copy: copy,
                title: l10n.programsLodgingDeparture,
                controller: _inventoryDeparture,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentInventoryItemsAvailabilityItemsDeparture,
              ),
              CatchButton(
                label: l10n.programsLodgingAddInventory,
                onPressed: _contract == null
                    ? null
                    : () => _change(
                        () => _draft.withInventory(
                          id: _unit ?? _id(),
                          contractId: _contract!,
                          physicalRoomId: _text(_label) == null
                              ? null
                              : (_physicalRoom ?? _id()),
                          roomLabel: _text(_label),
                          zoneId: _zone.text.trim(),
                          roomType: _type.text.trim(),
                          beds: int.parse(_beds.text),
                          maxOccupants: int.parse(_occupants.text),
                          building: _text(_building),
                          floor: _text(_floor),
                          wing: _text(_wing),
                          verifiedFeatures: _list(_features),
                          resourceIds: _components.toList(),
                          position: _position,
                          availability: [
                            {
                              'arrival': _inventoryArrival.text.trim(),
                              'departure': _inventoryDeparture.text.trim(),
                            },
                            if (_unit != null)
                              ...mapList(
                                    _draft
                                        .rows('inventory')
                                        .singleWhere(
                                          (u) => u['id'] == _unit,
                                        )['availability'],
                                    'availability',
                                  )
                                  .skip(1)
                                  .map((v) => Map<String, Object?>.from(v)),
                          ],
                        ),
                      ),
              ),
              CatchButton(
                label: l10n.programsLodgingRemove,
                variant: CatchButtonVariant.ghost,
                onPressed: _unit == null
                    ? null
                    : () => _change(() => _draft.withoutInventory(_unit!)),
              ),
            ],
          ),
          CatchSection.containedFieldRows(
            title: l10n.programsLodgingNesting,
            children: [
              CatchField<String>.choices(
                copy: copy,
                title: l10n.programsGuestsGroupLabel,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentGroupParentsItemsId,
                contractValueBuilder: (v) => v,
                values: catalog
                    .rows('groups')
                    .map((g) => requiredString(g, 'id'))
                    .toList(),
                selected: {?_group},
                itemLabelBuilder: (id) => label('groups', id),
                onSelectionChanged: (v) => setState(() {
                  _group = v.firstOrNull;
                  final existing = _draft
                      .rows('groupParents')
                      .where((g) => g['id'] == _group);
                  _parents = existing.isEmpty
                      ? {}
                      : stringList(existing.single['parentIds']).toSet();
                }),
              ),
              CatchField<String>.choices(
                copy: copy,
                title: l10n.programsLodgingParents,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentGroupParentsItemsParentIds,
                contractValueBuilder: (v) => v,
                mode: CatchChipMode.multiple,
                allowEmptySelection: true,
                values: catalog
                    .rows('groups')
                    .map((g) => requiredString(g, 'id'))
                    .where((id) => id != _group)
                    .toList(),
                selected: _parents,
                itemLabelBuilder: (id) => label('groups', id),
                onSelectionChanged: (v) => setState(() => _parents = v),
              ),
              CatchButton(
                label: l10n.programsLodgingAddNesting,
                onPressed: _group == null
                    ? null
                    : () => _change(
                        () =>
                            _draft.withGroupParents(_group!, _parents.toList()),
                      ),
              ),
            ],
          ),
          if (catalog.rows('activeStays').isNotEmpty)
            CatchSection.containedFieldRows(
              title: l10n.programsLodgingAdoptions,
              children: [
                CatchField<String>.choices(
                  copy: copy,
                  title: l10n.programsLodgingAdoptions,
                  contract: CatchContractConstraints
                      .programLodgingConfigDocumentDemandItemsGuestId,
                  contractValueBuilder: (id) =>
                      requiredString(catalog.row('activeStays', id), 'guestId'),
                  values: catalog
                      .rows('activeStays')
                      .map((s) => requiredString(s, 'id'))
                      .toList(),
                  selected: {?_stay},
                  itemLabelBuilder: (id) {
                    final stay = catalog.row('activeStays', id);
                    return '${label('guests', requiredString(stay, 'guestId'))} · ${stay['roomLabel'] ?? ''}';
                  },
                  onSelectionChanged: (v) =>
                      setState(() => _stay = v.firstOrNull),
                ),
                CatchField<String>.choices(
                  copy: copy,
                  title: l10n.programsLodgingParty,
                  contract: CatchContractConstraints
                      .programLodgingConfigDocumentPartiesItemsId,
                  contractValueBuilder: (v) => v,
                  values: _draft
                      .rows('parties')
                      .map((p) => requiredString(p, 'id'))
                      .toList(),
                  selected: {?_adoptParty},
                  itemLabelBuilder: (id) => stringList(
                    _draft
                        .rows('parties')
                        .singleWhere((p) => p['id'] == id)['guestIds'],
                  ).map((g) => label('guests', g)).join(', '),
                  onSelectionChanged: (v) =>
                      setState(() => _adoptParty = v.firstOrNull),
                ),
                CatchField<String>.choices(
                  copy: copy,
                  title: l10n.programsLodgingInventory,
                  contract: CatchContractConstraints
                      .programLodgingConfigDocumentInventoryItemsId,
                  contractValueBuilder: (v) => v,
                  values: _draft
                      .rows('inventory')
                      .map((u) => requiredString(u, 'id'))
                      .toList(),
                  selected: {?_adoptUnit},
                  itemLabelBuilder: (id) =>
                      _draft
                              .rows('labels')
                              .singleWhere(
                                (l) => l['inventoryId'] == id,
                              )['roomLabel']
                          as String? ??
                      id,
                  onSelectionChanged: (v) =>
                      setState(() => _adoptUnit = v.firstOrNull),
                ),
                CatchButton(
                  label: l10n.programsLodgingAdopt,
                  onPressed:
                      _stay == null || _adoptParty == null || _adoptUnit == null
                      ? null
                      : () {
                          try {
                            final adoption = _draft.adoption(
                              stayId: _stay!,
                              partyId: _adoptParty!,
                              inventoryId: _adoptUnit!,
                            );
                            setState(() {
                              _adoptions[_stay!] = adoption;
                              _error = null;
                            });
                          } catch (error) {
                            setState(() => _error = error);
                          }
                        },
                ),
                for (final adoption in _adoptions.values)
                  CatchText(
                    '${l10n.programsLodgingVerified} · ${label('guests', requiredString(catalog.row('activeStays', adoption['stayId']! as String), 'guestId'))}',
                    variant: CatchTextVariant.supporting,
                  ),
              ],
            ),
          CatchText(
            l10n.programsLodgingSaveHint,
            variant: CatchTextVariant.supporting,
          ),
          CatchButton(
            label: l10n.programsLodgingSaveSetup,
            onPressed: _ready && !_busy ? _save : null,
          ),
          CatchButton(
            label: l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
            variant: CatchButtonVariant.secondary,
            onPressed: _busy ? null : widget.onCancel,
          ),
        ],
      ),
    );
  }
}
