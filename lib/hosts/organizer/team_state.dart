import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:flutter/foundation.dart';

/// The team as plain values: who is on it, who is looking, and the invite
/// being typed.
@immutable
class OrganizerTeamState {
  const OrganizerTeamState({
    required this.organizer,
    required this.currentUid,
    required this.dialCode,
    this.phone = '',
    this.inviting = false,
    this.changing = false,
    this.revision = 0,
  });

  final Organizer organizer;
  final String currentUid;

  /// The organizer's country calling code, such as +91.
  final String dialCode;

  /// The number typed under Invite someone, without the calling code.
  final String phone;
  final bool inviting;

  /// A removal or ownership change is running.
  final bool changing;

  /// Bumped after an invite goes, so the phone field starts empty.
  final int revision;

  List<OrganizerHostProfile> get hosts => organizer.displayHostProfiles;

  /// Only the owner adds, removes and hands over.
  bool get isOwner => organizer.isOwnedBy(currentUid);

  bool get canInvite =>
      isOwner && !inviting && phone.replaceAll(RegExp(r'\D'), '').length >= 6;

  /// The typed number as the invite sends it: as typed when it starts with
  /// a plus, otherwise after the organizer's calling code.
  String get invitePhone {
    final typed = phone.replaceAll(RegExp(r'[\s-]'), '');
    return typed.startsWith('+') ? typed : '$dialCode$typed';
  }
}
