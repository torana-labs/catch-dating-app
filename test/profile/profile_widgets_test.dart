import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';
import 'package:catch_dating_app/contexts/profiles/domain/photo_upload_state.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_validation.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_grid.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_upload_controller.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/shell/app_shell_active_tab.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_body.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_surface.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profiles_controller.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profiles_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/profile_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_screen_state.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_screen_state_provider.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_inline_editors.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_insights_tab_sliver_body.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_preview_body.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_sliver_header.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_tab_body.dart';
import 'package:catch_tokens/catch_tokens.dart'
    show CatchFieldTokens, CatchInsets, CatchLayout, CatchMotion, CatchTokens;
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';

part 'profile_choice_editors_tests.dart';
part 'profile_editing_prompts_tests.dart';
part 'profile_shell_layout_tests.dart';

Future<void> _openRunningPreferences(WidgetTester tester) async {
  final disclosure = find.byKey(const ValueKey('profile-running-preferences'));
  await _dragProfileTabUntilTappable(tester, disclosure);
  await tester.tap(disclosure);
  await _pumpProfileSheet(tester);
}

Widget _profileTab(UserProfile user) {
  return ProviderScope(
    child: MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(
        body: ProfileTabBody(
          user: user,
          uploadState: const PhotoUploadState(),
          builder: (context, children) => ListView(
            key: const ValueKey('profile-tab-scroll-view'),
            padding: CatchInsets.pageBody.copyWith(left: 0, right: 0),
            children: children,
          ),
        ),
      ),
    ),
  );
}

Widget _profileWidgetHarness(Widget child) {
  return ProviderScope(
    child: MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(body: child),
    ),
  );
}

Future<void> _pumpProfileTab(WidgetTester tester, UserProfile user) async {
  tester.view.devicePixelRatio = 1.0;
  tester.view.physicalSize = const Size(390, 2200);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(_profileTab(user));
  await tester.pump();
}

UserProfile _profilePreviewScrollFixture() {
  return buildUser(name: 'Suvrat Garg').copyWith(
    relationshipGoal: RelationshipGoal.relationship,
    height: 178,
    occupation: 'Product designer',
    company: 'Catch',
    education: EducationLevel.masters,
    religion: Religion.hindu,
    languages: const [Language.english, Language.hindi],
    drinking: DrinkingHabit.socially,
    smoking: SmokingHabit.never,
    workout: WorkoutFrequency.often,
    diet: DietaryPreference.vegetarian,
    children: ChildrenStatus.wantSomeday,
  );
}

const _obstructedProfileScreenSize = Size(393, 852);
const _profileBottomOverlayInset = 102.0;

