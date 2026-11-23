import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_host_contact_controller.g.dart';

@riverpod
class OrganizerHostContactController extends _$OrganizerHostContactController {
  static final startConversationMutation = Mutation<String>();

  @override
  void build() {}

  Future<String> startConversation({
    required String organizerId,
    required String hostUid,
    String? eventId,
  }) async {
    requireSignedInUid(ref, action: 'message an organizer host');
    return ref
        .read(organizersRepositoryProvider)
        .startOrganizerConversation(
          organizerId: organizerId,
          hostUid: hostUid,
          eventId: eventId,
        );
  }
}
