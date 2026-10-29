import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_account.g.dart';

/// Existing assistance reviews share the app's uninterrupted auth period.
typedef EventAssistanceAccount = AuthenticatedSession;

@riverpod
AsyncValue<EventAssistanceAccount> eventAssistanceAccount(Ref ref) =>
    ref.watch(authenticatedSessionProvider);
