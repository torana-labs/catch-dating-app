import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_editor.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_builder_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_workspace_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../test_pump_helpers.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('settings offer separate unchecked WhatsApp choices', (
    tester,
  ) async {
    await _pumpBuilder(tester, initialView: HostFormWorkspaceView.settings);
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

  testWidgets('compact builder leads with questions instead of raw settings', (
    tester,
  ) async {
    await _pumpBuilder(tester);

    expect(find.text('Overview'), findsOneWidget);
    expect(find.text('Responses'), findsOneWidget);
    expect(find.text('Draft'), findsOneWidget);
    expect(find.text('Questions'), findsWidgets);
    expect(find.text('What do you need to know?'), findsNothing);
    expect(
      find.text('Choose the questions that will help you decide who to call.'),
      findsNothing,
    );
    expect(
      find.textContaining('Full name', findRichText: true),
      findsOneWidget,
    );
    expect(
      find.textContaining('Short text · Required', findRichText: true),
      findsOneWidget,
    );
    expect(find.text('Add question'), findsOneWidget);
    expect(find.text('Reorder questions'), findsNothing);
    expect(find.byIcon(Icons.drag_indicator_rounded), findsNWidgets(2));
    expect(find.text('Form settings'), findsOneWidget);
    expect(find.text('2 questions · Ready to publish?'), findsOneWidget);
    expect(find.text('Review & publish'), findsOneWidget);
    expect(find.text('Continue to settings'), findsNothing);
    expect(find.text('Continue to publish'), findsNothing);
    expect(find.text('Form title'), findsNothing);
    final topBar = find.byType(CatchTopBar);
    final titleFinder = find.descendant(
      of: topBar,
      matching: find.text('Form'),
    );
    final titleContext = tester.element(titleFinder);
    expect(
      tester.widget<Text>(titleFinder).style,
      CatchTextStyles.titleL(
        titleContext,
        color: CatchTokens.of(titleContext).ink,
      ),
    );
    final topBarButtons = find.descendant(
      of: topBar,
      matching: find.byType(CatchIconAction),
    );
    expect(topBarButtons, findsNWidgets(3));
    expect(
      tester
          .widgetList<CatchIconAction>(topBarButtons)
          .map((button) => button.variant),
      everyElement(CatchIconActionVariant.bordered),
    );
    expect(
      find.descendant(
        of: topBar,
        matching: find.byIcon(CatchIcons.arrowBackIosNewRounded),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: topBar,
        matching: find.byIcon(CatchIcons.visibilityOutlined),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: topBar,
        matching: find.byIcon(CatchIcons.moreHorizRounded),
      ),
      findsOneWidget,
    );
    expect(
      tester
          .widget<CatchDock>(
            find.byWidgetPredicate(
              (widget) =>
                  widget is CatchDock &&
                  widget.variant == CatchDockVariant.primary,
            ),
          )
          .buttonMode,
      CatchButtonMode.rounded,
    );
  });

  testWidgets(
    'tablet builder keeps three panes and publish in the command bar',
    (tester) async {
      await _pumpBuilder(tester, size: const Size(1024, 1366));

      expect(find.text('Outline'), findsOneWidget);
      expect(find.text('SECTION 1'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is CatchDock && widget.variant == CatchDockVariant.primary,
        ),
        findsNothing,
      );
      final publishAction = find.byType(CatchTopBarPrimaryButton);
      expect(publishAction, findsOneWidget);
      expect(
        tester.widget<CatchTopBarPrimaryButton>(publishAction).label,
        'Review & publish',
      );

      await tester.tap(find.byIcon(CatchIcons.moreHorizRounded));
      await pumpFeatureUi(tester);
      expect(find.text('Preview'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'question editor stays focused and settings remain directly reachable',
    (tester) async {
      await _pumpBuilder(tester);

      final fullNameRowLabel = find
          .descendant(
            of: find.byKey(const ValueKey('form-question-question_1')),
            matching: find.textContaining('Full name', findRichText: true),
          )
          .first;
      await ensureCentered(tester, fullNameRowLabel);
      await tester.tap(fullNameRowLabel);
      await pumpFeatureUi(tester);

      expect(
        find.byKey(const ValueKey('form-question-question_1-editor')),
        findsOneWidget,
      );
      expect(find.text('Edit question'), findsNothing);
      expect(find.text('Question'), findsOneWidget);
      expect(find.text('Answer type'), findsOneWidget);
      expect(find.text('Response required'), findsOneWidget);
      expect(find.text('Advanced settings'), findsOneWidget);
      expect(find.text('Data classification'), findsNothing);

      expect(find.text('Person field'), findsOneWidget);
      expect(find.text('Profile use'), findsOneWidget);
      expect(find.text('Organizer only'), findsOneWidget);
      await ensureCentered(tester, find.text('Advanced settings'));
      await tester.tap(find.text('Advanced settings'));
      await pumpFeatureUi(tester);

      expect(find.text('Data classification'), findsOneWidget);
      expect(find.text('Prefill behavior'), findsOneWidget);
      expect(find.text('Host response view'), findsOneWidget);

      await ensureCentered(tester, fullNameRowLabel);
      await tester.tap(fullNameRowLabel);
      await pumpFeatureUi(tester);

      expect(
        find.byKey(const ValueKey('form-question-question_1-editor')),
        findsNothing,
      );

      await ensureCentered(tester, find.text('Form settings'));
      await tester.tap(find.text('Form settings'));
      await pumpFeatureUi(tester);

      expect(find.text('Form settings'), findsWidgets);
      expect(find.text('Form title'), findsOneWidget);
      expect(find.text('Who can respond'), findsWidgets);
      expect(find.text('Identity consequence'), findsOneWidget);
      expect(find.textContaining('Verifies phone'), findsOneWidget);
      expect(
        find.textContaining(
          'Identity checks and contact creation do not grant messaging permission.',
        ),
        findsOneWidget,
      );
    },
  );

  testWidgets('publish review names cross-workspace consequences and limits', (
    tester,
  ) async {
    await _pumpBuilder(tester);

    await tester.tap(find.text('Review & publish'));
    await pumpFeatureUi(tester);

    expect(find.text('Review before publishing'), findsOneWidget);
    expect(find.text('What publishing does'), findsOneWidget);
    expect(
      find.text('Verifies phone · Sends a record to application review'),
      findsOneWidget,
    );
    expect(find.text('Messaging permission'), findsOneWidget);
    expect(
      find.text(
        'Identity checks and contact creation do not grant messaging permission.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('publish review labels incomplete legacy automation coverage', (
    tester,
  ) async {
    await _pumpBuilder(tester, legacyConsequences: true);

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

  testWidgets('opening a question closes the previously expanded editor', (
    tester,
  ) async {
    await _pumpBuilder(tester);

    await tester.tap(find.textContaining('Full name', findRichText: true));
    await pumpFeatureUi(tester);
    expect(
      find.byKey(const ValueKey('form-question-question_1-editor')),
      findsOneWidget,
    );

    final phoneNumberRowLabel = find.descendant(
      of: find.byKey(const ValueKey('form-question-question_2')),
      matching: find.text('Phone number'),
    );
    await ensureCentered(tester, phoneNumberRowLabel);
    await tester.tap(phoneNumberRowLabel);
    await pumpFeatureUi(tester);

    expect(
      find.byKey(const ValueKey('form-question-question_1-editor')),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey('form-question-question_2-editor')),
      findsOneWidget,
    );
  });

  testWidgets('single page summarizes readiness and keeps preview explicit', (
    tester,
  ) async {
    await _pumpBuilder(tester);

    expect(find.text('2 questions · Ready to publish?'), findsOneWidget);
    expect(find.byTooltip('Preview'), findsOneWidget);
    expect(find.text('Review & publish'), findsOneWidget);
  });

  testWidgets('inline drag handle changes the persisted question order', (
    tester,
  ) async {
    await _pumpBuilder(tester);

    final reorderList = tester.widget<ReorderableListView>(
      find.byType(ReorderableListView),
    );
    reorderList.onReorderItem!(0, 2);
    await tester.pump();

    final phoneRow = find.descendant(
      of: find.byKey(const ValueKey('form-question-question_2')),
      matching: find.text('Phone number'),
    );
    final nameRow = find.descendant(
      of: find.byKey(const ValueKey('form-question-question_1')),
      matching: find.textContaining('Full name', findRichText: true),
    );
    expect(
      tester.getTopLeft(phoneRow).dy,
      lessThan(tester.getTopLeft(nameRow).dy),
    );
    expect(
      tester
          .getCenter(
            find.byKey(const ValueKey('form-question-question_2-drag')),
          )
          .dx,
      lessThan(tester.getTopLeft(phoneRow).dx),
    );
    expect(
      tester
          .getCenter(
            find.byKey(const ValueKey('form-question-question_2-drag')),
          )
          .dy,
      inInclusiveRange(
        tester.getTopLeft(phoneRow).dy,
        tester
            .getBottomLeft(
              find.descendant(
                of: find.byKey(const ValueKey('form-question-question_2')),
                matching: find.text('Phone number · Required'),
              ),
            )
            .dy,
      ),
    );
  });

  for (final size in [const Size(390, 844), const Size(1200, 1000)]) {
    testWidgets('Published form shares its workspace navigation at $size', (
      tester,
    ) async {
      await _pumpBuilder(
        tester,
        published: true,
        withHistory: true,
        size: size,
      );
      expect(
        find.byKey(const ValueKey('host-form-builder-overview')),
        findsOneWidget,
      );
      expect(find.text('Saturday Social application'), findsOneWidget);
      expect(find.text('Maya Kapoor'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('host-form-builder-tabs')),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is CatchMetricTile && widget.item == null,
        ),
        findsNWidgets(2),
      );
      final questions = find.descendant(
        of: find.byKey(const ValueKey('host-form-builder-tabs')),
        matching: find.text('Questions'),
      );
      await tester.tap(questions);
      await pumpFeatureUi(tester);
      expect(find.byTooltip('Undo last edit'), findsOneWidget);
      expect(find.byTooltip('Redo edit'), findsOneWidget);
      expect(
        find.textContaining('Full name', findRichText: true),
        findsWidgets,
      );
      expect(
        find.byKey(const ValueKey('host-form-builder-tabs')),
        findsOneWidget,
      );
      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey('host-form-builder-tabs')),
          matching: find.text('Responses'),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Maya Kapoor'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('Form overview reflows at large text in dark mode', (
    tester,
  ) async {
    await _pumpBuilder(
      tester,
      published: true,
      textScale: 2,
      disableAnimations: true,
      theme: AppTheme.dark,
    );
    final title = find.byKey(const ValueKey('host-form-command-center-title'));
    expect(tester.widget<CatchText>(title).maxLines, isNull);
    expect(
      find.byKey(const ValueKey('host_form_metrics.reflow')),
      findsOneWidget,
    );
    final metricCells = find.byWidgetPredicate(
      (widget) => widget is CatchMetricTile && widget.item == null,
    );
    expect(metricCells, findsNWidgets(2));
    expect(
      tester.getCenter(metricCells.at(0)).dy,
      lessThan(tester.getCenter(metricCells.at(1)).dy),
    );
    expect(
      tester.getSize(find.widgetWithText(CatchButton, 'Share form')).height,
      greaterThan(CatchSpacing.s12),
    );
    expect(tester.takeException(), isNull);
  });
}

Future<void> _pumpBuilder(
  WidgetTester tester, {
  HostFormWorkspaceView? initialView,
  bool published = false,
  bool withHistory = false,
  bool legacyConsequences = false,
  double textScale = 1,
  bool disableAnimations = false,
  ThemeData? theme,
  Size size = const Size(390, 844),
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = size;
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
      ..['publishedVersion'] = 1
      ..['submittedResponseCount'] = 12
      ..['publishedAtMillis'] = DateTime(2026, 8, 20).millisecondsSinceEpoch
      ..['lastResponseAtMillis'] = DateTime(
        2026,
        8,
        20,
        10,
        42,
      ).millisecondsSinceEpoch;
  }
  final state = HostFormEditorState(
    canUndo: withHistory,
    canRedo: withHistory,
    editor: HostFormEditor(
      form: HostFormSummary.fromMap(summary),
      definition: HostFormDefinition.fromMap(_definitionMap()),
      validationIssues: const [],
    ),
  );
  final router = GoRouter(
    initialLocation:
        '/forms/form_1${initialView == null ? '' : '?view=${initialView.name}'}',
    routes: [
      GoRoute(
        path: '/forms/:formId',
        name: Routes.hostFormBuilderScreen.name,
        builder: (context, routeState) => HostFormBuilderScreen(
          organizerId: 'org_1',
          formId: 'form_1',
          initialView: hostFormViewFromQuery(
            routeState.uri.queryParameters['view'],
          ),
        ),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        if (published) ...[
          firebaseAuthProvider.overrideWithValue(_BuilderTestAuth()),
          uidProvider.overrideWithValue(
            const AsyncData<String?>('builder-host'),
          ),
        ],
        hostFormPaymentControllerProvider(
          'org_1',
        ).overrideWith(_PaymentSetup.new),
        hostFormEditorControllerProvider(
          'org_1',
          'form_1',
        ).overrideWith(() => _FakeHostFormEditorController(state)),
        if (published)
          hostFormResponsesControllerProvider.overrideWith2(
            (_) => _FakeHostFormResponsesController(),
          ),
      ],
      child: MaterialApp.router(
        routerConfig: router,
        theme: theme ?? AppTheme.light,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(textScale),
            disableAnimations: disableAnimations,
          ),
          child: child!,
        ),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

class _FakeHostFormResponsesController extends HostFormResponsesController {
  @override
  Future<HostFormResponsesState> build(
    HostFormResponseListRequest request,
  ) async => HostFormResponsesState(
    responses: [HostFormResponseSummary.fromMap(_responseSummaryMap())],
    nextCursor: null,
  );
}

class _BuilderTestAuth extends Fake implements FirebaseAuth {
  @override
  User? get currentUser => _BuilderTestUser();
}

class _BuilderTestUser extends Fake implements User {
  @override
  String get uid => 'builder-host';
}

class _FakeHostFormEditorController extends HostFormEditorController {
  _FakeHostFormEditorController(this.initialState);

  final HostFormEditorState initialState;

  @override
  bool editorBoundTo(String? accountId) => true;

  @override
  Future<HostFormEditorState> build(String organizerId, String formId) async =>
      initialState;

  @override
  void moveQuestion(int sectionIndex, int questionIndex, int delta) {
    final current = state.requireValue;
    final currentSection = current.editor.definition.sections[sectionIndex];
    final target = (questionIndex + delta)
        .clamp(0, currentSection.questions.length - 1)
        .toInt();
    final definition = current.editor.definition.replaceSection(
      sectionIndex,
      currentSection.moveQuestion(questionIndex, target),
    );
    state = AsyncData(
      current.copyWith(editor: current.editor.copyWith(definition: definition)),
    );
  }
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

Map<String, Object?> _responseSummaryMap() => {
  'responseId': 'response_1',
  'formId': 'form_1',
  'formTitle': 'Saturday Social application',
  'versionId': 'version_1',
  'version': 1,
  'status': 'submitted',
  'identityKind': 'phoneVerified',
  'identity': {
    'displayName': 'Maya Kapoor',
    'email': null,
    'phoneE164': '+919876543210',
    'origin': 'respondentGranted',
  },
  'sourceLinkId': null,
  'sourceLabel': 'Instagram',
  'submittedAtMillis': DateTime(2026, 8, 20, 10, 42).millisecondsSinceEpoch,
  'withdrawnAtMillis': null,
  'highlights': <Object?>[],
  'conversionKinds': <Object?>[],
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
        {
          'questionId': 'question_1',
          'key': 'full_name',
          'label': 'Full name',
          'helpText': null,
          'kind': 'shortText',
          'required': true,
          'options': <Object?>[],
          'canonicalFieldId': 'fullName',
          'privacyClass': 'contact',
          'prefillPolicy': 'never',
          'hostPresentation': 'detailOnly',
          'validation': _validationMap(),
        },
        {
          'questionId': 'question_2',
          'key': 'phone_number',
          'label': 'Phone number',
          'helpText': null,
          'kind': 'phone',
          'required': true,
          'options': <Object?>[],
          'canonicalFieldId': 'phoneNumber',
          'privacyClass': 'contact',
          'prefillPolicy': 'never',
          'hostPresentation': 'detailOnly',
          'validation': _validationMap(),
        },
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

Map<String, Object?> _validationMap() => {
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
};

class _PaymentSetup extends HostFormPaymentController {
  @override
  Future<HostFormPaymentSetupState> build(String organizerId) async =>
      const HostFormPaymentSetupState(
        setup: HostFormPaymentSetup(available: false, connections: []),
      );
}
