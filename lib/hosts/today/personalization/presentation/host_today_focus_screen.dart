import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_focus_page_body.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_state.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_preference_controller.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_feed_controller.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_state.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_view_model.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class HostTodayFocusScreen extends ConsumerStatefulWidget {
  const HostTodayFocusScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  ConsumerState<HostTodayFocusScreen> createState() =>
      _HostTodayFocusScreenState();
}

class _HostTodayFocusScreenState extends ConsumerState<HostTodayFocusScreen> {
  HostTodayFocus? _selected;
  HostTodayPreferenceScope? _selectionScope;
  bool _allowRoutePop = false;
  bool _operationalReturnScheduled = false;
  late final DateTime _sessionBoundary = DateTime.now();

  @override
  Widget build(BuildContext context) {
    final uid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final accountId = uid.isSettledData ? uid.value : null;
    final organizersAsync = accountId == null
        ? null
        : ref.watch(hostOperableClubsProvider(accountId));
    final organizers = organizersAsync == null
        ? null
        : catchAsyncStateFromAsyncValue(organizersAsync);
    final organizer = organizers?.isSettledData == true
        ? organizers?.value
              ?.where((club) => club.id == widget.organizerId)
              .firstOrNull
        : null;
    final scope =
        uid.isLoading ||
            uid.error != null ||
            organizers?.isLoading == true ||
            organizers?.error != null ||
            organizer == null ||
            accountId == null
        ? null
        : HostTodayPreferenceScope(
            accountId: accountId,
            organizerId: organizer.id,
          );
    // A restored/deep-linked Focus route may mount without the Today layout.
    // Use the same operational feed and projection before offering a choice.
    final request = scope == null
        ? null
        : HostTodayFeedRequest(
            organizerId: scope.organizerId,
            accountId: scope.accountId,
            sessionBoundary: _sessionBoundary,
          );
    final today = request == null
        ? null
        : buildHostTodayState(
            catchAsyncStateFromAsyncValue(
              ref.watch(hostTodayFeedControllerProvider(request)),
            ),
            now: DateTime.now(),
            l10n: context.l10n,
          );
    final quiet = today != null && isHostTodayQuiet(today);
    if (today != null && today.status != HostTodayStatus.loading && !quiet) {
      _returnToTodayForOperationalWork(request!);
    }
    final preferenceAsync = scope == null || !quiet
        ? null
        : ref.watch(hostTodayPreferenceProvider(scope));
    final preference = preferenceAsync == null
        ? null
        : catchAsyncStateFromAsyncValue(preferenceAsync);
    if (scope != null) {
      listenToCatchMutationErrors(
        context,
        ref,
        mutations: [HostTodayPreferenceController.saveMutation(scope)],
      );
    }
    final pending =
        scope != null &&
        ref.watch(HostTodayPreferenceController.saveMutation(scope)).isPending;
    final saved = preference?.error == null ? preference?.value : null;
    final selected = _selectionScope == scope ? _selected : saved?.focus;

    Widget content;
    var loading = false;
    if (uid.error != null ||
        organizers?.error != null ||
        preference?.error != null) {
      content = CatchLocalizedErrorState(
        uid.error ?? organizers?.error ?? preference!.error!,
        onRetry: () {
          if (uid.error != null) {
            ref.invalidate(uidProvider);
          } else if (organizers?.error != null) {
            ref.invalidate(hostOperableClubsProvider(accountId!));
          } else if (scope != null) {
            ref.invalidate(hostTodayPreferenceProvider(scope));
          }
        },
      );
    } else if (uid.isLoading ||
        uid.isRefreshing ||
        organizers?.isLoading == true ||
        organizers?.isRefreshing == true ||
        preference?.isLoading == true ||
        (scope != null && !quiet)) {
      loading = true;
      content = const CatchLoadingIndicator();
    } else if (accountId == null) {
      content = CatchErrorState(
        title: context.l10n.hostsHostAuthRequiredScreenTitleSignInRequired,
        message: context.l10n.hostsHostAuthRequiredScreenMessageSignInToManage,
        retryLabel: context.l10n.hostsHostAuthRequiredScreenVisiblecopySignIn,
        onRetry: () => context.goNamed(Routes.authScreen.name),
      );
    } else if (scope == null || saved == null) {
      content = CatchErrorState(
        title: context.l10n.hostTodayFocusUnavailable,
        message: context.l10n.hostTodayFocusUnavailableBody,
        retryLabel: context.l10n.hostTodayFocusBackToToday,
        onRetry: _exit,
      );
    } else {
      content = HostTodayFocusPageBody(
        selected: selected,
        pending: pending,
        onSelect: (focus) => setState(() {
          _selectionScope = scope;
          _selected = focus;
        }),
        onContinue: () => unawaited(_save(scope, selected)),
        onSkip: () => unawaited(_save(scope, null)),
      );
    }

    return PopScope(
      canPop: _allowRoutePop || (!pending && saved?.answered != false),
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && !pending && scope != null && saved?.answered == false) {
          unawaited(_save(scope, null));
        }
      },
      child: CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.hostTodayFocusScreenTitle,
          subtitle: organizer?.name,
          navigation: CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
            onPressed: () {
              if (pending) return;
              if (scope != null && saved?.answered == false) {
                unawaited(_save(scope, null));
              } else {
                _exit();
              }
            },
          ),
        ),
        body: loading
            ? CatchRouteBody.standardViewport(child: Center(child: content))
            : CatchRouteBody.standardConstrained(child: content),
      ),
    );
  }

  void _returnToTodayForOperationalWork(HostTodayFeedRequest request) {
    if (_operationalReturnScheduled) return;
    _operationalReturnScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _operationalReturnScheduled = false;
      if (!mounted ||
          ref.read(uidProvider).asData?.value != request.accountId ||
          widget.organizerId != request.organizerId) {
        return;
      }
      final today = buildHostTodayState(
        catchAsyncStateFromAsyncValue(
          ref.read(hostTodayFeedControllerProvider(request)),
        ),
        now: DateTime.now(),
        l10n: context.l10n,
      );
      if (today.status == HostTodayStatus.loading || isHostTodayQuiet(today)) {
        return;
      }
      // An operational interruption is not a choice to skip orientation.
      context.goNamed(
        Routes.hostTodayScreen.name,
        queryParameters: {'organizerId': request.organizerId},
      );
    });
  }

  Future<void> _save(
    HostTodayPreferenceScope scope,
    HostTodayFocus? focus,
  ) async {
    try {
      await HostTodayPreferenceController.saveMutation(scope).run(ref, (tx) {
        final controller = tx.get(
          hostTodayPreferenceControllerProvider(scope).notifier,
        );
        return focus == null ? controller.skip() : controller.select(focus);
      });
      if (!mounted || ref.read(uidProvider).asData?.value != scope.accountId) {
        return;
      }
      _exit();
    } on Object {
      // The scoped mutation listener owns user-facing save errors.
    }
  }

  void _exit() {
    if (_allowRoutePop) return;
    setState(() => _allowRoutePop = true);
    if (context.canPop()) {
      // Rebuild PopScope before the programmatic pop. First-run system Back
      // follows the same persisted skip path as the visible close control.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.pop();
      });
    } else {
      context.goNamed(
        Routes.hostTodayScreen.name,
        queryParameters: {'organizerId': widget.organizerId},
      );
    }
  }
}
