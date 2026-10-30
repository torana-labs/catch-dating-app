import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef EventAgeRangeChanged = void Function(int minAge, int maxAge);

/// Canonical Host event age selector.
///
/// Event policy storage uses `0` and `99` as the unrestricted sentinels. The
/// control presents the adult booking range as 18...99+, keeps the existing
/// text controllers synchronized for form payload compatibility, and commits
/// remote default changes only when a drag ends.
class EventAgeRangeField extends StatefulWidget {
  const EventAgeRangeField({
    super.key,
    required this.minAgeController,
    required this.maxAgeController,
    required this.minimumContract,
    required this.maximumContract,
    this.onChangeEnd,
    this.enabled = true,
    this.initiallyOpen = false,
  });

  static const int minimumAge = 18;
  static const int maximumAge = 99;

  final TextEditingController minAgeController;
  final TextEditingController maxAgeController;
  final CatchContractFieldConstraints minimumContract;
  final CatchContractFieldConstraints maximumContract;
  final EventAgeRangeChanged? onChangeEnd;
  final bool enabled;
  final bool initiallyOpen;

  @override
  State<EventAgeRangeField> createState() => _EventAgeRangeFieldState();
}

class _EventAgeRangeFieldState extends State<EventAgeRangeField> {
  late RangeValues _values = _valuesFromControllers();
  bool _writingControllers = false;

  @override
  void initState() {
    super.initState();
    _listen(widget);
  }

  @override
  void didUpdateWidget(covariant EventAgeRangeField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.minAgeController != widget.minAgeController ||
        oldWidget.maxAgeController != widget.maxAgeController) {
      _unlisten(oldWidget);
      _listen(widget);
      _syncFromControllers();
    }
  }

  @override
  void dispose() {
    _unlisten(widget);
    super.dispose();
  }

  void _listen(EventAgeRangeField target) {
    target.minAgeController.addListener(_syncFromControllers);
    target.maxAgeController.addListener(_syncFromControllers);
  }

  void _unlisten(EventAgeRangeField target) {
    target.minAgeController.removeListener(_syncFromControllers);
    target.maxAgeController.removeListener(_syncFromControllers);
  }

  void _syncFromControllers() {
    if (_writingControllers || !mounted) return;
    final next = _valuesFromControllers();
    if (next != _values) setState(() => _values = next);
  }

  RangeValues _valuesFromControllers() {
    final parsedMin = int.tryParse(widget.minAgeController.text.trim());
    final parsedMax = int.tryParse(widget.maxAgeController.text.trim());
    final minAge = (parsedMin ?? EventAgeRangeField.minimumAge).clamp(
      EventAgeRangeField.minimumAge,
      EventAgeRangeField.maximumAge,
    );
    final maxAge = (parsedMax ?? EventAgeRangeField.maximumAge).clamp(
      EventAgeRangeField.minimumAge,
      EventAgeRangeField.maximumAge,
    );
    return RangeValues(
      minAge.clamp(EventAgeRangeField.minimumAge, maxAge).toDouble(),
      maxAge.toDouble(),
    );
  }

  void _handleChanged(RangeValues values) {
    final next = RangeValues(
      values.start.roundToDouble(),
      values.end.roundToDouble(),
    );
    setState(() => _values = next);
    _writeControllers(next);
  }

  void _handleChangeEnd(RangeValues values) {
    final next = RangeValues(
      values.start.roundToDouble(),
      values.end.roundToDouble(),
    );
    _writeControllers(next);
    widget.onChangeEnd?.call(_storedMin(next), _storedMax(next));
  }

  void _writeControllers(RangeValues values) {
    _writingControllers = true;
    widget.minAgeController.text = _storedMin(values) == 0
        ? ''
        : values.start.round().toString();
    widget.maxAgeController.text = _storedMax(values) == 99
        ? ''
        : values.end.round().toString();
    _writingControllers = false;
  }

  int _storedMin(RangeValues values) =>
      values.start.round() <= EventAgeRangeField.minimumAge
      ? 0
      : values.start.round();

  int _storedMax(RangeValues values) =>
      values.end.round() >= EventAgeRangeField.maximumAge
      ? EventAgeRangeField.maximumAge
      : values.end.round();

  @override
  Widget build(BuildContext context) {
    assert(
      widget.minimumContract.minimum == null ||
          EventAgeRangeField.minimumAge >= widget.minimumContract.minimum!,
      'The visible adult minimum cannot undercut the stored age contract.',
    );
    assert(
      widget.maximumContract.maximum == null ||
          EventAgeRangeField.maximumAge <= widget.maximumContract.maximum!,
      'The visible age maximum cannot exceed the stored age contract.',
    );
    final minLabel = _values.start.round().toString();
    final maxLabel = _values.end.round() == EventAgeRangeField.maximumAge
        ? '${EventAgeRangeField.maximumAge}+'
        : _values.end.round().toString();
    return CatchFieldLanes.single(
      child: CatchField.control(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostsHostOrganizerProfileTitleAgeRange,
        contract: widget.minimumContract,
        body: context.l10n.hostsHostOrganizerProfileVisiblecopyMinageMaxage(
          minAge: minLabel,
          maxAge: maxLabel,
        ),
        disclosureMode: widget.initiallyOpen
            ? CatchFieldMode.localExpanded
            : CatchFieldMode.localCollapsed,
        states: <WidgetState>{if (!widget.enabled) WidgetState.disabled},
        icon: CatchIcons.birthday,
        child: CatchRangeInput(
          key: const ValueKey('event-age-range-slider'),
          minimumContract: widget.minimumContract,
          maximumContract: widget.maximumContract,
          values: _values,
          min: EventAgeRangeField.minimumAge.toDouble(),
          max: EventAgeRangeField.maximumAge.toDouble(),
          divisions:
              EventAgeRangeField.maximumAge - EventAgeRangeField.minimumAge,
          minLabel: EventAgeRangeField.minimumAge.toString(),
          maxLabel: '${EventAgeRangeField.maximumAge}+',
          semanticValueBuilder: (value) => value.round().toString(),
          onChanged: widget.enabled ? _handleChanged : null,
          onChangeEnd: widget.enabled ? _handleChangeEnd : null,
        ),
      ),
    );
  }
}
