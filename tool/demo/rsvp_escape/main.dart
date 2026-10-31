// Local-only visual QA of production Host widgets with handler-backed fixtures.
import 'dart:convert';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_communication_plan.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_conversion.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/host_event_rehearsal_screen.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_application_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_builder_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_preview_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_workspace_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_screen.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;

late final Map<String, dynamic> fixture;
late final String organizerId;
late final String formId;

Future<Object?> call(String action, Map<String, Object?> payload) async {
  final response = await http.post(
    Uri.parse('http://127.0.0.1:8789'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'action': action, 'payload': payload}),
  );
  final Object? result = jsonDecode(response.body);
  if (response.statusCode != 200) {
    final error = result is Map ? result['error'] as String? : null;
    throw StateError(
      error ?? 'Local handler returned HTTP ${response.statusCode}',
    );
  }
  return result;
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  fixture =
      (await call('fixture', {'organizerId': 'demo-saket'}))
          as Map<String, dynamic>;
  organizerId = fixture['organizerId'] as String;
  formId = fixture['formId'] as String;
  final router = GoRouter(
    initialLocation: '/forms/$formId',
    routes: [
      GoRoute(
        path: '/rehearsal',
        builder: (_, _) => const HostEventRehearsalScreen(
          organizerId: 'demo-saket',
          sessionId: 'demo-snapshot',
        ),
      ),

      GoRoute(
        path: '/people/:contactId',
        name: Routes.hostCustomerDetailScreen.name,
        builder: (_, state) => HostCustomerDetailScreen(
          organizerId: organizerId,
          contactId: state.pathParameters['contactId']!,
        ),
      ),
      GoRoute(
        path: '/forms/:formId',
        name: Routes.hostFormBuilderScreen.name,
        builder: (_, state) => HostFormBuilderScreen(
          organizerId: organizerId,
          formId: formId,
          initialView: hostFormViewFromQuery(state.uri.queryParameters['view']),
        ),
      ),
      GoRoute(
        path: '/preview/:formId',
        name: Routes.hostFormPreviewScreen.name,
        builder: (_, _) =>
            HostFormPreviewScreen(organizerId: organizerId, formId: formId),
      ),
      GoRoute(
        path: '/responses/:responseId',
        name: Routes.hostFormResponseDetailScreen.name,
        builder: (_, state) => HostFormResponseDetailScreen(
          organizerId: organizerId,
          responseId: state.pathParameters['responseId']!,
        ),
      ),
      GoRoute(
        path: '/applications',
        name: Routes.hostApplicationsScreen.name,
        redirect: (_, _) => '/audience?view=responses',
      ),
      GoRoute(
        path: '/audience',
        name: Routes.hostAudienceScreen.name,
        builder: (_, state) => HostFormsScreen(
          initialOrganizerId: organizerId,
          initialFormId: formId,
          initialResponses: state.uri.queryParameters['view'] == 'responses',
        ),
      ),
      GoRoute(
        path: '/applications/:applicationId',
        name: Routes.hostApplicationDetailScreen.name,
        builder: (_, state) => HostApplicationDetailScreen(
          organizerId: organizerId,
          applicationId: state.pathParameters['applicationId']!,
        ),
      ),
    ],
  );
  runApp(
    ProviderScope(
      overrides: [
        eventRehearsalRepositoryProvider.overrideWithValue(
          DemoRehearsalRepository(),
        ),

        uidProvider.overrideWith((ref) => Stream.value('demo-host')),
        hostAudienceContactDetailProvider.overrideWith(
          (ref, args) async => HostAudienceContactDetail.fromCallableData(
            await call('contactDetail', {
              'organizerId': args.$1,
              'contactId': args.$2,
              'includeHistory': false,
            }),
          ),
        ),
        hostAudienceContactHistoryProvider.overrideWith(
          (ref, args) async => HostAudienceContactDetail.fromCallableData(
            await call('contactDetail', {
              'organizerId': args.$1,
              'contactId': args.$2,
            }),
          ),
        ),
        hostCommunicationPlanProvider.overrideWith(
          (ref, args) async => HostCommunicationPlan(
            organizerId: args.$1,
            intent: HostCommunicationIntent.individualConversation,
            capabilityVersion: 1,
            resolvedAt: DateTime(2026, 9, 21),
            recipients: [
              HostCommunicationRecipientPlan(
                contactId: args.$2,
                displayName: 'Synthetic guest',
                outcome: HostCommunicationOutcome.unavailable,
                recommendedRouteId: null,
                routes: [
                  for (final route in HostCommunicationRouteId.values)
                    HostCommunicationRouteOption(
                      routeId: route,
                      executionMode:
                          HostCommunicationExecutionMode.managedDelivery,
                      availability:
                          HostCommunicationRouteAvailability.unavailable,
                      blocker: HostCommunicationRouteBlocker.permissionRequired,
                    ),
                ],
              ),
            ],
          ),
        ),
        hostFormsRepositoryProvider.overrideWithValue(DemoFormsRepository()),
        hostFormsControllerProvider.overrideWith(
          (ref) => HostFormsController(DemoFormsRepository()),
        ),
        hostApplicationRepositoryProvider.overrideWithValue(
          DemoApplicationsRepository(),
        ),
        hostSavedAudienceFilterOptionsProvider(organizerId).overrideWith(
          (ref) => HostSavedAudienceFilterOptions(
            forms: [
              HostAudienceSourceOption(
                id: formId,
                title: HostFormEditor.fromCallableData(
                  fixture['editor'],
                ).form.title,
              ),
            ],
            questions: const [],
            events: [
              HostAudienceSourceOption(
                id: fixture['eventId'] as String,
                title: 'RSVP Escape — Mumbai demo',
              ),
            ],
            tags: const [],
          ),
        ),
      ],
      child: MaterialApp.router(
        theme: AppTheme.light,
        routerConfig: router,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        builder: (context, child) => Column(
          children: [
            Material(
              color: const Color(0xFFFFEDC8),
              child: SizedBox(
                height: 28,
                child: Center(
                  child: Text(
                    'LOCAL DEMO · Synthetic guests · No messages sent',
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
              ),
            ),
            Expanded(child: child!),
          ],
        ),
      ),
    ),
  );
}

class DemoFormsRepository implements HostFormsRepository {
  @override
  Future<HostFormEditor> getEditor({
    required String organizerId,
    required String formId,
  }) async => HostFormEditor.fromCallableData(
    await call('getEditor', {'organizerId': organizerId, 'formId': formId}),
  );
  @override
  Future<HostFormEditor> updateDraft({
    required String organizerId,
    required String formId,
    required int expectedRevision,
    required HostFormDefinition definition,
  }) async => HostFormEditor.fromCallableData(
    await call('updateDraft', {
      'organizerId': organizerId,
      'formId': formId,
      'expectedRevision': expectedRevision,
      'definition': definition.toJson(),
    }),
  );
  @override
  Future<HostFormValidationResult> validateDraft({
    required String organizerId,
    required String formId,
    required HostFormDefinition definition,
  }) async => HostFormValidationResult.fromCallableData(
    await call('validateDraft', {
      'organizerId': organizerId,
      'formId': formId,
      'definition': definition.toJson(),
    }),
  );
  @override
  Future<HostFormSummary> publish({
    required String organizerId,
    required String formId,
    required int expectedRevision,
  }) async => HostFormSummary.fromMap(
    (await call('publish', {
          'organizerId': organizerId,
          'formId': formId,
          'expectedRevision': expectedRevision,
        }))
        as Map,
  );
  @override
  Future<HostFormResponsePage> listResponses(
    HostFormResponseListRequest r,
  ) async => HostFormResponsePage.fromCallableData(
    await call('listResponses', {
      'organizerId': r.organizerId,
      'formId': r.formId,
      'versionId': r.versionId,
      'statuses': r.statuses.map((s) => s.name).toList(),
      'identityKinds': r.identityKinds.map((s) => s.name).toList(),
      'sourceLinkId': r.sourceLinkId,
      'query': r.query,
      'fromMillis': r.from?.millisecondsSinceEpoch,
      'toMillis': r.to?.millisecondsSinceEpoch,
      'cursor': r.cursor,
      'limit': r.limit,
      'sortDirection': r.oldestFirst ? 'asc' : 'desc',
      'answerFilters': [
        for (final entry in r.answerFilters.entries)
          {
            'questionId': entry.key,
            'values': [entry.value],
          },
      ],
    }),
  );
  @override
  Future<HostFormResponseDetail> getResponseDetail({
    required String organizerId,
    required String responseId,
  }) async => HostFormResponseDetail.fromCallableData(
    await call('responseDetail', {
      'organizerId': organizerId,
      'responseId': responseId,
    }),
  );
  @override
  Future<HostFormConversionPreview> previewConversion({
    required String organizerId,
    required String responseId,
    required HostFormConversionKind kind,
    String? eventId,
    Map<String, Object?> overrides = const {},
  }) async => HostFormConversionPreview.fromCallableData(
    await call('previewConversion', {
      'organizerId': organizerId,
      'responseId': responseId,
      'kind': kind.name,
      'eventId': eventId,
      'overrides': overrides,
    }),
  );
  @override
  Future<HostFormConversionReceipt> convertResponse({
    required String organizerId,
    required String responseId,
    required HostFormConversionKind kind,
    required String requestId,
    String? eventId,
    Map<String, Object?> overrides = const {},
  }) async => HostFormConversionReceipt.fromCallableData(
    await call('convertResponse', {
      'organizerId': organizerId,
      'responseId': responseId,
      'kind': kind.name,
      'eventId': eventId,
      'overrides': overrides,
      'requestId': requestId,
    }),
  );
  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnsupportedError(
    'Not connected in local visual QA: ${invocation.memberName}',
  );
}

class DemoApplicationsRepository implements HostApplicationRepository {
  @override
  Future<HostApplicationPage> listApplications(
    HostApplicationListRequest r, {
    int limit = 25,
  }) async => HostApplicationPage.fromCallableData(
    await call('listApplications', {
      'organizerId': r.organizerId,
      'contactId': r.contactId,
      'formId': r.formId,
      'targetId': r.targetId,
      'reviewStatus': r.reviewStatus?.name,
      'query': r.query,
      'sort': r.sort.wireValue,
      'cursor': r.cursor,
      'limit': limit,
    }),
  );
  @override
  Future<HostApplicationDetail> getApplicationDetail(
    String organizerId,
    String applicationId,
  ) async => HostApplicationDetail.fromCallableData(
    await call('applicationDetail', {
      'organizerId': organizerId,
      'applicationId': applicationId,
    }),
  );
  @override
  Future<HostApplicationReviewResult> reviewApplication({
    required String organizerId,
    required String applicationId,
    required int expectedRevision,
    required HostApplicationReviewStatus reviewStatus,
    String? reviewNote,
  }) async => HostApplicationReviewResult.fromCallableData(
    await call('reviewApplication', {
      'organizerId': organizerId,
      'applicationId': applicationId,
      'expectedRevision': expectedRevision,
      'reviewStatus': reviewStatus.name,
      'reviewNote': reviewNote,
    }),
  );
  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnsupportedError(
    'Not connected in local visual QA: ${invocation.memberName}',
  );
}

// Snapshot of the isolated account rehearsal, containing synthetic actors only.
// Mutations remain unavailable; use the signed-in Host app for live controls.
class DemoRehearsalRepository implements EventRehearsalRepository {
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async =>
      EventRehearsalBootstrap.fromCallableData(
        await call('rehearsalSnapshot', {'organizerId': organizerId}),
      );
  @override
  Stream<EventRehearsalBootstrap> watch(String sessionId) async* {
    yield await fetch(sessionId);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnsupportedError(
    'Read-only account rehearsal snapshot; use the signed-in Host app for live controls.',
  );
}
