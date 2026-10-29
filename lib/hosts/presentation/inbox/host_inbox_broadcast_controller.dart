import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

typedef HostInboxBroadcastSendOperation =
    Future<SendEventBroadcastCallableResponse> Function({
      required String requestId,
      required String eventId,
      required EventBroadcastAudience audience,
      required String body,
    });

class HostInboxBroadcastController {
  const HostInboxBroadcastController._();

  static final sendMutation = Mutation<SendEventBroadcastCallableResponse>();

  static String generateRequestId(WidgetRef ref) =>
      ref.read(eventRepositoryProvider).generateBroadcastRequestId();

  static void reset(WidgetRef ref) => sendMutation.reset(ref);

  static Future<SendEventBroadcastCallableResponse> send({
    required WidgetRef ref,
    required String requestId,
    required String eventId,
    required EventBroadcastAudience audience,
    required String body,
    HostInboxBroadcastSendOperation? operation,
  }) => sendMutation.run(
    ref,
    (transaction) => operation != null
        ? operation(
            requestId: requestId,
            eventId: eventId,
            audience: audience,
            body: body,
          )
        : transaction
              .get(eventRepositoryProvider)
              .sendEventBroadcast(
                requestId: requestId,
                eventId: eventId,
                audience: audience,
                body: body,
              ),
  );
}
