import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_review_detail.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

void main() {
  final l10n = AppLocalizationsEn();

  test('whatsapp handoff builds a wa.me link only for a valid E.164 phone', () {
    final uri = hostResponseWhatsappUri(
      value: ' +919876543210 ',
      displayName: 'Maya Kapoor',
      l10n: l10n,
    );
    expect(uri?.scheme, 'https');
    expect(uri?.host, 'wa.me');
    expect(uri?.path, '/919876543210');
    expect(uri?.queryParameters['text'], 'Hi Maya Kapoor,');
    expect(
      hostResponseWhatsappUri(
        value: '+919876543210',
        displayName: null,
        l10n: l10n,
      )?.queryParameters,
      isEmpty,
    );
    expect(
      hostResponseWhatsappUri(
        value: '+919876543210',
        displayName: '  ',
        l10n: l10n,
      )?.queryParameters,
      isEmpty,
    );
    for (final bad in [
      null,
      '',
      '91 98765 43210',
      'tel:+919876543210',
      '+1234',
    ]) {
      expect(
        hostResponseWhatsappUri(value: bad, displayName: 'Maya', l10n: l10n),
        isNull,
        reason: bad ?? 'null',
      );
    }
  });

  testWidgets('response contact row opens a prefilled WhatsApp handoff', (
    tester,
  ) async {
    final opened = <Uri>[];
    await _pumpSection(tester, phoneE164: '+919876543210', opened: opened);
    final whatsapp = find.widgetWithText(CatchButton, 'WhatsApp');
    expect(whatsapp, findsOneWidget);
    await tester.tap(whatsapp);
    await pumpFeatureUi(tester);
    expect(opened.single.scheme, 'https');
    expect(opened.single.host, 'wa.me');
    expect(opened.single.path, '/919876543210');
    expect(opened.single.queryParameters['text'], 'Hi Maya Kapoor,');
    expect(tester.takeException(), isNull);
  });

  testWidgets('response contact row hides WhatsApp without a valid phone', (
    tester,
  ) async {
    await _pumpSection(tester, phoneE164: 'not-a-phone');
    expect(find.widgetWithText(CatchButton, 'WhatsApp'), findsNothing);
    expect(find.widgetWithText(CatchButton, 'Email'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

Future<void> _pumpSection(
  WidgetTester tester, {
  String? phoneE164,
  List<Uri>? opened,
}) async {
  final detail = HostFormResponseDetail.fromCallableData(
    _detailMap(phoneE164: phoneE164),
  );
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: HostResponseContactSection(
          value: HostResponseReviewDetail(response: detail),
          onContact: (uri) async => opened?.add(uri),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

Map<String, Object?> _detailMap({String? phoneE164}) => {
  'response': {
    'responseId': 'response_1',
    'formId': 'form_1',
    'formTitle': 'Saturday Social application',
    'versionId': 'version_1',
    'version': 1,
    'status': 'submitted',
    'identityKind': 'phoneVerified',
    'identity': {
      'displayName': 'Maya Kapoor',
      'email': 'maya@example.com',
      'phoneE164': phoneE164,
      'origin': 'respondentGranted',
    },
    'sourceLinkId': null,
    'sourceLabel': 'Instagram',
    'submittedAtMillis': DateTime(2026, 8, 20, 10, 42).millisecondsSinceEpoch,
    'withdrawnAtMillis': null,
    'highlights': <Object?>[],
    'conversionKinds': <Object?>[],
  },
  'answers': <Object?>[],
  'consentVersion': 'v1',
  'completionMillis': 82000,
};
