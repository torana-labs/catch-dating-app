import 'dart:io';

import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_applications_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_memory_section.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_timeline_section.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';

import '../test_pump_helpers.dart';
import 'catalog/screen_capture_catalog.dart';
import 'support/capture_device.dart';
import 'support/capture_pump.dart';

void main() {
  testWidgets(
    'captures customer detail views and editing',
    (tester) async {
      final entry = findScreenCapture('host_customer_detail_memory');
      final organizerId = HostOperationsFixtures.primaryClub.id;
      final opened = <Uri>[];
      for (final view in [
        'overview',
        'reach',
        'details',
        'submitted',
        'memory',
        'history',
        'history_events',
        'events',
        'edit',
        'spend',
        'record_actions',
        'remove_confirmation',
      ]) {
        const requestedView = String.fromEnvironment('CAPTURE_VIEW');
        if (requestedView.isNotEmpty && view != requestedView) continue;
        final artifacts = await captureCatchWidget(
          tester,
          id: view,
          builder: (context) =>
              KeyedSubtree(key: ValueKey(view), child: entry.builder(context)),
          providerOverrides: [
            ...entry.providerOverrides,
            firebaseAuthProvider.overrideWithValue(_CaptureAuth()),
            externalUrlLauncherProvider.overrideWithValue((
              uri, {
              mode = LaunchMode.platformDefault,
            }) async {
              opened.add(uri);
              return true;
            }),
            hostApplicationsDirectoryControllerProvider(
              HostApplicationListRequest(
                organizerId: organizerId,
                contactId: 'capture-customer-ananya',
              ),
            ).overrideWith(() => _CustomerApplications()),
            hostApplicationDetailProvider(
              organizerId,
              'capture-application-1',
            ).overrideWithValue(AsyncData(_application(organizerId))),
            hostSavedAudienceFilterOptionsProvider(
              organizerId,
            ).overrideWithValue(
              const AsyncData<HostSavedAudienceFilterOptions>(
                HostSavedAudienceFilterOptions.empty(),
              ),
            ),
          ],
          device: CaptureDevice.iphone17Pro,
          includeOverlays:
              view == 'edit' ||
              view == 'spend' ||
              view == 'record_actions' ||
              view == 'remove_confirmation',
          pixelRatio: 2,
          textScale: double.parse(
            const String.fromEnvironment(
              'CAPTURE_TEXT_SCALE',
              defaultValue: '1',
            ),
          ),
          outputDirectory: Directory(
            const String.fromEnvironment(
              'CAPTURE_OUTPUT_DIR',
              defaultValue: 'artifacts/customer-detail-preview',
            ),
          ),
          drive: (tester) async {
            for (final label in ['Overview', 'Details', 'Notes', 'History']) {
              final paragraph = tester.renderObject<RenderParagraph>(
                find.text(label),
              );
              expect(
                paragraph.didExceedMaxLines,
                isFalse,
                reason: 'Customer detail tab labels must remain readable',
              );
            }
            if (view == 'reach' || view == 'edit') {
              await tester.tap(find.text('Details'));
              await pumpFeatureUi(tester);
            }
            if (view == 'reach') {
              await tester.ensureVisible(
                find.byKey(
                  const ValueKey('host-customer-reach-and-provenance'),
                ),
              );
              await pumpFeatureUi(tester);
            } else if (view == 'details' || view == 'submitted') {
              await tester.ensureVisible(find.text('Details'));
              await tester.tap(find.text('Details'));
              await pumpFeatureUi(tester);
              expect(find.byType(HostCustomerDetailsSection), findsOneWidget);
              final call = find.byKey(const ValueKey('host-customer-call'));
              await tester.ensureVisible(call);
              await tester.tap(call);
              await pumpFeatureUi(tester);
              expect(opened.last.scheme, 'tel');
              final email = find.byKey(const ValueKey('host-customer-email'));
              await tester.ensureVisible(email);
              await tester.tap(email);
              await pumpFeatureUi(tester);
              expect(opened.last.scheme, 'mailto');
              if (view == 'details') {
                Scrollable.of(tester.element(email)).position.jumpTo(0);
                await pumpFeatureUi(tester);
              }
              if (view == 'submitted') {
                final submittedDisclosure = find.text(
                  'Latest submitted details',
                );
                await tester.ensureVisible(submittedDisclosure);
                await tester.tap(submittedDisclosure);
                await pumpFeatureUi(tester);
                final submittedFields = find.byKey(
                  const ValueKey('host-customer-submitted-fields'),
                );
                await pumpUntilFound(tester, submittedFields);
                await tester.ensureVisible(submittedFields);
                await pumpFeatureUi(tester);
                expect(find.text('ananya.rao'), findsOneWidget);
                expect(find.text('Vegetarian'), findsOneWidget);
              }
            } else if (view == 'record_actions' ||
                view == 'remove_confirmation') {
              await tester.tap(
                find.byKey(const ValueKey('host-customer-record-actions')),
              );
              await pumpFeatureUi(tester);
              expect(find.text('Remove customer'), findsOneWidget);
              if (view == 'remove_confirmation') {
                await tester.tap(find.text('Remove customer'));
                await pumpFeatureUi(tester);
                expect(find.text('Cancel'), findsOneWidget);
              }
            } else if (view == 'spend') {
              final breakdown = find.byKey(
                const ValueKey('host-customer-revenue-breakdown'),
              );
              await tester.ensureVisible(breakdown);
              await tester.tap(breakdown);
              await pumpFeatureUi(tester);
              expect(find.byType(HostCustomerRevenueList), findsOneWidget);
            } else if (view == 'memory' || view.startsWith('history')) {
              final tab = find.text(view == 'memory' ? 'Notes' : 'History');
              await tester.ensureVisible(tab);
              await tester.tap(tab);
              await pumpFeatureUi(tester);
              expect(
                find.byType(HostCustomerMemorySection),
                view == 'memory' ? findsOneWidget : findsNothing,
              );
              expect(
                find.byType(HostCustomerTimelineSection),
                view.startsWith('history') ? findsOneWidget : findsNothing,
              );
              if (view == 'history_events') {
                await tester.tap(
                  find.byKey(const ValueKey('host-customer-history-filter')),
                );
                await pumpFeatureUi(tester);
                await tester.tap(
                  find.byKey(
                    const ValueKey<Object?>(HostCustomerHistoryKind.events),
                  ),
                );
                await pumpFeatureUi(tester);
                expect(find.text('Sunday Run Club'), findsOneWidget);
                expect(find.text('Sunday Run sign-up'), findsNothing);
                expect(
                  find.text('I’ll bring two friends next week.'),
                  findsNothing,
                );
              }
              if (view.startsWith('history')) {
                for (final paragraph
                    in find
                        .descendant(
                          of: find.byType(HostCustomerTimelineSection),
                          matching: find.byType(RichText),
                        )
                        .evaluate()) {
                  expect(
                    (paragraph.renderObject! as RenderParagraph)
                        .didExceedMaxLines,
                    isFalse,
                    reason: 'The sample history must not truncate',
                  );
                }
              }
            } else if (view == 'events') {
              await tester.ensureVisible(
                find.byKey(const ValueKey('host-customer-recent-events')),
              );
              await pumpFeatureUi(tester);
              expect(find.text('Sunday Run Club'), findsOneWidget);
            } else if (view == 'edit') {
              final edit = find.byKey(
                const ValueKey('host-customer-edit-details'),
              );
              await tester.ensureVisible(edit);
              await tester.tap(edit);
              await pumpFeatureUi(tester);
              expect(find.byType(TextField), findsWidgets);
            }
            expect(tester.takeException(), isNull);
          },
        );
        expect(artifacts, hasLength(2));
        if (view == 'edit') {
          final cancel = find.text('Cancel');
          await tester.ensureVisible(cancel);
          await tester.tap(cancel);
          await pumpFeatureUi(tester);
          expect(find.byType(HostCustomerIdentityCard), findsNothing);
          expect(find.byType(HostCustomerDetailsSection), findsOneWidget);
        }
        expect(tester.takeException(), isNull);
      }
    },
    variant: TargetPlatformVariant.only(
      const String.fromEnvironment('CAPTURE_PLATFORM') == 'android'
          ? TargetPlatform.android
          : TargetPlatform.iOS,
    ),
  );
}