Future<void> _pumpObstructedProfileScreen(WidgetTester tester) async {
  tester.view.devicePixelRatio = 1.0;
  tester.view.physicalSize = _obstructedProfileScreenSize;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        watchUserProfileProvider.overrideWith(
          (ref) => Stream.value(_profilePreviewScrollFixture()),
        ),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        home: const MediaQuery(
          data: MediaQueryData(
            size: _obstructedProfileScreenSize,
            padding: EdgeInsets.only(bottom: 34),
            viewPadding: EdgeInsets.only(bottom: 34),
          ),
          child: CatchTabViewportScope(
            index: appShellProfileTabIndex,
            bottomOverlayInset: _profileBottomOverlayInset,
            bottomBarPlacement: CatchTabViewportScopePlacement.floating,
            child: ProfileScreen(),
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

Future<ScrollPosition> _positionProfileFieldNearOverlay(
  WidgetTester tester,
  Finder field,
) async {
  await tester.dragUntilVisible(
    field,
    find.byKey(const PageStorageKey('profile-edit-tab-scroll')),
    const Offset(0, -320),
  );
  await tester.pump();

  final position = Scrollable.of(tester.element(field)).position;
  final fieldRect = tester.getRect(field);
  position.jumpTo(
    (position.pixels + fieldRect.bottom - 740)
        .clamp(position.minScrollExtent, position.maxScrollExtent)
        .toDouble(),
  );
  await tester.pump();
  expect(tester.getRect(field).bottom, inInclusiveRange(739, 742.1));
  return position;
}

Future<void> _pumpEditableProfileTab(
  WidgetTester tester,
  UserProfile user,
  FakeProfileEditUserProfileRepository repository,
) async {
  repository.latestProfile = user;
  tester.view.devicePixelRatio = 1.0;
  tester.view.physicalSize = const Size(390, 2200);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(_editableProfileTab(user, repository));
  await tester.pump();
  await tester.pump();
}

Widget _editableProfileTab(
  UserProfile user,
  FakeProfileEditUserProfileRepository repository,
) {
  return ProviderScope(
    overrides: [
      // Test-only scoped overrides deliberately replace app-root providers.
      // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
      uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
      // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
      errorLoggerProvider.overrideWithValue(_SilentErrorLogger()),
      // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
      userProfileRepositoryProvider.overrideWithValue(repository),
    ],
    child: _ProfileEditProviderPrimer(
      child: MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: ProfileTabBody(
            user: user,
            uploadState: const PhotoUploadState(),
            builder: (context, children) => ListView(
              key: const ValueKey('profile-tab-scroll-view'),
              padding: CatchInsets.pageBody.copyWith(left: 0, right: 0),
              children: children,
            ),
          ),
        ),
      ),
    ),
  );
}

Future<void> _dragProfileTabUntilVisible(
  WidgetTester tester,
  Finder finder,
) async {
  await tester.dragUntilVisible(
    finder,
    find.byKey(const ValueKey('profile-tab-scroll-view')),
    const Offset(0, -300),
  );
  await tester.ensureVisible(finder);
  await tester.pump();
}

Future<void> _dragProfileTabUntilTappable(
  WidgetTester tester,
  Finder finder,
) async {
  await _dragProfileTabUntilVisible(tester, finder);
  await tester.drag(
    find.byKey(const ValueKey('profile-tab-scroll-view')),
    const Offset(0, -260),
  );
  await tester.pump();
}

Finder _profileInfoTile(String label) => find.byWidgetPredicate(
  (widget) =>
      widget is CatchField &&
      (widget.title == label || widget.body == label) &&
      widget.variant == CatchFieldVariant.row,
);

Finder _editableTextForProfileField(String label) => find.descendant(
  of: _profileInfoTile(label),
  matching: find.byType(EditableText),
);

Finder _inlinePromptEditableText() => find.descendant(
  of: find.byKey(const ValueKey('profile-prompt-answer-0')),
  matching: find.byType(EditableText),
);

Finder _promptQuestionField(int index) =>
    find.byKey(ValueKey('profile-prompt-question-$index'));

Finder _promptAnswerField(int index) =>
    find.byKey(ValueKey('profile-prompt-answer-$index'));

Finder _promptAnswerEditableText(int index) => find.descendant(
  of: _promptAnswerField(index),
  matching: find.byType(EditableText),
);

Finder _profileOptionGroup() => find.byType(CatchChoiceInput<SelfProfileTab>);

Finder _catchChip(String label) => find.byWidgetPredicate(
  (widget) =>
      widget is CatchChip && widget.mode != null && widget.label == label,
);

int _loadingCatchButtonCount(WidgetTester tester) => find
    .descendant(
      of: find.byKey(const ValueKey('catch-field-done')),
      matching: find.byKey(const ValueKey('catch-field-spinner')),
    )
    .evaluate()
    .length;

int _promptAnswerSavingCount(int index) => find
    .descendant(
      of: _promptAnswerField(index),
      matching: find.byKey(const ValueKey('catch-field-spinner')),
    )
    .evaluate()
    .length;

Future<void> _blurPromptAnswer(WidgetTester tester, {int index = 0}) async {
  tester
      .widget<EditableText>(_promptAnswerEditableText(index))
      .focusNode
      .unfocus();
  await tester.pump();
}

Future<void> _tapInlineDone(WidgetTester tester) async {
  final doneButton = find.descendant(
    of: find.byKey(const ValueKey('catch-field-done')),
    matching: find.byType(TextButton),
  );
  tester.widget<TextButton>(doneButton).onPressed?.call();
  await tester.pump();
}

Future<void> _tapInlineCancel(WidgetTester tester) async {
  final cancelButton = find.descendant(
    of: find.byKey(const ValueKey('catch-field-cancel')),
    matching: find.byType(TextButton),
  );
  tester.widget<TextButton>(cancelButton).onPressed?.call();
  await tester.pump();
}

final _perfectRunPromptTitle = profilePromptDefinition(
  profilePromptPerfectEventId,
).title;

void main() {
  _registerProfileShellLayoutTests();
  _registerProfileEditingPromptsTests();
  _registerProfileChoiceEditorsTests();
}

Future<void> _pumpProfileSheet(WidgetTester tester) async {
  await pumpFeatureUi(tester);
}

const _nullableSingleChoiceFields = [
  (tileLabel: 'Education', firstLabel: 'High school'),
  (tileLabel: 'Religion', firstLabel: 'Hindu'),
  (tileLabel: 'Looking for', firstLabel: 'Long-term relationship'),
  (tileLabel: 'Drinking', firstLabel: 'Never'),
  (tileLabel: 'Smoking', firstLabel: 'Never'),
  (tileLabel: 'Workout', firstLabel: 'Never'),
  (tileLabel: 'Diet', firstLabel: 'Omnivore'),
  (tileLabel: 'Children', firstLabel: "Don't have"),
  (tileLabel: 'City', firstLabel: 'Mumbai'),
];

class _ProfileHeaderHarness extends StatefulWidget {
  const _ProfileHeaderHarness();

  @override
  State<_ProfileHeaderHarness> createState() => _ProfileHeaderHarnessState();
}

class _ProfileHeaderHarnessState extends State<_ProfileHeaderHarness>
    with SingleTickerProviderStateMixin {
  late final TabController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TabController(
      length: SelfProfileTab.values.length,
      vsync: this,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            ...CatchSliverHeader(
              title: const CatchTopBar.primaryRail(
                title: 'Your profile',
                actions: [ProfileSettingsButton()],
              ),
              bottomHeight: CatchLayout.tabRailHeight,
              bottom: ProfileTabBar(controller: _controller),
            ).buildSlivers(context),
            SliverList.builder(
              itemCount: 30,
              itemBuilder: (context, index) =>
                  SizedBox(height: 56, child: Text('Profile content $index')),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileEditProviderPrimer extends ConsumerWidget {
  const _ProfileEditProviderPrimer({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(uidProvider);
    return child;
  }
}

class _ProfileUploadFailureSeeder extends ConsumerStatefulWidget {
  const _ProfileUploadFailureSeeder();

  @override
  ConsumerState<_ProfileUploadFailureSeeder> createState() =>
      _ProfileUploadFailureSeederState();
}

class _ProfileUploadFailureSeederState
    extends ConsumerState<_ProfileUploadFailureSeeder> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      PhotoUploadController.uploadPhotoMutation.reset(ref);
      unawaited(
        PhotoUploadController.uploadPhotoMutation
            .run(ref, (tx) async {
              await tx
                  .get(photoUploadControllerProvider.notifier)
                  .pickAndUpload(1);
            })
            .catchError((_) {}),
      );
    });
  }

  @override
  Widget build(BuildContext context) => const ProfileScreen();
}

class _FailingProfileImageUploadRepository extends Fake
    implements ImageUploadRepository {
  @override
  Future<XFile?> pickImage({
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    int? imageQuality,
  }) async {
    return XFile('picked-profile-photo.jpg');
  }

  @override
  Future<UploadedImage> uploadUserProfilePhoto({
    required String uid,
    required int index,
    required XFile image,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) async {
    throw obviousOfflineException();
  }
}

class FakeProfileEditUserProfileRepository extends Fake
    implements UserProfileRepository {
  Completer<void>? updateCompleter;
  Object? updateError;
  UserProfile? latestProfile;
  String? updatedUid;
  Map<String, dynamic>? updatedFields;
  final List<Map<String, dynamic>> updateHistory = [];

  @override
  Future<UserProfile?> fetchUserProfile({required String? uid}) async =>
      latestProfile;

  @override
  Future<void> updateUserProfile({
    required String uid,
    required UpdateUserProfilePatch patch,
    String action = 'update_profile',
  }) async {
    updatedUid = uid;
    final fields = Map<String, dynamic>.from(patch.toFieldsJson());
    updatedFields = fields;
    updateHistory.add(fields);
    final error = updateError;
    if (error != null) throw error;
    final completer = updateCompleter;
    if (completer != null) await completer.future;

    final promptFields = fields['profilePrompts'];
    if (promptFields case final List<Object?> promptValues) {
      latestProfile = latestProfile?.copyWith(
        profilePrompts: [
          for (final promptValue in promptValues)
            ProfilePromptAnswer.fromJson(
              Map<String, dynamic>.from(promptValue! as Map),
            ),
        ],
      );
    }
  }
}

class _SilentErrorLogger extends ErrorLogger {
  _SilentErrorLogger() : super(crashReporter: null, shouldReportErrors: false);

  @override
  void log({
    required LogLevel level,
    required String message,
    Object? error,
    StackTrace? stackTrace,
    Map<String, String>? context,
  }) {}
}

class _AccountFormProfilesController extends FormProfilesController {
  @override
  Future<FormProfilesState> build() async => FormProfilesState(
    page: FormProfilePage(
      items: [
        FormProfileSummary(
          organizerId: 'org',
          responseId: 'owned-response',
          formTitle: 'Application',
          organizerName: 'RSVP Demo',
          submittedAt: DateTime(2026, 9, 23),
          claimedAt: null,
          cardFieldCount: 1,
        ),
      ],
      nextCursor: null,
    ),
  );
}
