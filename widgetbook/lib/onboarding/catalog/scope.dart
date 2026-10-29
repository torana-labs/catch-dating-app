import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/onboarding_draft_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/onboarding_draft.dart';
import 'package:catch_dating_app/contexts/profiles/domain/photo_upload_state.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_upload_controller.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_step.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;

enum WidgetbookOnboardingMode {
  idle,
  nameDobPrefilled,
  genderInterest,
  genderInterestSelected,
  instagramFilled,
  instagramSkipped,
  photos,
  saveProfilePending,
  saveProfileError,
  completePending,
  completeError,
}

class WidgetbookOnboardingScope extends StatelessWidget {
  const WidgetbookOnboardingScope({
    super.key,
    required this.child,
    this.uid = 'widgetbook-viewer',
    this.profile,
    this.uploadState = _idlePhotoUploadState,
    this.mode = WidgetbookOnboardingMode.idle,
  });

  final String? uid;
  final UserProfile? profile;
  final PhotoUploadState uploadState;
  final WidgetbookOnboardingMode mode;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final viewer =
        profile ?? ProfileSurfaceFixtures.viewer.copyWith(uid: uid ?? '');
    final effectiveProfile = uid == null ? null : viewer;

    return _OnboardingPreviewSeeder(
      key: ValueKey((uid, effectiveProfile, uploadState, mode)),
      mode: mode,
      overrides: [
        uidProvider.overrideWithValue(AsyncData<String?>(uid)),
        watchUserProfileProvider.overrideWith(
          (ref) => Stream.value(effectiveProfile),
        ),
        userProfileRepositoryProvider.overrideWithValue(
          ProfileFixtureUserProfileRepository(profile: effectiveProfile),
        ),
        authRepositoryProvider.overrideWithValue(
          const _WidgetbookOnboardingAuthRepository(),
        ),
        onboardingDraftRepositoryProvider.overrideWithValue(
          _WidgetbookOnboardingDraftRepository(),
        ),
        photoUploadControllerProvider.overrideWithValue(uploadState),
      ],
      child: child,
    );
  }
}

const PhotoUploadState _idlePhotoUploadState = PhotoUploadState();

// A plain nested ProviderScope would inherit the unscoped flow controller and
// mutations. Each specimen needs an independent root container, including when
// Widgetbook itself is already inside a provider scope.
class _OnboardingPreviewSeeder extends StatefulWidget {
  const _OnboardingPreviewSeeder({
    super.key,
    required this.overrides,
    required this.mode,
    required this.child,
  });

  final List<Override> overrides;
  final WidgetbookOnboardingMode mode;
  final Widget child;

  @override
  State<_OnboardingPreviewSeeder> createState() =>
      _OnboardingPreviewSeederState();
}