class _CustomerApplications extends HostApplicationsDirectoryController {
  @override
  Future<HostApplicationsDirectoryState> build(
    HostApplicationListRequest request,
  ) async => HostApplicationsDirectoryState(
    applications: [
      HostApplicationSummary(
        applicationId: 'capture-application-1',
        formId: 'capture-form-1',
        formVersionId: 'capture-version-1',
        targetKind: 'organizer',
        targetId: null,
        applicantDisplayName: 'Ananya Rao',
        reviewStatus: HostApplicationReviewStatus.approved,
        sourceKind: HostApplicationSourceKind.native,
        providerId: null,
        submittedAt: DateTime(2026, 5, 20),
        revision: 1,
      ),
    ],
    nextCursor: null,
  );
}

HostApplicationDetail _application(String organizerId) => HostApplicationDetail(
  organizerId: organizerId,
  applicationId: 'capture-application-1',
  formId: 'capture-form-1',
  formVersionId: 'capture-version-1',
  targetKind: 'organizer',
  targetId: null,
  applicantDisplayName: 'Ananya Rao',
  reviewStatus: HostApplicationReviewStatus.approved,
  answers: [
    for (final field in [
      ('diet', 'Diet', 'Vegetarian'),
      ('occupation', 'Occupation', 'Product designer'),
    ])
      HostApplicationAnswer(
        questionId: field.$1,
        questionKey: field.$1,
        questionLabel: field.$2,
        questionKind: 'shortText',
        canonicalFieldId: field.$1,
        privacyClass: 'profile',
        hostPresentation: 'detailOnly',
        value: HostApplicationAnswerValue(
          valueKind: 'text',
          textValue: field.$3,
          numberValue: null,
          booleanValue: null,
          dateValue: null,
          optionValues: const [],
          assetIds: const [],
        ),
      ),
  ],
  outreach: const HostApplicationOutreach(
    phoneE164: '+919876543210',
    email: 'ananya@example.com',
    instagramUrl: 'https://www.instagram.com/ananya.rao/',
    linkedinUrl: null,
  ),
  reviewNote: null,
  assignedReviewerUid: null,
  submittedAt: DateTime(2026, 5, 20),
  reviewedAt: DateTime(2026, 5, 21),
  revision: 1,
);

class _CaptureAuth extends Fake implements FirebaseAuth {
  @override
  User get currentUser => _CaptureUser();
}

class _CaptureUser extends Fake implements User {
  @override
  String get uid => HostOperationsFixtures.hostUid;
}
