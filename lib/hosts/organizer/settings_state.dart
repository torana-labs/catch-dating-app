import 'package:flutter/foundation.dart';

/// What a row or button in Settings asks for.
enum OrganizerSettingsAction {
  editName,
  switchOrganizer,
  guides,
  terms,
  privacy,
  deleteAccount,
  signOut,
}

/// Settings as plain values: the host's name and number, the organizers
/// they run, the one notification switch with a backend, and the build.
@immutable
class OrganizerSettingsState {
  const OrganizerSettingsState({
    this.name,
    this.phone,
    this.organizerNames = const <String>[],
    this.messagesOn,
    this.version,
    this.guidesAvailable = false,
    this.termsAvailable = false,
    this.privacyAvailable = false,
    this.busy = false,
  });

  /// The host profile name, else the account first name.
  final String? name;

  /// The account number with its last five digits hidden.
  final String? phone;
  final List<String> organizerNames;

  /// Push for guest messages; null until the profile is read.
  final bool? messagesOn;

  /// The installed build, such as 4.0.1.
  final String? version;
  final bool guidesAvailable;
  final bool termsAvailable;
  final bool privacyAvailable;

  /// Signing out, deleting the account or opening a page.
  final bool busy;

  bool get hasHelp => guidesAvailable || termsAvailable || privacyAvailable;
}

/// [phone] with its last five digits hidden, as the board prints it.
String? settingsMaskedPhone(String? phone) {
  final value = phone?.trim();
  if (value == null || value.isEmpty) return null;
  if (value.length <= 5) return '·····';
  return '${value.substring(0, value.length - 5)}·····';
}
