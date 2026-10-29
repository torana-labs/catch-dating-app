import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_section.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_state.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_preference_controller.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_roadmap_provider.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Owns quiet-day personalization only. The existing Today projection retains
/// its complete loading, error, event and attention presentation unchanged.
class HostTodayPersonalizedLayout extends ConsumerStatefulWidget {
  const HostTodayPersonalizedLayout({
    super.key,
    required this.scope,
    required this.today,
    required this.now,
    required this.operationalSurface,
    this.onCreateEvent,
  });

  final HostTodayPreferenceScope scope;
  final HostTodayState today;
  final DateTime now;
  final Widget operationalSurface;
  final VoidCallback? onCreateEvent;

  @override
  ConsumerState<HostTodayPersonalizedLayout> createState() =>
      _HostTodayPersonalizedLayoutState();
}

class _HostTodayPersonalizedLayoutState
    extends ConsumerState<HostTodayPersonalizedLayout> {
  final _offeredScopes = <HostTodayPreferenceScope>{};
  GoRouter? _router;
  bool _wasTodayRoute = false;
  bool _orientationScheduled = false;
  bool _focusRouteOpen = false;
  bool _operationalReturnScheduled = false;

  bool get _isTodayRoute => _router?.state.name == Routes.hostTodayScreen.name;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final router = GoRouter.maybeOf(context);
    if (identical(router, _router)) return;
    _router?.routerDelegate.removeListener(_onRouteChanged);
    _router = router;
    _wasTodayRoute = _isTodayRoute;
    router?.routerDelegate.addListener(_onRouteChanged);
  }

  @override
  void dispose() {
    _router?.routerDelegate.removeListener(_onRouteChanged);
    super.dispose();
  }

  void _onRouteChanged() {
    if (!mounted) return;
    final isToday = _isTodayRoute;
    if (isToday && !_wasTodayRoute && _hasCurrentAccount) {
      // CRM summaries are callable snapshots; unlike organizer and payment
      // streams they need a refresh after work in another feature.
      ref.invalidate(hostCrmSummaryProvider(widget.scope.organizerId));
      ref.invalidate(hostTodayRehearsalCompletionProvider(widget.scope));
    }
    _wasTodayRoute = isToday;
    setState(() {});
  }

  bool get _hasCurrentAccount =>
      ref.read(uidProvider).asData?.value == widget.scope.accountId;

  @override
  Widget build(BuildContext context) {
    final identity = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final accountId = identity.isSettledData ? identity.value : null;
    if (accountId != widget.scope.accountId ||
        !isHostTodayQuiet(widget.today)) {
      _returnToOperationalWork();
      return widget.operationalSurface;
    }

    final preference = catchAsyncStateFromAsyncValue(
      ref.watch(hostTodayPreferenceProvider(widget.scope)),
    );
    final evidence = ref.watch(hostTodayRoadmapProvider(widget.scope));
    final saved = preference.error == null ? preference.value : null;
    final state = saved == null
        ? null
        : buildHostTodayPersonalizationState(
            today: widget.today,
            preference: saved,
            evidence: evidence,
          );
    if (state?.showOrientation == true) _scheduleOrientation();

    if (preference.error != null) {
      return SliverToBoxAdapter(
        child: CatchSection.content(
          child: CatchLocalizedErrorState(
            preference.error!,
            onRetry: () =>
                ref.invalidate(hostTodayPreferenceProvider(widget.scope)),
          ),
        ),
      );
    }
    if (state == null) return const CatchStateViewport.sliverLoading();
    return SliverMainAxisGroup(
      slivers: [
        SliverToBoxAdapter(
          child: HostTodayPersonalizationSection(
            state: state,
            onChangeFocus: () => unawaited(_openFocus()),
            onAction: (action) => unawaited(_openAction(action)),
          ),
        ),
        SliverToBoxAdapter(
          child: CatchSection.content(
            child: Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                if (widget.onCreateEvent != null)
                  CatchButton(
                    key: const ValueKey('host-today-create-event'),
                    label: context.l10n.hostsHostEventsListLabelNewEvent,
                    variant: CatchButtonVariant.secondary,
                    onPressed: widget.onCreateEvent,
                  ),
                CatchButton(
                  key: const ValueKey('host-today-view-events'),
                  label: context.l10n.hostTodayViewAllEvents,
                  variant: CatchButtonVariant.secondary,
                  onPressed: () =>
                      context.goNamed(Routes.hostEventsScreen.name),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _returnToOperationalWork() {
    if (_operationalReturnScheduled ||
        _router?.state.name != Routes.hostTodayFocusScreen.name ||
        _router?.state.uri.queryParameters['organizerId'] !=
            widget.scope.organizerId) {
      return;
    }
    _operationalReturnScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _operationalReturnScheduled = false;
      if (!mounted ||
          !_hasCurrentAccount ||
          isHostTodayQuiet(widget.today) ||
          _router?.state.name != Routes.hostTodayFocusScreen.name ||
          _router?.state.uri.queryParameters['organizerId'] !=
              widget.scope.organizerId) {
        return;
      }
      // Operational work appeared while the optional choice was open. Leave
      // the preference unanswered; interruption is not the user's skip choice.
      _offeredScopes.remove(widget.scope);
      _router?.goNamed(
        Routes.hostTodayScreen.name,
        queryParameters: {'organizerId': widget.scope.organizerId},
      );
    });
  }

  void _scheduleOrientation() {
    final scope = widget.scope;
    if (!_isTodayRoute ||
        _orientationScheduled ||
        _offeredScopes.contains(scope)) {
      return;
    }
    _orientationScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _orientationScheduled = false;
      if (!mounted ||
          widget.scope != scope ||
          !_hasCurrentAccount ||
          !_isTodayRoute ||
          !isHostTodayQuiet(widget.today)) {
        return;
      }
      final preference = ref
          .read(hostTodayPreferenceProvider(scope))
          .asData
          ?.value;
      if (preference == null || preference.answered) return;
      _offeredScopes.add(scope);
      unawaited(_openFocus());
    });
  }

  Future<void> _openFocus() async {
    if (!_hasCurrentAccount || _focusRouteOpen) return;
    _focusRouteOpen = true;
    try {
      await context.pushNamed<void>(
        Routes.hostTodayFocusScreen.name,
        queryParameters: {'organizerId': widget.scope.organizerId},
      );
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    } finally {
      _focusRouteOpen = false;
    }
  }

  Future<void> _openAction(HostTodaySuggestedAction action) async {
    if (!_hasCurrentAccount) return;
    final organizerId = widget.scope.organizerId;
    try {
      switch (action) {
        case HostTodaySuggestedAction.addCustomer:
          await context.pushNamed<void>(
            Routes.hostAddCustomerScreen.name,
            queryParameters: {'organizerId': organizerId},
          );
          if (mounted &&
              _hasCurrentAccount &&
              widget.scope.organizerId == organizerId) {
            ref.invalidate(hostCrmSummaryProvider(organizerId));
          }
        case HostTodaySuggestedAction.openAudience:
          context.goNamed(
            Routes.hostAudienceScreen.name,
            queryParameters: {'organizerId': organizerId, 'view': 'people'},
          );
        case HostTodaySuggestedAction.startDressRehearsal:
          await context.pushNamed<void>(
            Routes.hostEventRehearsalStartScreen.name,
            pathParameters: {'clubId': organizerId},
            queryParameters: const {'source': 'custom'},
          );
          if (mounted &&
              _hasCurrentAccount &&
              widget.scope.organizerId == organizerId) {
            ref.invalidate(hostTodayRehearsalCompletionProvider(widget.scope));
          }
        case HostTodaySuggestedAction.openOrganizerPage:
          context.goNamed(
            Routes.hostOrganizerScreen.name,
            queryParameters: {'clubId': organizerId},
          );
        case HostTodaySuggestedAction.managePayouts:
          if (!ref
              .read(hostTodayRoadmapProvider(widget.scope))
              .canManagePayouts) {
            return;
          }
          await context.pushNamed<void>(
            Routes.hostClubPaymentsScreen.name,
            queryParameters: {'clubId': organizerId},
          );
      }
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }
}
