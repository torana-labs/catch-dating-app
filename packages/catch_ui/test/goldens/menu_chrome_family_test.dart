import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  for (final width in [440.0, 840.0]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets('menu and chrome recipes at $width / $scale', (tester) async {
        await matchCatchGolden(
          tester,
          'menu_chrome_family_${width.toInt()}@$scale',
          size: Size(width, 1150),
          textScale: scale,
          builder: (context) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 24,
            children: [
              CatchTopBar.route(
                title: 'People',
                navigation: const CatchTopBarNavigation(
                  mode: CatchTopBarNavigationMode.none,
                ),
                actions: [
                  CatchTopBarPrimaryButton(
                    label: 'Add person',
                    icon: CatchIcons.add,
                    onPressed: _noop,
                  ),
                  const CatchButton.text(label: 'Done', onPressed: _noop),
                  const CatchActionMenu<String>(
                    tooltip: 'More',
                    items: [
                      CatchActionMenuItem(value: 'export', label: 'Export'),
                    ],
                    onSelected: _select,
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: CatchSelectionMenu<String>.control(
                  title: 'Sort people',
                  tooltip: 'Sort people',
                  items: _choices,
                  value: 'recent',
                  labelBuilder: (item) => item.label,
                  onSelected: _select,
                ),
              ),
              const Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: CatchMenu<String>(
                    width: 320,
                    items: [
                      CatchMenuItem(
                        value: 'recent',
                        label: 'Recently joined',
                        selected: true,
                        variant: CatchMenuItemVariant.choice,
                      ),
                      CatchMenuItem(
                        value: 'name',
                        label: 'Name',
                        variant: CatchMenuItemVariant.choice,
                      ),
                      CatchMenuItem(
                        value: 'unavailable',
                        label: 'Unavailable',
                        sublabel: 'No results yet',
                        enabled: false,
                      ),
                      CatchMenuItem(
                        value: 'remove',
                        label: 'Remove person',
                        danger: true,
                        startsSection: true,
                      ),
                    ],
                  ),
                ),
              ),
              const CatchSelectionSheet<String>(
                title: 'Sort people',
                items: _choices,
                value: 'recent',
              ),
              const Align(
                child: CatchErrorBackButton(label: 'Go back', onPressed: _noop),
              ),
            ],
          ),
        );
      }, tags: const ['golden']);
    }
  }
}

const _choices = [
  CatchSelectionMenuItem(value: 'recent', label: 'Recently joined'),
  CatchSelectionMenuItem(value: 'name', label: 'Name'),
];
void _noop() {}
void _select(String _) {}
