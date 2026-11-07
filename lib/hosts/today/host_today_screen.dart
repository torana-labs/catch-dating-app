import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_journey/host_organizer_journey_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_organizer_switcher_sheet.dart';
import 'package:catch_dating_app/hosts/today/host_today_body.dart';
import 'package:catch_dating_app/hosts/today/host_today_controller.dart';
import 'package:catch_dating_app/hosts/today/host_today_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

/// The Host app's first screen: tonight, what needs the host, the week and
/// the last thirty days for the selected organizer.
///
/// It resolves who is signed in and which organizer is selected, keeps a
/// minute clock, watches [hostTodayControllerProvider] and turns the body's
/// callbacks into navigation. Every read behind it is a listener or a cached
/// read, so nothing here refreshes on return or resume.
class HostTodayScreen extends ConsumerStatefulWidget {
  const HostTodayScreen({super.key, this.initialOrganizerId, this.now});

  final String? initialOrganizerId;

  /// A fixed clock for previews and tests; null follows the app clock.
  final DateTime? now;

  @override
  ConsumerState<HostTodayScreen> createState() => _HostTodayScreenState();
}

class _HostTodayScreenState extends ConsumerState<HostTodayScreen> {
  DateTime? _clockNow;
  Timer? _tick;

  DateTime get _now => widget.now ?? _clockNow ?? DateTime.now();

  @override
  void initState() {
    super.initState();
    _scheduleTick();
  }

