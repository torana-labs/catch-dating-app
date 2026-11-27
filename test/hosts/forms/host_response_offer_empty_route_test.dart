import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/hosts/forms/offer_screen.dart';
import 'package:catch_l10n/generated/app_localizations_en.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:firebase_auth_mocks/firebase_auth_mocks.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('the query offer opened without its query says offers are not '
      'available and keeps Close', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('manager')),
          firebaseAuthProvider.overrideWithValue(
            MockFirebaseAuth(
              signedIn: true,
              mockUser: MockUser(uid: 'manager'),
            ),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const HostOfferScreen.query(
            organizerId: 'org',
            formId: 'form',
            query: null,
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    expect(
      find.text(AppLocalizationsEn().hostFormsOfferUnavailable),
      findsOneWidget,
    );
    expect(find.byTooltip(AppLocalizationsEn().hostFormsClose), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
