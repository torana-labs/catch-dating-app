import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_publication_journal.dart';
import 'package:catch_dating_app/contexts/events/data/event_publication_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_journal.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_details_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_journal.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_configuration_reads.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_journal.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_offer_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_publication_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_setup_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations/host_manager_event_setup_defaults_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'support/read_model_feeds.dart';

/// The event as a step reads it; a feed delivers it as a complete setup view.
typedef ReadPrivateEventForPreferences =
    Future<PrivateEventBasicSummary> Function({
      required String organizerId,
      required String eventId,
    });
typedef ReadEventOfferConfiguration =
    Future<EventOfferConfiguration> Function({
      required String organizerId,
      required String eventId,
    });
typedef ReadManagerEventSetupDefaults =
    Future<ManagerEventSetupDefaults> Function(String organizerId);

/// Setup view feed over [read]; refreshed after each committed command.
SetupViewFeed setupViewFeed(
  ReadPrivateEventForPreferences read, {
  required String organizerId,
  required String eventId,
}) => SetupViewFeed(read, organizerId: organizerId, eventId: eventId);

/// A setup view feed that, like the server's trigger, never delivers a
/// revision older than the last command it saw commit.
class SetupViewFeed extends ReadModelFeed<PrivateEventSetupView> {
  SetupViewFeed(
    ReadPrivateEventForPreferences read, {
    required String organizerId,
    required String eventId,
  }) : this._(read, organizerId, eventId, _Floor());

  SetupViewFeed._(
    ReadPrivateEventForPreferences read,
    String organizerId,
    String eventId,
    this._floor,
  ) : super(() async {
        final summary = await read(organizerId: organizerId, eventId: eventId);
        return PrivateEventSetupView.complete(
          summary.setupRevision >= _floor.value
              ? summary
              : _withRevision(summary, _floor.value),
        );
      });

  final _Floor _floor;

  /// Records a command result's committed setup revision, when it has one.
  void commit(Object? result) {
    final revision = switch (result) {
      PrivateEventCreateReceipt(:final setupRevision) => setupRevision,
      EventPublicationReceipt(:final setupRevision) => setupRevision,
      PrivateSeatReconciliationResult(:final receipt?) => receipt.setupRevision,
      _ => null,
    };
    if (revision != null && revision > _floor.value) _floor.value = revision;
  }
}

final class _Floor {
  int value = 0;
}

PrivateEventBasicSummary _withRevision(
  PrivateEventBasicSummary summary,
  int revision,
) => PrivateEventBasicSummary(
  eventId: summary.eventId,
  organizerId: summary.organizerId,
  setupRevision: revision,
  name: summary.name,
  city: summary.city,
  localDate: summary.localDate,
  localStartTime: summary.localStartTime,
  timezone: summary.timezone,
  startTimeMillis: summary.startTimeMillis,
  status: summary.status,
  setupDefaults: summary.setupDefaults,
  detailsConfigured: summary.detailsConfigured,
  eventPreferences: summary.eventPreferences,
  publicationState: summary.publicationState,
  publicationReadiness: summary.publicationReadiness,
  canEditBasics: summary.canEditBasics,
  canChangeCity: summary.canChangeCity,
  eventDetails: summary.eventDetails,
);

/// Defaults view feed over [read].
ReadModelFeed<ManagerEventSetupDefaultsView> defaultsViewFeed(
  ReadManagerEventSetupDefaults read,
  String organizerId,
) => ReadModelFeed(
  () async => ManagerEventSetupDefaultsView.complete(await read(organizerId)),
);

/// Runs [write], then lets the feeds deliver what the server would rewrite.
Future<R> Function(Q) refreshingAfter<Q, R>(
  Future<R> Function(Q) write,
  List<ReadModelFeed<Object?>> feeds,
) => (request) async {
  final result = await write(request);
  for (final feed in feeds) {
    if (feed is SetupViewFeed) feed.commit(result);
    unawaited(feed.refresh());
  }
  return result;
};

class _SeededPrivateEventPreferencesController
    extends PrivateEventPreferencesController {
  EventPreferencesEditorState snapshot() => state;
  void seed(EventPreferencesEditorState value) => state = value;
}

