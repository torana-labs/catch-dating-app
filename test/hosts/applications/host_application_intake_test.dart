import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/forms/response_screen.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_application_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_applications_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../test_pump_helpers.dart';

/// A saved application URL renders the routed answer screen,
/// [HostResponseScreen.application], over the application detail alone.
Widget _app(List overrides) => ProviderScope(
  overrides: [...overrides],
  child: MaterialApp(
    theme: AppTheme.light,
    home: const HostApplicationDetailScreen(
      organizerId: 'org-1',
      applicationId: 'app-1',
    ),
  ),
);

void main() {
  testWidgets('a saved application URL opens the routed answer screen', (
    tester,
  ) async {
    await tester.pumpWidget(
      _app([
        hostApplicationDetailProvider(
          'org-1',
          'app-1',
        ).overrideWith((_) async => _detail(false, linked: true)),
      ]),
    );
    await pumpFeatureUi(tester);
    final screen = tester.widget<HostResponseScreen>(
      find.byType(HostResponseScreen),
    );
    expect(screen.applicationId, 'app-1');
    expect(screen.responseId, isNull);
    expect(find.text('Ada'), findsWidgets);
    // An imported application has no form response to offer a place from,
    // so the screen shows its answers without review actions.
    expect(find.text('Offer a place'), findsNothing);
    expect(find.text('Not now'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Not now sends the team note with the decline', (tester) async {
    final controller = _ReviewController();
    await tester.pumpWidget(
      _app([
        hostApplicationsControllerProvider.overrideWithValue(controller),
        hostApplicationDetailProvider(
          'org-1',
          'app-1',
        ).overrideWith((_) async => _detail(false, sourceResponseId: 'resp-1')),
        hostFormResponseDetailProvider(
          organizerId: 'org-1',
          responseId: 'resp-1',
        ).overrideWith((_) async => _response()),
      ]),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Offer a place'), findsOneWidget);
    final input = find.descendant(
      of: find.byKey(const ValueKey('host-response-note')),
      matching: find.byType(EditableText),
    );
    await tester.ensureVisible(input);
    await tester.enterText(input, 'Follow up about the weekend event');
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Not now'));
    await pumpFeatureUi(tester);
    expect(controller.lastStatus, HostApplicationReviewStatus.declined);
    expect(controller.lastNote, 'Follow up about the weekend event');
  });

  testWidgets('Message opens WhatsApp for the applicant phone', (tester) async {
    final opened = <Uri>[];
    await tester.pumpWidget(
      _app([
        externalUrlLauncherProvider.overrideWithValue((
          uri, {
          mode = LaunchMode.platformDefault,
        }) async {
          opened.add(uri);
          return true;
        }),
        hostApplicationDetailProvider(
          'org-1',
          'app-1',
        ).overrideWith((ref) async => _detail(false, contacts: true)),
      ]),
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Message'));
    await pumpFeatureUi(tester);
    expect(opened.map((uri) => uri.toString()).toList(), [
      'https://wa.me/12025550101',
    ]);
    expect(tester.takeException(), isNull);
  });

  testWidgets('revoked application cannot expose review actions', (
    tester,
  ) async {
    await tester.pumpWidget(
      _app([
        hostApplicationDetailProvider(
          'org-1',
          'app-1',
        ).overrideWith((ref) async => _detail(false, revoked: true)),
      ]),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Not now'), findsNothing);
    expect(find.text('Offer a place'), findsNothing);
  });
}

HostApplicationDetail _detail(
  bool accepted, {
  bool revoked = false,
  bool contacts = false,
  bool linked = false,
  String? sourceResponseId,
}) => HostApplicationDetail(
  organizerId: 'org-1',
  applicationId: 'app-1',
  formId: 'form-1',
  formVersionId: 'version-1',
  targetKind: 'organizer',
  targetId: null,
  applicantDisplayName: revoked ? 'Withdrawn applicant' : 'Ada',
  reviewStatus: accepted
      ? HostApplicationReviewStatus.approved
      : HostApplicationReviewStatus.submitted,
  answers: const [],
  outreach: HostApplicationOutreach(
    phoneE164: contacts ? '+12025550101' : null,
    email: null,
    instagramUrl: contacts ? 'https://www.instagram.com/synthetic_demo/' : null,
    linkedinUrl: null,
  ),
  reviewNote: null,
  assignedReviewerUid: null,
  submittedAt: DateTime(2026, 9),
  reviewedAt: null,
  revision: accepted ? 2 : 1,
  contactId: accepted || linked ? 'person-1' : null,
  dataAccessState: revoked
      ? 'revokedParticipantGrant'
      : 'submittedFormResponse',
  sourceResponseId: sourceResponseId,
);

/// The form response an application was submitted through.
HostFormResponseDetail _response() => HostFormResponseDetail(
  applicationId: 'app-1',
  response: HostFormResponseSummary(
    responseId: 'resp-1',
    formId: 'form-1',
    formTitle: 'Weekend run',
    versionId: 'version-1',
    version: 1,
    status: HostFormResponseStatus.submitted,
    identityKind: HostFormResponseIdentityKind.phoneVerified,
    identity: const HostFormResponseIdentity(
      displayName: 'Ada',
      email: null,
      phoneE164: null,
      origin: HostFormDataOrigin.respondentGranted,
    ),
    sourceLinkId: null,
    sourceLabel: null,
    submittedAt: DateTime(2026, 9),
    withdrawnAt: null,
    highlights: const [],
    conversionKinds: const {},
  ),
  answers: const [],
  consentVersion: 'v1',
  completionMillis: 1790000000000,
);

class _ReviewController extends Fake implements HostApplicationsController {
  bool accepted = false;
  HostApplicationReviewStatus? lastStatus;
  String? lastNote;
  @override
  Future<HostApplicationReviewResult> reviewApplication({
    required String organizerId,
    required String applicationId,
    required int expectedRevision,
    required HostApplicationReviewStatus reviewStatus,
    String? reviewNote,
  }) async {
    expect(expectedRevision, 1);
    lastStatus = reviewStatus;
    lastNote = reviewNote;
    accepted = reviewStatus == HostApplicationReviewStatus.approved;
    return HostApplicationReviewResult(
      organizerId: organizerId,
      applicationId: applicationId,
      reviewStatus: reviewStatus,
      reviewedAt: DateTime(2026, 9, 3),
      revision: 2,
      contactId: 'person-1',
    );
  }
}
