import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_dock.dart';
import 'package:catch_ui/src/components/catch_top_bar.dart';
import 'package:catch_ui/src/patterns/catch_app_shell.dart';
import 'package:catch_ui/src/patterns/catch_scaffold.dart';
import 'package:flutter/material.dart';

/// What a screen tells the parts inside it.
@immutable
class CatchScreenScopeData {
  const CatchScreenScopeData({required this.scrolled});

  /// Whether the body has scrolled past 4 px: the top bar shows its hairline
  /// and a `subject` bar turns solid.
  final bool scrolled;

  @override
  bool operator ==(Object other) =>
      other is CatchScreenScopeData && other.scrolled == scrolled;

  @override
  int get hashCode => scrolled.hashCode;
}

/// Publishes a [CatchScreen]'s scroll state to its top bar and body.
/// [CatchScreen] is its only provider.
class CatchScreenScope extends InheritedWidget {
  const CatchScreenScope({super.key, required this.data, required super.child});

  final CatchScreenScopeData data;

  static CatchScreenScopeData? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<CatchScreenScope>()?.data;

  /// False outside a screen.
  static bool scrolledOf(BuildContext context) =>
      maybeOf(context)?.scrolled ?? false;

  @override
  bool updateShouldNotify(CatchScreenScope oldWidget) => data != oldWidget.data;
}

/// One screen's frame, inside a [CatchAppShell] or alone: the top bar, the
/// body, the dock and an overlay.
///
/// It owns the scroll state the top bar reads ([CatchScreenScope.scrolled],
/// set once the body's vertical scroll passes 4 px). It places the top bar
/// above the body, or over it for a `subject` bar so the hero runs under the
/// status bar; it keeps the dock below the body, so the body never runs under
/// it, and the dock chooses its own `bar` or `card` placement from the size
/// class; and it keeps the body and the dock clear of a floating bottom bar
/// the shell reports through [CatchShellScope].
///
/// With [bodyScrolls] (the default) the screen scrolls [body] and ends it
/// clear of the device's bottom inset; otherwise [body] fills the frame and
/// owns its scrolling, and the screen still listens to it.
///
/// The frame is hosted in the one canonical Material scaffold, so snackbars,
/// keyboard insets and Material ink behave as on every other screen.
class CatchScreen extends StatefulWidget {
  const CatchScreen({
    super.key,
    this.topBar,
    required this.body,
    this.dock,
    this.overlay,
    this.bodyScrolls = true,
  });

  final CatchTopBar? topBar;
  final Widget body;
  final CatchDock? dock;

  /// Drawn over the body and the top bar: a sheet scrim, a toast, a spotlight.
  final Widget? overlay;
  final bool bodyScrolls;

  @override
  State<CatchScreen> createState() => _CatchScreenState();
}

class _CatchScreenState extends State<CatchScreen> {
  static const double _scrolledAfter = 4;

  bool _scrolled = false;

  /// Scrolling and metrics changes alike, so a restored or programmatic
  /// offset marks the screen scrolled as a drag does.
  bool _handleScroll(Notification notification) {
    final (depth, metrics) = switch (notification) {
      ScrollNotification(:final depth, :final metrics) => (depth, metrics),
      ScrollMetricsNotification(:final depth, :final metrics) => (
        depth,
        metrics,
      ),
      _ => (-1, null),
    };
    if (depth != 0 || metrics == null || metrics.axis != Axis.vertical) {
      return false;
    }
    final scrolled = metrics.pixels > _scrolledAfter;
    if (scrolled != _scrolled) setState(() => _scrolled = scrolled);
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final tokens = CatchTokens.of(context);
    final topBar = widget.topBar;
    final dock = widget.dock;
    final overlay = widget.overlay;
    final shell = CatchShellScope.maybeOf(context);
    final shellInset = shell?.bottomInset ?? 0;
    final overHero = topBar?.variant == CatchTopBarVariant.subject;
    final bottomClearance = shellInset > 0
        ? shellInset
        : MediaQuery.paddingOf(context).bottom;
    final body = widget.bodyScrolls
        ? SingleChildScrollView(
            primary: true,
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: EdgeInsets.only(
              bottom: dock == null ? bottomClearance : 0,
            ),
            child: widget.body,
          )
        : widget.body;
    final frame = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (topBar != null && !overHero) topBar,
        Expanded(
          child: Stack(
            children: [
              Positioned.fill(
                child: SafeArea(
                  top: topBar == null,
                  bottom: false,
                  child: NotificationListener<Notification>(
                    onNotification: _handleScroll,
                    child: body,
                  ),
                ),
              ),
              if (topBar != null && overHero)
                Positioned(top: 0, left: 0, right: 0, child: topBar),
            ],
          ),
        ),
        if (dock != null)
          Padding(
            padding: EdgeInsets.only(bottom: shellInset),
            child: MediaQuery.removePadding(
              context: context,
              removeBottom: shellInset > 0,
              child: dock,
            ),
          ),
      ],
    );
    return CatchScaffold.workspace(
      backgroundColor: tokens.ground,
      body: CatchScreenScope(
        data: CatchScreenScopeData(scrolled: _scrolled),
        // One stack whether or not an overlay shows, so a toast coming and
        // going never rebuilds the frame or loses its scroll position.
        child: Stack(
          children: [
            Positioned.fill(child: frame),
            if (overlay != null) Positioned.fill(child: overlay),
          ],
        ),
      ),
    );
  }
}
