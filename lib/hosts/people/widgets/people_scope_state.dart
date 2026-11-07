import 'package:catch_dating_app/hosts/people/people_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// What the People tab shows before an organizer is selected: loading, a
/// sign-in prompt, no organizer to run yet, or a failed read.
class HostPeopleScopeState extends StatelessWidget {
  const HostPeopleScopeState({
    super.key,
    required this.organizer,
    required this.onRetry,
    required this.onSignIn,
  });

  final HostPeopleOrganizer organizer;
  final VoidCallback onRetry;
  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchPageBody(
      child: switch (organizer.scope) {
        HostPeopleScope.loading ||
        HostPeopleScope.ready => const CatchLoadingIndicator(),
        HostPeopleScope.signedOut => CatchErrorState(
          title: l10n.hostsHostAuthRequiredScreenTitleSignInRequired,
          message: l10n.hostsHostAuthRequiredScreenMessageSignInToManage,
          retryLabel: l10n.hostsHostAuthRequiredScreenVisiblecopySignIn,
          onRetry: onSignIn,
        ),
        HostPeopleScope.noOrganizer => CatchEmptyState(
          icon: CatchIcons.people,
          title: l10n.hostPeopleNoOrganizerTitle,
          message: l10n.hostPeopleNoOrganizerBody,
        ),
        HostPeopleScope.error => CatchErrorState(
          title: l10n.hostPeopleErrorTitle,
          message: l10n.hostPeopleErrorBody,
          retryLabel: l10n.hostPeopleRetry,
          onRetry: onRetry,
        ),
      },
    );
  }
}
