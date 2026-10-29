import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_workspace_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_offer_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

void main() {
  testWidgets('query route without selection keeps explicit Back navigation', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const HostResponseOfferScreen.query(organizerId: 'org'),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.byTooltip('Back'), findsOneWidget);
    expect(find.byType(HostEventOfferWorkspaceSection), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
