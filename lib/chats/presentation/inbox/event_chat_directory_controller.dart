import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_directory_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_chat_directory_controller.g.dart';

/// The signed-in person's event chats, newest event first, from one listener
/// on their directory rows. Writes to bookings, roster rows, rooms and chat
/// memberships reach it through the triggers that rebuild those rows.
@Riverpod(retry: _noDirectoryReadRetry)
Stream<List<EventChatAccess>> eventChatDirectory(Ref ref) async* {
  final uid = await ref.watch(uidProvider.future);
  if (uid == null) throw const SignInRequiredException('view event chats');
  final clock = ref.watch(appClockProvider);
  yield* ref.watch(eventChatDirectoryRepositoryProvider).watch(uid, clock.now);
}

/// A listener restarts only on the user's reload, never on an automatic retry.
Duration? _noDirectoryReadRetry(int retryCount, Object error) => null;
