import 'package:flutter/widgets.dart';

abstract final class SettingsKeys {
  static const showInCrossPathsSwitch = ValueKey(
    'settings.showInCrossPaths.switch',
  );
  static const showOnMapSwitch = ValueKey('settings.showOnMap.switch');
  static const newCatchesSwitch = ValueKey('settings.newCatches.switch');
  static const crossPathsInvitationsSwitch = ValueKey(
    'settings.crossPathsInvitations.switch',
  );
  static const messagesSwitch = ValueKey('settings.messages.switch');
  static const eventRemindersSwitch = ValueKey(
    'settings.eventReminders.switch',
  );
  static const eventStatusUpdatesSwitch = ValueKey(
    'settings.eventStatusUpdates.switch',
  );
  static const organizerUpdatesSwitch = ValueKey(
    'settings.organizerUpdates.switch',
  );
  static const weeklyDigestSwitch = ValueKey('settings.weeklyDigest.switch');
  static const reviewHistoryRow = ValueKey('settings.reviewHistory.row');
  static const paymentHistoryRow = ValueKey('settings.paymentHistory.row');
  static const hostAppRow = ValueKey('settings.hostApp.row');
  static const launchAccessRow = ValueKey('settings.launchAccess.row');
  static const privacyPolicyRow = ValueKey('settings.privacyPolicy.row');
  static const helpSupportRow = ValueKey('settings.helpSupport.row');
  static const termsRow = ValueKey('settings.terms.row');
  static const signOutRow = ValueKey('settings.signOut.row');
  static const deleteAccountRow = ValueKey('settings.deleteAccount.row');

  static Key unblockButton(String uid) => ValueKey('settings.unblock.$uid');
}
