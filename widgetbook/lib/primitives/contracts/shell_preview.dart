import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

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
  primaryAction: const CatchTabBarAction(label: 'New event'),
  footer: const CatchTabBarIdentity(name: 'Meher Rao', note: 'Settings'),
);
