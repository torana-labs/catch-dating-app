import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/events/data/event_publication_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_default_view_reads.dart';
import 'package:catch_dating_app/hosts/events/event_commands_controller.dart';
import 'package:catch_dating_app/hosts/events/event_publish_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_publish_controller.g.dart';

/// The publication screen, read through the event's setup view listener:
/// its name, whether it is published and listed, whether it can be, its
/// guest settings, its saved booking choice and its setup revision.
@riverpod
HostEventPublishState hostEventPublishController(
  Ref ref,
  HostEventRequest request,
) {
  final viewValue = ref.watch(
    privateEventSetupViewProvider(
      organizerId: request.organizerId,
      eventId: request.eventId,
    ),
  );
  final defaults = ref
      .watch(managerEventSetupDefaultsViewProvider(request.organizerId))
      .value
      ?.defaults;
  final view = viewValue.value;
  if (view == null) {
    return switch (viewValue) {
      AsyncValue(:final error?) => HostEventPublishState(
        status: HostEventPublishStatus.error,
        error: error,
      ),
      _ => const HostEventPublishState.loading(),
    };
  }
  if (view.sourceCoverage == PrivateEventSetupCoverage.missing ||
      view.summary == null) {
    return const HostEventPublishState(status: HostEventPublishStatus.missing);
  }
  final summary = view.summary!;
  final settings = summary.eventSettings;
  final published = summary.publicationState == 'published';
  // A published event books as its admission says; before that, the choice
  // is the event's booking preference.
  final booking = published
      ? settings.publishedBookingMode
      : summary.eventPreferences?.resolvedValues['bookingMode'];
  return HostEventPublishState(
    status: HostEventPublishStatus.ready,
    eventTitle: summary.name,
    published: published,
    canPublish: summary.publicationReadiness?.canPublish ?? false,
    setupRevision: view.setupRevision ?? summary.setupRevision,
    listing: settings.listing,
    showGuestList: settings.showGuestList,
    priceHiddenUntilBookingOpens: settings.priceHiddenUntilBookingOpens,
    bookingMode: switch (booking) {
      'askFirst' => HostEventBookingMode.askFirst,
      'followersFirst' => HostEventBookingMode.followersFirst,
      'anyone' => HostEventBookingMode.anyone,
      _ => null,
    },
    canChangeBooking:
        summary.status == 'active' && (published || defaults != null),
  );
}

/// The commands the publication screen commits beyond publishing: who can
/// find the event, its guest settings, and who can book. None invalidates a
/// read; the setup view listener delivers each result.
@riverpod
class HostEventPublishCommands extends _$HostEventPublishCommands {
  static final settingsMutation = Mutation<void>();
  static final bookingMutation = Mutation<void>();

  @override
  void build() {}

  /// Saves who can find the event and its guest settings through the
  /// publication command. Moving between published and unpublished changes
  /// publication; any other change saves only the settings.
  Future<void> saveSettings({
    required HostEventRequest request,
    required int expectedSetupRevision,
    required bool published,
    String? listing,
    bool? showGuestList,
    bool? priceHiddenUntilBookingOpens,
  }) async {
    requireSignedInUid(ref, action: 'change who can see the event');
    await ref
        .read(eventPublicationRepositoryProvider)
        .set(
          EventPublicationRequest(
            organizerId: request.organizerId,
            eventId: request.eventId,
            requestId: hostEventRequestId(),
            expectedSetupRevision: expectedSetupRevision,
            publicationState: published ? 'published' : 'private',
            listing: listing,
            showGuestList: showGuestList,
            priceHiddenUntilBookingOpens: priceHiddenUntilBookingOpens,
          ),
        );
  }

  /// Saves who can book. A published event changes its admission through
  /// the publication command, fenced by the setup revision; an unpublished
  /// one saves the choice as its booking preference, keeping every other
  /// preference, and publishing applies it. Ask first makes each sign-up a
  /// request the host lets in; followers first lets only followers book
  /// until the day before.
  Future<void> saveBookingMode({
    required HostEventRequest request,
    required HostEventBookingMode mode,
  }) async {
    final uid = requireSignedInUid(ref, action: 'change who can book');
    final view = await ref.read(
      privateEventSetupViewProvider(
        organizerId: request.organizerId,
        eventId: request.eventId,
      ).future,
    );
    final summary = view.requireSummary();
    if (summary.publicationState == 'published') {
      await ref
          .read(eventPublicationRepositoryProvider)
          .set(
            EventPublicationRequest(
              organizerId: request.organizerId,
              eventId: request.eventId,
              requestId: hostEventRequestId(),
              expectedSetupRevision:
                  view.setupRevision ?? summary.setupRevision,
              publicationState: 'published',
              bookingMode: mode.name,
            ),
          );
      return;
    }
    final defaults = (await ref.read(
      managerEventSetupDefaultsViewProvider(request.organizerId).future,
    )).requireDefaults();
    final saved = summary.eventPreferences;
    final intents = (saved?.intents ?? const PrivateEventPreferenceIntents())
        .withBookingMode(EventSetupValue.set(mode.name));
    await PrivateEventPreferencesRepository(
      ref.read(firebaseFunctionsProvider),
    ).update(
      PrivateEventPreferencesUpdateRequest(
        expectedActorUid: uid,
        organizerId: request.organizerId,
        eventId: request.eventId,
        requestId: hostEventRequestId(),
        expectedSetupRevision: summary.setupRevision,
        expectedPreferencesRevision: saved?.revision ?? 0,
        reviewedDefaultsHash: defaults.preferencesHash,
        intents: intents,
      ),
    );
  }
}
