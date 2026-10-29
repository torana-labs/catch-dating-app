import 'package:meta/meta.dart';

enum HostTodayFocus { audience, rehearsal, organizerPresence }

/// Device-local preference identity. Never share one organizer's choice with
/// another organizer or with a different signed-in account on the same device.
@immutable
class HostTodayPreferenceScope {
  HostTodayPreferenceScope({
    required this.accountId,
    required this.organizerId,
  }) {
    if (accountId.trim().isEmpty || organizerId.trim().isEmpty) {
      throw ArgumentError(
        'Today preferences require an account and organizer.',
      );
    }
  }

  final String accountId;
  final String organizerId;

  @override
  bool operator ==(Object other) =>
      other is HostTodayPreferenceScope &&
      accountId == other.accountId &&
      organizerId == other.organizerId;

  @override
  int get hashCode => Object.hash(accountId, organizerId);
}

@immutable
class HostTodayPreference {
  const HostTodayPreference.unanswered() : answered = false, focus = null;

  const HostTodayPreference.skipped() : answered = true, focus = null;

  const HostTodayPreference.selected(HostTodayFocus this.focus)
    : answered = true;

  final bool answered;
  final HostTodayFocus? focus;

  @override
  bool operator ==(Object other) =>
      other is HostTodayPreference &&
      answered == other.answered &&
      focus == other.focus;

  @override
  int get hashCode => Object.hash(answered, focus);
}