class _OnboardingPreviewSeederState extends State<_OnboardingPreviewSeeder> {
  late final _container = ProviderContainer(overrides: widget.overrides);
  Completer<void>? _pendingCompleter;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    // Retain completed error fixtures until their production consumers mount.
    _container.listen(OnboardingController.saveProfileMutation, (_, _) {});
    _container.listen(OnboardingController.completeMutation, (_, _) {});
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _seed();
      // Forms initialize text controllers on their first build. Mount them only
      // after seeding, also preserving state with golden TickerMode disabled.
      setState(() => _ready = true);
    });
  }

  @override
  void dispose() {
    _completePending();
    _container.dispose();
    super.dispose();
  }

  void _seed() {
    OnboardingController.saveProfileMutation.reset(_container);
    OnboardingController.completeMutation.reset(_container);

    final controller = _container.read(onboardingControllerProvider.notifier);
    switch (widget.mode) {
      case WidgetbookOnboardingMode.idle:
        break;
      case WidgetbookOnboardingMode.nameDobPrefilled:
        _seedBookingIdentity(controller);
        controller.goToStep(OnboardingStep.nameDob);
        break;
      case WidgetbookOnboardingMode.genderInterest:
        _seedBookingIdentity(controller);
        controller.goToStep(OnboardingStep.genderInterest);
        break;
      case WidgetbookOnboardingMode.genderInterestSelected:
        _seedGenderInterest(controller);
        break;
      case WidgetbookOnboardingMode.instagramFilled:
        _seedGenderInterest(controller);
        controller.setInstagramHandle('neharuns');
        controller.goToStep(OnboardingStep.instagram);
        break;
      case WidgetbookOnboardingMode.instagramSkipped:
        _seedGenderInterest(controller);
        controller.setInstagramHandle(null);
        controller.goToStep(OnboardingStep.instagram);
        break;
      case WidgetbookOnboardingMode.photos:
        _seedGenderInterest(controller);
        controller.goToStep(OnboardingStep.photos);
        break;
      case WidgetbookOnboardingMode.saveProfilePending:
        _seedGenderInterest(controller);
        _runPending(OnboardingController.saveProfileMutation);
        break;
      case WidgetbookOnboardingMode.saveProfileError:
        _seedGenderInterest(controller);
        _runError(
          OnboardingController.saveProfileMutation,
          const NetworkException(
            'widgetbook-onboarding-save-failed',
            'We could not save your profile. Please try again.',
            context: BackendErrorContext(
              service: BackendService.firestore,
              action: 'save onboarding profile',
              resource: 'users',
            ),
          ),
        );
        break;
      case WidgetbookOnboardingMode.completePending:
        controller.goToStep(OnboardingStep.runningPrefs);
        _runPending(OnboardingController.completeMutation);
        break;
      case WidgetbookOnboardingMode.completeError:
        controller.goToStep(OnboardingStep.runningPrefs);
        _runError(
          OnboardingController.completeMutation,
          const NetworkException(
            'widgetbook-onboarding-complete-failed',
            'We could not finish onboarding. Please try again.',
            context: BackendErrorContext(
              service: BackendService.firestore,
              action: 'complete onboarding',
              resource: 'users',
            ),
          ),
        );
        break;
    }
  }

  void _seedGenderInterest(OnboardingController controller) {
    _seedBookingIdentity(controller);
    controller
      ..setGenderInterest(
        gender: Gender.woman,
        interestedInGenders: const [Gender.man],
      )
      ..goToStep(OnboardingStep.genderInterest);
  }

  void _seedBookingIdentity(OnboardingController controller) {
    controller.setNameDob(
      firstName: 'Neha',
      lastName: 'Kapoor',
      dateOfBirth: DateTime(1996, 4, 12),
      phoneNumber: '9876543210',
      countryCode: '+91',
    );
  }

  void _runPending(Mutation<void> mutation) {
    final completer = Completer<void>();
    _pendingCompleter = completer;
    unawaited(mutation.run(_container, (_) => completer.future));
  }

  void _runError(Mutation<void> mutation, Object error) {
    unawaited(
      mutation.run(_container, (_) async => throw error).catchError((_) {}),
    );
  }

  void _completePending() {
    final completer = _pendingCompleter;
    _pendingCompleter = null;
    if (completer != null && !completer.isCompleted) {
      completer.complete();
    }
  }

  @override
  Widget build(BuildContext context) => UncontrolledProviderScope(
    container: _container,
    child: _ready ? widget.child : const SizedBox.shrink(),
  );
}

class _WidgetbookOnboardingAuthRepository implements AuthRepository {
  const _WidgetbookOnboardingAuthRepository();

  @override
  User? get currentUser => null;

  @override
  Stream<User?> authStateChanges() => Stream<User?>.value(null);

  @override
  Future<void> verifyPhoneNumber({
    required String phoneNumber,
    int? forceResendingToken,
    required void Function(String verificationId, int? resendToken) codeSent,
    required void Function(AppException e) verificationFailed,
    required void Function(PhoneAuthCredential credential)
    verificationCompleted,
  }) async {
    codeSent('widgetbook-onboarding-verification-id', null);
  }

  @override
  Future<void> signInWithOtp({
    required String verificationId,
    required String smsCode,
  }) async {}

  @override
  Future<void> signInWithCredential(AuthCredential credential) async {}

  @override
  Future<void> signOut() async {}
}

class _WidgetbookOnboardingDraftRepository
    implements OnboardingDraftRepository {
  OnboardingDraft? _draft;

  @override
  Future<OnboardingDraft?> fetchDraft({required String uid}) async => _draft;

  @override
  Future<void> saveDraft({
    required String uid,
    required OnboardingDraft draft,
  }) async {
    _draft = draft;
  }

  @override
  Future<void> deleteDraft({required String uid}) async {
    _draft = null;
  }
}
