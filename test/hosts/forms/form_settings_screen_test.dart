import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_logic.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/hosts/forms/form_settings_screen.dart';
import 'package:catch_dating_app/hosts/forms/host_form_payment_controller.dart';
import 'package:catch_dating_app/hosts/forms/host_forms_controller.dart';
import 'package:catch_l10n/generated/app_localizations.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('settings offer separate unchecked WhatsApp choices', (
    tester,
  ) async {
    await _pump(tester);
    final organizer = find.byWidgetPredicate(
      (w) => w is CatchField && w.title == 'Offer updates from this organizer',
    );
    final platform = find.byWidgetPredicate(
      (w) => w is CatchField && w.title == 'Offer updates from Catch',
    );
    expect(organizer, findsOneWidget);
    expect(platform, findsOneWidget);
    for (final field in [organizer, platform]) {
      expect(tester.widget<CatchField>(field).toggled, isFalse);
    }
    expect(
      find.textContaining('Applicants can choose either, both, or neither'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('every settings section is on the page', (tester) async {
    await _pump(tester);
    for (final title in [
      'Form title',
      'Who can respond',
      'No payment required',
      'Conditional logic',
    ]) {
      await ensureCentered(tester, find.text(title));
      expect(find.text(title), findsWidgets);
    }
    expect(
      find.textContaining(
        'Identity checks and contact creation do not grant messaging '
        'permission.',
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('a title edit saves into the draft when the field blurs', (
    tester,
  ) async {
    final controller = await _pump(tester);
    final title = find.descendant(
      of: find.byKey(const ValueKey('form-title-Saturday Social application')),
      matching: find.byType(EditableText),
    );
    await tester.enterText(title, '  Sunday Social application  ');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    FocusManager.instance.primaryFocus?.unfocus();
    await pumpFeatureUi(tester);
    expect(controller.metadataTitles, contains('Sunday Social application'));
  });

  testWidgets('publish review names consequences and runs publish', (
    tester,
  ) async {
    final controller = await _pump(tester);

    await tester.tap(find.text('Review & publish'));
    await pumpFeatureUi(tester);

    expect(find.text('Review before publishing'), findsOneWidget);
    expect(find.text('What publishing does'), findsOneWidget);
    expect(
      find.text('Verifies phone · Sends a record to application review'),
      findsOneWidget,
    );
    expect(find.text('Messaging permission'), findsOneWidget);

    final publish = find.byKey(const ValueKey('host-form-review-publish'));
    await tester.ensureVisible(publish);
    await pumpFeatureUi(tester);
    await tester.tap(publish);
    await pumpFeatureUi(tester);
    expect(controller.published, isTrue);
  });

  testWidgets('publish review labels incomplete legacy automation coverage', (
    tester,
  ) async {
    await _pump(tester, legacyConsequences: true);

    await tester.tap(find.text('Review & publish'));
    await pumpFeatureUi(tester);

    expect(
      find.text(
        'Verifies phone · Sends a record to application review · '
        'Automation consequences need review',
      ),
      findsOneWidget,
    );
  });

  testWidgets('the menu pauses a published form', (tester) async {
    final controller = await _pump(tester, published: true);

    await tester.tap(find.byIcon(CatchIcons.more));
    await pumpFeatureUi(tester);
    expect(find.text('Preview'), findsOneWidget);
    expect(find.text('Share form'), findsOneWidget);
    await tester.tap(find.text('Pause responses'));
    await pumpFeatureUi(tester);
    expect(controller.lifecycle, [HostFormLifecycleAction.pause]);
  });

  testWidgets('the menu archives a form', (tester) async {
    final controller = await _pump(tester);

    await tester.tap(find.byIcon(CatchIcons.more));
    await pumpFeatureUi(tester);
    expect(find.text('Share form'), findsNothing);
    expect(find.text('Pause responses'), findsNothing);
    await tester.tap(find.text('Archive form'));
    await pumpFeatureUi(tester);
    expect(controller.lifecycle, [HostFormLifecycleAction.archive]);
  });

  testWidgets('undo and redo step through this visit', (tester) async {
    final controller = await _pump(tester, withHistory: true);

    await tester.tap(find.byTooltip('Undo last edit'));
    await pumpFeatureUi(tester);
    expect(controller.undos, 1);
    await tester.tap(find.byKey(const ValueKey('host-form-settings-redo')));
    await pumpFeatureUi(tester);
    expect(controller.redos, 1);
  });

  testWidgets('a logic rule is added from the sheet and removed from its row', (
    tester,
  ) async {
    final controller = await _pump(tester);

    await ensureCentered(tester, find.text('Add rule'));
    await tester.tap(find.text('Add rule'));
    await pumpFeatureUi(tester);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('logic-value-question_1')),
        matching: find.byType(EditableText),
      ),
      'Asha',
    );
    await pumpFeatureUi(tester);
    final save = find.byKey(const ValueKey('host-form-logic-save'));
    await tester.ensureVisible(save);
    await pumpFeatureUi(tester);
    await tester.tap(save);
    await pumpFeatureUi(tester);
    expect(controller.logicRules, hasLength(1));
    expect(controller.logicRules.single.condition.questionId, 'question_1');

    final remove = find.byTooltip('Remove rule');
    await ensureCentered(tester, remove);
    await tester.tap(remove);
    await pumpFeatureUi(tester);
    expect(controller.logicRules, isEmpty);
  });

  testWidgets('settings fit at text scale 2', (tester) async {
    await _pump(tester, textScale: 2);
    expect(find.text('Form settings'), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}

Future<_Recorded> _pump(
  WidgetTester tester, {
  bool published = false,
  bool withHistory = false,
  bool legacyConsequences = false,
  double textScale = 1,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
  final summary = _summaryMap();
  if (legacyConsequences) {
    summary['consequences'] = <String, Object?>{
      'coverage': 'identityOnly',
      'identityPolicy': 'phoneVerified',
      'enabledAutomationActionKinds': <Object?>[],
    };
  }
  if (published) {
    summary
      ..['status'] = 'published'
      ..['activeVersionId'] = 'version_1'
      ..['publishedVersion'] = 1;
  }
  final recorded = _Recorded();
  final controller = _SettingsEditor(
    HostFormEditorState(
      canUndo: withHistory,
      canRedo: withHistory,
      editor: HostFormEditor(
        form: HostFormSummary.fromMap(summary),
        definition: HostFormDefinition.fromMap(_definitionMap()),
        validationIssues: const [],
      ),
    ),
    recorded,
  );
  final router = GoRouter(
    initialLocation: '/forms/form_1?view=settings',
    routes: [
      GoRoute(
        path: '/forms/:formId',
        name: Routes.hostFormBuilderScreen.name,
        builder: (context, routeState) => const HostFormSettingsScreen(
          organizerId: 'org_1',
          formId: 'form_1',
        ),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        hostFormPaymentControllerProvider(
          'org_1',
        ).overrideWith(_PaymentSetup.new),
        hostFormEditorControllerProvider(
          'org_1',
          'form_1',
        ).overrideWith(() => controller),
      ],
      child: MaterialApp.router(
        routerConfig: router,
        theme: AppTheme.light,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(textScale)),
          child: child!,
        ),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
      ),
    ),
  );
  await pumpFeatureUi(tester);
  return recorded;
}

/// The editor with its commands recorded instead of sent.
class _Recorded {
  final List<String> metadataTitles = [];
  final List<HostFormLifecycleAction> lifecycle = [];
  bool published = false;
  int undos = 0;
  int redos = 0;
  List<HostFormLogicRule> logicRules = const [];
}

class _SettingsEditor extends HostFormEditorController {
  _SettingsEditor(this._initialState, this._recorded);

  final HostFormEditorState _initialState;
  final _Recorded _recorded;

  @override
  bool editorBoundTo(String? accountId) => true;

  @override
  Future<HostFormEditorState> build(String organizerId, String formId) async =>
      _initialState;

  void _replace(HostFormDefinition definition) {
    final current = state.requireValue;
    state = AsyncData(
      current.copyWith(editor: current.editor.copyWith(definition: definition)),
    );
    _recorded.logicRules = definition.logicRules;
  }

  @override
  void updateMetadata({
    String? title,
    String? description,
    bool clearDescription = false,
    HostFormPurpose? purpose,
    HostFormIdentityPolicy? identityPolicy,
    String? completionTitle,
    String? completionMessage,
    bool clearCompletionMessage = false,
    HostFormCompletionAction? completionAction,
    String? completionActionLabel,
    bool clearCompletionActionLabel = false,
    String? completionActionUrl,
    bool clearCompletionActionUrl = false,
    HostFormAppearancePreset? appearancePreset,
    String? activityKind,
    bool clearActivityKind = false,
    DateTime? opensAt,
    bool setOpensAt = false,
    DateTime? closesAt,
    bool setClosesAt = false,
    int? responseLimit,
    bool setResponseLimit = false,
    String? closedMessage,
    bool clearClosedMessage = false,
    String? consentCopy,
    String? consentVersion,
    String? retentionCopy,
  }) {
    if (title != null) _recorded.metadataTitles.add(title);
  }

  @override
  void addLogicRule({
    required String questionId,
    required HostFormLogicOperator operator,
    required List<Object?> expectedValues,
    required HostFormLogicAction action,
    String? targetQuestionId,
    String? targetSectionId,
  }) => _replace(
    state.requireValue.editor.definition.addLogicRule(
      HostFormLogicRule.create(
        ruleId: 'rule_1',
        questionId: questionId,
        operator: operator,
        expectedValues: expectedValues,
        action: action,
        targetQuestionId: targetQuestionId,
        targetSectionId: targetSectionId,
      ),
    ),
  );

  @override
  void removeLogicRule(int index) =>
      _replace(state.requireValue.editor.definition.removeLogicRule(index));

  @override
  void undo() => _recorded.undos++;

  @override
  void redo() => _recorded.redos++;

  @override
  Future<bool> publish() async => _recorded.published = true;

  @override
  Future<bool> setLifecycle(HostFormLifecycleAction action) async {
    _recorded.lifecycle.add(action);
    return true;
  }
}

class _PaymentSetup extends HostFormPaymentController {
  @override
  Future<HostFormPaymentSetupState> build(String organizerId) async =>
      const HostFormPaymentSetupState(
        setup: HostFormPaymentSetup(available: false, connections: []),
      );
}

Map<String, Object?> _summaryMap() => {
  'organizerId': 'org_1',
  'formId': 'form_1',
  'title': 'Saturday Social application',
  'description': null,
  'purpose': 'application',
  'status': 'draft',
  'templateId': 'event_application',
  'publicFormId': 'public_1',
  'defaultTargetKind': 'organizer',
  'defaultTargetId': null,
  'activeVersionId': null,
  'draftRevision': 2,
  'publishedVersion': 0,
  'submittedResponseCount': 2,
  'consequences': {
    'coverage': 'exact',
    'identityPolicy': 'phoneVerified',
    'enabledAutomationActionKinds': <Object?>[],
  },
  'updatedAtMillis': 1,
  'publishedAtMillis': null,
  'lastResponseAtMillis': null,
};

Map<String, Object?> _question(String id, String key, String label) => {
  'questionId': id,
  'key': key,
  'label': label,
  'helpText': null,
  'kind': 'shortText',
  'required': true,
  'options': <Object?>[],
  'canonicalFieldId': null,
  'privacyClass': 'contact',
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

Map<String, Object?> _definitionMap() => {
  'schemaVersion': 1,
  'title': 'Saturday Social application',
  'description': 'Tell us a little about yourself.',
  'purpose': 'application',
  'identityPolicy': 'phoneVerified',
  'sections': [
    {
      'sectionId': 'section_1',
      'title': 'About you',
      'description': null,
      'pageBreak': false,
      'questions': [
        _question('question_1', 'full_name', 'Full name'),
        _question('question_2', 'city', 'City'),
      ],
    },
  ],
  'logicRules': <Object?>[],
  'appearance': {
    'preset': 'minimal',
    'logoAssetId': null,
    'coverAssetId': null,
    'activityKind': null,
  },
  'availability': {
    'opensAt': null,
    'closesAt': null,
    'responseLimit': null,
    'closedMessage': null,
  },
  'consent': {
    'consentCopy': 'I consent.',
    'consentVersion': 'v1',
    'retentionCopy': 'Retained for this form purpose.',
  },
  'completion': {
    'title': 'Thanks',
    'message': 'We will be in touch.',
    'actionKind': 'none',
    'actionLabel': null,
    'actionUrl': null,
  },
};
