import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/onboarding_draft_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/onboarding_draft.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

typedef VerifyPhoneNumberHandler =
    FutureOr<void> Function({
      required PhoneVerificationCompleted verificationCompleted,
      required PhoneVerificationFailed verificationFailed,
      required PhoneCodeSent codeSent,
      required PhoneCodeAutoRetrievalTimeout codeAutoRetrievalTimeout,
    });

class TestUser extends Fake implements User {
  TestUser({required this.uid, this.phoneNumber});

  @override
  final String uid;

  @override
  final String? phoneNumber;
}

class FakeAuthRepository extends Fake implements AuthRepository {
  final StreamController<User?> _authStateController =
      StreamController<User?>.broadcast();

  User? currentUserValue;
  String? otpVerificationId;
  String? otpSmsCode;
  AuthCredential? credential;
  String? verifiedPhoneNumber;
  int? forceResendingToken;
  int signInWithOtpCallCount = 0;
  int verifyPhoneNumberCallCount = 0;
  Object? signInWithOtpError;
  Completer<void>? signInWithOtpCompleter;
  VerifyPhoneNumberHandler? onVerifyPhoneNumber;

  @override
  User? get currentUser => currentUserValue;

  @override
  Stream<User?> authStateChanges() => _authStateController.stream;

  @override
  Future<void> verifyPhoneNumber({
    required String phoneNumber,
    int? forceResendingToken,
    required void Function(String verificationId, int? resendToken) codeSent,
    required void Function(AppException e) verificationFailed,
    required void Function(PhoneAuthCredential credential)
    verificationCompleted,
  }) async {
    const context = BackendErrorContext(
      service: BackendService.auth,
      action: 'send verification code',
      resource: 'phone_auth',
    );
    verifyPhoneNumberCallCount += 1;
    verifiedPhoneNumber = phoneNumber;
    this.forceResendingToken = forceResendingToken;
    await onVerifyPhoneNumber?.call(
      verificationCompleted: verificationCompleted,
      verificationFailed: (error) {
        verificationFailed(normalizeBackendError(error, context: context));
      },
      codeSent: codeSent,
      codeAutoRetrievalTimeout: (_) {},
    );
  }

  @override
  Future<void> signInWithOtp({
    required String verificationId,
    required String smsCode,
  }) async {
    signInWithOtpCallCount += 1;
    if (signInWithOtpError case final error?) {
      throw error;
    }
    if (signInWithOtpCompleter case final completer?) {
      await completer.future;
    }
    otpVerificationId = verificationId;
    otpSmsCode = smsCode;
  }

  @override
  Future<void> signInWithCredential(AuthCredential credential) async {
    this.credential = credential;
  }

  Future<void> dispose() async {
    if (_authStateController.isClosed) {
      return;
    }
    await _authStateController.close();
  }
}

