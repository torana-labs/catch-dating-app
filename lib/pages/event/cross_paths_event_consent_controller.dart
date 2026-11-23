import 'package:catch_dating_app/contexts/connections/data/cross_paths_repository.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'cross_paths_event_consent_controller.g.dart';

@riverpod
class CrossPathsEventConsentController
    extends _$CrossPathsEventConsentController {
  static final setConsentMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> setConsent({required String eventId, required bool enabled}) =>
      ref
          .read(crossPathsRepositoryProvider)
          .setEventConsent(eventId: eventId, enabled: enabled);
}
