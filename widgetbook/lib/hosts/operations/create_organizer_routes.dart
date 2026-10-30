import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_draft_controller.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_screen.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_create_organizer_screen.dart';
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

const _createOrganizerSteps = <int, String>{
  0: 'basics step',
  1: 'details step',
  2: 'host defaults step',
  3: 'event success defaults step',
};

List<PickedOrganizerPhoto> _createOrganizerPickedPhotos() {
  return [
    _createOrganizerPickedPhoto('club-cover-1'),
    _createOrganizerPickedPhoto('club-cover-2'),
  ];
}

PickedOrganizerPhoto _createOrganizerPickedPhoto(String name) {
  final bytes = widgetbookCreateOrganizerPngBytes();
  return PickedOrganizerPhoto(
    image: XFile.fromData(bytes, name: '$name.png', mimeType: 'image/png'),
    bytes: bytes,
  );
}

PickedOrganizerProfileImage _createOrganizerProfileImage() {
  final bytes = widgetbookCreateOrganizerPngBytes();
  return PickedOrganizerProfileImage(
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
  type: HostCreateOrganizerScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostCreateOrganizerRouteAndWizardStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostCreateClubScreen',
    contractId: 'screen.host.club.create',
    children: [
      WidgetbookPageStateCard(
        label: 'auth required',
        child: const WidgetbookHostDeviceFrame(
          child: _HostCreateOrganizerScope(
            uid: null,
            child: CreateOrganizerScreen(restoreSavedDraft: false),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'route entry',
        child: const WidgetbookHostDeviceFrame(
          child: _HostCreateOrganizerScope(
            child: CreateOrganizerScreen(restoreSavedDraft: false),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'basics validation',
        child: const WidgetbookHostDeviceFrame(
          child: _HostCreateOrganizerScope(
            child: CreateOrganizerScreen(
              restoreSavedDraft: false,
              formAutovalidateMode: AutovalidateMode.always,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'picked media',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateOrganizerScope(
            child: CreateOrganizerScreen(
              initialDraft: HostOperationsFixtures.organizerDraft,
              restoreSavedDraft: false,
              initialPickedOrganizerPhotos: _createOrganizerPickedPhotos(),
              initialProfileImage: _createOrganizerProfileImage(),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'restored draft',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateOrganizerScope(
            child: CreateOrganizerScreen(
              initialDraft: HostOperationsFixtures.organizerDraft,
              restoreSavedDraft: false,
            ),
          ),
        ),
      ),
      for (final step in _createOrganizerSteps.entries)
        WidgetbookPageStateCard(
          label: step.value,
          child: WidgetbookHostDeviceFrame(
            child: _HostCreateOrganizerScope(
              child: CreateOrganizerScreen(
                initialDraft: HostOperationsFixtures.organizerDraft,
                initialStep: step.key,
                restoreSavedDraft: false,
              ),
            ),
          ),
        ),
      WidgetbookPageStateCard(
        label: 'save draft pending',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateOrganizerScope(
            child: _HostCreateOrganizerMutationPreview(
              mode: _HostCreateOrganizerMutationPreviewMode.saveDraftPending,
              child: CreateOrganizerScreen(
                initialDraft: HostOperationsFixtures.organizerDraft,
                restoreSavedDraft: false,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'save draft error',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateOrganizerScope(
            child: _HostCreateOrganizerMutationPreview(
              mode: _HostCreateOrganizerMutationPreviewMode.saveDraftError,
              child: CreateOrganizerScreen(
                initialDraft: HostOperationsFixtures.organizerDraft,
                restoreSavedDraft: false,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'submit pending',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateOrganizerScope(
            child: _HostCreateOrganizerMutationPreview(
              mode: _HostCreateOrganizerMutationPreviewMode.submitPending,
              child: CreateOrganizerScreen(
                initialDraft: HostOperationsFixtures.organizerDraft,
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
          child: _HostCreateOrganizerScope(
            child: _HostCreateOrganizerMutationPreview(
              mode: _HostCreateOrganizerMutationPreviewMode.submitError,
              child: CreateOrganizerScreen(
                initialDraft: HostOperationsFixtures.organizerDraft,
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
          child: _HostCreateOrganizerScope(
            child: _HostCreateOrganizerMutationPreview(
              mode: _HostCreateOrganizerMutationPreviewMode.submitOffline,
              child: CreateOrganizerScreen(
                initialDraft: HostOperationsFixtures.organizerDraft,
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
            child: _HostCreateOrganizerScope(
              child: CreateOrganizerScreen(
                initialDraft: HostOperationsFixtures.organizerDraft,
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
            child: _HostCreateOrganizerScope(
              child: CreateOrganizerScreen(
                initialDraft: HostOperationsFixtures.organizerDraft,
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
          child: _HostCreateOrganizerScope(
            themeMode: ThemeMode.dark,
            child: CreateOrganizerScreen(
              initialDraft: HostOperationsFixtures.organizerDraft,
              initialStep: 3,
              restoreSavedDraft: false,
            ),
          ),
        ),
      ),
    ],
  );
}

enum _HostCreateOrganizerMutationPreviewMode {
  saveDraftPending,
  saveDraftError,
  submitPending,
  submitError,
  submitOffline,
}

class _HostCreateOrganizerMutationPreview extends ConsumerStatefulWidget {
  const _HostCreateOrganizerMutationPreview({
    required this.mode,
    required this.child,
  });

  final _HostCreateOrganizerMutationPreviewMode mode;
  final Widget child;

  @override
  ConsumerState<_HostCreateOrganizerMutationPreview> createState() =>
      _HostCreateOrganizerMutationPreviewState();
}

class _HostCreateOrganizerMutationPreviewState
    extends ConsumerState<_HostCreateOrganizerMutationPreview> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      CreateOrganizerController.submitMutation.reset(ref);
      CreateOrganizerDraftController.saveDraftMutation.reset(ref);
      switch (widget.mode) {
        case _HostCreateOrganizerMutationPreviewMode.saveDraftPending:
          _runPending(CreateOrganizerDraftController.saveDraftMutation);
          break;
        case _HostCreateOrganizerMutationPreviewMode.saveDraftError:
          _runError(
            CreateOrganizerDraftController.saveDraftMutation,
            StateError('Widgetbook club draft save failed'),
          );
          break;
        case _HostCreateOrganizerMutationPreviewMode.submitPending:
          _runPending(CreateOrganizerController.submitMutation);
          break;
        case _HostCreateOrganizerMutationPreviewMode.submitError:
          _runError(
            CreateOrganizerController.submitMutation,
            StateError('Widgetbook club submit failed'),
          );
          break;
        case _HostCreateOrganizerMutationPreviewMode.submitOffline:
          _runError(
            CreateOrganizerController.submitMutation,
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
  type: CreateOrganizerScreen,
  path: '[P1 product surfaces]/Host create club',
)
Widget createOrganizerScreenCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CreateClubScreen',
    contractId: 'screen.host.club.create.form',
    children: [
      WidgetbookPageStateCard(
        label: 'draft restored',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateOrganizerScope(
            child: CreateOrganizerScreen(
              initialDraft: HostOperationsFixtures.organizerDraft,
              restoreSavedDraft: false,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'media picked',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateOrganizerScope(
            child: CreateOrganizerScreen(
              initialDraft: HostOperationsFixtures.organizerDraft,
              initialPickedOrganizerPhotos: _createOrganizerPickedPhotos(),
              initialProfileImage: _createOrganizerProfileImage(),
              restoreSavedDraft: false,
            ),
          ),
        ),
      ),
    ],
  );
}

class _HostCreateOrganizerScope extends StatelessWidget {
  const _HostCreateOrganizerScope({
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
      watchOrganizerMembershipProvider(
        widgetbookOrganizer.id,
        effectiveUid,
      ).overrideWith((ref) => Stream<OrganizerMembership?>.value(null)),
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
