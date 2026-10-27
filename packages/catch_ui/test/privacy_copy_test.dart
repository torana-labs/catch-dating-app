import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const copy = CatchPrivacyBadgeCopy(
    privateToYouLabel: 'Privé pour vous',
    hostCanSeeLabel: 'Visible à l’hôte',
    catchPrivateLabel: 'Privé pour Catch',
  );
  for (final scale in [1.0, 2.0]) {
    for (final (kind, label, icon) in [
      (
        CatchPrivacyBadgeVariant.privateToYou,
        copy.privateToYouLabel,
        CatchIcons.locked,
      ),
      (
        CatchPrivacyBadgeVariant.hostCanSee,
        copy.hostCanSeeLabel,
        CatchIcons.show,
      ),
      (
        CatchPrivacyBadgeVariant.catchPrivate,
        copy.catchPrivateLabel,
        CatchIcons.safety,
      ),
    ]) {
      testWidgets('caller copy stays paired with $kind at scale $scale', (
        tester,
      ) async {
        final semantics = tester.ensureSemantics();
        try {
          await tester.pumpWidget(
            MaterialApp(
              theme: CatchTheme.light,
              home: Scaffold(
                body: MediaQuery(
                  data: MediaQueryData(textScaler: TextScaler.linear(scale)),
                  child: CatchPrivacyBadge(copy: copy, variant: kind),
                ),
              ),
            ),
          );
          expect(find.text(label.toUpperCase()), findsOneWidget);
          expect(find.byIcon(icon), findsOneWidget);
          expect(
            tester.getSemantics(find.byType(CatchPrivacyBadge)).label,
            label,
          );
          expect(tester.takeException(), isNull);
        } finally {
          semantics.dispose();
        }
      });
    }
  }
}