class TestPrivateEventPreferencesController {
  TestPrivateEventPreferencesController({
    required String userId,
    required String organizerId,
    required String eventId,
    required ReadPrivateEventForPreferences readEvent,
    required Future<ManagerEventSetupDefaults> Function(String) readDefaults,
    required WritePrivateEventPreferences write,
    PreviewEventOfferPreferences? readPreview,
    String? Function()? currentUserId,
    String? displayName,
    PrivateEventPreferencesJournal journal =
        const PrivateEventPreferencesJournal(),
  }) {
    scope = (userId: userId, organizerId: organizerId, eventId: eventId);
    eventFeed = setupViewFeed(
      readEvent,
      organizerId: organizerId,
      eventId: eventId,
    );
    defaultsFeed = defaultsViewFeed(readDefaults, organizerId);
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(userId)),
        privateEventSetupViewProvider(
          organizerId: organizerId,
          eventId: eventId,
        ).overrideWith((ref) => eventFeed.stream),
        managerEventSetupDefaultsViewProvider(
          organizerId,
        ).overrideWith((ref) => defaultsFeed.stream),
        privateEventPreferencesDependenciesProvider.overrideWithValue(
          PrivateEventPreferencesDependencies(
            write: refreshingAfter(write, [eventFeed]),
            readPreview: readPreview,
            currentUserId: currentUserId,
            journal: journal,
          ),
        ),
        privateEventPreferencesControllerProvider(
          scope,
        ).overrideWith(_SeededPrivateEventPreferencesController.new),
      ],
    );
    container.listen(
      privateEventPreferencesControllerProvider(scope),
      (_, _) {},
    );
    _controller =
        container.read(
              privateEventPreferencesControllerProvider(scope).notifier,
            )
            as _SeededPrivateEventPreferencesController;
    _controller.seed(_controller.snapshot().copyWith(displayName: displayName));
  }
  late final EventEditorScope scope;
  late final SetupViewFeed eventFeed;
  late final ReadModelFeed<ManagerEventSetupDefaultsView> defaultsFeed;
  late final ProviderContainer container;
  late final _SeededPrivateEventPreferencesController _controller;
  PrivateEventPreferencesController get notifier => _controller;
  EventPreferencesEditorState get snapshot => _controller.snapshot();
  void dispose() => container.dispose();
  Future<void> load() => _controller.load();
  ManagerEventSetupDefaults? get defaults => snapshot.defaults;
  set defaults(ManagerEventSetupDefaults? value) =>
      _controller.seed(snapshot.copyWith(defaults: value));
  Object? get error => snapshot.error;
  set error(Object? value) => _controller.seed(snapshot.copyWith(error: value));
  bool get loading => snapshot.loading;
  set loading(bool value) =>
      _controller.seed(snapshot.copyWith(loading: value));
  bool get saving => snapshot.saving;
  set saving(bool value) => _controller.seed(snapshot.copyWith(saving: value));
  bool get actorAvailable => snapshot.actorAvailable;
  set actorAvailable(bool value) =>
      _controller.seed(snapshot.copyWith(actorAvailable: value));
  PrivateEventBasicSummary? get event => snapshot.event;
  set event(PrivateEventBasicSummary? value) =>
      _controller.seed(snapshot.copyWith(event: value));
  PrivateEventPreferenceIntents? get draftIntents => snapshot.draftIntents;
  set draftIntents(PrivateEventPreferenceIntents? value) =>
      _controller.seed(snapshot.copyWith(draftIntents: value));
  EventOfferPreferencesPreview? get review => snapshot.review;
  set review(EventOfferPreferencesPreview? value) =>
      _controller.seed(snapshot.copyWith(review: value));
  bool get previewing => snapshot.previewing;
  set previewing(bool value) =>
      _controller.seed(snapshot.copyWith(previewing: value));
  PrivateEventPreferencesUpdateRequest? get pending => snapshot.privatePending;
  bool get canEdit => _controller.actorIsAvailable() && snapshot.canEdit;
  bool get hasPending => snapshot.hasPending;
  bool get hasLoadedEvent => snapshot.hasLoadedEvent;
  String? get eventName => snapshot.eventName;
  PrivateEventPreferenceIntents get intents => snapshot.intents;
  PrivateEventPreferenceIntents get editorIntents => snapshot.editorIntents;
  Map<String, Object?> get resolvedValues => snapshot.resolvedValues;
  void stage(PrivateEventPreferenceIntents value) => _controller.stage(value);
  void invalidateActor() => _controller.invalidateActor();
  Future<void> save(PrivateEventPreferenceIntents value) =>
      _controller.save(value);
  Future<void> retryPending() => _controller.retryPending();
  Future<void> previewChanges() => _controller.previewChanges();
  Future<void> applyReview() => _controller.applyReview();
  EventOfferPreferencesUpdateRequest buildPreviewRequest(
    PrivateEventPreferenceIntents value,
  ) => _controller.previewRequest(value);
}

