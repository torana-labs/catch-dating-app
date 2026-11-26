part of 'programme_lodging_setup_body.dart';

// Staged form state and mutations share the widget lifecycle; rendering lives
// in the page body. Moving these methods does not change persistence authority.
mixin _HostProgrammeLodgingSetupForm on State<HostProgrammeLodgingSetupBody> {
  late ProgramLodgingDraft _draft;
  late final Map<String, String> _calendarDates;
  final _arrival = TextEditingController();
  final _departure = TextEditingController();
  final _beds = TextEditingController(text: '1');
  final _features = TextEditingController();
  final _demandBeds = TextEditingController(text: '1');
  final _demandFeatures = TextEditingController();
  final _partyType = TextEditingController();
  final _priority = TextEditingController(text: '0');
  final _type = TextEditingController();
  final _zone = TextEditingController();
  final _building = TextEditingController();
  final _floor = TextEditingController();
  final _wing = TextEditingController();
  final _label = TextEditingController();
  final _occupants = TextEditingController(text: '1');
  final _inventoryArrival = TextEditingController();
  final _inventoryDeparture = TextEditingController();
  String? _physicalRoom;
  Set<String> _components = {};
  Map<String, Object?>? _position;
  final _pinZone = TextEditingController();
  String? _guest;
  String? _party;
  String? _unit;
  String? _contract;
  String? _group;
  String? _stay;
  String? _adoptParty;
  String? _adoptUnit;
  String? _pinHotel;
  String? _pinRoom;
  Set<String> _sharing = {};
  Set<String> _parents = {};
  bool _confirmed = false;
  bool _pending = false;
  Object? _error;
  final _adoptions = <String, Map<String, Object?>>{};

  @override
  void initState() {
    super.initState();
    _draft = widget.initial;
    _calendarDates = Map<String, String>.from(
      requiredMap(_draft.catalog.json['calendarDates'], 'calendar dates'),
    );
  }

  @override
  void dispose() {
    for (final controller in [
      _arrival,
      _departure,
      _beds,
      _features,
      _priority,
      _partyType,
      _demandBeds,
      _demandFeatures,
      _type,
      _zone,
      _building,
      _floor,
      _wing,
      _label,
      _occupants,
      _inventoryArrival,
      _inventoryDeparture,
      _pinZone,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  String _id() =>
      'lodging_${List.generate(4, (_) => Random.secure().nextInt(1 << 32).toRadixString(16).padLeft(8, '0')).join()}';
  String? _text(TextEditingController value) =>
      value.text.trim().isEmpty ? null : value.text.trim();
  List<String> _list(TextEditingController value) => value.text
      .split(',')
      .map((s) => s.trim())
      .where((s) => s.isNotEmpty)
      .toSet()
      .toList();
  bool get _busy => widget.busy || _pending;

  void _change(ProgramLodgingDraft Function() action) {
    if (_busy) return;
    try {
      final result = action();
      setState(() {
        _draft = result;
        _adoptions.clear();
        _error = null;
        final partyIds = _draft.rows('parties').map((p) => p['id']).toSet();
        final unitIds = _draft.rows('inventory').map((u) => u['id']).toSet();
        if (!partyIds.contains(_party)) _party = null;
        if (!partyIds.contains(_adoptParty)) _adoptParty = null;
        if (!unitIds.contains(_unit)) _unit = null;
        if (!unitIds.contains(_adoptUnit)) _adoptUnit = null;
        final guests = _draft.rows('demand').map((d) => d['guestId']).toSet();
        _sharing = _sharing.where(guests.contains).toSet();
      });
    } catch (error) {
      setState(() => _error = error);
    }
  }

  Future<void> _demand() async {
    final guest = _guest;
    if (guest == null || _busy) return;
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      // Preserve exact existing stay times for verification. Custom dates use
      // the program's civil calendar resolver, never device-local DateTime.
      final old = _draft.catalog
          .rows('activeStays')
          .where((row) => row['guestId'] == guest);
      final existing = old.length == 1 ? old.single : null;
      final oldDemand = _draft
          .rows('demand')
          .where((d) => d['guestId'] == guest);
      final original = oldDemand.isNotEmpty ? oldDemand.single : existing;
      final unchanged =
          original?['startsAtMillis'] != null &&
          original?['endsAtMillis'] != null &&
          _arrival.text.trim() ==
              _date(requiredInt(original!, 'startsAtMillis')) &&
          _departure.text.trim() ==
              _date(requiredInt(original, 'endsAtMillis'));
      final dates = unchanged
          ? (
              startsAtMillis: requiredInt(original, 'startsAtMillis'),
              endsAtMillis: requiredInt(original, 'endsAtMillis'),
            )
          : await widget.resolveDates(
              _arrival.text.trim(),
              _departure.text.trim(),
            );
      if (!mounted) return;
      if (!unchanged) {
        _calendarDates[dates.startsAtMillis.toString()] = _arrival.text.trim();
        _calendarDates[dates.endsAtMillis.toString()] = _departure.text.trim();
      }
      _change(
        () => _draft.withDemand(
          guestId: guest,
          startsAtMillis: dates.startsAtMillis,
          endsAtMillis: dates.endsAtMillis,
          beds: int.parse(_demandBeds.text),
          requiredFeatures: _list(_demandFeatures),
        ),
      );
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  bool get _ready {
    final demand = _draft.rows('demand');
    final parties = _draft.rows('parties');
    return demand.isNotEmpty &&
        _draft.rows('inventory').isNotEmpty &&
        parties.isNotEmpty &&
        parties.every((p) => p['confirmed'] == true) &&
        demand.every(
          (d) => parties.any(
            (p) => stringList(p['guestIds']).contains(d['guestId']),
          ),
        ) &&
        _draft.catalog
            .rows('activeStays')
            .every(
              (stay) =>
                  (stay['lodgingPartyId'] != null &&
                      stay['lodgingInventoryId'] != null) ||
                  _adoptions.containsKey(stay['id']),
            );
  }

  Future<void> _save() async {
    if (!_ready || _busy) return;
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      await widget.onSave(_draft, _adoptions.values.toList(growable: false));
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  String _date(int millis) =>
      _calendarDates[millis.toString()] ??
      (throw const FormatException('Refresh the program calendar dates.'));

  void _selectGuest(String? id) {
    _guest = id;
    _arrival.clear();
    _departure.clear();
    _demandBeds.text = '1';
    _demandFeatures.clear();
    if (id == null) return;
    final demand = _draft.rows('demand').where((d) => d['guestId'] == id);
    final stays = _draft.catalog
        .rows('activeStays')
        .where((s) => s['guestId'] == id);
    final row = demand.isNotEmpty
        ? demand.single
        : stays.length == 1
        ? stays.single
        : null;
    if (row == null) return;
    if (row['startsAtMillis'] != null) {
      _arrival.text = _date(requiredInt(row, 'startsAtMillis'));
    }
    if (row['endsAtMillis'] != null) {
      _departure.text = _date(requiredInt(row, 'endsAtMillis'));
    }
    if (demand.isNotEmpty) {
      _demandBeds.text = requiredInt(row, 'beds').toString();
      _demandFeatures.text = stringList(row['requiredFeatures']).join(', ');
    }
  }

  String _roomLabel(String roomId) {
    final units = _draft
        .rows('inventory')
        .where((u) => u['physicalRoomId'] == roomId);
    if (units.isEmpty) return roomId;
    return _draft
                .rows('labels')
                .singleWhere(
                  (l) => l['inventoryId'] == units.first['id'],
                )['roomLabel']
            as String? ??
        roomId;
  }

  void _selectUnit(String? id) {
    _unit = id;
    _physicalRoom = null;
    _components = {};
    _position = null;
    if (id == null) return;
    final unit = _draft.rows('inventory').singleWhere((u) => u['id'] == id);
    _contract = requiredString(unit, 'contractId');
    _physicalRoom = requiredNullableString(unit, 'physicalRoomId');
    final facts = _physicalRoom == null
        ? requiredMap(unit['provisional'], 'provisional room')
        : _draft.rows('rooms').singleWhere((r) => r['id'] == _physicalRoom);
    _zone.text = requiredString(facts, 'zoneId');
    _building.text = facts['building'] as String? ?? '';
    _floor.text = facts['floor'] as String? ?? '';
    _wing.text = facts['wing'] as String? ?? '';
    _type.text = requiredString(facts, 'roomType');
    _beds.text = requiredInt(facts, 'beds').toString();
    _occupants.text = requiredInt(facts, 'maxOccupants').toString();
    _features.text = stringList(facts['verifiedFeatures']).join(', ');
    _label.text =
        _draft
                .rows('labels')
                .singleWhere((l) => l['inventoryId'] == id)['roomLabel']
            as String? ??
        '';
    if (_physicalRoom != null) {
      _components = stringList(
        facts['resourceIds'],
      ).where((r) => r != _physicalRoom).toSet();
      _position = facts['position'] == null
          ? null
          : Map<String, Object?>.from(facts['position']! as Map);
    }
    final availability = mapList(unit['availability'], 'availability');
    _inventoryArrival.text = requiredString(availability.first, 'arrival');
    _inventoryDeparture.text = requiredString(availability.first, 'departure');
  }
}
