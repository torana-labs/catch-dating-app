import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/safety/data/organizer_guest_safety_repository.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/contexts/safety/data/organizer_guest_safety_repository.dart'
    show
        OrganizerGuestBlock,
        OrganizerGuestReportReason,
        organizerGuestBlocksProvider;

part 'guest_safety_commands_controller.g.dart';

/// The guest list safety commands: report a guest to Catch, stop them
/// booking the organiser events, and let them back. Blocking and letting
/// back refresh the organiser block list.
@riverpod
class HostGuestSafetyCommands extends _$HostGuestSafetyCommands {
  static final reportMutation = Mutation<void>();
  static final blockMutation = Mutation<void>();
  static final letBackMutation = Mutation<void>();

  @override
  void build() {}

  /// Reports [uid] from the event guest list, with no notes.
  Future<void> report({
    required String organizerId,
    required String eventId,
    required String uid,
    required OrganizerGuestReportReason reason,
  }) async {
    requireSignedInUid(ref, action: 'report a guest');
    await ref
        .read(organizerGuestSafetyRepositoryProvider)
        .reportGuest(
          organizerId: organizerId,
          eventId: eventId,
          targetUserId: uid,
          reason: reason,
        );
  }

  /// Stops [uid] booking the organiser events. Bookings they already
  /// have stay.
  Future<void> block({required String organizerId, required String uid}) =>
      _setBlocked(organizerId: organizerId, uid: uid, blocked: true);

  /// Lets [uid] book the organiser events again.
  Future<void> letBack({required String organizerId, required String uid}) =>
      _setBlocked(organizerId: organizerId, uid: uid, blocked: false);

  Future<void> _setBlocked({
    required String organizerId,
    required String uid,
    required bool blocked,
  }) async {
    requireSignedInUid(
      ref,
      action: blocked ? 'block a guest' : 'let a guest back',
    );
    await ref
        .read(organizerGuestSafetyRepositoryProvider)
        .setGuestBlocked(organizerId: organizerId, uid: uid, blocked: blocked);
    ref.invalidate(organizerGuestBlocksProvider(organizerId));
  }
}
