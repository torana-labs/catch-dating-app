import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_membership.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/create_club_controller.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/create_club_draft_controller.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/create_club_screen.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/host_create_club_screen.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'role_theme.dart';

const _createClubSteps = <int, String>{
  0: 'basics step',
  1: 'details step',
  2: 'host defaults step',
  3: 'event success defaults step',
};

List<PickedClubPhoto> _createClubPickedPhotos() {
  return [
    _createClubPickedPhoto('club-cover-1'),
    _createClubPickedPhoto('club-cover-2'),
  ];
}

PickedClubPhoto _createClubPickedPhoto(String name) {
  final bytes = widgetbookCreateClubPngBytes();
  return PickedClubPhoto(
    image: XFile.fromData(bytes, name: '$name.png', mimeType: 'image/png'),
    bytes: bytes,
  );
}

PickedClubProfileImage _createClubProfileImage() {
  final bytes = widgetbookCreateClubPngBytes();
  return PickedClubProfileImage(
    image: XFile.fromData(
      bytes,
      name: 'club-profile.png',
      mimeType: 'image/png',
    ),
    bytes: bytes,
  );
}

@widgetbook.UseCase(
  name: 'Route and wizard states',
  type: HostCreateClubScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostCreateClubRouteAndWizardStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostCreateClubScreen',
    contractId: 'screen.host.club.create',
    children: [
      WidgetbookPageStateCard(
        label: 'auth required',
        child: const WidgetbookHostDeviceFrame(
          child: _HostCreateClubScope(
            uid: null,
            child: CreateClubScreen(restoreSavedDraft: false),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'route entry',
        child: const WidgetbookHostDeviceFrame(
          child: _HostCreateClubScope(
            child: CreateClubScreen(restoreSavedDraft: false),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'basics validation',
        child: const WidgetbookHostDeviceFrame(
          child: _HostCreateClubScope(
            child: CreateClubScreen(
              restoreSavedDraft: false,
              formAutovalidateMode: AutovalidateMode.always,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'picked media',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateClubScope(
            child: CreateClubScreen(
              initialDraft: HostOperationsFixtures.clubDraft,
              restoreSavedDraft: false,
              initialPickedClubPhotos: _createClubPickedPhotos(),
              initialProfileImage: _createClubProfileImage(),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'restored draft',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateClubScope(
            child: CreateClubScreen(
              initialDraft: HostOperationsFixtures.clubDraft,
              restoreSavedDraft: false,
            ),
          ),
        ),
      ),
      for (final step in _createClubSteps.entries)
        WidgetbookPageStateCard(
          label: step.value,
          child: WidgetbookHostDeviceFrame(
            child: _HostCreateClubScope(
              child: CreateClubScreen(
                initialDraft: HostOperationsFixtures.clubDraft,
                initialStep: step.key,
                restoreSavedDraft: false,
              ),
            ),
          ),
        ),
      WidgetbookPageStateCard(
        label: 'save draft pending',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateClubScope(
            child: _HostCreateClubMutationPreview(
              mode: _HostCreateClubMutationPreviewMode.saveDraftPending,
              child: CreateClubScreen(
                initialDraft: HostOperationsFixtures.clubDraft,
                restoreSavedDraft: false,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'save draft error',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateClubScope(
            child: _HostCreateClubMutationPreview(
              mode: _HostCreateClubMutationPreviewMode.saveDraftError,
              child: CreateClubScreen(
                initialDraft: HostOperationsFixtures.clubDraft,
                restoreSavedDraft: false,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'submit pending',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateClubScope(
            child: _HostCreateClubMutationPreview(
              mode: _HostCreateClubMutationPreviewMode.submitPending,
              child: CreateClubScreen(
                initialDraft: HostOperationsFixtures.clubDraft,
                initialStep: 3,
                restoreSavedDraft: false,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'submit error',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateClubScope(
            child: _HostCreateClubMutationPreview(
              mode: _HostCreateClubMutationPreviewMode.submitError,
              child: CreateClubScreen(
                initialDraft: HostOperationsFixtures.clubDraft,
                initialStep: 3,
                restoreSavedDraft: false,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'submit offline',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateClubScope(
            child: _HostCreateClubMutationPreview(
              mode: _HostCreateClubMutationPreviewMode.submitOffline,
              child: CreateClubScreen(
                initialDraft: HostOperationsFixtures.clubDraft,
                initialStep: 3,
                restoreSavedDraft: false,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: const TextScaler.linear(2),
            child: _HostCreateClubScope(
              child: CreateClubScreen(
                initialDraft: HostOperationsFixtures.clubDraft,
                initialStep: 1,
                restoreSavedDraft: false,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: _HostCreateClubScope(
              child: CreateClubScreen(
                initialDraft: HostOperationsFixtures.clubDraft,
                initialStep: 2,
                restoreSavedDraft: false,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dark theme',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateClubScope(
            themeMode: ThemeMode.dark,
            child: CreateClubScreen(
              initialDraft: HostOperationsFixtures.clubDraft,
              initialStep: 3,
              restoreSavedDraft: false,
            ),
          ),
        ),
      ),
    ],
  );
}

enum _HostCreateClubMutationPreviewMode {
  saveDraftPending,
  saveDraftError,
  submitPending,
  submitError,
  submitOffline,
}

class _HostCreateClubMutationPreview extends ConsumerStatefulWidget {
  const _HostCreateClubMutationPreview({
    required this.mode,
    required this.child,
  });

  final _HostCreateClubMutationPreviewMode mode;
  final Widget child;

  @override
  ConsumerState<_HostCreateClubMutationPreview> createState() =>
      _HostCreateClubMutationPreviewState();
}

class _HostCreateClubMutationPreviewState
    extends ConsumerState<_HostCreateClubMutationPreview> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      CreateClubController.submitMutation.reset(ref);
      CreateClubDraftController.saveDraftMutation.reset(ref);
      switch (widget.mode) {
        case _HostCreateClubMutationPreviewMode.saveDraftPending:
          _runPending(CreateClubDraftController.saveDraftMutation);
          break;
        case _HostCreateClubMutationPreviewMode.saveDraftError:
          _runError(
            CreateClubDraftController.saveDraftMutation,
            StateError('Widgetbook club draft save failed'),
          );
          break;
        case _HostCreateClubMutationPreviewMode.submitPending:
          _runPending(CreateClubController.submitMutation);
          break;
        case _HostCreateClubMutationPreviewMode.submitError:
          _runError(
            CreateClubController.submitMutation,
            StateError('Widgetbook club submit failed'),
          );
          break;
        case _HostCreateClubMutationPreviewMode.submitOffline:
          _runError(
            CreateClubController.submitMutation,
            obviousOfflineException(),
          );
          break;
      }
    });
  }

  void _runPending<T>(Mutation<T> mutation) {
    final completer = Completer<T>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError<T>(Mutation<T> mutation, Object error) {
    unawaited(
      mutation
          .run(ref, (_) async => throw error)
          .then<void>((_) {}, onError: (_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

@widgetbook.UseCase(
  name: 'Direct form states',
  type: CreateClubScreen,
  path: '[P1 product surfaces]/Host create club',
)
Widget createClubScreenCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CreateClubScreen',
    contractId: 'screen.host.club.create.form',
    children: [
      WidgetbookPageStateCard(
        label: 'draft restored',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateClubScope(
            child: CreateClubScreen(
              initialDraft: HostOperationsFixtures.clubDraft,
              restoreSavedDraft: false,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'media picked',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateClubScope(
            child: CreateClubScreen(
              initialDraft: HostOperationsFixtures.clubDraft,
              initialPickedClubPhotos: _createClubPickedPhotos(),
              initialProfileImage: _createClubProfileImage(),
              restoreSavedDraft: false,
            ),
          ),
        ),
      ),
    ],
  );
}

class _HostCreateClubScope extends StatelessWidget {
  const _HostCreateClubScope({
    required this.child,
    this.uid = 'design-host-owner',
    this.themeMode = ThemeMode.light,
  });

  final Widget child;
  final String? uid;
  final ThemeMode themeMode;

  @override
  Widget build(BuildContext context) {
    final effectiveUid = uid ?? widgetbookHostUid;
    final overrides = [
      uidProvider.overrideWithValue(AsyncData<String?>(uid)),
      watchUserProfileProvider.overrideWith(
        (ref) =>
            Stream.value(uid == null ? null : HostOperationsFixtures.owner),
      ),
      watchClubMembershipProvider(
        widgetbookClub.id,
        effectiveUid,
      ).overrideWith((ref) => Stream<ClubMembership?>.value(null)),
    ];

    return WidgetbookAppRoleBoundary(
      role: AppRole.host,
      child: WidgetbookFixtureScope(
        overrides: overrides,
        child: WidgetbookThemedHostPreview(themeMode: themeMode, child: child),
      ),
    );
  }
}
