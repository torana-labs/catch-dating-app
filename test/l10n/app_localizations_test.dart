import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/routing/shell/app_shell.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final l10n = AppLocalizationsEn();

  test('resolves consumer and host navigation from semantic destinations', () {
    expect(
      AppShellNavigationDestination.consumerExplore.localizedLabel(l10n),
      'Explore',
    );
    expect(
      AppShellNavigationDestination.hostInbox.localizedLabel(l10n),
      'Inbox',
    );
  });

  test('uses ICU plural rules for host unread counts', () {
    expect(l10n.hostInboxUnreadCount(count: 0), 'Unread');
    expect(l10n.hostInboxUnreadCount(count: 1), 'Unread · 1');
    expect(l10n.hostInboxUnreadCount(count: 4), 'Unread · 4');
  });
}
