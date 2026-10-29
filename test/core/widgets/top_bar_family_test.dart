import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

void main() {
  testWidgets('keyed root and route recipes retain the active search', (
    tester,
  ) async {
    const key = ValueKey('shared-top-bar');
    var query = '';
    Future<void> pump(bool root) => tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Builder(
          builder: (context) {
            final search = CatchTopBarSearch(
              copy: catchSearchFieldCopy(AppLocalizationsEn()),
              value: query,
              onChanged: (value) => query = value,
              placeholder: 'Find people',
              tooltip: 'Search people',
            );
            return Scaffold(
              appBar: root
                  ? CatchTopBar.screen(
                      key: key,
                      title: 'People',
                      search: search,
                    )
                  : CatchTopBar.route(
                      key: key,
                      title: 'People',
                      search: search,
                    ),
            );
          },
        ),
      ),
    );
    await pump(true);
    final state = tester.state(find.byKey(key));
    await tester.tap(find.byTooltip('Search people'));
    await pumpFeatureUi(tester);
    await tester.enterText(find.byType(TextField), 'Ananya');
    expect(query, 'Ananya');
    await pump(false);
    await pumpFeatureUi(tester);
    expect(tester.state(find.byKey(key)), same(state));
    expect(find.byType(TextField), findsOneWidget);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      'Ananya',
    );
    expect(tester.takeException(), isNull);
  });

  for (final selector in [false, true]) {
    testWidgets(
      'search retains editing across text reflow with selector=$selector',
      (tester) async {
        tester.platformDispatcher.textScaleFactorTestValue = 1;
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        var query = '';
        var fieldKey = const ValueKey('people-search');
        late StateSetter update;
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: StatefulBuilder(
              builder: (context, setState) {
                update = setState;
                return CatchScaffold.workspace(
                  title: CatchTopBar.screen(
                    title: 'People',
                    leading: selector ? const _LeadingSelector() : null,
                    search: CatchTopBarSearch(
                      copy: catchSearchFieldCopy(AppLocalizationsEn()),
                      fieldKey: fieldKey,
                      value: query,
                      onChanged: (value) => setState(() => query = value),
                      placeholder: 'Find people',
                      tooltip: 'Search people',
                    ),
                  ),
                  body: const SizedBox.shrink(),
                );
              },
            ),
          ),
        );
        await tester.tap(find.byTooltip('Search people'));
        await pumpFeatureUi(tester);
        await tester.enterText(find.byType(EditableText), 'Ananya');
        await pumpFeatureUi(tester);
        const editingValue = TextEditingValue(
          text: 'Ananya',
          selection: TextSelection(baseOffset: 1, extentOffset: 4),
        );
        tester.testTextInput.updateEditingValue(editingValue);
        await pumpFeatureUi(tester);
        final originalFocus = tester
            .widget<EditableText>(find.byType(EditableText))
            .focusNode;
        expect(originalFocus.hasFocus, isTrue);
        for (final scale in [2.0, 1.0]) {
          tester.platformDispatcher.textScaleFactorTestValue = scale;
          await pumpFeatureUi(tester);
          expect(find.byType(EditableText), findsOneWidget);
          final current = tester.widget<EditableText>(
            find.byType(EditableText),
          );
          expect(current.focusNode.hasFocus, isTrue);
          expect(current.controller.value, editingValue);
          expect(tester.takeException(), isNull);
        }

        // Reflow preserves one query. A different public identity deliberately
        // starts a fresh editor rather than leaking the old selection/focus.
        update(() {
          fieldKey = const ValueKey('audience-search');
          query = 'Saved audience';
        });
        await pumpFeatureUi(tester);
        expect(find.byKey(const ValueKey('people-search')), findsNothing);
        expect(find.byKey(fieldKey), findsOneWidget);
        final replacement = tester.widget<EditableText>(
          find.byType(EditableText),
        );
        expect(replacement.controller.text, 'Saved audience');
        expect(replacement.focusNode, isNot(same(originalFocus)));
        expect(replacement.focusNode.hasFocus, isFalse);
        expect(replacement.controller.selection, isNot(editingValue.selection));
        expect(tester.takeException(), isNull);
      },
    );
  }
}

class _LeadingSelector extends StatelessWidget implements CatchToolbarLeading {
  const _LeadingSelector();

  @override
  Size toolbarSizeFor(BuildContext context) =>
      CatchToolbarButton.sizeFor(context, label: 'City');

  @override
  Widget build(BuildContext context) => CatchToolbarButton.selector(
    label: 'City',
    semanticLabel: 'Choose city',
    tooltip: 'Choose city',
    icon: Icons.place_outlined,
    onPressed: () {},
  );
}
