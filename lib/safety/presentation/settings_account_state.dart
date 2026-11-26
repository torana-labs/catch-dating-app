import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
// ignore: catch_ui_lints/catch_arch_provider_free_boundary -- reads a value type the safety repository declares; no repository call happens here
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/pages/account/settings_controller.dart';
import 'package:country_code_picker/country_code_picker.dart';

final class SettingsAccountState {
  const SettingsAccountState({
    required this.profile,
    required this.preferences,
    required this.blockedAccounts,
    required this.mutations,
  });

  final SettingsProfileState profile;
  final SettingsPreferenceValues preferences;
  final SettingsBlockedAccountsState blockedAccounts;
  final SettingsMutationState mutations;
}

enum SettingsProfileStatus { loading, error, missing, loaded }

final class SettingsProfileState {
  const SettingsProfileState({
    required this.status,
    required this.phoneNumber,
    required this.email,
    this.error,
  });

  final SettingsProfileStatus status;
  final String phoneNumber;
  final String email;
  final Object? error;

  bool get isError => status == SettingsProfileStatus.error;
  bool get isMissing => status == SettingsProfileStatus.missing;
}

final class SettingsPreferenceValues {
  const SettingsPreferenceValues({
    required this.showInCrossPaths,
    required this.crossPathsInvitations,
    required this.showOnMap,
    required this.newCatches,
    required this.messages,
    required this.eventReminders,
    required this.eventStatusUpdates,
    required this.organizerUpdates,
    required this.weeklyDigest,
    required this.showReligion,
    required this.showRelationshipGoal,
    required this.showDrinking,
    required this.showSmoking,
    required this.showChildren,
  });

  const SettingsPreferenceValues.defaults()
    : showInCrossPaths = false,
      crossPathsInvitations = false,
      showOnMap = true,
      newCatches = true,
      messages = true,
      eventReminders = true,
      eventStatusUpdates = true,
      organizerUpdates = true,
      weeklyDigest = false,
      showReligion = false,
      showRelationshipGoal = true,
      showDrinking = true,
      showSmoking = true,
      showChildren = true;

  factory SettingsPreferenceValues.fromProfile(UserProfile profile) {
    return SettingsPreferenceValues(
      showInCrossPaths: profile.prefsShowInCrossPaths,
      crossPathsInvitations: profile.prefsCrossPathsInvitations,
      showOnMap: profile.prefsShowOnMap,
      newCatches: profile.prefsNewCatches,
      messages: profile.prefsMessages,
      eventReminders: profile.prefsEventReminders,
      eventStatusUpdates: profile.prefsRunStatusUpdates,
      organizerUpdates: profile.prefsOrganizerUpdates,
      weeklyDigest: profile.prefsWeeklyDigest,
      showReligion: !profile.prefsHideReligion,
      showRelationshipGoal: !profile.prefsHideRelationshipGoal,
      showDrinking: !profile.prefsHideDrinking,
      showSmoking: !profile.prefsHideSmoking,
      showChildren: !profile.prefsHideChildren,
    );
  }

  final bool showInCrossPaths;
  final bool crossPathsInvitations;
  final bool showOnMap;
  final bool newCatches;
  final bool messages;
  final bool eventReminders;
  final bool eventStatusUpdates;
  final bool organizerUpdates;
  final bool weeklyDigest;

  // Whether each profile answer reaches other guests (#2493, FIX-8).
  final bool showReligion;
  final bool showRelationshipGoal;
  final bool showDrinking;
  final bool showSmoking;
  final bool showChildren;

  bool valueFor(SettingsPreference preference) {
    return switch (preference) {
      SettingsPreference.showInCrossPaths => showInCrossPaths,
      SettingsPreference.crossPathsInvitations => crossPathsInvitations,
      SettingsPreference.showOnMap => showOnMap,
      SettingsPreference.newCatches => newCatches,
      SettingsPreference.messages => messages,
      SettingsPreference.eventReminders => eventReminders,
      SettingsPreference.eventStatusUpdates => eventStatusUpdates,
      SettingsPreference.organizerUpdates => organizerUpdates,
      SettingsPreference.weeklyDigest => weeklyDigest,
      SettingsPreference.showReligion => showReligion,
      SettingsPreference.showRelationshipGoal => showRelationshipGoal,
      SettingsPreference.showDrinking => showDrinking,
      SettingsPreference.showSmoking => showSmoking,
      SettingsPreference.showChildren => showChildren,
    };
  }

