import 'package:flutter/material.dart';

/// One destination. The same list draws the bottom bar, the rail and the
/// sidebar.
class CatchTabBarItem<T> {
  const CatchTabBarItem({
    required this.id,
    required this.icon,
    required this.label,
    this.activeIcon,
    this.iconWidget,
    this.activeIconWidget,
    this.badgeCount = 0,
    this.onLongPress,
    this.semanticValue,
    this.semanticHint,
    this.section,
    this.pinned = false,
  });

  final T id;
  final IconData icon;
  final IconData? activeIcon;
  final Widget? iconWidget;
  final Widget? activeIconWidget;
  final String label;
  final int badgeCount;
  final VoidCallback? onLongPress;
  final String? semanticValue;
  final String? semanticHint;

  /// Sidebar: a heading drawn above the first item of each section ("Work",
  /// "Records"); the rail draws a short rule instead.
  final String? section;

  /// Bottom bar: when any item is pinned and the bar has More, only pinned
  /// items show, followed by More.
  final bool pinned;
}

/// Where the navigation sits. `auto` follows the CatchRoot size class: a
/// bottom bar under 600, a rail from 600 and a sidebar from 840.
enum CatchTabBarPlacement { auto, bottom, rail, sidebar }

/// The one primary action of a rail or sidebar: "New event".
@immutable
class CatchTabBarAction {
  const CatchTabBarAction({required this.label, this.icon, this.onPressed});

  /// The sidebar button's label, and the rail button's tooltip.
  final String label;

  /// Null draws the add icon.
  final IconData? icon;
  final VoidCallback? onPressed;
}

/// Where More goes on a bottom bar whose items are pinned: a sheet or a page
/// listing every destination.
@immutable
class CatchTabBarMore {
  const CatchTabBarMore({required this.label, this.badge = 0, this.onPressed});

  final String label;

  /// A count that needs attention somewhere behind More.
  final int badge;
  final VoidCallback? onPressed;
}
