import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_application_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_applications_controller.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../test_pump_helpers.dart';

void main() {
  testWidgets('imported review keeps its existing People link', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          hostApplicationDetailProvider(
            'org-1',
            'app-1',
          ).overrideWith((_) async => _detail(false, linked: true)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const HostApplicationDetailScreen(
            organizerId: 'org-1',
            applicationId: 'app-1',
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Open person'), findsOneWidget);
    expect(find.text('Accept and add to People'), findsOneWidget);
    expect(find.text('Propose attendee'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('review note saves without changing status', (tester) async {
    final controller = _ReviewController();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          hostApplicationsControllerProvider.overrideWithValue(controller),
          hostApplicationDetailProvider(
            'org-1',
            'app-1',
          ).overrideWith((_) async => _detail(false)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const HostApplicationDetailScreen(
            organizerId: 'org-1',
            applicationId: 'app-1',
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Save review note'), findsNothing);
    final noteField = find.byWidgetPredicate(
      (widget) => widget is CatchField && widget.title == 'Private review note',
    );
    await tester.ensureVisible(noteField);
    await tester.tap(noteField);
    await pumpFeatureUi(tester);
    final input = find.byType(TextField);
    await tester.ensureVisible(input);
    await tester.enterText(input, 'Follow up about the weekend event');
    await pumpFeatureUi(tester);
    final save = find.text('Save review note');
    await tester.ensureVisible(save);
    await tester.tap(save);
    await pumpFeatureUi(tester);
    expect(controller.lastStatus, HostApplicationReviewStatus.submitted);
    expect(controller.lastNote, 'Follow up about the weekend event');
    expect(controller.accepted, isFalse);
    expect(find.text('Open original response'), findsNothing);
  });

  testWidgets('accept refreshes application and opens its linked person', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 1200));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final controller = _ReviewController();
    final router = GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (_, _) => const HostApplicationDetailScreen(
            organizerId: 'org-1',
            applicationId: 'app-1',
          ),
        ),
        GoRoute(
          path: '/person/:contactId',
          name: Routes.hostCustomerDetailScreen.name,
          builder: (_, state) => Scaffold(
            body: Text(
              'Person ${state.pathParameters['contactId']} '
              '${state.uri.queryParameters['organizerId']}',
            ),
          ),
        ),
        GoRoute(
          path: '/response/:responseId',
          name: Routes.hostFormResponseDetailScreen.name,
          builder: (_, _) => const Scaffold(body: Text('Original response')),
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          hostApplicationsControllerProvider.overrideWithValue(controller),
          hostApplicationDetailProvider(
            'org-1',
            'app-1',
          ).overrideWith((ref) async => _detail(controller.accepted)),
        ],
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.text('Accept and add to People'));
    await tester.tap(find.text('Accept and add to People'));
    await pumpFeatureUi(tester);
    expect(controller.accepted, isTrue);
    final link = find.byKey(const ValueKey('host-application-open-person'));
    await tester.ensureVisible(link);
    await tester.tap(link);
    await pumpFeatureUi(tester);
    expect(find.text('Person person-1 org-1'), findsOneWidget);
  });

  testWidgets(
    'contact shortcuts remain reachable and answers precede review on mobile',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final opened = <Uri>[];
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
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
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const HostApplicationDetailScreen(
              organizerId: 'org-1',
              applicationId: 'app-1',
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      for (final label in ['Call', 'Instagram']) {
        expect(find.text(label).hitTestable(), findsOneWidget);
        expect(
          tester.getTopLeft(find.text(label)).dy,
          lessThan(tester.getTopLeft(find.text('ANSWERS')).dy),
        );
      }
      expect(find.text('Waitlist'), findsNothing);
      expect(find.text('Decline'), findsNothing);
      expect(
        tester.getTopLeft(find.text('Review status')).dy,
        greaterThan(tester.getTopLeft(find.text('ANSWERS')).dy),
      );
      await tester.tap(find.text('Call'));
      await tester.tap(find.text('Instagram'));
      await pumpFeatureUi(tester);
      expect(opened.map((uri) => uri.toString()).toList(), [
        'tel:+12025550101',
        'https://www.instagram.com/synthetic_demo/',
      ]);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('revoked application cannot expose review actions', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          hostApplicationDetailProvider(
            'org-1',
            'app-1',
          ).overrideWith((ref) async => _detail(false, revoked: true)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const HostApplicationDetailScreen(
            organizerId: 'org-1',
            applicationId: 'app-1',
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Accept and add to People'), findsNothing);
  });
}

HostApplicationDetail _detail(
  bool accepted, {
  bool revoked = false,
  bool contacts = false,
  bool linked = false,
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
