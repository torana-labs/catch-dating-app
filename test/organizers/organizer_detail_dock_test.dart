import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_dock.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'OrganizerBellButton retains toggle and pending semantics over icon chrome',
    (tester) async {
      var taps = 0;

      Future<void> pumpBell({required bool active, required bool isLoading}) {
        return tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: Center(
                child: OrganizerBellButton(
                  active: active,
                  accent: Colors.deepOrange,
                  isLoading: isLoading,
                  onPressed: () => taps++,
                ),
              ),
            ),
          ),
        );
      }

      await pumpBell(active: true, isLoading: false);

      Semantics toggleSemantics() => tester.widget<Semantics>(
        find.byWidgetPredicate(
          (widget) => widget is Semantics && widget.properties.toggled != null,
        ),
      );

      expect(find.byType(CatchIconAction), findsOneWidget);
      expect(
        tester.getSize(find.byType(CatchIconAction)).shortestSide,
        greaterThanOrEqualTo(CatchIconAction.defaultSize),
      );
      expect(toggleSemantics().properties.button, isTrue);
      expect(toggleSemantics().properties.toggled, isTrue);
      expect(toggleSemantics().properties.enabled, isTrue);

      await tester.tap(find.byType(CatchIconAction));
      await tester.pump();
      expect(taps, 1);

      await pumpBell(active: true, isLoading: true);

      expect(toggleSemantics().properties.toggled, isTrue);
      expect(toggleSemantics().properties.enabled, isFalse);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      expect(
        tester.widget<CatchIconAction>(find.byType(CatchIconAction)).onPressed,
        isNull,
      );
      await tester.pump();
      expect(taps, 1);

      await pumpBell(active: false, isLoading: false);
      expect(toggleSemantics().properties.toggled, isFalse);
      expect(toggleSemantics().properties.enabled, isTrue);
    },
  );
}
