import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_night_row.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/insights/host_insights_body.dart';
import 'package:catch_dating_app/hosts/insights/host_insights_controller.dart';
import 'package:catch_dating_app/hosts/insights/host_insights_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The organizer's Insights: the stats, bookings over time, where visitors
/// came from and the fullest nights for the last 7, 30 or 90 days.
///
/// It resolves who is signed in and which organizer is selected, keeps the
/// chosen period, watches [hostInsightsControllerProvider] and opens a
/// night's event report. The report is the cached host-reports read, so
/// nothing here refreshes on return.
class HostInsightsScreen extends ConsumerStatefulWidget {
  const HostInsightsScreen({
    super.key,
    this.initialOrganizerId,
    this.initialRange = HostInsightsRange.thirtyDays,
  });

  final String? initialOrganizerId;
  final HostInsightsRange initialRange;

  @override
  ConsumerState<HostInsightsScreen> createState() => _HostInsightsScreenState();
}

class _HostInsightsScreenState extends ConsumerState<HostInsightsScreen> {
  late HostInsightsRange _range = widget.initialRange;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final uidValue = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = uidValue.value;
    final organizersValue = uid == null
        ? const CatchAsyncState<List<Organizer>>.loading()
        : catchAsyncStateFromAsyncValue(
            ref.watch(hostOperableOrganizersProvider(uid)),
          );
    final selectedId = uid == null
        ? null
        : ref.watch(hostOrganizerSelectionProvider(uid));
    final organizers = organizersValue.value;
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
      body = _body(HostInsightsState.loading(_range), null);
    } else if (organizer == null) {
      body = CatchEmptyState(
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
      );
    } else {
      final request = HostInsightsRequest(
        organizerId: organizer.id,
        range: _range,
        cityName: organizer.location,
      );
      final state = ref.watch(hostInsightsControllerProvider(request));
      body = state.status == HostInsightsStatus.error
          ? CatchLocalizedErrorState(
              state.error!,
              context: AppErrorContext.organizer,
              onRetry: () => retryHostInsights(ref, request),
            )
          : _body(state, organizer);
    }

    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-insights-scroll-view'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tabHome,
          kicker: organizer?.name,
          title: l10n.hostTodayInsights,
        ),
        body: body,
      ),
    );
  }

  Widget _body(HostInsightsState state, Organizer? organizer) =>
      HostInsightsBody(
        state: state,
        onRangeChanged: (range) => setState(() => _range = range),
        onOpenNight: (night) => _openNight(organizer, night),
      );

  void _openNight(Organizer? organizer, HostAnalyticsNight night) {
    if (organizer == null) return;
    context.pushNamed(
      Routes.hostAppEventManageScreen.name,
      pathParameters: {'organizerId': organizer.id, 'eventId': night.eventId},
      queryParameters: const {'section': 'report'},
    );
  }
}
