import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_workspace/preview_layout_contracts.dart';

/// The windows the shell previews draw, by the size class they stand for.
abstract final class WidgetbookShellLayout {
  static const double phone = WidgetbookPreviewLayout.phoneChromeWidth;
  static const double tablet = WidgetbookPreviewLayout.tabletChromeWidth;
  static const double desktop = WidgetbookPreviewLayout.desktopChromeWidth;

  /// A medium window for one wide bar.
  static const double wideBar = 900;

  /// A detail pane's width, for a pane dock.
  static const double pane = 640;

  /// A queue's narrow window, below every split.
  static const double narrow = 480;

  /// The pane patterns' window widths: a laptop, a wide desktop.
  static const double laptop = 1100;
  static const double wideDesktop = 1400;

  /// Window heights: a whole shell, a screen, a pane strip, a short readout.
  static const double shellHeight = 620;
  static const double screenHeight = 520;
  static const double paneHeight = 240;
  static const double readoutHeight = 300;

  /// The identity's slot in the sidebar and the rail.
  static const double sidebarSlot = 212;
  static const double railSlot = 80;
}

/// The Widgetbook theme as a CatchRoot theme, so a preview follows the
/// light and dark toggle rather than the platform setting.
CatchThemeMode widgetbookThemeOf(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
    ? CatchThemeMode.night
    : CatchThemeMode.day;

/// A window [width] wide (and [height] tall, or as tall as its content)
/// inside a CatchRoot of [sizeClass], scaled down to fit its state card, so
/// tablet and desktop layouts show whole in a phone-width review canvas.
class WidgetbookShellWindow extends StatelessWidget {
  const WidgetbookShellWindow({
    super.key,
    required this.width,
    this.height,
    required this.sizeClass,
    required this.child,
  });

  final double width;
  final double? height;
  final CatchWindowSize sizeClass;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final size = Size(width, height ?? MediaQuery.sizeOf(context).height);
    return FittedBox(
      fit: BoxFit.scaleDown,
      alignment: AlignmentDirectional.topStart,
      child: SizedBox(
        width: width,
        height: height,
        child: MediaQuery(
          data: MediaQuery.of(context).copyWith(
            size: size,
            padding: EdgeInsets.zero,
            viewPadding: EdgeInsets.zero,
            viewInsets: EdgeInsets.zero,
          ),
          child: ClipRect(
            child: CatchRoot(
              theme: widgetbookThemeOf(context),
              size: sizeClass,
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

/// The four host destinations the shell previews draw.
List<CatchTabBarItem<String>> widgetbookShellItems({bool pinned = false}) => [
  CatchTabBarItem<String>(
    id: 'today',
    icon: CatchIcons.home,
    label: 'Today',
    section: 'Work',
    pinned: pinned,
  ),
  CatchTabBarItem<String>(
    id: 'events',
    icon: CatchIcons.event,
    label: 'Events',
    section: 'Work',
    pinned: pinned,
  ),
  CatchTabBarItem<String>(
    id: 'people',
    icon: CatchIcons.people,
    label: 'People',
    badgeCount: 4,
    section: 'Audience',
  ),
  CatchTabBarItem<String>(
    id: 'organizer',
    icon: CatchIcons.organizer,
    label: 'Organizer',
    section: 'Audience',
  ),
];

/// A host navigation with every part the rail and sidebar draw.
CatchTabBar<String> widgetbookShellNavigation({
  String active = 'today',
  CatchTabBarPlacement layout = CatchTabBarPlacement.auto,
}) => CatchTabBar<String>(
  items: widgetbookShellItems(),
  active: active,
  onChanged: (_) {},
  layout: layout,
  label: 'Host',
  header: const CatchTabBarIdentity(
    name: 'Lantern Lane Social',
    note: 'Switch organiser',
    switcher: true,
  ),
  primaryAction: CatchTabBarAction(label: 'New event', onPressed: () {}),
  footer: const CatchTabBarIdentity(name: 'Meher Rao', note: 'Settings'),
);
