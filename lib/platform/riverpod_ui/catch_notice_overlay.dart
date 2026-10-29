import 'dart:async';

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CatchNoticeOverlay extends ConsumerStatefulWidget {
  const CatchNoticeOverlay({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<CatchNoticeOverlay> createState() => _CatchNoticeOverlayState();
}

class _CatchNoticeOverlayState extends ConsumerState<CatchNoticeOverlay> {
  final _noticeFocus = FocusScopeNode(
    debugLabel: 'Catch notice',
    traversalEdgeBehavior: TraversalEdgeBehavior.parentScope,
  );
  FocusNode? _returnFocus;
  Timer? _dismissTimer;
  CatchNoticeData? _scheduledNotice;
  bool _pointerDown = false;
  bool _hovered = false;
  bool _focused = false;
  bool _accessibleNavigation = false;

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _noticeFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final eventNotice = ref.watch(
      catchNoticeControllerProvider.select((queue) => queue.current),
    );
    _scheduleAutoDismiss(eventNotice);
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final entryInset = MediaQuery.paddingOf(context).top + CatchSpacing.s3;

    Widget? noticeCard;
    if (eventNotice != null) {
      noticeCard = CatchNotice(
        key: ValueKey('app_notice.${eventNotice.id}'),
        dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
        notice: eventNotice,
        onDismiss: eventNotice.dismissible || eventNotice.onOpen != null
            ? () => _dismiss(eventNotice)
            : null,
      );
      if (eventNotice.onOpen != null) {
        noticeCard = Dismissible(
          key: ValueKey('notice.side.${eventNotice.id}'),
          resizeDuration: null,
          movementDuration: reduceMotion ? Duration.zero : CatchMotion.fast,
          onDismissed: (_) => _dismiss(eventNotice),
          child: Dismissible(
            key: ValueKey('notice.up.${eventNotice.id}'),
            direction: DismissDirection.up,
            resizeDuration: null,
            movementDuration: reduceMotion ? Duration.zero : CatchMotion.fast,
            onDismissed: (_) => _dismiss(eventNotice),
            child: noticeCard,
          ),
        );
      }
      noticeCard = MouseRegion(
        onEnter: (_) {
          _hovered = true;
          _restartTimer();
        },
        onExit: (_) {
          _hovered = false;
          _restartTimer();
        },
        child: Listener(
          onPointerDown: (_) {
            _pointerDown = true;
            _restartTimer();
          },
          onPointerUp: (_) {
            _pointerDown = false;
            _restartTimer();
          },
          onPointerCancel: (_) {
            _pointerDown = false;
            _restartTimer();
          },
          child: FocusScope(
            node: _noticeFocus,
            onFocusChange: (focused) {
              _focused = focused;
              _restartTimer();
            },
            child: noticeCard,
          ),
        ),
      );
    }

    // This layer sits above the router, so its tooltips cannot use the
    // descendant Navigator's overlay. Own the ancestor for all notice chrome.
    return Overlay.wrap(
      child: CallbackShortcuts(
        bindings: {
          if (eventNotice != null) ...{
            const SingleActivator(LogicalKeyboardKey.f6): _toggleNoticeFocus,
            const SingleActivator(LogicalKeyboardKey.f6, shift: true):
                _toggleNoticeFocus,
          },
          if (eventNotice?.onOpen != null)
            const SingleActivator(LogicalKeyboardKey.escape): () =>
                _dismiss(eventNotice!),
        },
        child: Stack(
          children: [
            widget.child,
            if (noticeCard != null)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: SafeArea(
                  bottom: false,
                  minimum: const EdgeInsets.symmetric(
                    horizontal: CatchSpacing.s4,
                  ),
                  child: Align(
                    alignment: Alignment.topCenter,
                    child: Padding(
                      padding: const EdgeInsets.only(top: CatchSpacing.s3),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(
                          maxWidth: CatchLayout.noticeMaxWidth,
                        ),
                        child: TweenAnimationBuilder<double>(
                          key: ObjectKey(eventNotice),
                          tween: Tween(begin: reduceMotion ? 0 : -1, end: 0),
                          duration: reduceMotion
                              ? Duration.zero
                              : CatchMotion.base,
                          curve: CatchMotion.standardCurve,
                          builder: (context, offset, child) =>
                              Transform.translate(
                                offset: Offset(0, offset * entryInset),
                                child: FractionalTranslation(
                                  translation: Offset(0, offset),
                                  child: child,
                                ),
                              ),
                          child: noticeCard,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _scheduleAutoDismiss(CatchNoticeData? notice) {
    final accessible = MediaQuery.accessibleNavigationOf(context);
    if (identical(_scheduledNotice, notice) &&
        _accessibleNavigation == accessible) {
      return;
    }
    if (!identical(_scheduledNotice, notice)) {
      _pointerDown = _hovered = _focused = false;
    }
    _scheduledNotice = notice;
    _accessibleNavigation = accessible;
    _restartTimer();
  }

  void _restartTimer() {
    _dismissTimer?.cancel();
    if (!mounted) return;
    final notice = _scheduledNotice;
    final duration = notice?.duration;
    if (notice == null ||
        duration == null ||
        _accessibleNavigation ||
        _pointerDown ||
        _hovered ||
        _focused) {
      return;
    }

    _dismissTimer = Timer(duration, () {
      if (!mounted) return;
      _dismiss(notice);
    });
  }

  void _dismiss(CatchNoticeData notice) {
    // An old animation/timer must not dismiss a replacement with the same id.
    if (!identical(ref.read(catchNoticeControllerProvider).current, notice)) {
      return;
    }
    if (_noticeFocus.hasFocus) _restoreRouteFocus();
    ref.read(catchNoticeControllerProvider.notifier).dismiss(notice.id);
  }

  void _toggleNoticeFocus() {
    if (_noticeFocus.hasFocus) {
      _restoreRouteFocus();
      return;
    }
    final context = _noticeFocus.context;
    if (context == null) return;
    final first = FocusTraversalGroup.of(
      context,
    ).findFirstFocus(_noticeFocus, ignoreCurrentFocus: true);
    if (first == null || identical(first, _noticeFocus)) return;
    _returnFocus = FocusManager.instance.primaryFocus;
    first.requestFocus();
  }

  void _restoreRouteFocus() {
    final previous = _returnFocus;
    if (previous != null &&
        previous.context != null &&
        previous.canRequestFocus) {
      previous.requestFocus();
    } else {
      // The previous route or control may have gone away while showing this.
      _noticeFocus.unfocus();
    }
    _returnFocus = null;
  }
}
