import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/safety/presentation/settings_account_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

SettingsAccountState buildSettingsAccountState({
  required AsyncValue<UserProfile?> profile,
  required SettingsPreferenceValues preferences,
  required AsyncValue<List<BlockedUser>> blockedUsers,
  required AsyncValue<Map<String, PublicProfile>> blockedProfiles,
  required SettingsMutationState mutations,
}) {
  return SettingsAccountState(
    profile: buildSettingsProfileState(profile),
    preferences: preferences,
    blockedAccounts: buildSettingsBlockedAccountsState(
      blockedUsers: blockedUsers,
      blockedProfiles: blockedProfiles,
    ),
    mutations: mutations,
  );
}

SettingsProfileState buildSettingsProfileState(
  AsyncValue<UserProfile?> profile,
) {
  return switch (profile) {
    AsyncData(:final value) =>
      value == null
          ? const SettingsProfileState(
              status: SettingsProfileStatus.missing,
              phoneNumber: 'Unavailable',
              email: 'Unavailable',
            )
          : SettingsProfileState(
              status: SettingsProfileStatus.loaded,
              phoneNumber: settingsFormatPhoneForDisplay(value.phoneNumber),
              email: settingsEmailForDisplay(value.email),
            ),
    AsyncError(:final error) => SettingsProfileState(
      status: SettingsProfileStatus.error,
      phoneNumber: 'Unavailable',
      email: 'Unavailable',
      error: error,
    ),
    _ => const SettingsProfileState(
      status: SettingsProfileStatus.loading,
      phoneNumber: 'Loading',
      email: 'Loading',
    ),
  };
}

SettingsBlockedAccountsState buildSettingsBlockedAccountsState({
  required AsyncValue<List<BlockedUser>> blockedUsers,
  required AsyncValue<Map<String, PublicProfile>> blockedProfiles,
}) {
  return switch (blockedUsers) {
    AsyncError(:final error) => SettingsBlockedAccountsState(
      status: SettingsBlockedAccountsStatus.error,
      rows: const [],
      error: error,
    ),
    AsyncData(:final value) =>
      value.isEmpty
          ? const SettingsBlockedAccountsState(
              status: SettingsBlockedAccountsStatus.empty,
              rows: [],
            )
          : switch (blockedProfiles) {
              // Surface profile lookup errors instead of silently falling
              // through to null profiles.
              AsyncError(:final error) => SettingsBlockedAccountsState(
                status: SettingsBlockedAccountsStatus.error,
                rows: [],
                error: error,
              ),
              _ => SettingsBlockedAccountsState(
                status: SettingsBlockedAccountsStatus.content,
                rows: [
                  for (final blocked in value)
                    SettingsBlockedAccountRow.fromBlockedUser(
                      blocked,
                      profile: blockedProfiles.asData?.value[blocked.uid],
                    ),
                ],
              ),
            },
    _ => const SettingsBlockedAccountsState(
      status: SettingsBlockedAccountsStatus.loading,
      rows: [],
    ),
  };
}
