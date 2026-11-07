@Tags(['golden'])
library;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

CatchThemeMode _themeOf(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
    ? CatchThemeMode.night
    : CatchThemeMode.day;

String _clear(String placeholder) => 'Clear $placeholder';

/// One tab-home bar with both an identity and a search: the size class
/// decides which one shows.
class _Bar extends StatelessWidget {
  const _Bar({required this.sizeClass});

  final CatchWindowSize sizeClass;

  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.topLeft,
    child: CatchRoot(
      theme: _themeOf(context),
      size: sizeClass,
      child: CatchTopBar(
        variant: CatchTopBarVariant.tabHome,
        kicker: 'Tuesday 27 October',
        title: 'Good evening, Meher',
        identity: CatchTopBarIdentity(
          name: 'Lantern Lane Social',
          initials: 'LL',
          label: 'Lantern Lane Social. Switch organiser',
          onTap: () {},
        ),
        search: const CatchTopBarSearch(
          copy: CatchSearchFieldCopy(
            searchLabel: 'Search',
            clearTooltip: _clear,
            closeSearchLabel: 'Close search',
          ),
          placeholder: 'Find a guest or an event',
          tooltip: 'Search',
        ),
      ),
    ),
  );
}

void main() {
  for (final (name, width, sizeClass) in const [
    ('top_bar_tab_home_compact', 390.0, CatchWindowSize.compact),
    ('top_bar_tab_home_medium', 700.0, CatchWindowSize.medium),
    ('top_bar_tab_home_expanded', 1024.0, CatchWindowSize.expanded),
  ]) {
    testWidgets('tab-home at ${width.toInt()}', (tester) async {
      await matchCatchGolden(
        tester,
        name,
        size: Size(width, 120),
        builder: (_) => _Bar(sizeClass: sizeClass),
      );
    });
  }
}
