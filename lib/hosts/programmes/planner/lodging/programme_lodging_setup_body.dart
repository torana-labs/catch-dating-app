import 'dart:math';

import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_setup.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

part 'programme_lodging_setup_form.dart';

/// The stay planner's private lodging setup, staged in a local draft.
///
/// Five sections: guests who need rooms (stay dates resolved on the
/// programme calendar through `resolveDates`, beds and functional
/// features), confirmed room-sharing parties (priority, room type and an
/// optional pin to a hotel, room or floor area), contracted inventory
/// (room block, location, verified capacity, features, shared component
/// rooms and availability), nested social groups, and links that verify
/// existing stays. Save setup and plan rooms hands the draft and the stay
/// links to [onSave], which runs `manageProgramLodging` `setup`. It reads
/// no provider; no invitation household creates a sharing party.
class HostProgrammeLodgingSetupBody extends StatefulWidget {
  const HostProgrammeLodgingSetupBody({
    super.key,
    required this.initial,
    required this.resolveDates,
    required this.onSave,
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
  final bool busy;
  final Object? error;

  @override
  State<HostProgrammeLodgingSetupBody> createState() =>
      _HostProgrammeLodgingSetupBodyState();
}

class _HostProgrammeLodgingSetupBodyState
    extends State<HostProgrammeLodgingSetupBody>
    with _HostProgrammeLodgingSetupForm {
  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    const exemption = 'Private stay planner setup the planner types.';
    final catalog = _draft.catalog;
    String label(String key, String id) =>
        catalog.row(key, id)['label']! as String;
    return CatchPageBody.screen(
      children: [
        if (_error ?? widget.error case final error?)
          CatchNotice.inline(
            key: const ValueKey<String>('host-programme-lodging-setup-error'),
            tone: CatchNoticeTone.danger,
            icon: CatchIcons.error,
            body: appErrorMessage(
              error,
              l10n: l10n,
              context: AppErrorContext.event,
            ),
          ),
        CatchText(
          l10n.hostProgrammeLodgingSharingHint,
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
        CatchText(
          catalog.timezone,
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
        CatchSection(
          dividers: CatchSectionPlacement.none,
          title: l10n.hostProgrammeLodgingDemand,
          children: [
            CatchField<String>.choices(
              copy: copy,
              title: l10n.hostProgrammeLodgingGuest,
              contract: CatchContractConstraints
                  .programLodgingConfigDocumentDemandItemsGuestId,
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
              title: l10n.hostProgrammeLodgingArrival,
              controller: _arrival,
              contractExemption: exemption,
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostProgrammeLodgingDeparture,
              controller: _departure,
              contractExemption: exemption,
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostProgrammeLodgingBeds,
              controller: _demandBeds,
              keyboardType: TextInputType.number,
              contractExemption: exemption,
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostProgrammeLodgingFeatures,
              controller: _demandFeatures,
              contractExemption: exemption,
            ),
            CatchButton(
              label: l10n.hostProgrammeLodgingAddDemand,
              onPressed: _demand,
            ),
            for (final row in _draft.rows('demand'))
              CatchIndexRow(
                key: ValueKey<String>(
                  'host-programme-lodging-demand-${row['guestId']}',
                ),
                title: label('guests', requiredString(row, 'guestId')),
                selected: row['guestId'] == _guest,
                onTap: _busy
                    ? null
                    : () => setState(
                        () => _selectGuest(requiredString(row, 'guestId')),
                      ),
              ),
            CatchButton(
              label: l10n.hostProgrammeLodgingRemove,
              variant: CatchButtonVariant.quiet,
              onPressed: _guest == null
                  ? null
                  : () => _change(() => _draft.withoutDemand(_guest!)),
            ),
          ],
        ),
        CatchSection(
          dividers: CatchSectionPlacement.none,
          title: l10n.hostProgrammeLodgingParties,
          children: [
            CatchField<String>.choices(
              copy: copy,
              title: l10n.hostProgrammeLodgingParty,
              contract: CatchContractConstraints
                  .programLodgingConfigDocumentPartiesItemsId,
              values: _draft
                  .rows('parties')
                  .map((p) => requiredString(p, 'id'))
                  .toList(),
              selected: {?_party},
              allowEmptySelection: true,
              emptyValueText: l10n.hostProgrammeLodgingAdd,
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
                    selected.isNotEmpty && selected.single['confirmed'] == true;
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
              title: l10n.hostProgrammeLodgingDemand,
              contract: CatchContractConstraints
                  .programLodgingConfigDocumentPartiesItemsGuestIdsItems,
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
              title: l10n.hostProgrammeLodgingConfirmed,
              contractExemption: exemption,
              value: _confirmed,
              onChanged: (v) => setState(() => _confirmed = v),
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostProgrammeLodgingPriority,
              controller: _priority,
              keyboardType: TextInputType.number,
              contractExemption: exemption,
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostProgrammeLodgingRoomType,
              controller: _partyType,
              contractExemption: exemption,
            ),
            CatchField<String>.choices(
              copy: copy,
              title: l10n.hostProgrammeLodgingPinHotel,
              contract: CatchContractConstraints
                  .programLodgingConfigDocumentRoomsItemsHotelId,
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
              title: l10n.hostProgrammeLodgingPinRoom,
              contract: CatchContractConstraints
                  .programLodgingConfigDocumentInventoryItemsId,
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
              title: l10n.hostProgrammeLodgingPinZone,
              controller: _pinZone,
              contractExemption: exemption,
            ),
            CatchButton(
              label: l10n.hostProgrammeLodgingAddParty,
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
              label: l10n.hostProgrammeLodgingRemove,
              variant: CatchButtonVariant.quiet,
              onPressed: _party == null
                  ? null
                  : () => _change(() => _draft.withoutParty(_party!)),
            ),
          ],
        ),
        CatchSection(
          dividers: CatchSectionPlacement.none,
          title: l10n.hostProgrammeLodgingInventory,
          children: [
            CatchText(
              l10n.hostProgrammeLodgingInventoryHint,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
            CatchField<String>.choices(
              copy: copy,
              title: l10n.hostProgrammeLodgingInventory,
              contract: CatchContractConstraints
                  .programLodgingConfigDocumentInventoryItemsId,
              allowEmptySelection: true,
              values: _draft
                  .rows('inventory')
                  .map((u) => requiredString(u, 'id'))
                  .toList(),
              selected: {?_unit},
              emptyValueText: l10n.hostProgrammeLodgingAdd,
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
              title: l10n.hostProgrammeLodgingContract,
              contract: CatchContractConstraints
                  .programLodgingConfigDocumentInventoryItemsContractId,
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
              title: l10n.hostProgrammeLodgingZone,
              controller: _zone,
              contractExemption: exemption,
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostProgrammeLodgingBuilding,
              controller: _building,
              contractExemption: exemption,
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostProgrammeLodgingFloor,
              controller: _floor,
              contractExemption: exemption,
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostProgrammeLodgingWing,
              controller: _wing,
              contractExemption: exemption,
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostProgrammeLodgingRoomLabel,
              controller: _label,
              contractExemption: exemption,
            ),
            CatchField.input(
              copy: copy,
              key: const ValueKey('lodging-inventory-room-type'),
              title: l10n.hostProgrammeLodgingRoomType,
              controller: _type,
              contractExemption: exemption,
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostProgrammeLodgingBeds,
              controller: _beds,
              keyboardType: TextInputType.number,
              contractExemption: exemption,
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostProgrammeLodgingOccupants,
              controller: _occupants,
              keyboardType: TextInputType.number,
              contractExemption: exemption,
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostProgrammeLodgingFeatures,
              controller: _features,
              contractExemption: exemption,
            ),
            CatchText(
              l10n.hostProgrammeLodgingResourcesHint,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
            CatchField<String>.choices(
              copy: copy,
              title: l10n.hostProgrammeLodgingResources,
              contract: CatchContractConstraints
                  .programLodgingConfigDocumentRoomsItemsResourceIdsItems,
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
              title: l10n.hostProgrammeLodgingArrival,
              controller: _inventoryArrival,
              contractExemption: exemption,
            ),
            CatchField.input(
              copy: copy,
              title: l10n.hostProgrammeLodgingDeparture,
              controller: _inventoryDeparture,
              contractExemption: exemption,
            ),
            CatchButton(
              label: l10n.hostProgrammeLodgingAddInventory,
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
                            ).skip(1).map((v) => Map<String, Object?>.from(v)),
                        ],
                      ),
                    ),
            ),
            CatchButton(
              label: l10n.hostProgrammeLodgingRemove,
              variant: CatchButtonVariant.quiet,
              onPressed: _unit == null
                  ? null
                  : () => _change(() => _draft.withoutInventory(_unit!)),
            ),
          ],
        ),
        CatchSection(
          dividers: CatchSectionPlacement.none,
          title: l10n.hostProgrammeLodgingNesting,
          children: [
            CatchField<String>.choices(
              copy: copy,
              title: l10n.hostProgrammeLodgingGroup,
              contract: CatchContractConstraints
                  .programLodgingConfigDocumentGroupParentsItemsId,
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
              title: l10n.hostProgrammeLodgingParents,
              contract: CatchContractConstraints
                  .programLodgingConfigDocumentGroupParentsItemsParentIdsItems,
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
              label: l10n.hostProgrammeLodgingAddNesting,
              onPressed: _group == null
                  ? null
                  : () => _change(
                      () => _draft.withGroupParents(_group!, _parents.toList()),
                    ),
            ),
          ],
        ),
        if (catalog.rows('activeStays').isNotEmpty)
          CatchSection(
            dividers: CatchSectionPlacement.none,
            title: l10n.hostProgrammeLodgingAdoptions,
            children: [
              CatchField<String>.select(
                copy: copy,
                title: l10n.hostProgrammeLodgingAdoptions,
                contractExemption:
                    'An active stay from the lodging catalog; manageProgramLodging adoptions bound its id at 180 characters.',
                values: catalog
                    .rows('activeStays')
                    .map((s) => requiredString(s, 'id'))
                    .toList(),
                value: _stay,
                itemLabelBuilder: (id) {
                  final stay = catalog.row('activeStays', id);
                  return '${label('guests', requiredString(stay, 'guestId'))} · ${stay['roomLabel'] ?? ''}';
                },
                onChanged: (v) => setState(() => _stay = v),
              ),
              CatchField<String>.choices(
                copy: copy,
                title: l10n.hostProgrammeLodgingParty,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentPartiesItemsId,
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
                title: l10n.hostProgrammeLodgingInventory,
                contract: CatchContractConstraints
                    .programLodgingConfigDocumentInventoryItemsId,
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
                label: l10n.hostProgrammeLodgingAdopt,
                onPressed:
                    _busy ||
                        _stay == null ||
                        _adoptParty == null ||
                        _adoptUnit == null
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
                  '${l10n.hostProgrammeLodgingVerified} · ${label('guests', requiredString(catalog.row('activeStays', adoption['stayId']! as String), 'guestId'))}',
                  variant: CatchTextVariant.bodySmall,
                  tone: CatchTextTone.secondary,
                ),
            ],
          ),
        CatchText(
          l10n.hostProgrammeLodgingSaveHint,
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
        CatchButton(
          key: const ValueKey<String>('host-programme-lodging-setup-save'),
          label: l10n.hostProgrammeLodgingSaveSetup,
          fullWidth: true,
          status: _busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
          onPressed: _ready && !_busy ? _save : null,
        ),
      ],
    );
  }
}
