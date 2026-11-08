import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One person as a row: their avatar and name, a line about them, a status
/// at the end of the title and one action. Sitting out on court, not at the
/// stop yet, waiting for a pod. The row draws nothing of its own.
class FormatsPersonRow extends StatelessWidget {
  const FormatsPersonRow({
    super.key,
    required this.name,
    this.subtitle,
    this.status,
    this.statusTone = CatchIndexRowTone.neutral,
    this.action,
    this.density = CatchIndexRowSize.compact,
  });

  final String name;
  final String? subtitle;
  final String? status;
  final CatchIndexRowTone statusTone;
  final CatchIndexRowAction? action;
  final CatchIndexRowSize density;

  @override
  Widget build(BuildContext context) => CatchIndexRow(
    title: name,
    subtitle: subtitle,
    onTap: null,
    density: density,
    leading: CatchAvatar.system(size: CatchAvatarSize.sm, name: name),
    status: status,
    statusTone: statusTone,
    action: action,
  );
}
