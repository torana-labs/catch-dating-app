import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_field_divider_geometry.dart';
import 'package:catch_ui/src/components/catch_section_body_mode.dart';
import 'package:catch_ui/src/primitives/catch_divider.dart';
import 'package:flutter/material.dart';

/// Section-owned child stack and separators, without header or surface chrome.
///
/// Product callers use the named `CatchSection` constructors. A direct child
/// owns its composition; a child list receives the section's separator policy.
class CatchSectionBody extends StatelessWidget {
  const CatchSectionBody({
    super.key,
    this.children = const [],
    this.child,
    this.mode = CatchSectionBodyMode.content,
    this.dividerIndent,
    this.dividerVariant = CatchDividerVariant.fieldRow,
    this.showInternalDividers = true,
  });

  final List<Widget> children;
  final Widget? child;
  final CatchSectionBodyMode mode;
  final double? dividerIndent;
  final CatchDividerVariant dividerVariant;
  final bool showInternalDividers;

  @override
  Widget build(BuildContext context) {
    final directChild = child;
    if (directChild != null) return directChild;
    if (children.isEmpty) return const SizedBox.shrink();
    if (mode == CatchSectionBodyMode.content) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < children.length; i++)
            if (i == 0 || !showInternalDividers || !_dividerBetween(i - 1, i))
              children[i]
            else
              Stack(
                children: [
                  children[i],
                  Positioned(
                    top: 0,
                    left: dividerIndent ?? 0,
                    right: 0,
                    child: CatchDivider(variant: dividerVariant),
                  ),
                ],
              ),
        ],
      );
    }
    final contained = mode == CatchSectionBodyMode.containedFields;
    final fieldRows = children.whereType<CatchFieldDividerGeometry>().toList();
    final directFields = fieldRows
        .where((field) => !field.suppressesFieldDividers)
        .toList();
    // Unknown adapters preserve the original text-lane fallback. Only a full
    // list of direct field contracts permits exact automatic inset inference.
    final canInferEveryRow = fieldRows.length == children.length;
    final leadingInset = directFields.fold<double>(
      0,
      (inset, field) => math.max(inset, field.fieldDividerLeadingInset),
    );
    final effectiveDividerIndent =
        dividerIndent ??
        (contained ? CatchFieldTokens.rowHorizontalPadding : 0) +
            (canInferEveryRow ? leadingInset : CatchFieldTokens.textLaneInset);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < children.length; i++)
          if (!showInternalDividers ||
              i == children.length - 1 ||
              !_dividerBetween(i, i + 1))
            children[i]
          else
            Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned(
                  bottom: -CatchStroke.hairline,
                  left: effectiveDividerIndent,
                  right: contained ? CatchFieldTokens.rowHorizontalPadding : 0,
                  child: CatchDivider(variant: dividerVariant),
                ),
                children[i],
              ],
            ),
      ],
    );
  }

  // A row that draws its own boundary needs no separator on either side.
  bool _dividerBetween(int above, int below) =>
      !_suppressesDividers(children[above]) &&
      !_suppressesDividers(children[below]);

  static bool _suppressesDividers(Widget child) => switch (child) {
    CatchFieldDividerGeometry(:final suppressesFieldDividers) =>
      suppressesFieldDividers,
    _ => false,
  };
}
