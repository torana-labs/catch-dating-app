import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_team_workspace_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_team_workspace_view_model.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'role_theme.dart';
import 'shell_fixture.dart';

HostProfile _hostProfileVariant(HostProfileStatus status) {
  final suffix = switch (status) {
    HostProfileStatus.active => 'Active',
    HostProfileStatus.pending => 'Pending',
    HostProfileStatus.suspended => 'Suspended',
  };
  return HostProfile(
    uid: widgetbookHostUid,
    displayName: 'Mira Shah',
    roleTitle: '$suffix host profile',
    bio:
        'Runs hosted event formats with clear arrival cues, structured prompts, and visible safety follow-through.',
    status: status,
    verified: status == HostProfileStatus.active,
    linkedClubIds: [HostOperationsFixtures.primaryClub.id],
    createdAt: HostOperationsFixtures.now.subtract(const Duration(days: 400)),
    updatedAt: HostOperationsFixtures.now.subtract(const Duration(days: 2)),
  );
}

@widgetbook.UseCase(
  name: 'Covered by host team route states',
  type: HostTeamProfileList,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
@widgetbook.UseCase(
  name: 'Route states',
  type: HostClubTeamScreen,
  path: '[P2 host surfaces]/Host team',
)
Widget hostTeamRouteStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostClubTeamScreen',
    contractId: 'screen.host.clubs',
    children: [
      WidgetbookPageStateCard(
        label: 'auth required',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            uid: null,
            child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'fallback profile from club',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostProfileStream:
                HostOperationsFixtures.loadingStream<HostProfile?>(),
            child: const HostClubTeamScreen(clubId: 'design-host-sea-face'),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'active profile and clubs',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'clubs loading',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            hostedClubsStream:
                HostOperationsFixtures.loadingStream<List<Club>>(),
            child: const HostClubTeamScreen(clubId: 'design-host-sea-face'),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'clubs error',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            ownedClubsStream: HostOperationsFixtures.errorStream<List<Club>>(
              'Hosted clubs failed',
            ),
            child: const HostClubTeamScreen(clubId: 'design-host-sea-face'),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: TextScaler.linear(2),
            child: WidgetbookHostShellScope(
              child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: WidgetbookHostShellScope(
              child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dark theme',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            themeMode: ThemeMode.dark,
            child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Profile summary states',
  type: HostTeamProfileSection,
  path: '[P2 host surfaces]/Host team',
)
Widget hostTeamProfileSummaryStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostTeamProfileSection',
    contractId: 'section.host.team.profile',
    children: [
      WidgetbookPageStateCard(
        label: 'profile loading',
        child: const WidgetbookHostDeviceFrame(
          child: _HostTeamProfileFrame(state: HostTeamProfileLoading()),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'profile error',
        child: WidgetbookHostDeviceFrame(
          child: _HostTeamProfileFrame(
            state: HostTeamProfileError(
              error: StateError('Host profile failed'),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'no profile',
        child: const WidgetbookHostDeviceFrame(
          child: _HostTeamProfileFrame(state: HostTeamProfileMissing()),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'create pending',
        child: const WidgetbookHostDeviceFrame(
          child: _HostTeamProfileFrame(
            state: HostTeamProfileMissing(),
            creatingProfile: true,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'club fallback profile',
        child: WidgetbookHostDeviceFrame(
          child: _HostTeamProfileFrame(
            state: HostTeamProfileContent(
              profile: _hostProfileVariant(HostProfileStatus.active),
              isFallback: true,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'active edit rows',
        child: WidgetbookHostDeviceFrame(
          child: _HostTeamProfileFrame(
            profile: _hostProfileVariant(HostProfileStatus.active),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'active preview rows',
        child: WidgetbookHostDeviceFrame(
          child: _HostTeamProfileFrame(
            profile: _hostProfileVariant(HostProfileStatus.active),
            editMode: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'pending status',
        child: WidgetbookHostDeviceFrame(
          child: _HostTeamProfileFrame(
            profile: _hostProfileVariant(HostProfileStatus.pending),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'suspended status',
        child: WidgetbookHostDeviceFrame(
          child: _HostTeamProfileFrame(
            profile: _hostProfileVariant(HostProfileStatus.suspended),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: const TextScaler.linear(2),
            child: _HostTeamProfileFrame(
              profile: _hostProfileVariant(HostProfileStatus.active),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Clubs states',
  type: HostTeamHostedClubsSection,
  path: '[P2 host surfaces]/Host team',
)
Widget hostTeamHostedClubsStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostTeamHostedClubsSection',
    contractId: 'section.host.team.hosted_clubs',
    children: [
      WidgetbookPageStateCard(
        label: 'clubs loading',
        child: const WidgetbookHostDeviceFrame(
          child: _HostTeamHostedClubsFrame(loading: true),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'clubs error',
        child: WidgetbookHostDeviceFrame(
          child: _HostTeamHostedClubsFrame(
            error: StateError('Hosted clubs failed'),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty clubs',
        child: const WidgetbookHostDeviceFrame(
          child: _HostTeamHostedClubsFrame(clubs: []),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'owner and host-team rows',
        child: const WidgetbookHostDeviceFrame(
          child: _HostTeamHostedClubsFrame(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'preview mode rows',
        child: const WidgetbookHostDeviceFrame(
          child: _HostTeamHostedClubsFrame(editMode: false),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: TextScaler.linear(2),
            child: _HostTeamHostedClubsFrame(),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostClubTeamScreen,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostClubTeamScreenCatalogStates(BuildContext context) =>
    hostTeamRouteStates(context);

class _HostTeamProfileFrame extends StatefulWidget {
  const _HostTeamProfileFrame({
    this.profile,
    this.state,
    this.editMode = true,
    this.creatingProfile = false,
  });

  final HostProfile? profile;
  final HostTeamProfileState? state;
  final bool editMode;
  final bool creatingProfile;

  @override
  State<_HostTeamProfileFrame> createState() => _HostTeamProfileFrameState();
}

class _HostTeamProfileFrameState extends State<_HostTeamProfileFrame> {
  final _displayNameController = TextEditingController();
  final _roleTitleController = TextEditingController();
  final _bioController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final profile = widget.profile;
    if (profile == null) return;
    _displayNameController.text = profile.displayName;
    _roleTitleController.text = profile.roleTitle ?? '';
    _bioController.text = profile.bio ?? '';
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _roleTitleController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return WidgetbookThemedHostPreview(
      themeMode: ThemeMode.light,
      child: Builder(
        builder: (context) {
          final t = CatchTokens.of(context);
          return Scaffold(
            backgroundColor: t.bg,
            body: ListView(
              padding: CatchInsets.pageBodyUnderHeader,
              children: [
                HostTeamProfileSection(
                  state:
                      widget.state ??
                      HostTeamProfileContent(profile: widget.profile!),
                  editMode: widget.editMode,
                  creatingProfile: widget.creatingProfile,
                  onRetry: () {},
                  onCreateProfile: () {},
                  displayNameController: _displayNameController,
                  roleTitleController: _roleTitleController,
                  bioController: _bioController,
                  savingProfile: false,
                  onSaveProfile: () async => true,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _HostTeamHostedClubsFrame extends StatelessWidget {
  const _HostTeamHostedClubsFrame({
    this.clubs,
    this.loading = false,
    this.error,
    this.editMode = true,
  });

  final List<Club>? clubs;
  final bool loading;
  final Object? error;
  final bool editMode;

  @override
  Widget build(BuildContext context) {
    return WidgetbookThemedHostPreview(
      themeMode: ThemeMode.light,
      child: Builder(
        builder: (context) {
          final t = CatchTokens.of(context);
          return Scaffold(
            backgroundColor: t.bg,
            body: ListView(
              padding: CatchInsets.pageBodyUnderHeader,
              children: [
                HostTeamHostedClubsSection(
                  actions: HostTeamWorkspaceActionState.from(
                    uid: widgetbookHostUid,
                    editMode: editMode,
                    creatingProfile: false,
                    profile: HostTeamProfileContent(
                      profile: HostOperationsFixtures.hostProfile,
                    ),
                  ),
                  state: error != null
                      ? HostTeamHostedClubsError(error: error!)
                      : loading
                      ? const HostTeamHostedClubsLoading()
                      : buildHostTeamHostedClubsState(
                          CatchAsyncState<List<Club>>.data(
                            clubs ?? HostOperationsFixtures.clubs,
                          ),
                        ),
                  onRetry: error == null ? null : () {},
                  onOpenClub: (_) {},
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
