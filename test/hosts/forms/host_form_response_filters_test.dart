import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_responses_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';
import 'support/response_filter_fixtures.dart';

void main() {
  if (Platform.environment.containsKey('CATCH_HOST_RESPONSE_REVIEW_DIR')) {
    setUpAll(loadCatchTestFonts);
  }

  testWidgets(
    'published version is selected and switching clears answer filters',
    (tester) async {
      final requests = <HostFormResponseListRequest>[];
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            hostFormResponsesControllerProvider.overrideWith2(
              (_) => _VersionedResponses(requests),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const Scaffold(
              body: CustomScrollView(
                slivers: [
                  HostFormResponsesSection(
                    organizerId: 'org',
                    formId: 'form',
                    showFormContext: false,
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(requests.last.versionId, 'form_v2');
      expect(find.text('Published version 2'), findsWidgets);
      await tester.tap(find.text('Filters'));
      await pumpFeatureUi(tester);
      final city = find.byKey(const ValueKey('response-filter-city-Mumbai'));
      await tester.ensureVisible(city);
      await tester.tap(city);
      await pumpFeatureUi(tester);
      expect(requests.last.answerFilters['city'], {'Mumbai'});
      final firstVersion = find.byKey(
        const ValueKey('response-version-form_v1'),
      );
      await tester.ensureVisible(firstVersion);
      await tester.tap(firstVersion);
      await pumpFeatureUi(tester);
      expect(requests.last.versionId, 'form_v1');
      expect(requests.last.answerFilters, isEmpty);
      await tester.tap(find.text('Reset all'));
      await pumpFeatureUi(tester);
      expect(requests.last.versionId, 'form_v2');
      final allVersions = find.byKey(const ValueKey('response-version-'));
      await tester.ensureVisible(allVersions);
      await tester.tap(allVersions);
      await pumpFeatureUi(tester);
      expect(requests.last.versionId, isNull);
      expect(requests.last.answerFilters, isEmpty);
      await tester.tap(find.text('Reset all'));
      await pumpFeatureUi(tester);
      expect(requests.last.versionId, 'form_v2');
    },
  );
  testWidgets(
    'city filters remain available during loading and empty scan pages',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 844);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final requests = <HostFormResponseListRequest>[];
      final pending = Completer<HostFormResponsesState>();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            hostFormResponsesControllerProvider.overrideWith2(
              (_) => _Responses(requests, pending),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            builder: (context, child) => RepaintBoundary(
              key: const ValueKey('response-filters-capture'),
              child: child!,
            ),
            home: const Scaffold(
              body: CustomScrollView(
                slivers: [
                  HostFormResponsesSection(
                    organizerId: 'org',
                    formId: 'form',
                    showFormContext: false,
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Filters'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Mumbai'));
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 400));
      await tester.tap(find.text('Dubai'));
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 400));
      expect(requests.last.answerFilters, {
        'city': {'Mumbai', 'Dubai'},
      });
      expect(find.byType(CatchSelectionSheet<String>), findsNothing);
      await tester.tap(find.text('Dubai'));
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 400));
      await tester.tap(find.text('Close'));
      await pumpUntilFound(tester, find.text('Event city: Mumbai'));
      expect(requests.last.answerFilters, {
        'city': {'Mumbai'},
      });
      expect(find.text('Event city: Mumbai'), findsOneWidget);
      pending.complete(_page);
      await pumpFeatureUi(tester);
      expect(find.text('Load more responses'), findsOneWidget);
      expect(
        tester
            .widget<CatchButton>(
              find.widgetWithText(CatchButton, 'Load more responses'),
            )
            .onPressed,
        isNotNull,
      );
      expect(find.text('No matching responses'), findsNothing);
      await _captureFilters(tester, 'responses-zero-matches-continuation');
      await tester.tap(find.text('Sort: Newest first'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Oldest first'));
      await pumpFeatureUi(tester);
      expect(requests.last.oldestFirst, isTrue);
      expect(requests.last.answerFilters, {
        'city': {'Mumbai'},
      });
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('filtered response queue shows real review rows', (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.reset);
    final requests = <HostFormResponseListRequest>[];
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          hostFormResponsesControllerProvider.overrideWith2(
            (_) => _PopulatedResponses(requests),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          builder: (context, child) => RepaintBoundary(
            key: const ValueKey('response-filters-capture'),
            child: child!,
          ),
          home: const Scaffold(
            body: CustomScrollView(
              slivers: [
                HostFormResponsesSection(
                  organizerId: 'org',
                  formId: 'form',
                  showFormContext: false,
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Filters'));
    await pumpFeatureUi(tester);
    final city = find.byKey(const ValueKey('response-filter-city-Mumbai'));
    await tester.ensureVisible(city);
    await tester.tap(city);
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Close'));
    await pumpFeatureUi(tester);
    expect(requests.last.answerFilters['city'], {'Mumbai'});
    expect(find.text('Maya Test Guest'), findsOneWidget);
    expect(find.text('Rohan Test Guest'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('host-response-entry-response:maya')),
      findsOneWidget,
    );
    await _captureFilters(tester, 'responses-populated-queue');
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'all promoted questions are available with at most five active filters',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(900, 1200));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final requests = <HostFormResponseListRequest>[];
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            hostFormResponsesControllerProvider.overrideWith2(
              (_) => _ManyFilters(requests),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const Scaffold(
              body: CustomScrollView(
                slivers: [
                  HostFormResponsesSection(
                    organizerId: 'org',
                    formId: 'form',
                    showFormContext: false,
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Filters'));
      await pumpFeatureUi(tester);
      for (final number in [6, 1, 2, 3, 4]) {
        final chip = find.byKey(ValueKey('response-filter-q$number-selected'));
        await tester.ensureVisible(chip);
        await tester.tap(chip);
        await pumpFeatureUi(tester);
      }
      expect(requests.last.answerFilters.length, 5);
      expect(requests.last.answerFilters['q6'], {'selected'});
      final sixth = find.byKey(const ValueKey('response-filter-q5-selected'));
      expect(tester.widget<CatchChip>(sixth).onPressed, isNull);
      final selected = find.byKey(
        const ValueKey('response-filter-q6-selected'),
      );
      await tester.ensureVisible(selected);
      await tester.tap(selected);
      await pumpFeatureUi(tester);
      expect(requests.last.answerFilters.length, 4);
      expect(tester.widget<CatchChip>(sixth).onPressed, isNotNull);
      expect(tester.takeException(), isNull);
    },
  );
  for (final scale in [1.0, 2.0]) {
    testWidgets(
      'inline form and answer chips combine, reset and preserve selection at $scale',
      (tester) async {
        tester.view.physicalSize = const Size(320, 874);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        final requests = <HostFormResponseListRequest>[];
        String? formId = 'rsvp';
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              hostFormsDirectoryControllerProvider.overrideWith2(
                (_) => _Forms(),
              ),
              hostFormResponsesControllerProvider.overrideWith2(
                (_) => _ScopedResponses(requests),
              ),
            ],
            child: MaterialApp(
              theme: scale == 1 ? AppTheme.light : AppTheme.dark,
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(
                  context,
                ).copyWith(textScaler: TextScaler.linear(scale)),
                child: RepaintBoundary(
                  key: const ValueKey('response-filters-capture'),
                  child: child!,
                ),
              ),
              home: StatefulBuilder(
                builder: (context, update) => Scaffold(
                  body: CustomScrollView(
                    slivers: [
                      HostFormResponsesSection(
                        organizerId: 'review',
                        formId: formId,
                        onFormChanged: (value) => update(() => formId = value),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
        await pumpFeatureUi(tester);
        await tester.tap(find.text('Filters'));
        await pumpFeatureUi(tester);
        Future<void> choose(String value) async {
          final chip = find.byKey(ValueKey('response-filter-$value'));
          await tester.ensureVisible(chip);
          await tester.tap(chip);
          await pumpFeatureUi(tester);
        }

        await choose('city-Mumbai');
        await choose('city-Delhi');
        await choose('diet-vegetarian');
        expect(requests.last.answerFilters, {
          'city': {'Mumbai', 'Delhi'},
          'diet': {'vegetarian'},
        });
        await _captureFilters(tester, 'filters-selected-$scale');
        final dinner = find.widgetWithText(CatchChip, 'Community dinner');
        await tester.ensureVisible(dinner);
        await tester.tap(dinner);
        await pumpFeatureUi(tester);
        expect(requests.last.formId, 'dinner');
        expect(requests.last.answerFilters, isEmpty);
        expect(find.byType(CatchSheet), findsOneWidget);
        await choose('city-Mumbai');
        await tester.tap(find.text('Close'));
        await pumpFeatureUi(tester);
        await tester.tap(find.text('Filters'));
        await pumpFeatureUi(tester);
        expect(
          tester
              .widget<CatchChip>(
                find.byKey(const ValueKey('response-filter-city-Mumbai')),
              )
              .selected,
          isTrue,
        );
        await tester.tap(find.text('Reset all'));
        await pumpFeatureUi(tester);
        expect(requests.last.formId, isNull);
        expect(requests.last.answerFilters, isEmpty);
        expect(find.widgetWithText(CatchChip, 'All forms'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
}

Future<void> _captureFilters(WidgetTester tester, String name) async {
  final directory = Platform.environment['CATCH_HOST_RESPONSE_REVIEW_DIR'];
  if (directory == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const ValueKey('response-filters-capture')),
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

const _page = HostFormResponsesState(
  responses: [],
  nextCursor: 'continue-scan',
  answerFilterOptions: [
    HostFormResponseFilterOption(
      questionId: 'city',
      label: 'Event city',
      options: {'Mumbai': 'Mumbai', 'Dubai': 'Dubai'},
    ),
  ],
);

HostFormResponseSummary _response(String id, String name) =>
    HostFormResponseSummary(
      responseId: id,
      formId: 'form',
      formTitle: 'Sunday run RSVP',
      versionId: 'form_v2',
      version: 2,
      status: HostFormResponseStatus.submitted,
      identityKind: HostFormResponseIdentityKind.catchAccount,
      identity: HostFormResponseIdentity(
        displayName: name,
        email: null,
        phoneE164: null,
        origin: HostFormDataOrigin.respondentGranted,
      ),
      sourceLinkId: null,
      sourceLabel: 'Public RSVP',
      submittedAt: DateTime.utc(2026, 9, 23, 10),
      withdrawnAt: null,
      highlights: const [],
      conversionKinds: const {},
    );

class _PopulatedResponses extends HostFormResponsesController {
  _PopulatedResponses(this.requests);
  final List<HostFormResponseListRequest> requests;
  @override
  Future<HostFormResponsesState> build(
    HostFormResponseListRequest request,
  ) async {
    requests.add(request);
    return HostFormResponsesState(
      responses: [
        _response('maya', 'Maya Test Guest'),
        _response('rohan', 'Rohan Test Guest'),
      ],
      nextCursor: 'next-page',
      versionScope: const HostFormResponseVersionScope(
        activeVersionId: 'form_v2',
        publishedVersion: 2,
      ),
      answerFilterOptions: responseFilterQuestions,
    );
  }
}

class _Responses extends HostFormResponsesController {
  _Responses(this.requests, this.pending);
  final List<HostFormResponseListRequest> requests;
  final Completer<HostFormResponsesState> pending;
  @override
  Future<HostFormResponsesState> build(
    HostFormResponseListRequest request,
  ) async {
    requests.add(request);
    return request.answerFilters.isEmpty ? _page : pending.future;
  }
}

class _ManyFilters extends HostFormResponsesController {
  _ManyFilters(this.requests);
  final List<HostFormResponseListRequest> requests;
  @override
  Future<HostFormResponsesState> build(
    HostFormResponseListRequest request,
  ) async {
    requests.add(request);
    return HostFormResponsesState(
      responses: const [],
      nextCursor: null,
      answerFilterOptions: [
        for (var i = 1; i <= 6; i++)
          HostFormResponseFilterOption(
            questionId: 'q$i',
            label: 'Filter $i',
            options: const {'selected': 'Selected'},
          ),
      ],
    );
  }
}

class _Forms extends HostFormsDirectoryController {
  @override
  Future<HostFormsDirectoryState> build(HostFormListRequest request) async =>
      HostFormsDirectoryState(forms: responseFilterForms, nextCursor: null);
}

class _ScopedResponses extends HostFormResponsesController {
  _ScopedResponses(this.requests);
  final List<HostFormResponseListRequest> requests;
  @override
  Future<HostFormResponsesState> build(
    HostFormResponseListRequest request,
  ) async {
    requests.add(request);
    return HostFormResponsesState(
      responses: const [],
      nextCursor: null,
      answerFilterOptions: request.formId == null
          ? const []
          : responseFilterQuestions,
    );
  }
}

class _VersionedResponses extends HostFormResponsesController {
  _VersionedResponses(this.requests);
  final List<HostFormResponseListRequest> requests;
  @override
  Future<HostFormResponsesState> build(
    HostFormResponseListRequest request,
  ) async {
    requests.add(request);
    return const HostFormResponsesState(
      responses: [],
      nextCursor: null,
      versionScope: HostFormResponseVersionScope(
        activeVersionId: 'form_v2',
        publishedVersion: 2,
      ),
      answerFilterOptions: [
        HostFormResponseFilterOption(
          questionId: 'city',
          label: 'City',
          options: {'Mumbai': 'Mumbai'},
        ),
      ],
    );
  }
}
