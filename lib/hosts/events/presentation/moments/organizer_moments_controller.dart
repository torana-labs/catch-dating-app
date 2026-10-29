import 'package:catch_dating_app/contexts/events/data/organizer_moments_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/organizer_moment.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_moments_controller.g.dart';

@immutable
class OrganizerMomentsState {
  const OrganizerMomentsState({
    required this.moments,
    this.mutatingMomentIds = const {},
  });

  final List<OrganizerMoment> moments;
  final Set<String> mutatingMomentIds;

  OrganizerMomentsState copyWith({
    List<OrganizerMoment>? moments,
    Set<String>? mutatingMomentIds,
  }) => OrganizerMomentsState(
    moments: moments ?? this.moments,
    mutatingMomentIds: mutatingMomentIds ?? this.mutatingMomentIds,
  );
}

/// Loads and mutates the moments for one event or program scope.
/// Lifecycle validation stays with the backend; the controller only
/// applies the returned definitions to the list.
@riverpod
class OrganizerMomentsController extends _$OrganizerMomentsController {
  @override
  Future<OrganizerMomentsState> build(OrganizerMomentScope scope) async =>
      OrganizerMomentsState(
        moments: await ref
            .read(organizerMomentsRepositoryProvider)
            .listMoments(scope),
      );

  Future<void> _mutate(
    String momentId,
    Future<OrganizerMoment> Function() call,
  ) async {
    final current = state.asData?.value;
    if (current == null || current.mutatingMomentIds.contains(momentId)) {
      return;
    }
    state = AsyncData(
      current.copyWith(
        mutatingMomentIds: {...current.mutatingMomentIds, momentId},
      ),
    );
    try {
      final updated = await call();
      final latest = state.asData?.value ?? current;
      state = AsyncData(
        latest.copyWith(
          moments: [
            for (final moment in latest.moments)
              if (moment.momentId == updated.momentId) updated else moment,
          ],
          mutatingMomentIds: {...latest.mutatingMomentIds}..remove(momentId),
        ),
      );
    } on Object {
      final latest = state.asData?.value ?? current;
      state = AsyncData(
        latest.copyWith(
          mutatingMomentIds: {...latest.mutatingMomentIds}..remove(momentId),
        ),
      );
      rethrow;
    }
  }

  Future<void> arm(String momentId) => _mutate(
    momentId,
    () =>
        ref.read(organizerMomentsRepositoryProvider).armMoment(scope, momentId),
  );

  Future<void> pause(String momentId) => _mutate(
    momentId,
    () => ref
        .read(organizerMomentsRepositoryProvider)
        .pauseMoment(scope, momentId),
  );

  Future<void> resume(String momentId) => _mutate(
    momentId,
    () => ref
        .read(organizerMomentsRepositoryProvider)
        .resumeMoment(scope, momentId),
  );

  /// Fires a manual run. The backend resolves the requestKey idempotently;
  /// the list refresh picks up any send bookkeeping on the next build.
  Future<String> run(String momentId, {required String requestKey}) => ref
      .read(organizerMomentsRepositoryProvider)
      .runMoment(scope, momentId, requestKey: requestKey);

  /// Upserts a moment definition, then refreshes so the list reflects the
  /// post-revision draft state the backend owns.
  Future<OrganizerMoment> save({
    String? momentId,
    required String name,
    required OrganizerMomentInitiation initiation,
    required OrganizerMomentSense sense,
    required OrganizerMomentAudience audience,
    required OrganizerMomentAction action,
  }) async {
    final saved = await ref
        .read(organizerMomentsRepositoryProvider)
        .upsertMoment(
          scope: scope,
          momentId: momentId,
          name: name,
          initiation: initiation,
          sense: sense,
          audience: audience,
          action: action,
        );
    ref.invalidateSelf();
    return saved;
  }
}
