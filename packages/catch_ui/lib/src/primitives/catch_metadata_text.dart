import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/material.dart';

/// Single-line mono label for compact metadata in cards and rails.
class CatchMetadataText extends StatelessWidget {
  const CatchMetadataText(
    this.label, {
    super.key,
    required this.color,
    this.uppercase = false,
  });

  final String label;
  final Color color;
  final bool uppercase;

  @override
  Widget build(BuildContext context) {
    return Text(
      uppercase ? label.toUpperCase() : label,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: uppercase
          ? CatchTextStyles.monoCapsLabel(context, color: color)
          : CatchTextStyles.monoLabel(context, color: color),
    );
  }
}
