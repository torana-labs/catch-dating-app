import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/payments/data/host_organizer_bills_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_controller.g.dart';

/// Who is signed in, the organizers they run, and the one on screen.
@immutable
class HostOrganizerScope {
  const HostOrganizerScope({
    required this.uid,
    required this.organizers,
    required this.organizer,
  });

  final String uid;
  final List<Organizer> organizers;

  /// Null when the account runs no organizer, or not the one asked for.
  final Organizer? organizer;

  bool get isOwner => organizer?.isOwnedBy(uid) ?? false;
  bool get canSwitch => organizer != null && organizers.length > 1;
}

/// Why there is no [HostOrganizerScope] yet.
enum HostOrganizerScopeGap { loading, signedOut, authError, organizersError }

/// The organizer screens' common read: the signed-in account and its
/// operable organizers, a listener each. With [organizerId] the screen is
/// for that organizer; without it, for the one the shell has selected.
({HostOrganizerScope? scope, HostOrganizerScopeGap? gap, Object? error})
watchHostOrganizerScope(WidgetRef ref, {String? organizerId}) {
  final uidValue = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
  final uid = uidValue.value;
  if (uid == null) {
    if (uidValue.hasError) {
      return (
        scope: null,
        gap: HostOrganizerScopeGap.authError,
        error: uidValue.error,
      );
    }
    return (
      scope: null,
      gap: uidValue.isLoading
          ? HostOrganizerScopeGap.loading
          : HostOrganizerScopeGap.signedOut,
      error: null,
    );
  }
  final organizersValue = catchAsyncStateFromAsyncValue(
    ref.watch(hostOperableOrganizersProvider(uid)),
  );
  final organizers = organizersValue.value;
  if (organizers == null) {
    return organizersValue.hasError
        ? (
            scope: null,
            gap: HostOrganizerScopeGap.organizersError,
            error: organizersValue.error,
          )
        : (scope: null, gap: HostOrganizerScopeGap.loading, error: null);
  }
  final Organizer? organizer;
  if (organizerId != null && organizerId.isNotEmpty) {
    organizer = organizers.where((item) => item.id == organizerId).firstOrNull;
  } else {
    organizer = resolveSelectedHostOrganizer(
      organizers,
      selectedOrganizerId: ref.watch(hostOrganizerSelectionProvider(uid)),
    );
  }
  return (
    scope: HostOrganizerScope(
      uid: uid,
      organizers: organizers,
      organizer: organizer,
    ),
    gap: null,
    error: null,
  );
}

/// Starts the scope reads again after one failed.
void retryHostOrganizerScope(WidgetRef ref) {
  ref.invalidate(uidProvider);
  final uid = ref.read(uidProvider).value;
  if (uid != null) hostOperableOrganizerReads(uid).forEach(ref.invalidate);
}

/// The public page as an address, or null until the page has a route.
Uri? organizerPageUri(Organizer organizer) {
  final path = organizer.publicPage?.canonicalPath;
  if (path == null) return null;
  return AppConfig.publicSiteUrl.resolve(path);
}

/// [uri] without its scheme or a trailing slash, as the board prints it.
String organizerPageLink(Uri uri) {
  final text = '${uri.host}${uri.path}';
  return text.endsWith('/') ? text.substring(0, text.length - 1) : text;
}

/// Which organizer the tab is for and who is looking.
@immutable
class OrganizerTabRequest {
  const OrganizerTabRequest({required this.organizer, required this.uid});

  final Organizer organizer;
  final String uid;

  @override
  bool operator ==(Object other) =>
      other is OrganizerTabRequest &&
      other.organizer == organizer &&
      other.uid == uid;

  @override
  int get hashCode => Object.hash(organizer, uid);
}

/// The Organiser tab composed from its read owners: the organizer listener
/// the screen already holds, the cached thirty-day host report Today also
/// reads, the newest Catch bill for owners and the signed-in profile.
@riverpod
OrganizerState organizerTabController(Ref ref, OrganizerTabRequest request) {
  final organizer = request.organizer;
  final isOwner = organizer.isOwnedBy(request.uid);
  final pageUri = organizerPageUri(organizer);
  final currency = currencyCodeForCityName(organizer.location);
  final stats = _stats(ref, organizer, currency);
  final bills = isOwner
      ? ref.watch(hostOrganizerBillsProvider(organizer.id)).value
      : null;
  return OrganizerState(
    organizer: organizer,
    isOwner: isOwner,
    pageLink: pageUri == null ? null : organizerPageLink(pageUri),
    pageLive: organizer.publicPage?.isPublicWebsiteEnabled ?? false,
    stats: stats ?? const <OrganizerStat>[],
    statsPending: stats == null,
    billMinor: bills?.firstOrNull?.billMinor,
    billCurrencyCode: currency,
    accountName: _firstName(ref.watch(watchUserProfileProvider).value),
    helpAvailable: AppConfig.helpUrl != null,
  );
}

/// Starts the report and bill reads again.
void retryOrganizerTabReads(WidgetRef ref, OrganizerTabRequest request) {
  ref.invalidate(hostOrganizerBillsProvider(request.organizer.id));
  ref.invalidate(organizerTabControllerProvider(request));
}

/// The thirty-day stats, or null while the report is first read. A failed
/// report keeps the followers figure, which the organizer itself carries.
List<OrganizerStat>? _stats(Ref ref, Organizer organizer, String currency) {
  final followers = OrganizerStat(
    kind: OrganizerStatKind.followers,
    value: organizer.followerCount,
  );
  final session = ref.watch(authenticatedSessionProvider).value;
  if (session == null) return null;
  final timezone =
      ref.watch(hostAnalyticsDeviceTimezoneProvider).value ??
      marketForCityName(organizer.location).timeZone;
  final report = catchAsyncStateFromAsyncValue(
    ref.watch(
      hostAnalyticsProvider(
        HostAnalyticsRead(
          session,
          HostAnalyticsQuery(
            organizerId: organizer.id,
            granularity: HostAnalyticsGranularity.week,
            timezone: timezone,
          ),
        ),
      ),
    ),
  );
  final cards = report.value?.data.summaryCards;
  if (cards == null) {
    return report.hasError ? [followers] : null;
  }
  OrganizerStat? stat(String id, OrganizerStatKind kind, {String? currency}) {
    final card = cards.where((card) => card.id == id).firstOrNull;
    if (card == null || card.status == HostAnalyticsMetricStatus.missing) {
      return null;
    }
    return OrganizerStat(
      kind: kind,
      value: card.value,
      previousValue: card.previousValue,
      currencyCode: currency,
    );
  }

  return List<OrganizerStat>.unmodifiable([
    ?stat(HostAnalyticsMetricIds.bookings, OrganizerStatKind.bookings),
    ?stat(
      HostAnalyticsMetricIds.revenue,
      OrganizerStatKind.ticketSales,
      currency: currency,
    ),
    followers,
    ?stat(HostAnalyticsMetricIds.listingViews, OrganizerStatKind.pageVisits),
  ]);
}

String? _firstName(UserProfile? profile) {
  if (profile == null) return null;
  final name = profile.firstName.trim().isNotEmpty
      ? profile.firstName
      : profile.accountDisplayName;
  final word = name.trim().split(RegExp(r'\s+')).first;
  return word.isEmpty ? null : word;
}
