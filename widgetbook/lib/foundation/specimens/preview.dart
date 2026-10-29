import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class WidgetbookFoundationSpecSection extends StatelessWidget {
  const WidgetbookFoundationSpecSection({
    super.key,
    required this.title,
    required this.child,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return CatchSurface(
      tone: CatchSurfaceTone.surface,
      borderRole: CatchBorderRole.separator,
      radius: CatchRadius.lg,
      padding: CatchInsets.content,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: CatchTextStyles.sectionTitle(context)),
          gapH16,
          child,
        ],
      ),
    );
  }
}

class WidgetbookFoundationDualThemeSection extends StatelessWidget {
  const WidgetbookFoundationDualThemeSection({
    super.key,
    required this.title,
    required this.builder,
  });

  final String title;
  final WidgetBuilder builder;

  @override
  Widget build(BuildContext context) {
    return WidgetbookFoundationSpecSection(
      title: title,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 760;
          final panels = [
            _ThemePanel(name: 'Light', theme: AppTheme.light, builder: builder),
            _ThemePanel(name: 'Dark', theme: AppTheme.dark, builder: builder),
          ];
          if (compact) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final panel in panels) ...[panel, gapH16],
              ],
            );
          }
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final panel in panels)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: CatchSpacing.s4),
                    child: panel,
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _ThemePanel extends StatelessWidget {
  const _ThemePanel({
    required this.name,
    required this.theme,
    required this.builder,
  });

  final String name;
  final ThemeData theme;
  final WidgetBuilder builder;

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: theme,
      child: Builder(
        builder: (context) {
          final t = CatchTokens.of(context);
          return DecoratedBox(
            decoration: BoxDecoration(
              color: t.bg,
              border: Border.all(color: t.line),
              borderRadius: BorderRadius.circular(CatchRadius.md),
            ),
            child: Padding(
              padding: CatchInsets.content,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: CatchTextStyles.kicker(context)),
                  gapH12,
                  builder(context),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