class _SeededEventOfferPreferencesController
    extends EventOfferPreferencesController {
  EventPreferencesEditorState snapshot() => state;
  void seed(EventPreferencesEditorState value) => state = value;
}

class TestEventOfferPreferencesController {
  TestEventOfferPreferencesController({
    required String userId,
    required String organizerId,
    required String eventId,
    required ReadEventOfferConfiguration readConfiguration,
    required Future<ManagerEventSetupDefaults> Function(String) readDefaults,
    required WriteEventOfferPreferences write,
    PreviewEventOfferPreferences? readPreview,
    String? Function()? currentUserId,
    String? displayName,
    EventOfferPreferencesJournal journal = const EventOfferPreferencesJournal(),
  }) {
    scope = (userId: userId, organizerId: organizerId, eventId: eventId);
    configurationFeed = ReadModelFeed(
      () => readConfiguration(organizerId: organizerId, eventId: eventId),
    );
    defaultsFeed = defaultsViewFeed(readDefaults, organizerId);
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(userId)),
        eventOfferConfigurationProvider(
          organizerId: organizerId,
          eventId: eventId,
        ).overrideWith((ref) => configurationFeed.stream),
        managerEventSetupDefaultsViewProvider(
          organizerId,
        ).overrideWith((ref) => defaultsFeed.stream),
        eventOfferPreferencesDependenciesProvider.overrideWithValue(
          EventOfferPreferencesDependencies(
            write: refreshingAfter(write, [configurationFeed]),
            readPreview: readPreview,
            currentUserId: currentUserId,
            journal: journal,
          ),
        ),
        eventOfferPreferencesControllerProvider(
          scope,
        ).overrideWith(_SeededEventOfferPreferencesController.new),
      ],
    );
    container.listen(eventOfferPreferencesControllerProvider(scope), (_, _) {});
    _controller =
        container.read(eventOfferPreferencesControllerProvider(scope).notifier)
            as _SeededEventOfferPreferencesController;
    _controller.seed(_controller.snapshot().copyWith(displayName: displayName));
  }
  late final EventEditorScope scope;
  late final ReadModelFeed<EventOfferConfiguration> configurationFeed;
  late final ReadModelFeed<ManagerEventSetupDefaultsView> defaultsFeed;
  late final ProviderContainer container;
  late final _SeededEventOfferPreferencesController _controller;
  EventOfferPreferencesController get notifier => _controller;
  EventPreferencesEditorState get snapshot => _controller.snapshot();
  void dispose() => container.dispose();
  Future<void> load() => _controller.load();
  ManagerEventSetupDefaults? get defaults => snapshot.defaults;
  set defaults(ManagerEventSetupDefaults? value) =>
      _controller.seed(snapshot.copyWith(defaults: value));
  Object? get error => snapshot.error;
  set error(Object? value) => _controller.seed(snapshot.copyWith(error: value));
  bool get loading => snapshot.loading;
  set loading(bool value) =>
      _controller.seed(snapshot.copyWith(loading: value));
  bool get saving => snapshot.saving;
  set saving(bool value) => _controller.seed(snapshot.copyWith(saving: value));
  bool get actorAvailable => snapshot.actorAvailable;
  set actorAvailable(bool value) =>
      _controller.seed(snapshot.copyWith(actorAvailable: value));
  EventOfferConfiguration? get configuration => snapshot.configuration;
  set configuration(EventOfferConfiguration? value) =>
      _controller.seed(snapshot.copyWith(configuration: value));
  PrivateEventPreferenceIntents? get draftIntents => snapshot.draftIntents;
  set draftIntents(PrivateEventPreferenceIntents? value) =>
      _controller.seed(snapshot.copyWith(draftIntents: value));
  EventOfferPreferencesPreview? get review => snapshot.review;
  set review(EventOfferPreferencesPreview? value) =>
      _controller.seed(snapshot.copyWith(review: value));
  bool get previewing => snapshot.previewing;
  set previewing(bool value) =>
      _controller.seed(snapshot.copyWith(previewing: value));
  EventOfferPreferencesUpdateRequest? get pending => snapshot.offerPending;
  bool get canEdit => _controller.actorIsAvailable() && snapshot.canEdit;
  bool get hasPending => snapshot.hasPending;
  bool get hasLoadedEvent => snapshot.hasLoadedEvent;
  String? get eventName => snapshot.eventName;
  PrivateEventPreferenceIntents get intents => snapshot.intents;
  PrivateEventPreferenceIntents get editorIntents => snapshot.editorIntents;
  Map<String, Object?> get resolvedValues => snapshot.resolvedValues;
  void stage(PrivateEventPreferenceIntents value) => _controller.stage(value);
  void invalidateActor() => _controller.invalidateActor();
  Future<void> save(PrivateEventPreferenceIntents value) =>
      _controller.save(value);
  Future<void> retryPending() => _controller.retryPending();
  Future<void> previewChanges() => _controller.previewChanges();
  Future<void> applyReview() => _controller.applyReview();
  EventOfferPreferencesUpdateRequest buildPreviewRequest(
    PrivateEventPreferenceIntents value,
  ) => _controller.previewRequest(value);
  Widget screen({required VoidCallback onBack}) => UncontrolledProviderScope(
    container: container,
    child: HostOfferPaymentSetupPageBody(scope: scope, onBack: onBack),
  );
}

