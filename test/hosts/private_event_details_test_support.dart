import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_details_journal.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_details_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/core/media/uploaded_photo.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_details_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Test-only seed access; production changes immutable state through commands.
class _SeededDetailsController extends PrivateEventDetailsController {
  PrivateEventDetailsState readSnapshot() => state;
  void seed(PrivateEventDetailsState value) => state = value;
}

class TestPrivateEventDetailsController {
  TestPrivateEventDetailsController._(this._notifier, this.container);
  final _SeededDetailsController _notifier;
  final ProviderContainer container;
  PrivateEventDetailsController get notifier => _notifier;
  PrivateEventDetailsScope get scope => _notifier.scope;
  PrivateEventDetailsState get state => _notifier.readSnapshot();
  set state(PrivateEventDetailsState value) => _notifier.seed(value);
  Future<void> load() => _notifier.load();
  Future<void> save(PrivateEventDetailsPatch patch) => _notifier.save(patch);
  Future<void> retryPending() => _notifier.retryPending();
  Future<void> discardPending() => _notifier.discardPending();
  Future<void> addPhotos() => _notifier.addPhotos();
  void invalidateActor() => _notifier.invalidateActor();

  PrivateEventBasicSummary? get event => state.event;
  ManagerEventSetupDefaults? get defaults => state.defaults;
  PrivateEventDetailsUpdateRequest? get pending => state.pending;
  PrivateSeatReconciliationProgress? get reconciliationProgress =>
      state.reconciliationProgress;
  Object? get error => state.error;
  bool get loading => state.loading;
  bool get saving => state.saving;
  bool get uploading => state.uploading;
  bool get actorAvailable => state.actorAvailable;
  bool get canEdit => state.canEdit;
  bool get canEditFormat => state.canEditFormat;
  bool get canDiscardPending => state.canDiscardPending;

  set event(PrivateEventBasicSummary? value) =>
      state = state.copyWith(event: value);
  set defaults(ManagerEventSetupDefaults? value) =>
      state = state.copyWith(defaults: value);
  set pending(PrivateEventDetailsUpdateRequest? value) =>
      state = state.copyWith(pending: value);
  set reconciliationProgress(PrivateSeatReconciliationProgress? value) =>
      state = state.copyWith(reconciliationProgress: value);
  void dispose() => container.dispose();
  PrivateEventDetailsState get snapshot => state;
}

TestPrivateEventDetailsController createDetailsController({
  required String userId,
  required String organizerId,
  required String eventId,
  required ReadPrivateEventForDetails readEvent,
  required ReadDefaultsForPrivateDetails readDefaults,
  required WritePrivateEventDetails write,
  PrivateEventDetailsJournal journal = const PrivateEventDetailsJournal(),
  String? Function()? currentUserId,
  Future<PrivateSeatReconciliationResult> Function(
    PrivateEventDetailsUpdateRequest,
  )?
  reconcile,
  Future<List<UploadedPhoto>> Function(int)? pickAndUploadPhotos,
}) {
  final notifier = _SeededDetailsController();
  final scope = (userId: userId, organizerId: organizerId, eventId: eventId);
  final provider = privateEventDetailsControllerProvider(scope);
  final container = ProviderContainer(
    overrides: [
      uidProvider.overrideWith((ref) => Stream.value(userId)),
      privateEventDetailsDependenciesProvider.overrideWithValue(
        PrivateEventDetailsDependencies(
          readEvent: readEvent,
          readDefaults: readDefaults,
          write: write,
          journal: journal,
          currentUserId: currentUserId,
          reconcile: reconcile,
          pickAndUploadPhotos: pickAndUploadPhotos == null
              ? null
              : (_, position) => pickAndUploadPhotos(position),
        ),
      ),
      provider.overrideWith(() => notifier),
    ],
  );
  final controller = TestPrivateEventDetailsController._(notifier, container);
  container.listen(provider, (_, _) {});
  container.read(provider.notifier);
  addTearDown(container.dispose);
  return controller;
}
