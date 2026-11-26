import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/hosts/forms/host_applications_controller.dart';
import 'package:catch_dating_app/hosts/forms/response_screen.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// The application review screen grants and revokes community membership
/// through the manager decision command, citing the approved application.
void main() {
  Future<_MembershipController> pump(
    WidgetTester tester,
    HostApplicationDetail detail,
  ) async {
    final controller = _MembershipController();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          hostApplicationsControllerProvider.overrideWithValue(controller),
          hostApplicationDetailProvider(
            'org-1',
            'app-1',
          ).overrideWith((_) => Stream.value(detail)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const HostResponseScreen.application(
            organizerId: 'org-1',
            applicationId: 'app-1',
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    return controller;
  }

  Future<void> tap(WidgetTester tester, Finder finder) async {
    await tester.ensureVisible(finder);
    await tester.tap(finder);
    await pumpFeatureUi(tester);
  }

  Future<void> decide(WidgetTester tester, String save) async {
    await tester.enterText(
      find.descendant(
        of: find.byType(BottomSheet),
        matching: find.byType(EditableText),
      ),
      'Ran with us all season',
    );
    await pumpFeatureUi(tester);
    await tap(
      tester,
      find.descendant(of: find.byType(BottomSheet), matching: find.text(save)),
    );
  }

  testWidgets('an approved applicant can be made a community member', (
    tester,
  ) async {
    final controller = await pump(
      tester,
      _detail(HostApplicationReviewStatus.approved, _membership()),
    );
    expect(find.text('Community membership'), findsOneWidget);
    expect(find.text('Not a community member'), findsOneWidget);
    await tap(tester, find.text('Make a member'));
    expect(find.text('Make a community member'), findsOneWidget);
    await decide(tester, 'Make a member');
    final call = controller.calls.single;
    expect(call.action, HostCommunityMembershipAction.grant);
    expect(call.membership.uid, 'guest-1');
    expect(call.membership.revision, 0);
    expect(call.application.applicationId, 'app-1');
    expect(call.reason, 'Ran with us all season');
    expect(call.requestId, startsWith('membership_'));
    expect(tester.takeException(), isNull);
  });

  testWidgets('a member can have their membership removed', (tester) async {
    final controller = await pump(
      tester,
      _detail(
        HostApplicationReviewStatus.approved,
        _membership(HostCommunityMembershipState.active, 1),
      ),
    );
    expect(find.text('Community member'), findsOneWidget);
    await tap(tester, find.text('Remove'));
    expect(find.text('Remove community membership'), findsOneWidget);
    await decide(tester, 'Remove membership');
    final call = controller.calls.single;
    expect(call.action, HostCommunityMembershipAction.revoke);
    expect(call.membership.revision, 1);
  });

  testWidgets('an unapproved applicant has to be approved first', (
    tester,
  ) async {
    await pump(
      tester,
      _detail(HostApplicationReviewStatus.submitted, _membership()),
    );
    expect(
      find.text('Approve their application first to make them a member.'),
      findsOneWidget,
    );
    expect(find.text('Make a member'), findsNothing);
  });

  testWidgets('an application without a membership shows none', (tester) async {
    await pump(tester, _detail(HostApplicationReviewStatus.approved, null));
    expect(find.text('Community membership'), findsNothing);
  });

  test('the application detail reads the applicant membership', () {
    final detail = HostApplicationDetail.fromCallableData({
      ..._wire,
      'communityMembership': {
        'uid': 'guest-1',
        'state': 'revoked',
        'revision': 2,
      },
    });
    expect(
      detail.communityMembership!.state,
      HostCommunityMembershipState.revoked,
    );
    expect(detail.communityMembership!.revision, 2);
    expect(
      HostApplicationDetail.fromCallableData(_wire).communityMembership,
      isNull,
    );
  });

  test('a decision result reads its current state', () {
    final result = HostCommunityMembershipDecision.fromCallableData({
      'membershipId': 'ocm_${'a' * 64}',
      'decisionId': 'ocmd_${'b' * 64}',
      'decisionRevision': 1,
      'currentRevision': 1,
      'currentState': 'active',
      'replayed': false,
    });
    expect(result.currentState, HostCommunityMembershipState.active);
    expect(result.currentRevision, 1);
    expect(result.replayed, isFalse);
  });
}

const _wire = <String, Object?>{
  'organizerId': 'org-1',
  'applicationId': 'app-1',
  'formId': 'form-1',
  'formVersionId': 'version-1',
  'targetKind': 'organizer',
  'targetId': null,
  'applicantDisplayName': 'Ada',
  'reviewStatus': 'approved',
  'dataAccessState': 'submittedFormResponse',
  'answers': <Object?>[],
  'outreach': {
    'phoneE164': null,
    'email': null,
    'instagramUrl': null,
    'linkedinUrl': null,
  },
  'reviewNote': null,
  'assignedReviewerUid': null,
  'submittedAtMillis': 1790000000000,
  'reviewedAtMillis': 1790000100000,
  'revision': 2,
};

HostCommunityMembership _membership([
  HostCommunityMembershipState state = HostCommunityMembershipState.none,
  int revision = 0,
]) => HostCommunityMembership(uid: 'guest-1', state: state, revision: revision);

HostApplicationDetail _detail(
  HostApplicationReviewStatus status,
  HostCommunityMembership? membership,
) => HostApplicationDetail(
  organizerId: 'org-1',
  applicationId: 'app-1',
  formId: 'form-1',
  formVersionId: 'version-1',
  targetKind: 'organizer',
  targetId: null,
  applicantDisplayName: 'Ada',
  reviewStatus: status,
  answers: const [],
  outreach: const HostApplicationOutreach(
    phoneE164: null,
    email: null,
    instagramUrl: null,
    linkedinUrl: null,
  ),
  reviewNote: null,
  assignedReviewerUid: null,
  submittedAt: DateTime(2026, 9),
  reviewedAt: null,
  revision: 2,
  contactId: 'person-1',
  dataAccessState: 'submittedFormResponse',
  communityMembership: membership,
);

typedef _Decision = ({
  HostApplicationDetail application,
  HostCommunityMembership membership,
  HostCommunityMembershipAction action,
  String reason,
  String requestId,
});

class _MembershipController extends Fake implements HostApplicationsController {
  final calls = <_Decision>[];

  @override
  Future<HostCommunityMembershipDecision> decideCommunityMembership({
    required String organizerId,
    required HostApplicationDetail application,
    required HostCommunityMembership membership,
    required HostCommunityMembershipAction action,
    required String reason,
    required String requestId,
  }) async {
    expect(organizerId, 'org-1');
    calls.add((
      application: application,
      membership: membership,
      action: action,
      reason: reason,
      requestId: requestId,
    ));
    final grant = action == HostCommunityMembershipAction.grant;
    return HostCommunityMembershipDecision(
      membershipId: 'ocm_${'a' * 64}',
      decisionId: 'ocmd_${'b' * 64}',
      currentState: grant
          ? HostCommunityMembershipState.active
          : HostCommunityMembershipState.revoked,
      currentRevision: membership.revision + 1,
      replayed: false,
    );
  }
}
