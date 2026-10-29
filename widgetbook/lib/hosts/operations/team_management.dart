import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_team_management_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';
import 'shell_fixture.dart';

@widgetbook.UseCase(
  name: 'Covered by host clubs route states',
  type: HostClubsScaffold,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
@widgetbook.UseCase(
  name: 'Owner and co-host section states',
  type: HostTeamManagementSection,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostTeamManagementSectionStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostTeamManagementSection',
    contractId: 'section.host.clubs_host_team',
    children: [
      const WidgetbookPageStateCard(
        label: 'owner management / light',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(child: _HostTeamSectionPreview()),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'co-host read-only / light',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: _HostTeamSectionPreview(canManage: false),
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'owner management / dark',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            themeMode: ThemeMode.dark,
            child: _HostTeamSectionPreview(),
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'co-host read-only / dark',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            themeMode: ThemeMode.dark,
            child: _HostTeamSectionPreview(canManage: false),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Add host sheet states',
  type: HostTeamAddHostSheet,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostTeamAddHostSheetStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostTeamAddHostSheet',
    contractId: 'section.host.clubs_host_team',
    children: [
      WidgetbookPageStateCard(
        label: 'ready',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: _HostTeamAddHostSheetPreview(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'add pending',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: _HostTeamAddHostSheetPreview(
              mode: _HostTeamAddHostSheetPreviewMode.pending,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'add error',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: _HostTeamAddHostSheetPreview(
              mode: _HostTeamAddHostSheetPreviewMode.error,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'add offline',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: _HostTeamAddHostSheetPreview(
              mode: _HostTeamAddHostSheetPreviewMode.offline,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Host action confirmation dialogs',
  type: CatchDialog,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostTeamHostActionDialogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'Host action confirmations',
    contractId: 'section.host.clubs_host_team',
    children: const [
      WidgetbookPageStateCard(
        label: 'remove host',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: _HostTeamHostActionDialogPreview(
              action: HostTeamHostAction.remove,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'transfer ownership',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: _HostTeamHostActionDialogPreview(
              action: HostTeamHostAction.transferOwnership,
            ),
          ),
        ),
      ),
    ],
  );
}

class _HostTeamSectionPreview extends StatelessWidget {
  const _HostTeamSectionPreview({this.canManage = true});

  final bool canManage;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: CatchInsets.pageBody,
      child: HostTeamManagementSection(
        club: HostOperationsFixtures.primaryClub,
        currentUid: HostOperationsFixtures.hostUid,
        canManage: canManage,
      ),
    );
  }
}

enum _HostTeamAddHostSheetPreviewMode { ready, pending, error, offline }

class _HostTeamAddHostSheetPreview extends StatelessWidget {
  const _HostTeamAddHostSheetPreview({
    this.mode = _HostTeamAddHostSheetPreviewMode.ready,
  });

  final _HostTeamAddHostSheetPreviewMode mode;

  @override
  Widget build(BuildContext context) {
    final actionState = switch (mode) {
      _HostTeamAddHostSheetPreviewMode.ready =>
        const HostTeamAddHostActionState(),
      _HostTeamAddHostSheetPreviewMode.pending =>
        const HostTeamAddHostActionState(isSaving: true),
      _HostTeamAddHostSheetPreviewMode.error => HostTeamAddHostActionState(
        errorMessage: appErrorMessage(
          StateError('Widgetbook add host failed'),
          l10n: context.l10n,
          context: AppErrorContext.club,
        ),
      ),
      _HostTeamAddHostSheetPreviewMode.offline => HostTeamAddHostActionState(
        errorMessage: appErrorMessage(
          obviousOfflineException(),
          l10n: context.l10n,
          context: AppErrorContext.club,
        ),
      ),
    };

    return Scaffold(
      body: SafeArea(
        child: HostTeamAddHostSheet(
          clubId: 'design-host-sea-face',
          actionState: actionState,
        ),
      ),
    );
  }
}

class _HostTeamHostActionDialogPreview extends StatelessWidget {
  const _HostTeamHostActionDialogPreview({required this.action});

  final HostTeamHostAction action;

  @override
  Widget build(BuildContext context) {
    final host = HostOperationsFixtures.primaryClub.hostProfiles[1];
    final confirmation = HostTeamHostActionConfirmation(
      action: action,
      host: host,
    );

    return Scaffold(
      body: Center(
        child: CatchDialog<bool>.confirmation(
          title: confirmation.title(context.l10n),
          message: confirmation.message(context.l10n),
          actions: confirmation.actions(context.l10n),
        ),
      ),
    );
  }
}