class _SeededEventPublicationController extends EventPublicationController {
  EventPublicationState snapshot() => state;
  void seed(EventPublicationState value) => state = value;
}

class TestEventPublicationController {
  TestEventPublicationController({
    required String userId,
    required String organizerId,
    required String eventId,
    required Future<PrivateEventBasicSummary> Function({
      required String organizerId,
      required String eventId,
    })
    read,
    required Future<EventPublicationReceipt> Function(EventPublicationRequest)
    write,
    String? Function()? currentUserId,
    EventPublicationJournal journal = const EventPublicationJournal(),
  }) {
    scope = (userId: userId, organizerId: organizerId, eventId: eventId);
    eventFeed = setupViewFeed(read, organizerId: organizerId, eventId: eventId);
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(userId)),
        privateEventSetupViewProvider(
          organizerId: organizerId,
          eventId: eventId,
        ).overrideWith((ref) => eventFeed.stream),
        eventPublicationDependenciesProvider.overrideWithValue(
          EventPublicationDependencies(
            write: refreshingAfter(write, [eventFeed]),
            currentUserId: currentUserId,
            journal: journal,
          ),
        ),
        eventPublicationControllerProvider(
          scope,
        ).overrideWith(_SeededEventPublicationController.new),
      ],
    );
    container.listen(eventPublicationControllerProvider(scope), (_, _) {});
    _controller =
        container.read(eventPublicationControllerProvider(scope).notifier)
            as _SeededEventPublicationController;
  }
  late final EventEditorScope scope;
  late final SetupViewFeed eventFeed;
  late final ProviderContainer container;
  late final _SeededEventPublicationController _controller;
  EventPublicationController get notifier => _controller;
  EventPublicationState get snapshot => _controller.snapshot();
  void dispose() => container.dispose();
  Future<void> load() => _controller.load();
  Object? get error => snapshot.error;
  set error(Object? value) => _controller.seed(snapshot.copyWith(error: value));
  bool get loading => snapshot.loading;
  set loading(bool value) =>
      _controller.seed(snapshot.copyWith(loading: value));
  bool get saving => snapshot.saving;
  set saving(bool value) => _controller.seed(snapshot.copyWith(saving: value));
  bool get actorAvailable => snapshot.actorAvailable;
  set actorAvailable(bool value) =>
      _controller.seed(snapshot.copyWith(actorAvailable: value));
  PrivateEventBasicSummary? get event => snapshot.event;
  set event(PrivateEventBasicSummary? value) =>
      _controller.seed(snapshot.copyWith(event: value));
  EventPublicationRequest? get pending => snapshot.pending;
  set pending(EventPublicationRequest? value) =>
      _controller.seed(snapshot.copyWith(pending: value));
  EventPublicationReceipt? get receipt => snapshot.receipt;
  set receipt(EventPublicationReceipt? value) =>
      _controller.seed(snapshot.copyWith(receipt: value));
  bool get canChange => snapshot.canChange;
  bool get canPublish => snapshot.canPublish;
  bool get canUnpublish => snapshot.canUnpublish;
  void invalidateActor() => _controller.invalidateActor();
  Future<void> changeTo(String value) => _controller.changeTo(value);
  Future<void> retry() => _controller.retry();
}

