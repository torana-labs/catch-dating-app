import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_body.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_controller.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_organizer_switcher_sheet.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The Organiser tab: the page, the last thirty days, running the organizer
/// and the host's own settings. It resolves the account and the selected
/// organizer, watches [organizerTabControllerProvider] and turns the body's
/// actions into navigation; every read behind it is a listener or a cached
/// read.
class OrganizerScreen extends ConsumerWidget {
  const OrganizerScreen({super.key, this.initialOrganizerId});

  final String? initialOrganizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final read = watchHostOrganizerScope(ref);
    final scope = read.scope;
    final organizer =
        scope?.organizers
            .where((item) => item.id == initialOrganizerId)
            .firstOrNull ??
        scope?.organizer;
    final Widget body;
    if (scope == null || organizer == null) {
      body = HostOrganizerScopeFallback(
        gap: read.gap,
        error: read.error,
        onRetry: () => retryHostOrganizerScope(ref),
      );
    } else {
      final request = OrganizerTabRequest(organizer: organizer, uid: scope.uid);
      body = OrganizerBody(
        state: ref.watch(organizerTabControllerProvider(request)),
        onAction: (action) => unawaited(_act(context, ref, organizer, action)),
      );
    }
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-organizer-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tabHome,
          kicker: organizer == null ? null : _kicker(l10n, organizer),
          title: organizer?.name ?? l10n.hostNavigationOrganizer,
          actions: [
            if (scope != null && organizer != null && scope.canSwitch)
              CatchIconAction.icon(
                key: const ValueKey<String>('organizer-switch'),
                icon: CatchIcons.swap,
                tooltip: l10n.hostOrganizerSwitch,
                onPressed: () =>
                    unawaited(_switch(context, ref, scope, organizer)),
              ),
          ],
        ),
        body: body,
      ),
    );
  }

  static String? _kicker(AppLocalizations l10n, Organizer organizer) {
    final area = organizer.area.trim();
    final year = organizer.createdAt.year;
    return area.isEmpty
        ? l10n.hostOrganizerSince(year: '$year')
        : l10n.hostOrganizerKicker(area: area, year: '$year');
  }

  Future<void> _switch(
    BuildContext context,
    WidgetRef ref,
    HostOrganizerScope scope,
    Organizer selected,
  ) async {
    final organizerId = await showHostOrganizerSwitcherSheet(
      context: context,
      organizers: scope.organizers,
      selectedOrganizerId: selected.id,
    );
    if (!context.mounted || organizerId == null) return;
    ref
        .read(hostOrganizerSelectionProvider(scope.uid).notifier)
        .select(organizerId);
    if (initialOrganizerId != null) {
      context.goNamed(
        Routes.hostOrganizerScreen.name,
        queryParameters: {'organizerId': organizerId},
      );
    }
  }

  Future<void> _act(
    BuildContext context,
    WidgetRef ref,
    Organizer organizer,
    OrganizerAction action,
  ) async {
    final query = {'organizerId': organizer.id};
    final pageUri = organizerPageUri(organizer);
    switch (action) {
      case OrganizerAction.editPage:
        context.goNamed(
          Routes.hostOrganizerScreen.name,
          queryParameters: {...query, 'tab': 'page'},
        );
      case OrganizerAction.viewPage when pageUri != null:
        await _open(context, ref, pageUri);
      case OrganizerAction.viewPage:
        await context.pushNamed<void>(
          Routes.hostOrganizerDetailScreen.name,
          pathParameters: query,
          extra: organizer,
        );
      case OrganizerAction.sharePage:
        if (pageUri == null) return;
        await ref
            .read(externalShareControllerProvider)
            .shareText(text: pageUri.toString(), subject: organizer.name);
      case OrganizerAction.insights:
        context.goNamed(
          Routes.hostOrganizerScreen.name,
          queryParameters: {...query, 'tab': 'insights'},
        );
      case OrganizerAction.payments:
        await context.pushNamed<void>(
          Routes.hostOrganizerPaymentsScreen.name,
          queryParameters: query,
        );
      case OrganizerAction.team:
        await context.pushNamed<void>(
          Routes.hostOrganizerTeamScreen.name,
          queryParameters: query,
        );
      case OrganizerAction.memberships:
        await context.pushNamed<void>(
          Routes.hostOrganizerMembershipsScreen.name,
          queryParameters: query,
        );
      case OrganizerAction.eventDefaults:
        await context.pushNamed<void>(
          Routes.hostOrganizerEventDefaultsScreen.name,
          queryParameters: query,
        );
      case OrganizerAction.rehearse:
        await context.pushNamed<void>(
          Routes.hostEventRehearsalStartScreen.name,
          pathParameters: query,
          queryParameters: const {'source': 'custom'},
        );
      case OrganizerAction.settings:
        context.goNamed(
          Routes.hostOrganizerScreen.name,
          queryParameters: {...query, 'tab': 'settings'},
        );
      case OrganizerAction.help:
        final help = AppConfig.helpUrl;
        if (help != null) await _open(context, ref, help);
    }
  }

  Future<void> _open(BuildContext context, WidgetRef ref, Uri uri) async {
    var opened = false;
    try {
      opened = await ref.read(externalLinkControllerProvider).openExternal(uri);
    } on Object {
      // The notice below is the visible result of a failed launch.
    }
    if (!opened && context.mounted) {
      showCatchNotice(
        context,
        context.l10n.safetySettingsScreenExternalLinkOpenFailed,
      );
    }
  }
}

/// What an organizer screen shows before it has an organizer: the loading
/// shape, sign-in, a read error, or the first organizer to create.
class HostOrganizerScopeFallback extends StatelessWidget {
  const HostOrganizerScopeFallback({
    super.key,
    required this.gap,
    required this.error,
    required this.onRetry,
  });

  /// Null once the account is read but runs no organizer on this screen.
  final HostOrganizerScopeGap? gap;
  final Object? error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final error = this.error;
    return switch (gap) {
      HostOrganizerScopeGap.loading => const CatchPageBody(
        child: CatchLoadingIndicator(),
      ),
      HostOrganizerScopeGap.authError when error != null =>
        CatchLocalizedErrorState(
          error,
          context: AppErrorContext.auth,
          onRetry: onRetry,
        ),
      HostOrganizerScopeGap.organizersError when error != null =>
        CatchLocalizedErrorState(
          error,
          context: AppErrorContext.organizer,
          onRetry: onRetry,
        ),
      HostOrganizerScopeGap.signedOut ||
      HostOrganizerScopeGap.authError ||
      HostOrganizerScopeGap.organizersError => CatchErrorState(
        title: l10n.hostsHostAuthRequiredScreenTitleSignInRequired,
        message: l10n.hostsHostAuthRequiredScreenMessageSignInToManage,
        retryLabel: l10n.hostsHostAuthRequiredScreenVisiblecopySignIn,
        onRetry: () => context.go(Routes.authScreen.path),
      ),
      null => CatchPageBody(
        child: CatchEmptyState(
          icon: CatchIcons.people,
          title: l10n.hostsHostOrganizersScaffoldTitleNoHostOrganizersYet,
          message: l10n.hostsHostOrganizersScaffoldBodyCreateAOrganizerOr,
          actions: [
            CatchButton(
              label: l10n.hostsHostOrganizersScaffoldLabelCreateOrganizer,
              leading: CatchIcon(CatchIcons.add),
              onPressed: () =>
                  context.pushNamed(Routes.hostCreateOrganizerScreen.name),
            ),
          ],
        ),
      ),
    };
  }
}
