import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/hosts/forms/form_preview_body.dart';
import 'package:catch_l10n/generated/app_localizations.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('the preview draws every question and records nothing', (
    tester,
  ) async {
    await _pump(tester, _definition());

    expect(find.text('Saturday Social application'), findsOneWidget);
    expect(find.text('Tell us a little about yourself.'), findsOneWidget);
    expect(find.text('About you'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('host-form-preview-question-name')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('host-form-preview-question-pace')),
      findsOneWidget,
    );
    final send = tester.widget<CatchButton>(
      find.widgetWithText(CatchButton, 'Preview only'),
    );
    expect(send.onPressed, isNull);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a routing rule in the preview skips the section it names', (
    tester,
  ) async {
    await _pump(tester, _definition(routeToLast: true));

    expect(find.text('Running'), findsOneWidget);
    final pace = find.byKey(const ValueKey('host-form-preview-question-pace'));
    await ensureCentered(tester, pace);
    await tester.tap(pace);
    await pumpFeatureUi(tester);
    final walk = find.textContaining('Walk', findRichText: true);
    await ensureCentered(tester, walk);
    await tester.tap(walk);
    await pumpFeatureUi(tester);
    expect(find.text('Running'), findsNothing);
    expect(find.text('Last bits'), findsOneWidget);
  });
}

Future<void> _pump(WidgetTester tester, HostFormDefinition definition) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        child: CatchScreen(body: HostFormPreviewBody(definition: definition)),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

Map<String, Object?> _question(
  String id,
  String kind,
  String label, {
  List<Map<String, Object?>> options = const [],
}) => {
  'questionId': id,
  'key': id,
  'label': label,
  'helpText': null,
  'kind': kind,
  'required': false,
  'options': options,
  'canonicalFieldId': null,
  'privacyClass': 'organizerCustom',
  'prefillPolicy': 'never',
  'hostPresentation': 'detailOnly',
  'validation': {
    'minLength': null,
    'maxLength': null,
    'minNumber': null,
    'maxNumber': null,
    'earliestDate': null,
    'latestDate': null,
    'minSelections': null,
    'maxSelections': null,
    'maxFileCount': null,
    'maxFileSizeBytes': null,
    'allowedMimeTypes': <Object?>[],
    'patternPreset': null,
    'customError': null,
  },
};

Map<String, Object?> _section(
  String id,
  String title,
  List<Map<String, Object?>> questions,
) => {
  'sectionId': id,
  'title': title,
  'description': null,
  'pageBreak': false,
  'questions': questions,
};

HostFormDefinition _definition({bool routeToLast = false}) =>
    HostFormDefinition.fromMap({
      'schemaVersion': 1,
      'title': 'Saturday Social application',
      'description': 'Tell us a little about yourself.',
      'purpose': 'application',
      'identityPolicy': 'phoneVerified',
      'sections': [
        _section('about', 'About you', [
          _question('name', 'shortText', 'Full name'),
          _question(
            'pace',
            'singleChoice',
            'How do you like to move?',
            options: [
              {'optionId': 'pace_run', 'value': 'run', 'label': 'Run'},
              {'optionId': 'pace_walk', 'value': 'walk', 'label': 'Walk'},
            ],
          ),
        ]),
        _section('running', 'Running', [
          _question('distance', 'number', 'Usual distance'),
        ]),
        _section('last', 'Last bits', [
          _question('notes', 'longText', 'Anything else?'),
        ]),
      ],
      'logicRules': [
        if (routeToLast)
          {
            'ruleId': 'rule_1',
            'conditionMode': 'all',
            'conditions': [
              {
                'questionId': 'pace',
                'operator': 'equals',
                'expectedValues': ['walk'],
              },
            ],
            'action': 'routeToSection',
            'targetQuestionId': null,
            'targetSectionId': 'last',
          },
      ],
      'appearance': const {
        'preset': 'minimal',
        'logoAssetId': null,
        'coverAssetId': null,
        'activityKind': null,
      },
      'availability': const {
        'opensAt': null,
        'closesAt': null,
        'responseLimit': null,
        'closedMessage': null,
      },
      'consent': const {
        'consentCopy': 'I consent.',
        'consentVersion': 'v1',
        'retentionCopy': 'Retained for this form purpose.',
      },
      'completion': const {
        'title': 'Thanks',
        'message': null,
        'actionKind': 'none',
        'actionLabel': null,
        'actionUrl': null,
      },
    });