class _SeededHostManagerEventSetupDefaultsController
    extends HostManagerEventSetupDefaultsController {
  HostManagerEventSetupDefaultsState snapshot() => state;
  void seed(HostManagerEventSetupDefaultsState value) => state = value;
}

class TestHostManagerEventSetupDefaultsController {
  TestHostManagerEventSetupDefaultsController({
    required String userId,
    required String organizerId,
    required ReadManagerEventSetupDefaults read,
    required WriteManagerEventSetupDefaults write,
    String? Function()? currentUserId,
    ManagerEventSetupDefaultsJournal journal =
        const ManagerEventSetupDefaultsJournal(),
  }) {
    scope = (userId: userId, organizerId: organizerId);
    defaultsFeed = defaultsViewFeed(read, organizerId);
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(userId)),
        managerEventSetupDefaultsViewProvider(
          organizerId,
        ).overrideWith((ref) => defaultsFeed.stream),
        hostManagerEventSetupDefaultsDependenciesProvider.overrideWithValue(
          HostManagerEventSetupDefaultsDependencies(
            write: refreshingAfter(write, [defaultsFeed]),
            currentUserId: currentUserId,
            journal: journal,
          ),
        ),
        hostManagerEventSetupDefaultsControllerProvider(
          scope,
        ).overrideWith(_SeededHostManagerEventSetupDefaultsController.new),
      ],
    );
    container.listen(
      hostManagerEventSetupDefaultsControllerProvider(scope),
      (_, _) {},
    );
    _controller =
        container.read(
              hostManagerEventSetupDefaultsControllerProvider(scope).notifier,
            )
            as _SeededHostManagerEventSetupDefaultsController;
  }
  late final ({String userId, String organizerId}) scope;
  late final ReadModelFeed<ManagerEventSetupDefaultsView> defaultsFeed;
  late final ProviderContainer container;
  late final _SeededHostManagerEventSetupDefaultsController _controller;
  HostManagerEventSetupDefaultsController get notifier => _controller;
  HostManagerEventSetupDefaultsState get snapshot => _controller.snapshot();
  void dispose() => container.dispose();
  Future<void> load() => _controller.load();
  Object? get error => snapshot.error;
  set error(Object? value) => _controller.seed(snapshot.copyWith(error: value));
  bool get loading => snapshot.loading;
  set loading(bool value) =>
      _controller.seed(snapshot.copyWith(loading: value));
  bool get saving => snapshot.saving;
  set saving(bool value) => _controller.seed(snapshot.copyWith(saving: value));
  bool get actorAvailable => snapshot.actorAvailable;
  set actorAvailable(bool value) =>
      _controller.seed(snapshot.copyWith(actorAvailable: value));
  ManagerEventSetupDefaults? get current => snapshot.current;
  set current(ManagerEventSetupDefaults? value) =>
      _controller.seed(snapshot.copyWith(current: value));
  ManagerEventSetupDefaultsUpdateRequest? get pending => snapshot.pending;
  set pending(ManagerEventSetupDefaultsUpdateRequest? value) =>
      _controller.seed(snapshot.copyWith(pending: value));
  bool get canEdit => snapshot.canEdit;
  Future<void> save(ManagerEventSetupPreferences value) =>
      _controller.save(value);
  Future<void> retryPending() => _controller.retryPending();
}

Widget testOfferPreferencesScreen({
  required TestEventOfferPreferencesController controller,
  required VoidCallback onBack,
}) => controller.screen(onBack: onBack);
