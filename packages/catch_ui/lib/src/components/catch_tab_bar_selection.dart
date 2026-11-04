part of 'catch_tab_bar.dart';

/// The bottom bar's slots and its press, hover, focus and drag-to-select
/// state: which slot is active, previewed or touched, and what a commit
/// selects (a destination, or More while pinning).
mixin _CatchTabBarSelection<T> on State<CatchTabBar<T>> {
  int? _pressedIndex;
  int? _dragIndex;
  int? _hoveredIndex;
  int? _focusedIndex;
  bool _dragging = false;
  bool _dragProducedHaptic = false;

  /// More takes effect on the bottom bar when an item is pinned.
  bool get _pinning =>
      widget.more != null && widget.items.any((item) => item.pinned);

  /// The bottom bar's items: the pinned ones while pinning, else all.
  List<CatchTabBarItem<T>> get _visible => _pinning
      ? [
          for (final item in widget.items)
            if (item.pinned) item,
        ]
      : widget.items;

  int get _activeIndex {
    final visible = _visible;
    final index = visible.indexWhere((item) => item.id == widget.active);
    if (index >= 0) return index;
    return _pinning ? visible.length : 0;
  }

  bool get _enabled => widget.onChanged != null && widget.items.isNotEmpty;

  void _handlePressStart(int index) {
    if (!_enabled || _dragging) return;
    setState(() => _pressedIndex = index);
  }

  void _handlePressCancel(int index) {
    if (_dragging || _pressedIndex != index) return;
    setState(() => _pressedIndex = null);
  }

  void _handleTap(int index) {
    if (!_enabled) return;
    catchSelectionHaptic();
    _select(index);
    if (mounted) setState(() => _pressedIndex = null);
  }

  void _handleLongPress(int index) {
    _clearTransientState(notify: true);
    final visible = _visible;
    if (index < visible.length) visible[index].onLongPress?.call();
  }

  void _handleHover(int index, bool hovered) {
    if (!_enabled) return;
    if (hovered) {
      if (_hoveredIndex != index) setState(() => _hoveredIndex = index);
    } else if (_hoveredIndex == index) {
      setState(() => _hoveredIndex = null);
    }
  }

  void _handleFocus(int index, bool focused) {
    if (!_enabled) return;
    if (focused) {
      if (_focusedIndex != index) setState(() => _focusedIndex = index);
    } else if (_focusedIndex == index) {
      setState(() => _focusedIndex = null);
    }
  }

  void _handleDragStart(
    DragStartDetails details,
    _CatchTabBarGeometry geometry,
  ) {
    final index = geometry.indexForPosition(
      details.localPosition,
      currentIndex: _pressedIndex,
    );
    setState(() {
      _dragging = true;
      _dragIndex = index;
      _pressedIndex = null;
      _dragProducedHaptic = false;
    });
  }

  void _handleDragUpdate(
    DragUpdateDetails details,
    _CatchTabBarGeometry geometry,
  ) {
    final index = geometry.indexForPosition(
      details.localPosition,
      currentIndex: _dragIndex,
    );
    if (index == _dragIndex) return;
    setState(() => _dragIndex = index);
    if (index != null) {
      _dragProducedHaptic = true;
      catchSelectionHaptic();
    }
  }

  void _handleDragEnd(DragEndDetails _) {
    final index = _dragIndex;
    final needsCommitHaptic = !_dragProducedHaptic;
    setState(() {
      _dragging = false;
      _dragIndex = null;
      _pressedIndex = null;
      _dragProducedHaptic = false;
    });
    if (index == null || !_enabled) return;
    if (needsCommitHaptic) catchSelectionHaptic();
    _select(index);
  }

  /// Commits a bottom-bar slot: a destination, or More while pinning.
  void _select(int index) {
    final visible = _visible;
    if (index < visible.length) {
      widget.onChanged!(visible[index].id);
    } else {
      widget.more?.onPressed?.call();
    }
  }

  void _handleDragCancel() => _clearTransientState(notify: true);

  void _clearTransientState({bool notify = false}) {
    void clear() {
      _pressedIndex = null;
      _dragIndex = null;
      _dragging = false;
      _dragProducedHaptic = false;
    }

    if (notify && mounted) {
      setState(clear);
    } else {
      clear();
    }
  }
}
