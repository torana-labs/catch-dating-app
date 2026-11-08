import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/forms/forms_body.dart';
import 'package:catch_dating_app/hosts/forms/forms_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// People › Forms: the selected organizer's forms, newest first.
///
/// It resolves the signed-in manager and the selected organizer, reads the
/// forms directory once per account (a new account never sees the last
/// one's rows) and turns the body's callbacks into navigation.
class HostFormsScreen extends ConsumerStatefulWidget {
  const HostFormsScreen({super.key, this.initialOrganizerId});

  final String? initialOrganizerId;

  @override
  ConsumerState<HostFormsScreen> createState() => _HostFormsScreenState();
}

class _HostFormsScreenState extends ConsumerState<HostFormsScreen> {
  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final uidValue = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = uidValue.value;
    final organizersValue = _organizers(uid);
    final organizers = organizersValue.value;
    final selectedId = uid == null
        ? null
        : ref.watch(hostOrganizerSelectionProvider(uid));
    final organizer = organizers == null
        ? null
        : resolveSelectedHostOrganizer(
            organizers,
            selectedOrganizerId: selectedId,
            preferredOrganizerId: selectedId == null
                ? widget.initialOrganizerId
                : null,
          );

    final Widget body;
    if (uidValue.hasError && uid == null) {
      body = CatchLocalizedErrorState(
        uidValue.error!,
        context: AppErrorContext.auth,
        onRetry: () => ref.invalidate(uidProvider),
      );
    } else if (uid == null && !uidValue.isLoading) {
      body = CatchErrorState(
        title: l10n.hostsHostAuthRequiredScreenTitleSignInRequired,
        message: l10n.hostsHostAuthRequiredScreenMessageSignInToManage,
        retryLabel: l10n.hostsHostAuthRequiredScreenVisiblecopySignIn,
        onRetry: () => context.go(Routes.authScreen.path),
      );
    } else if (organizersValue.hasError && organizers == null) {
      body = CatchLocalizedErrorState(
        organizersValue.error!,
        context: AppErrorContext.organizer,
        onRetry: () => hostOperableOrganizerReads(uid!).forEach(ref.invalidate),
      );
    } else if (organizers == null) {
      body = HostFormsBody(
        state: const HostFormsState.loading(),
        onView: (view) => _openView(context, view, null),
        onOpenForm: (form) => _openForm(context, form),
        onCreate: () {},
        onLoadMore: () {},
      );
    } else if (organizer == null) {
      body = CatchPageBody(
        child: CatchEmptyState(
          icon: CatchIcons.people,
          title: l10n.hostsHostEventsScaffoldTitleCreateYourFirstOrganizer,
          message: l10n.hostsHostEventsScaffoldBodyCreateAOrganizerTo,
          actions: [
            CatchButton(
              label: l10n.hostsHostEventsScaffoldLabelCreateOrganizer,
              leading: CatchIcon(CatchIcons.add),
              onPressed: () =>
                  context.pushNamed(Routes.hostCreateOrganizerScreen.name),
            ),
          ],
        ),
      );
    } else {
      final request = HostFormListRequest(
        organizerId: organizer.id,
        accountUid: uid,
        statuses: HostFormLifecycleStatus.values.toSet(),
      );
      final scope = (uid: uid!, accountGeneration: 0, request: request);
      final directory = _directory(scope);
      final value = directory.value;
      if (directory.hasError && value == null) {
        body = CatchLocalizedErrorState(
          directory.error!,
          context: AppErrorContext.forms,
          onRetry: () =>
              ref.invalidate(hostFormsAccountDirectoryProvider(scope)),
        );
      } else {
        body = HostFormsBody(
          state: value == null
              ? const HostFormsState.loading()
              : HostFormsState(
                  status: HostFormsStatus.content,
                  forms: value.forms,
                  canLoadMore: value.canLoadMore,
                  loadingMore: value.loadingMore,
                  loadMoreError: value.loadMoreError,
                ),
          onView: (view) => _openView(context, view, organizer),
          onOpenForm: (form) => _openForm(context, form),
          onCreate: () => _openNewForm(context, organizer),
          onLoadMore: () => unawaited(
            ref
                .read(hostFormsDirectoryControllerProvider(request).notifier)
                .loadMore(),
          ),
        );
      }
    }

    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-forms-scroll-view'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tabHome,
          kicker: organizer?.name,
          title: l10n.hostFormsPeopleTitle,
          actions: [
            CatchButton(
              key: const ValueKey<String>('host-forms-create'),
              label: l10n.hostFormsNewFormShort,
              leading: CatchIcon(CatchIcons.add),
              size: CatchButtonSize.md,
              onPressed: organizer == null
                  ? null
                  : () => _openNewForm(context, organizer),
            ),
          ],
        ),
        body: body,
      ),
    );
  }

  CatchAsyncState<List<Organizer>> _organizers(String? uid) => uid == null
      ? const CatchAsyncState<List<Organizer>>.loading()
      : catchAsyncStateFromAsyncValue(
          ref.watch(hostOperableOrganizersProvider(uid)),
        );

  /// The forms directory once the account gate has refreshed it for this
  /// manager; the directory controller then owns paging.
  CatchAsyncState<HostFormsDirectoryState> _directory(
    HostFormAccountDirectoryScope scope,
  ) {
    final gate = catchAsyncStateFromAsyncValue(
      ref.watch(hostFormsAccountDirectoryProvider(scope)),
    );
    return gate.isSettledData
        ? catchAsyncStateFromAsyncValue(
            ref.watch(hostFormsDirectoryControllerProvider(scope.request)),
          )
        : gate;
  }

  void _openView(
    BuildContext context,
    HostPeopleView view,
    Organizer? organizer,
  ) {
    switch (view) {
      case HostPeopleView.people:
        context.goNamed(
          Routes.hostAudienceScreen.name,
          queryParameters: {'view': 'people', 'organizerId': ?organizer?.id},
        );
      case HostPeopleView.messages:
        context.goNamed(Routes.hostInboxScreen.name, extra: organizer);
      case HostPeopleView.forms:
        return;
    }
  }

  void _openNewForm(BuildContext context, Organizer organizer) =>
      context.pushNamed(
        Routes.hostFormTemplatesScreen.name,
        queryParameters: {'organizerId': organizer.id},
      );

  void _openForm(BuildContext context, HostFormSummary form) =>
      context.pushNamed(
        Routes.hostFormBuilderScreen.name,
        pathParameters: {'formId': form.formId},
        queryParameters: {'organizerId': form.organizerId},
      );
}
