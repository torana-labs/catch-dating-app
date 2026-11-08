import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'formats_crawl_commands_controller.g.dart';

/// Changing a crawl stop on the night and telling everyone booked: one
/// `changeEventCrawlStop` command under one request id. It does not
/// invalidate a read: the plan listener delivers the changed stop.
@riverpod
class HostFormatsCrawlCommands extends _$HostFormatsCrawlCommands {
  static final changeStopMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> changeStop({
    required String eventId,
    required String requestId,
    required int expectedLiveControlRevision,
    required String stopId,
    required String title,
    required String? address,
    required String message,
  }) async {
    requireSignedInUid(ref, action: 'change the stop');
    await ref
        .read(eventSuccessRepositoryProvider)
        .changeEventCrawlStop(
          eventId: eventId,
          requestId: requestId,
          expectedLiveControlRevision: expectedLiveControlRevision,
          stopId: stopId,
          title: title,
          address: address,
          message: message,
        );
  }
}
