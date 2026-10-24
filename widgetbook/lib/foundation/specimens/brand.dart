import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Wordmark',
  type: FoundationBrandTokens,
  path: '[Foundation tokens]/Core',
)
Widget foundationBrandTokens(BuildContext context) {
  return const FoundationBrandTokens();
}

class FoundationBrandTokens extends StatelessWidget {
  const FoundationBrandTokens({super.key});

  @override
  Widget build(BuildContext context) {
    return WidgetbookContractFrame.foundation(
      title: 'Wordmark',
      contractId: 'foundation.brand',
      states: const ['typographic', 'light', 'dark'],
      children: const [
        WidgetbookFoundationSpecSection(
          title: 'Typographic wordmark',
          child: _WordmarkGrid(),
        ),
      ],
    );
  }
}

class _WordmarkGrid extends StatelessWidget {
  const _WordmarkGrid();

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: CatchSpacing.s4,
      runSpacing: CatchSpacing.s4,
      children: const [
        _WordmarkTile(label: 'Plain', child: _CatchWordmark()),
        _WordmarkTile(label: 'Dotted', child: _CatchWordmark(showDot: true)),
        _WordmarkTile(label: 'Dark', dark: true, child: _CatchWordmark()),
      ],
    );
  }
}

class _WordmarkTile extends StatelessWidget {
  const _WordmarkTile({
    required this.label,
    required this.child,
    this.dark = false,
  });

  final String label;
  final Widget child;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final theme = dark ? AppTheme.dark : Theme.of(context);
    return Theme(
      data: theme,
      child: Builder(
        builder: (context) {
          final t = CatchTokens.of(context);
          return SizedBox(
            width: WidgetbookPreviewLayout.foundationWordmarkTileWidth,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: dark ? t.bg : t.surface,
                border: Border.all(color: t.line),
                borderRadius: BorderRadius.circular(CatchRadius.md),
              ),
              child: Padding(
                padding: CatchInsets.content,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      height:
                          WidgetbookPreviewLayout.foundationWordmarkStageHeight,
                      child: Align(child: child),
                    ),
                    gapH10,
                    Text(label, style: CatchTextStyles.statusLabel(context)),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _CatchWordmark extends StatelessWidget {
  const _CatchWordmark({this.showDot = false});

  final bool showDot;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final style = CatchTextStyles.display(context, color: t.ink);
    if (!showDot) return Text('Catch', style: style);
    return RichText(
      text: TextSpan(
        style: style,
        children: [
          const TextSpan(text: 'Catch'),
          TextSpan(
            text: '.',
            style: style.copyWith(color: t.primary),
          ),
        ],
      ),
    );
  }
}