  SettingsPreferenceValues copyWithPreference(
    SettingsPreference preference,
    bool value,
  ) {
    bool selected(SettingsPreference candidate, bool current) =>
        preference == candidate ? value : current;
    return SettingsPreferenceValues(
      showInCrossPaths: selected(
        SettingsPreference.showInCrossPaths,
        showInCrossPaths,
      ),
      crossPathsInvitations: selected(
        SettingsPreference.crossPathsInvitations,
        crossPathsInvitations,
      ),
      showOnMap: selected(SettingsPreference.showOnMap, showOnMap),
      newCatches: selected(SettingsPreference.newCatches, newCatches),
      messages: selected(SettingsPreference.messages, messages),
      eventReminders: selected(
        SettingsPreference.eventReminders,
        eventReminders,
      ),
      eventStatusUpdates: selected(
        SettingsPreference.eventStatusUpdates,
        eventStatusUpdates,
      ),
      organizerUpdates: selected(
        SettingsPreference.organizerUpdates,
        organizerUpdates,
      ),
      weeklyDigest: selected(SettingsPreference.weeklyDigest, weeklyDigest),
      showReligion: selected(SettingsPreference.showReligion, showReligion),
      showRelationshipGoal: selected(
        SettingsPreference.showRelationshipGoal,
        showRelationshipGoal,
      ),
      showDrinking: selected(SettingsPreference.showDrinking, showDrinking),
      showSmoking: selected(SettingsPreference.showSmoking, showSmoking),
      showChildren: selected(SettingsPreference.showChildren, showChildren),
    );
  }
}

enum SettingsBlockedAccountsStatus { loading, error, empty, content }

final class SettingsBlockedAccountsState {
  const SettingsBlockedAccountsState({
    required this.status,
    required this.rows,
    this.error,
  });

  final SettingsBlockedAccountsStatus status;
  final List<SettingsBlockedAccountRow> rows;
  final Object? error;

  int? get count {
    return switch (status) {
      SettingsBlockedAccountsStatus.empty => 0,
      SettingsBlockedAccountsStatus.content => rows.length,
      _ => null,
    };
  }
}

final class SettingsBlockedAccountRow {
  const SettingsBlockedAccountRow({
    required this.uid,
    required this.name,
    required this.imageUrl,
    required this.metaLine,
    required this.seed,
  });

  factory SettingsBlockedAccountRow.fromBlockedUser(
    BlockedUser blockedUser, {
    PublicProfile? profile,
  }) {
    return SettingsBlockedAccountRow(
      uid: blockedUser.uid,
      name: profile?.name ?? 'Blocked account',
      imageUrl: profile?.primaryPhotoThumbnailUrl,
      metaLine: blockedUser.source,
      seed: blockedUser.uid,
    );
  }

  final String uid;
  final String name;
  final String? imageUrl;
  final String metaLine;
  final String seed;
}

final class SettingsMutationState {
  const SettingsMutationState({
    required this.savingPreference,
    required this.deletingAccount,
    required this.signingOut,
    required this.unblocking,
  });

  final bool savingPreference;
  final bool deletingAccount;
  final bool signingOut;
  final bool unblocking;

  bool get operationPending =>
      savingPreference || deletingAccount || signingOut || unblocking;
}

String settingsEmailForDisplay(String email) {
  final trimmed = email.trim();
  return trimmed.isEmpty ? 'Not added' : trimmed;
}

String settingsFormatPhoneForDisplay(String phoneNumber) {
  if (phoneNumber.isEmpty) return '';
  if (!phoneNumber.startsWith('+')) return phoneNumber;

  final sortedCodes = codes.toList()
    ..sort((a, b) => b['dial_code']!.length.compareTo(a['dial_code']!.length));
  for (final c in sortedCodes) {
    final dialCode = c['dial_code']!;
    if (phoneNumber.startsWith(dialCode)) {
      final national = phoneNumber.substring(dialCode.length);
      return '$dialCode $national';
    }
  }
  return phoneNumber;
}
