import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_detail_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_review_detail.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final scale in [1.0, 2.0]) {
    testWidgets('optional note remains readable at text scale $scale', (
      tester,
    ) async {
      await _pumpDetail(
        tester,
        applicationStatus: HostApplicationReviewStatus.submitted,
        textScale: scale,
      );
      final field = find.byWidgetPredicate(
        (widget) =>
            widget is CatchField && widget.title == 'Private review note',
      );
      await tester.ensureVisible(field);
      await pumpFeatureUi(tester);
      final add = find.descendant(
        of: field,
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is RichText &&
              widget.text.toPlainText().contains('Add note'),
        ),
      );
      expect(add, findsOneWidget);
      final rendered = tester.renderObject<RenderParagraph>(add);
      expect(rendered.didExceedMaxLines, isFalse);
      expect(rendered.text.toPlainText(), contains('Optional'));
      expect(tester.takeException(), isNull);
    });
  }
  for (final status in ['submitted', 'refunded', 'reviewRequired']) {
    for (final dark in [false, true]) {
      for (final scale in [1.0, 2.0]) {
        final label = '$status-${dark ? 'dark' : 'light'}-$scale';
        testWidgets('response payment $label opens details', (tester) async {
          await _pumpDetail(
            tester,
            paymentStatus: status,
            theme: dark ? AppTheme.dark : AppTheme.light,
            textScale: scale,
          );
          final payment = find.byKey(const ValueKey('host-response-payment'));
          await tester.ensureVisible(payment);
          await pumpFeatureUi(tester);
          expect(tester.getSize(payment).height, greaterThanOrEqualTo(44));
          await _captureDetail(tester, 'response-$label');
          await tester.tap(payment);
          await pumpFeatureUi(tester);
          await pumpFeatureUiFor(tester, CatchMotion.slow);
          final sheet = tester.widget<HostFormPaymentDetailSheet>(
            find.byType(HostFormPaymentDetailSheet),
          );
          expect(sheet.payment.status.name, status);
          expect(sheet.payment.amountPaise, 10000);
          expect(sheet.onOpenResponse, isNull);
          expect(tester.takeException(), isNull);
          await _captureDetail(tester, 'payment-$label');
        });
      }
    }
  }

  test(
    'native response and application identities resolve the same detail',
    () async {
      final data = _detailMap()..['applicationId'] = 'app-1';
      final response = HostFormResponseDetail.fromCallableData(data);
      final container = ProviderContainer(
        overrides: [
          hostFormResponseDetailProvider(
            organizerId: 'org_1',
            responseId: 'response_1',
          ).overrideWith((_) async => response),
          hostApplicationDetailProvider(
            'org_1',
            'app-1',
          ).overrideWith((_) async => _application()),
        ],
      );
      addTearDown(container.dispose);
      final fromResponse = await container.read(
        hostResponseReviewDetailProvider((
          organizerId: 'org_1',
          responseId: 'response_1',
          applicationId: null,
        )).future,
      );
      final fromApplication = await container.read(
        hostResponseReviewDetailProvider((
          organizerId: 'org_1',
          responseId: null,
          applicationId: 'app-1',
        )).future,
      );
      expect(fromResponse.response, same(fromApplication.response));
      expect(
        fromResponse.application?.applicationId,
        fromApplication.application?.applicationId,
      );
      expect(fromResponse.canReview, isTrue);
      expect(fromResponse.canConvert, isTrue);
    },
  );

  test('revoked application never fetches the linked response', () async {
    var fetched = false;
    final container = ProviderContainer(
      overrides: [
        hostFormResponseDetailProvider(
          organizerId: 'org_1',
          responseId: 'response_1',
        ).overrideWith((_) async {
          fetched = true;
          return HostFormResponseDetail.fromCallableData(_detailMap());
        }),
        hostApplicationDetailProvider(
          'org_1',
          'app-1',
        ).overrideWith((_) async => _application(revoked: true)),
      ],
    );
    addTearDown(container.dispose);
    final detail = await container.read(
      hostResponseReviewDetailProvider((
        organizerId: 'org_1',
        responseId: null,
        applicationId: 'app-1',
      )).future,
    );
    expect(fetched, isFalse);
    expect(detail.response, isNull);
    expect(detail.canReview, isFalse);
    expect(detail.canConvert, isFalse);
  });

  test(
    'missing linked application fails closed rather than dropping review',
    () async {
      final data = _detailMap()..['applicationId'] = 'app-1';
      final container = ProviderContainer(
        overrides: [
          hostFormResponseDetailProvider(
            organizerId: 'org_1',
            responseId: 'response_1',
          ).overrideWith(
            (_) async => HostFormResponseDetail.fromCallableData(data),
          ),
          hostApplicationDetailProvider(
            'org_1',
            'app-1',
          ).overrideWith((_) async => throw StateError('unavailable')),
        ],
        retry: (_, _) => null,
      );
      addTearDown(container.dispose);
      await expectLater(
        container.read(
          hostResponseReviewDetailProvider((
            organizerId: 'org_1',
            responseId: 'response_1',
            applicationId: null,
          )).future,
        ),
        throwsStateError,
      );
    },
  );

  for (final status in [
    HostApplicationReviewStatus.submitted,
    HostApplicationReviewStatus.approved,
  ]) {
    testWidgets('response has one primary next action: ${status.name}', (
      tester,
    ) async {
      await _pumpDetail(tester, applicationStatus: status);
      expect(find.text('Propose attendee'), findsNothing);
      expect(find.text('Add to People'), findsNothing);
      expect(
        find.text(
          status == HostApplicationReviewStatus.approved
              ? 'Offer an event'
              : 'Accept and add to People',
        ),
        findsOneWidget,
      );
      final section = tester.widget<HostResponseDetailSection>(
        find.byType(HostResponseDetailSection),
      );
      expect(section.value.canChooseEvent, isTrue);
      expect(section.onChooseEvent, isNotNull);
      expect(
        section.value.canOfferEvent,
        status == HostApplicationReviewStatus.approved,
      );
      expect(find.text('Offer an event'), findsOneWidget);
      await _captureDetail(
        tester,
        'review-${status.name}',
        directoryEnv: 'CATCH_RSVP_FLOW_REVIEW_DIR',
      );
      await tester.ensureVisible(find.text('Submission details'));
      await pumpFeatureUi(tester);
      await _captureDetail(
        tester,
        'review-${status.name}-lower',
        directoryEnv: 'CATCH_RSVP_FLOW_REVIEW_DIR',
      );
      if (status == HostApplicationReviewStatus.submitted) {
        final noteField = find.byWidgetPredicate(
          (widget) =>
              widget is CatchField && widget.title == 'Private review note',
        );
        expect(find.text('Save review note'), findsNothing);
        await tester.ensureVisible(noteField);
        await tester.tap(noteField);
        await pumpFeatureUi(tester);
        expect(find.text('Save review note'), findsOneWidget);
        await tester.enterText(
          find.descendant(of: noteField, matching: find.byType(TextField)),
          'Discuss the preferred event date.',
        );
        await pumpFeatureUi(tester);
        await _captureDetail(
          tester,
          'review-note-editing',
          directoryEnv: 'CATCH_RSVP_FLOW_REVIEW_DIR',
        );
        await tester.ensureVisible(find.text('Cancel'));
        await tester.tap(find.text('Cancel'));
        await pumpFeatureUi(tester);
        expect(find.text('Save review note'), findsNothing);
        expect(find.text('Discuss the preferred event date.'), findsNothing);
      }
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('one flat detail keeps answers and opens full contact targets', (
    tester,
  ) async {
    final launched = <Uri>[];
    await _pumpDetail(tester, launched: launched);
    expect(find.byKey(const ValueKey('host-response-payment')), findsNothing);
    expect(find.text('Maya Kapoor'), findsOneWidget);
    expect(find.text('Saturday Social application'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('catch_bottom_action.floating_chrome')),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey('catch_bottom_action.page_action')),
      findsOneWidget,
    );
    expect(find.text('Review application'), findsNothing);
    expect(find.text('Why do you want to join?'), findsOneWidget);
    final call = find.widgetWithText(CatchButton, 'Call');
    final email = find.widgetWithText(CatchButton, 'Email');
    expect(tester.getSize(email).width, greaterThanOrEqualTo(44));
    expect(tester.getSize(call).height, greaterThanOrEqualTo(44));
    await tester.tapAt(tester.getTopLeft(call) + const Offset(6, 6));
    await pumpFeatureUi(tester);
    expect(launched.single, Uri(scheme: 'tel', path: '+919876543210'));
    final disclosure = find.text('Submission details');
    await tester.ensureVisible(disclosure);
    await tester.tap(disclosure);
    await pumpFeatureUi(tester);
    expect(find.text('Consent version'), findsOneWidget);
    expect(find.textContaining('Published version 1'), findsOneWidget);
  });

  testWidgets(
    'large text stacks contacts and keeps final content above action',
    (tester) async {
      await _pumpDetail(
        tester,
        theme: AppTheme.dark,
        textScale: 2,
        disableAnimations: true,
      );
      final call = find.widgetWithText(CatchButton, 'Call');
      final email = find.widgetWithText(CatchButton, 'Email');
      expect(
        tester.getBottomLeft(call).dy,
        lessThan(tester.getTopLeft(email).dy),
      );
      expect(
        find.byKey(const ValueKey('catch_bottom_action.floating_chrome')),
        findsNothing,
      );
      final action = find.byKey(
        const ValueKey('host-form-response-convert-crm-primary'),
      );
      final end = find.text('Start application review');
      await tester.ensureVisible(end);
      await pumpFeatureUi(tester);
      expect(
        tester.getBottomLeft(end).dy,
        lessThan(tester.getTopLeft(action).dy),
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'ordinary response has People action without application review',
    (tester) async {
      await _pumpDetail(tester, canApply: false);
      expect(find.text('Start application review'), findsNothing);
      expect(find.text('Add to People'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('withdrawn response keeps authorized answers without mutations', (
    tester,
  ) async {
    await _pumpDetail(tester, withdrawn: true);
    expect(
      find.byKey(const ValueKey('catch_bottom_action.page_action')),
      findsNothing,
    );
    expect(find.text('Add to People'), findsNothing);
    expect(find.text('Propose attendee'), findsNothing);
    expect(find.text('I love meeting new people in the city.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'Next after review removal loads the next filtered page, then Previous',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(900, 1100));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      const request = HostFormResponseListRequest(
        organizerId: 'org_1',
        formId: 'form_1',
        versionId: 'form_1_v2',
        includeApplications: true,
        answerFilters: {
          'city': {'Mumbai', 'Delhi'},
        },
      );
      final details = {
        for (final (id, name) in [
          ('response_a', 'Asha'),
          ('response_b', 'Bina'),
          ('response_c', 'Cara'),
        ])
          id: _queueDetail(id, name),
      };
      final queue = _ReviewQueueController(details);
      final router = GoRouter(
        routes: [
          GoRoute(
            path: '/',
            builder: (context, _) => Scaffold(
              body: TextButton(
                onPressed: () => context.pushNamed(
                  Routes.hostFormResponseDetailScreen.name,
                  pathParameters: {'responseId': 'response_b'},
                  queryParameters: {'organizerId': 'org_1'},
                  extra: const HostResponseReviewQueue(
                    request: request,
                    entryId: 'response:response_b',
                    index: 1,
                  ),
                ),
                child: const Text('Open review'),
              ),
            ),
          ),
          GoRoute(
            path: '/responses/:responseId',
            name: Routes.hostFormResponseDetailScreen.name,
            builder: (_, state) => HostFormResponseDetailScreen(
              organizerId: 'org_1',
              responseId: state.pathParameters['responseId']!,
              queue: state.extra as HostResponseReviewQueue?,
            ),
          ),
        ],
      );
      addTearDown(router.dispose);
      final container = ProviderContainer(
        overrides: [
          hostFormResponsesControllerProvider.overrideWith2((_) => queue),
          for (final entry in details.entries) ...[
            hostFormResponseDetailProvider(
              organizerId: 'org_1',
              responseId: entry.key,
            ).overrideWith((_) async => entry.value),
            hostFormResponseCanApplyProvider(
              organizerId: 'org_1',
              responseId: entry.key,
            ).overrideWith((_) => false),
          ],
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(
            theme: AppTheme.light,
            builder: (context, child) => RepaintBoundary(
              key: const ValueKey('response-payment-capture'),
              child: child!,
            ),
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            routerConfig: router,
          ),
        ),
      );
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Open review'));
      await pumpFeatureUi(tester);
      expect(find.text('Bina'), findsOneWidget);
      await _captureDetail(
        tester,
        'review-filtered-before',
        directoryEnv: 'CATCH_HOST_RESPONSE_REVIEW_DIR',
      );

      queue._reviewed = true;
      container.invalidate(hostFormResponsesControllerProvider(request));
      await pumpFeatureUi(tester);
      await tester.tap(find.widgetWithText(CatchButton, 'Next'));
      await pumpFeatureUi(tester);
      expect(queue._loadMoreCalls, 1);
      expect(find.text('Cara'), findsOneWidget);
      expect(queue._requests.every((value) => value == request), isTrue);
      await _captureDetail(
        tester,
        'review-filtered-next-page',
        directoryEnv: 'CATCH_HOST_RESPONSE_REVIEW_DIR',
      );
      await tester.tap(find.widgetWithText(CatchButton, 'Previous'));
      await pumpFeatureUi(tester);
      expect(find.text('Asha'), findsOneWidget);
      await _captureDetail(
        tester,
        'review-filtered-previous',
        directoryEnv: 'CATCH_HOST_RESPONSE_REVIEW_DIR',
      );
      expect(tester.takeException(), isNull);
    },
  );
}

HostFormResponseDetail _queueDetail(String id, String name) {
  final data = _detailMap();
  final response = Map<String, Object?>.from(
    data['response']! as Map<String, Object?>,
  );
  response['responseId'] = id;
  response['formId'] = 'form_1';
  response['versionId'] = 'form_1_v2';
  response['version'] = 2;
  response['identity'] = {
    'displayName': name,
    'email': null,
    'phoneE164': null,
    'origin': 'respondentGranted',
  };
  data['response'] = response;
  return HostFormResponseDetail.fromCallableData(data);
}

class _ReviewQueueController extends HostFormResponsesController {
  _ReviewQueueController(this._details);
  final Map<String, HostFormResponseDetail> _details;
  final List<HostFormResponseListRequest> _requests = [];
  bool _reviewed = false;
  int _loadMoreCalls = 0;

  List<HostFormInboxEntry> get _firstPage => [
    HostFormInboxEntry.fromResponse(_details['response_a']!.response),
    if (!_reviewed)
      HostFormInboxEntry.fromResponse(_details['response_b']!.response),
  ];

  @override
  Future<HostFormResponsesState> build(
    HostFormResponseListRequest request,
  ) async {
    _requests.add(request);
    return HostFormResponsesState(
      responses: const [],
      entries: _firstPage,
      nextCursor: 'next-page',
    );
  }

  @override
  Future<void> loadMore() async {
    _loadMoreCalls++;
    state = AsyncData(
      HostFormResponsesState(
        responses: const [],
        entries: [
          ..._firstPage,
          HostFormInboxEntry.fromResponse(_details['response_c']!.response),
        ],
        nextCursor: null,
      ),
    );
  }
}

Future<void> _pumpDetail(
  WidgetTester tester, {
  List<Uri>? launched,
  ThemeData? theme,
  double textScale = 1,
  bool disableAnimations = false,
  bool canApply = true,
  bool withdrawn = false,
  String? paymentStatus,
  HostApplicationReviewStatus? applicationStatus,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
  final data = _detailMap();
  if (applicationStatus != null) {
    data['applicationId'] = 'app-1';
    data['contactId'] =
        applicationStatus == HostApplicationReviewStatus.approved
        ? 'contact-one'
        : null;
  }
  if (paymentStatus != null) {
    data['payment'] = {
      'paymentId': 'fp_${'1' * 32}',
      'status': paymentStatus,
      'mode': 'test',
      'amountPaise': 10000,
      'currency': 'INR',
      'refundedAmountPaise': paymentStatus == 'refunded' ? 10000 : 0,
      'createdAtMillis': 1790110000000,
      'updatedAtMillis': 1790110060000,
      'capturedAtMillis': 1790110020000,
      'submittedAtMillis': 1790110030000,
      'responseId': 'response_1',
      'providerOrderId': 'order_demo',
      'providerPaymentId': 'pay_demo',
      'providerRefundId': null,
      'receipt': 'cfp_${'2' * 32}',
    };
  }
  if (withdrawn) {
    (data['response'] as Map<String, Object?>)['status'] = 'withdrawn';
  }
  final detail = HostFormResponseDetail.fromCallableData(data);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        if (applicationStatus != null)
          hostApplicationDetailProvider(
            'org_1',
            'app-1',
          ).overrideWith((_) => _application(status: applicationStatus)),
        hostFormResponseCanApplyProvider(
          organizerId: 'org_1',
          responseId: 'response_1',
        ).overrideWith((ref) => canApply),
        hostFormResponseDetailProvider(
          organizerId: 'org_1',
          responseId: 'response_1',
        ).overrideWith((ref) => detail),
        externalUrlLauncherProvider.overrideWithValue((
          uri, {
          mode = LaunchMode.platformDefault,
        }) async {
          launched?.add(uri);
          return true;
        }),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: theme ?? AppTheme.light,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(textScale),
            disableAnimations: disableAnimations,
          ),
          child: RepaintBoundary(
            key: const ValueKey('response-payment-capture'),
            child: child!,
          ),
        ),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const HostFormResponseDetailScreen(
          organizerId: 'org_1',
          responseId: 'response_1',
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
  await pumpFeatureUiFor(tester, CatchMotion.fast);
  await pumpFeatureUi(tester);
}

Map<String, Object?> _detailMap() => {
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
      'phoneE164': '+919876543210',
      'origin': 'respondentGranted',
    },
    'sourceLinkId': null,
    'sourceLabel': 'Instagram',
    'submittedAtMillis': DateTime(2026, 8, 20, 10, 42).millisecondsSinceEpoch,
    'withdrawnAtMillis': null,
    'highlights': <Object?>[],
    'conversionKinds': <Object?>[],
  },
  'answers': [
    {
      'questionId': 'question_1',
      'key': 'why_join',
      'label': 'Why do you want to join?',
      'kind': 'longText',
      'privacyClass': 'organizerCustom',
      'hostPresentation': 'detailOnly',
      'answer': 'I love meeting new people in the city.',
      'origin': 'respondentGranted',
      'assetDownloads': <Object?>[],
    },
    {
      'questionId': 'question_2',
      'key': 'anything_else',
      'label': 'Anything else we should know?',
      'kind': 'longText',
      'privacyClass': 'organizerCustom',
      'hostPresentation': 'detailOnly',
      'answer': 'I am visiting from Montreal.',
      'origin': 'respondentGranted',
      'assetDownloads': <Object?>[],
    },
  ],
  'consentVersion': 'v1',
  'completionMillis': 82000,
};

HostApplicationDetail _application({
  bool revoked = false,
  HostApplicationReviewStatus status = HostApplicationReviewStatus.submitted,
}) => HostApplicationDetail(
  organizerId: 'org_1',
  applicationId: 'app-1',
  formId: 'form_1',
  formVersionId: 'version_1',
  targetKind: 'organizer',
  targetId: null,
  applicantDisplayName: 'Maya Kapoor',
  reviewStatus: status,
  answers: const [],
  outreach: const HostApplicationOutreach(
    phoneE164: '+919876543210',
    email: 'maya@example.com',
    instagramUrl: null,
    linkedinUrl: null,
  ),
  contactId: status == HostApplicationReviewStatus.approved
      ? 'contact-one'
      : null,
  reviewNote: null,
  assignedReviewerUid: null,
  submittedAt: DateTime(2026, 8, 20),
  reviewedAt: null,
  revision: 1,
  sourceResponseId: 'response_1',
  dataAccessState: revoked
      ? 'revokedParticipantGrant'
      : 'submittedFormResponse',
);

Future<void> _captureDetail(
  WidgetTester tester,
  String name, {
  String directoryEnv = 'CATCH_RESPONSE_PAYMENT_REVIEW_DIR',
}) async {
  final directory = Platform.environment[directoryEnv];
  if (directory == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const ValueKey('response-payment-capture')),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    final file = File('$directory/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
  });
}
