// ignore_for_file: prefer_initializing_formals

part of 'catch_root_screen_scroll_view.dart';

enum _CatchRootScreenHeaderKind { custom, title }

/// Closed header specification for a root screen with a pinned primary rail.
///
/// Most destinations use [title], which preserves the shared compact
/// title-to-rail handoff. Edge-to-edge destinations such as Explore use
/// [custom] while retaining the same root scroll and pinning owner.
final class CatchRootScreenHeader {
  const CatchRootScreenHeader.custom(Widget header)
    : _kind = _CatchRootScreenHeaderKind.custom,
      _header = header,
      _title = null,
      _subtitle = null,
      _leading = null,
      _actions = const <Widget>[],
      _search = null;

  const CatchRootScreenHeader.title({
    required String title,
    String? subtitle,
    Widget? leading,
    List<Widget> actions = const <Widget>[],
    CatchTopBarSearch? search,
  }) : _kind = _CatchRootScreenHeaderKind.title,
       _header = null,
       _title = title,
       _subtitle = subtitle,
       _leading = leading,
       _actions = actions,
       _search = search;

  final _CatchRootScreenHeaderKind _kind;
  final Widget? _header;
  final String? _title;
  final String? _subtitle;
  final Widget? _leading;
  final List<Widget> _actions;
  final CatchTopBarSearch? _search;

  Widget _build(BuildContext context) {
    if (_kind == _CatchRootScreenHeaderKind.custom) return _header!;
    return CatchLegacyTopBar.primaryRail(
      title: _title!,
      subtitle: _subtitle,
      leading: _leading,
      actions: _actions,
      search: _search,
    );
  }
}