  @override
  void didUpdateWidget(HostTodayScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.now != widget.now) _scheduleTick();
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  void _scheduleTick() {
    _tick?.cancel();
    if (widget.now != null) return;
    final clock = ref.read(appClockProvider);
    final current = clock.now();
    _clockNow = current;
    final nextMinute = DateTime(
      current.year,
      current.month,
      current.day,
      current.hour,
      current.minute + 1,
    );
    _tick = clock.timer(nextMinute.difference(current), () {
      if (!mounted) return;
      setState(_scheduleTick);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final now = _now;
    final uidValue = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = uidValue.value;
    final organizersValue = _organizers(uid);
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
    final firstName = organizer == null
        ? null
        : _firstName(ref.watch(watchUserProfileProvider).value);
    final part = now.hour < 12
        ? 'morning'
        : now.hour < 17
        ? 'afternoon'
        : 'evening';
    final canSwitch = organizer != null && (organizers?.length ?? 0) > 1;
    final topBar = CatchTopBar(
      variant: CatchTopBarVariant.tabHome,
      kicker: DateFormat(
        'EEEE d MMMM',
        Localizations.localeOf(context).toLanguageTag(),
      ).format(now),
      title: firstName == null
          ? l10n.hostTodayGreetingAlone(part: part)
          : l10n.hostTodayGreeting(part: part, name: firstName),
      identity: organizer == null
          ? null
          : CatchTopBarIdentity(
              name: organizer.name,
              label: l10n.hostTodayIdentityLabel(name: organizer.name),
              photoUrl: organizer.logoPhotoUrl,
              onTap: canSwitch
                  ? () => unawaited(
                      _switchOrganizer(uid!, organizers!, organizer),
                    )
                  : null,
            ),
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
      body = HostTodayBody(
        state: const HostTodayState.loading(),
        now: now,
        onOpenEvent: (_) {},
        onOpenAttention: (_) {},
        onAction: (_) {},
        onViewEvents: () {},
        onOpenInsights: () {},
        onRetry: () {},
      );
    } else if (organizer == null) {
      body = CatchPageBody(
        child: CatchStack(
          gap: CatchStackGap.section,
          children: [
            const HostWaitingClaimsSection(),
            CatchEmptyState(
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
          ],
        ),
      );
    } else {
      final request = HostTodayRequest(
        organizerId: organizer.id,
        accountId: uid!,
        now: now,
        cityName: organizer.location,
      );
      final state = ref.watch(hostTodayControllerProvider(request));
      body = state.status == HostTodayStatus.error
          ? CatchLocalizedErrorState(
              state.error!,
              context: AppErrorContext.event,
              onRetry: () => retryHostTodayReads(ref, request),
            )
          : HostTodayBody(
              state: state,
              now: now,
              onOpenEvent: (event) => _openEvent(organizer, event),
              onOpenAttention: (item) => _openAttention(organizer, item),
              onAction: (action) => _act(organizer, state, action),
              onViewEvents: () => context.goNamed(Routes.hostEventsScreen.name),
              onOpenInsights: () => context.goNamed(
                Routes.hostOrganizerScreen.name,
                queryParameters: {
                  'organizerId': organizer.id,
                  'tab': 'insights',
                },
              ),
              onRetry: () => retryHostTodayReads(ref, request),
            );
    }

    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-today-scroll-view'),
        topBar: topBar,
        body: body,
      ),
    );
  }

  CatchAsyncState<List<Organizer>> _organizers(String? uid) => uid == null
      ? const CatchAsyncState<List<Organizer>>.loading()
      : catchAsyncStateFromAsyncValue(
          ref.watch(hostOperableOrganizersProvider(uid)),
        );

  Future<void> _switchOrganizer(
    String uid,
    List<Organizer> organizers,
    Organizer selected,
  ) async {
    final organizerId = await showHostOrganizerSwitcherSheet(
      context: context,
      organizers: organizers,
      selectedOrganizerId: selected.id,
    );
    if (!mounted || organizerId == null || organizerId == selected.id) return;
    ref.read(hostOrganizerSelectionProvider(uid).notifier).select(organizerId);
  }

  void _act(Organizer organizer, HostTodayState state, HostTodayAction action) {
    final event = state.tonight?.event;
    switch (action) {
      case HostTodayAction.newEvent:
        context.pushNamed(
          Routes.hostCreateEventScreen.name,
          pathParameters: {'organizerId': organizer.id},
          extra: HostCreateEventRouteArguments(initialOrganizer: organizer),
        );
      case HostTodayAction.openDoor when event != null:
        context.pushNamed(
          Routes.hostEventRosterScreen.name,
          pathParameters: {'organizerId': organizer.id, 'eventId': event.id},
          extra: event,
        );
      case HostTodayAction.messageGuests when event != null:
        context.pushNamed(
          Routes.hostInboxScreen.name,
          queryParameters: {'eventId': event.id},
          extra: organizer,
        );
      case HostTodayAction.liveConsole when event != null:
        _openManage(organizer, event.id, section: 'live', event: event);
      case HostTodayAction.openDoor ||
          HostTodayAction.messageGuests ||
          HostTodayAction.liveConsole:
        return;
    }
  }

  void _openEvent(Organizer organizer, Event event) {
    final now = _now;
    _openManage(
      organizer,
      event.id,
      event: event,
      section: !event.startTime.isAfter(now) && event.endTime.isAfter(now)
          ? 'live'
          : 'setup',
    );
  }

  /// Opens an event beside Today, in the section asked for.
  void _openManage(
    Organizer organizer,
    String eventId, {
    required String section,
    Event? event,
  }) => context.goNamed(
    Routes.hostTodayScreen.name,
    queryParameters: {
      'organizerId': organizer.id,
      'eventId': eventId,
      'section': section,
    },
    extra: event,
  );

  void _openAttention(Organizer organizer, HostAttentionItem item) {
    final destination = item.destination;
    switch (destination.route) {
      case HostAttentionDestinationRoute.hostEventManage:
        final eventId = destination.eventId ?? item.eventId;
        if (eventId == null) return;
        _openManage(
          organizer,
          eventId,
          section: destination.section ?? 'setup',
        );
      case HostAttentionDestinationRoute.hostApplications:
        final applicationId = destination.applicationId;
        context.pushNamed(
          applicationId == null
              ? Routes.hostAudienceScreen.name
              : Routes.hostApplicationDetailScreen.name,
          pathParameters: {'applicationId': ?applicationId},
          queryParameters: {
            'organizerId': organizer.id,
            if (applicationId == null) 'view': 'responses',
            'formId': ?destination.formId,
          },
        );
      case HostAttentionDestinationRoute.hostOrganizerPayments:
        context.pushNamed(
          Routes.hostOrganizerPaymentsScreen.name,
          queryParameters: {'organizerId': organizer.id},
        );
      case HostAttentionDestinationRoute.hostAudienceForms:
        final formId = destination.formId;
        if (destination.section == 'automations') {
          context.pushNamed(
            formId == null
                ? Routes.hostAudienceAutomationsScreen.name
                : Routes.hostFormAutomationsScreen.name,
            pathParameters: {'formId': ?formId},
            queryParameters: {'organizerId': organizer.id},
          );
          return;
        }
        context.goNamed(
          Routes.hostAudienceScreen.name,
          queryParameters: {
            'organizerId': organizer.id,
            'view': destination.section == 'responses' ? 'responses' : 'forms',
            'formId': ?formId,
          },
        );
      case HostAttentionDestinationRoute.hostInbox:
        context.goNamed(
          Routes.hostInboxScreen.name,
          queryParameters: {'threadId': ?destination.threadId},
          extra: organizer,
        );
      case HostAttentionDestinationRoute.hostDressRehearsal:
        context.pushNamed(
          Routes.hostEventRehearsalStartScreen.name,
          pathParameters: {'organizerId': organizer.id},
          queryParameters: const {'source': 'custom'},
        );
      case HostAttentionDestinationRoute.hostEvents:
        context.goNamed(Routes.hostEventsScreen.name);
      case HostAttentionDestinationRoute.hostProgramWork:
        // Program-scoped items carry the program id as the source prefix.
        final programId = item.sourceId.split(':').first;
        if (programId.isEmpty) return;
        context.pushNamed(
          Routes.hostWorkProgramScreen.name,
          pathParameters: {'programId': programId},
        );
    }
  }
}

String? _firstName(UserProfile? profile) {
  if (profile == null) return null;
  final name = profile.firstName.trim().isNotEmpty
      ? profile.firstName
      : profile.accountDisplayName;
  final word = name.trim().split(RegExp(r'\s+')).first;
  return word.isEmpty ? null : word;
}
