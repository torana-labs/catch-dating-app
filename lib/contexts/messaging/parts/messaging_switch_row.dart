import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// An automatic message (or the WhatsApp channel) as a row with its switch:
/// what it is, when it goes, and whether it is on.
class MessagingSwitchRow extends StatelessWidget {
  const MessagingSwitchRow({
    super.key,
    required this.title,
    required this.value,
    required this.onChanged,
    this.note,
  });

  final String title;
  final String? note;
  final bool value;

  /// Null while a change is on its way, which locks the switch.
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) => CatchIndexRow(
    title: title,
    subtitle: note,
    trailing: CatchToggleInput(
      value: value,
      onChanged: onChanged,
      semanticLabel: title,
      contractExemption: 'Automatic message on or off.',
    ),
    onTap: onChanged == null ? null : () => onChanged!(!value),
  );
}
