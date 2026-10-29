import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_publication_journal.dart';
import 'package:catch_dating_app/contexts/events/data/event_publication_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_journal.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_journal.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_journal.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_offer_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_publication_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_publication_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_setup_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_preferences_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations/host_manager_event_setup_defaults_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(userId)),
        privateEventPreferencesDependenciesProvider.overrideWithValue(
          PrivateEventPreferencesDependencies(
            readEvent: readEvent,
            readDefaults: readDefaults,
            write: write,
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
  Widget screen({required VoidCallback onBack}) => UncontrolledProviderScope(
    container: container,
    child: PrivateEventPreferencesScreen(scope: scope, onBack: onBack),
  );
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
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(userId)),
        eventOfferPreferencesDependenciesProvider.overrideWithValue(
          EventOfferPreferencesDependencies(
            readConfiguration: readConfiguration,
            readDefaults: readDefaults,
            write: write,
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
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(userId)),
        eventPublicationDependenciesProvider.overrideWithValue(
          EventPublicationDependencies(
            read: read,
            write: write,
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
  Widget screen({required VoidCallback onBack}) => UncontrolledProviderScope(
    container: container,
    child: EventPublicationScreen(scope: scope, onBack: onBack),
  );
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
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(userId)),
        hostManagerEventSetupDefaultsDependenciesProvider.overrideWithValue(
          HostManagerEventSetupDefaultsDependencies(
            read: read,
            write: write,
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