class FakeOnboardingUserProfileRepository extends Fake
    implements UserProfileRepository {
  FakeOnboardingUserProfileRepository({this.currentUser});

  UserProfile? currentUser;
  UserProfile? lastSavedUser;
  Map<String, dynamic>? lastPatch;

  @override
  Future<UserProfile?> fetchUserProfile({required String? uid}) async =>
      currentUser;

  @override
  Stream<UserProfile?> watchUserProfile({required String? uid}) =>
      Stream.value(currentUser);

  @override
  Future<void> setUserProfile({required UserProfile userProfile}) async {
    lastSavedUser = userProfile;
    currentUser = userProfile;
  }

  @override
  Future<void> updateUserProfile({
    required String uid,
    required UpdateUserProfilePatch patch,
    String action = 'update profile',
  }) async {
    final updated = Map<String, dynamic>.from(patch.toFieldsJson());
    lastPatch = updated;
    final original = currentUser ?? buildUser(uid: uid);
    currentUser = original.copyWith(
      dateOfBirth: updated['dateOfBirth'] == null
          ? original.dateOfBirth
          : DateTime.fromMillisecondsSinceEpoch(updated['dateOfBirth'] as int),
      gender: updated['gender'] == null
          ? original.gender
          : Gender.values.byName(updated['gender'] as String),
      interestedInGenders: updated['interestedInGenders'] == null
          ? original.interestedInGenders
          : (updated['interestedInGenders'] as List)
                .map((v) => Gender.values.byName(v as String))
                .toList(),
    );
    if (updated.containsKey('profileComplete')) {
      currentUser = (currentUser ?? buildUser(uid: uid)).copyWith(
        profileComplete: updated['profileComplete'] as bool,
      );
    }
    if (updated.containsKey('profilePrompts')) {
      currentUser = (currentUser ?? buildUser(uid: uid)).copyWith(
        profilePrompts: (updated['profilePrompts'] as List)
            .map(
              (e) => ProfilePromptAnswer.fromJson(
                Map<String, dynamic>.from(e as Map),
              ),
            )
            .toList(),
      );
    }
    if (updated.containsKey('activityPreferences')) {
      currentUser = (currentUser ?? buildUser(uid: uid)).copyWith(
        activityPreferences: ActivityPreferences.fromJson(
          Map<String, dynamic>.from(updated['activityPreferences'] as Map),
        ),
      );
    }
    lastSavedUser = currentUser;
  }
}

class FakeOnboardingDraftRepository extends Fake
    implements OnboardingDraftRepository {
  OnboardingDraft? draft;

  @override
  Future<OnboardingDraft?> fetchDraft({required String uid}) async => draft;

  @override
  Future<void> saveDraft({
    required String uid,
    required OnboardingDraft draft,
  }) async {
    this.draft = draft;
  }

  @override
  Future<void> deleteDraft({required String uid}) async {
    draft = null;
  }
}

ProviderContainer createOnboardingTestContainer({
  List<Object> overrides = const [],
  AppAnalytics? appAnalytics,
}) {
  final effectiveOverrides = <Object>[
    appAnalyticsProvider.overrideWithValue(
      appAnalytics ??
          AppAnalytics(
            reporter: _NoOpAnalyticsReporter(),
            shouldCollect: false,
          ),
    ),
    ...overrides,
  ];
  final container = ProviderContainer(overrides: effectiveOverrides.cast());
  OnboardingController.saveProfileMutation.reset(container);
  OnboardingController.completeMutation.reset(container);
  return container;
}

Future<void> pumpOnboardingPage(
  WidgetTester tester, {
  required ProviderContainer container,
  required Widget child,
}) async {
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: AppTheme.light,
        builder: (context, child) =>
            CatchNoticeOverlay(child: child ?? const SizedBox.shrink()),
        home: Scaffold(body: child),
      ),
    ),
  );
  await pumpOnboardingUi(tester);
}

Future<void> pumpOnboardingScreen(
  WidgetTester tester, {
  required ProviderContainer container,
  required Widget child,
}) async {
  addTearDown(() async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  });
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(theme: AppTheme.light, home: child),
    ),
  );
  await tester.pump();
  await pumpOnboardingUi(tester);
}

const _onboardingAnimationDuration = Duration(milliseconds: 400);

Future<void> pumpOnboardingUi(WidgetTester tester) async {
  await tester.pump(_onboardingAnimationDuration);
  await tester.pump();
}

Future<void> primeOnboardingAsyncProviders(ProviderContainer container) async {
  final uidSubscription = container.listen(
    uidProvider,
    (_, _) {},
    fireImmediately: true,
  );
  final userProfileSubscription = container.listen(
    watchUserProfileProvider,
    (_, _) {},
    fireImmediately: true,
  );
  try {
    await container.pump();
  } finally {
    uidSubscription.close();
    userProfileSubscription.close();
  }
}

final class _NoOpAnalyticsReporter implements AnalyticsReporter {
  @override
  Future<void> logEvent(String name, {Map<String, Object>? parameters}) async {}

  @override
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {}

  @override
  Future<void> setCollectionEnabled(bool enabled) async {}

  @override
  Future<void> setUserId(String? userId) async {}
}
