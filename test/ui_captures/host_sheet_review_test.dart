import 'dart:io';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_sheet.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_screen.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_organizer_switcher_sheet.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../hosts/forms/support/response_filter_fixtures.dart';
import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'support/capture_device.dart';
import 'support/capture_pump.dart';

// ignore_for_file: riverpod_lint/scoped_providers_should_specify_dependencies
void main() {
  setUpAll(loadCatchTestFonts);
  setUp(() {
    AppConfig.configureEntrypointRole(AppRole.host);
  });
  tearDown(() {
    AppConfig.resetEntrypointRoleOverrideForTesting();
  });
  const output = String.fromEnvironment('SHEET_REVIEW_OUTPUT');
  final cases = <String, WidgetBuilder>{
    'create-event': (_) => HostEventEntrySheet(
      state: HostEventEntryState.resolve(
        organizerId: HostOperationsFixtures.primaryClub.id,
        drafts: [HostOperationsFixtures.eventDraft],
        repeatSource: HostOperationsFixtures.upcomingEvent,
      ),
      onDeleteDraft: (_) async {},
    ),
    'people-filter': (_) => const HostCustomerFilterSheet(
      selectedFilters: {
        HostCustomerFilter.repeat,
        HostCustomerFilter.firstTime,
        HostCustomerFilter.reliable,
        HostCustomerFilter.advocate,
      },
      manualTagVocabulary: [],
      selectedCount: HostCustomerSegmentCount(
        count: 0,
        coverage: HostCustomerMatchCountCoverage.exact,
      ),
      smsReadiness: HostCrmChannelReadiness.currentEventOnly,
    ),
    'people-sort': (_) => HostCustomerControlSection(
      sort: HostCustomerSort.lastSeen,
      onSortChanged: (_) {},
      onOpenFilters: () {},
    ),
    'draft-picker': (_) => HostEventEntrySheet(
      state: HostEventEntryState.resolve(
        organizerId: HostOperationsFixtures.primaryClub.id,
        drafts: [
          HostOperationsFixtures.eventDraft,
          EventDraft(
            id: 'second-review-draft',
            clubId: HostOperationsFixtures.primaryClub.id,
            savedAt: DateTime.now().subtract(const Duration(hours: 3)),
            name: 'Saturday community breakfast',
          ),
        ],
        repeatSource: HostOperationsFixtures.upcomingEvent,
      ),
      onDeleteDraft: (_) async {},
    ),
    'organizer-picker': (_) => HostOrganizerSwitcherSheet(
      clubs: [
        HostOperationsFixtures.primaryClub,
        HostOperationsFixtures.dinnerClub,
      ],
      selectedOrganizerId: HostOperationsFixtures.primaryClub.id,
    ),
  };
  for (final entry in cases.entries) {
    testWidgets('Host sheet review ${entry.key}', (tester) async {
      if (output.isEmpty) return;
      await captureCatchWidget(
        tester,
        id: entry.key,
        outputDirectory: Directory(output),
        device: CaptureDevice.iphone17Pro,
        includeOverlays: true,
        builder: (context) => Center(
          child: CatchButton(
            label: 'Open',
            onPressed: () {
              showCatchBottomSheet<void>(
                context: context,
                builder: entry.value,
              );
            },
          ),
        ),
        drive: (tester) async {
          await tester.tap(find.text('Open'));
          await pumpFeatureUi(tester);
          if (entry.key == 'people-filter') _expectChipClearance(tester);
          if (entry.key == 'people-sort') {
            await tester.tap(find.text('Sort: Last seen'));
            await pumpFeatureUi(tester);
          }
        },
      );
      expect(tester.takeException(), isNull);
    }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));
  }
  for (final responses in [false, true]) {
    testWidgets(
      'Host sheet review ${responses ? 'responses' : 'forms'} filters',
      (tester) async {
        if (output.isEmpty) return;
        await captureCatchWidget(
          tester,
          id: responses ? 'responses-filter' : 'forms-filter',
          outputDirectory: Directory(output),
          device: CaptureDevice.iphone17Pro,
          includeOverlays: true,
          providerOverrides: [
            uidProvider.overrideWithValue(const AsyncData('host-review')),
            hostOperableClubsProvider('host-review').overrideWithValue(
              AsyncData([HostOperationsFixtures.primaryClub]),
            ),
            hostFormsDirectoryControllerProvider.overrideWith2(
              (_) => _Forms(withExamples: responses),
            ),
            hostFormResponsesControllerProvider.overrideWith2(
              (_) => _Responses(),
            ),
          ],
          builder: (_) => responses
              ? const HostFormsScreen(
                  initialResponses: true,
                  initialFormId: 'rsvp',
                )
              : const HostFormsScreen(),
          drive: (tester) async {
            await tester.tap(find.text('Filters').hitTestable().first);
            await pumpFeatureUi(tester);
            if (responses) {
              for (final value in [
                'city-Mumbai',
                'city-Delhi',
                'diet-vegetarian',
              ]) {
                final chip = find.byKey(ValueKey('response-filter-$value'));
                await tester.ensureVisible(chip);
                await tester.tap(chip);
                await pumpFeatureUi(tester);
              }
            }
            if (!responses) {
              for (final label in [
                'Application',
                'Registration',
                'Intake',
                'Published',
                'Paused',
              ]) {
                final chip = find.descendant(
                  of: find.byType(CatchSheet),
                  matching: find.widgetWithText(CatchChip, label),
                );
                await tester.ensureVisible(chip);
                await tester.tap(chip);
                await pumpFeatureUi(tester);
              }
            }
            _expectChipClearance(tester);
          },
        );
        expect(tester.takeException(), isNull);
      },
      variant: TargetPlatformVariant.only(TargetPlatform.iOS),
    );
  }
}

class _Forms extends HostFormsDirectoryController {
  _Forms({required this.withExamples});
  final bool withExamples;
  @override
  Future<HostFormsDirectoryState> build(HostFormListRequest request) async =>
      HostFormsDirectoryState(
        forms: withExamples ? responseFilterForms : [],
        nextCursor: null,
      );
}

class _Responses extends HostFormResponsesController {
  @override
  Future<HostFormResponsesState> build(
    HostFormResponseListRequest request,
  ) async => HostFormResponsesState(
    responses: const [],
    nextCursor: null,
    answerFilterOptions: request.formId == null
        ? const []
        : responseFilterQuestions,
  );
}

void _expectChipClearance(WidgetTester tester) {
  var measured = 0;
  for (final section in find.byType(CatchSection).evaluate()) {
    final group = find.byWidget(section.widget);
    final chips = find.descendant(of: group, matching: find.byType(CatchChip));
    final rules = find.descendant(
      of: group,
      matching: find.byType(CatchDivider),
    );
    if (chips.evaluate().isEmpty || rules.evaluate().isEmpty) continue;
    expect(
      tester.getTopLeft(chips.first).dy - tester.getBottomLeft(rules.first).dy,
      closeTo(CatchFieldTokens.rowVerticalPadding, 0.1),
      reason: 'Every filter group keeps the rule clear of its first chip.',
    );
    measured++;
  }
  expect(measured, greaterThan(1));
}
