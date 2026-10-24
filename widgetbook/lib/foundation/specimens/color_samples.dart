import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

import '../../preview_layout_contracts.dart';

class WidgetbookFoundationColorGrid extends StatelessWidget {
  const WidgetbookFoundationColorGrid({super.key, required this.colors});

  final List<WidgetbookFoundationColorSpec> colors;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: CatchSpacing.s3,
      runSpacing: CatchSpacing.s3,
      children: [for (final color in colors) _ColorTile(spec: color)],
    );
  }
}

class _ColorTile extends StatelessWidget {
  const _ColorTile({required this.spec});

  final WidgetbookFoundationColorSpec spec;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return SizedBox(
      width: WidgetbookPreviewLayout.foundationTileWidth,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: t.surface,
          border: Border.all(color: t.line),
          borderRadius: BorderRadius.circular(CatchRadius.sm),
        ),
        child: Padding(
          padding: const EdgeInsets.all(CatchSpacing.s2),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: WidgetbookPreviewLayout.foundationSwatchHeight,
                decoration: BoxDecoration(
                  color: spec.color,
                  border: Border.all(color: t.line2),
                  borderRadius: BorderRadius.circular(CatchRadius.xs),
                ),
              ),
              gapH8,
              Text(spec.name, style: CatchTextStyles.statusLabel(context)),
              gapH2,
              Text(
                widgetbookFoundationColorHex(spec.color),
                style: CatchTextStyles.monoLabelS(context, color: t.ink2),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class WidgetbookFoundationColorSpec {
  const WidgetbookFoundationColorSpec(this.name, this.color);

  final String name;
  final Color color;
}

String widgetbookFoundationColorHex(Color color) {
  return '#${color.toARGB32().toRadixString(16).padLeft(8, '0').toUpperCase()}';
}
