@Tags(['golden'])
library;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

/// The light pass renders day roots, the dark pass night roots.
CatchThemeMode _themeOf(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
    ? CatchThemeMode.night
    : CatchThemeMode.day;

/// Names what the nearest scope says, in the root's own body text and icon.
class _ScopeReadout extends StatelessWidget {
  const _ScopeReadout(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    final scope = CatchRootScope.of(context);
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 6,
        children: [
          Row(
            spacing: 8,
            children: [
              CatchIcon(CatchIcons.event),
              Text('$label · ${scope.sizeClass.name}'),
            ],
          ),
          Text(
            '${scope.theme.name} · ${scope.ground.name}'
            '${scope.format == null ? '' : ' · ${scope.format!.name}'}',
          ),
          const CatchText('Page title', variant: CatchTextVariant.pageTitle),
        ],
      ),
    );
  }
}

void main() {
  testWidgets('root paints its ground, ink, body text and icons, and '
      'measures or takes its size class', (tester) async {
    await matchCatchGolden(
      tester,
      'root_family',
      size: const Size(960, 600),
      builder: (context) {
        final theme = _themeOf(context);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final width in const [300.0, 640.0])
                  SizedBox(
                    width: width,
                    height: 180,
                    child: CatchRoot(
                      theme: theme,
                      child: const _ScopeReadout('measured'),
                    ),
                  ),
              ],
            ),
            SizedBox(
              width: 900,
              height: 200,
              child: CatchRoot(
                theme: theme,
                child: const _ScopeReadout('measured'),
              ),
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 300,
                  height: 200,
                  child: CatchRoot(
                    theme: theme,
                    size: CatchWindowSize.expanded,
                    child: const _ScopeReadout('given'),
                  ),
                ),
                SizedBox(
                  width: 300,
                  height: 200,
                  child: CatchRoot(
                    theme: theme,
                    format: CatchFormat.dinner,
                    register: CatchRegister.quiet,
                    child: const _ScopeReadout('format'),
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }, tags: const ['golden']);
}
