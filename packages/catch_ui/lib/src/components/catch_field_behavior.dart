part of 'catch_field.dart';

extension _CatchFieldBehavior on _CatchFieldState {
  void _initializeField() {
    _expandedContentRevealController = AnimationController(vsync: this)
      ..addListener(_handleExpandedContentRevealTick)
      ..addStatusListener(_handleExpandedContentRevealStatus);
    _open = widget.open ?? (widget.initiallyOpen && widget.child != null);
    _disclosureOffstage = !_isOpen;
    _attachFocusNode(widget.focusNode);
    _internalController = TextEditingController(
      text: widget.controller == null ? widget.initialValue : null,
    );
    _inputWasEmpty = _controller.text.isEmpty;
    _statusLaneActive = widget.status != CatchFieldStatus.idle;
    _attachControllerListener(_controller);
    if (widget._explicitSaveInput && _isOpen) {
      _pendingExpansionFocus = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _requestPendingExpansionFocus();
      });
    }
  }

  void _updateFieldConfiguration(CatchField oldWidget) {
    if (widget.status != CatchFieldStatus.idle) {
      _statusLaneDismissTimer?.cancel();
      _statusLaneActive = true;
    } else if (oldWidget.status != CatchFieldStatus.idle) {
      _scheduleStatusLaneDismiss();
    }
    if (oldWidget.status != widget.status) {
      _announceStatusTransition(widget.status);
    }
    if (oldWidget.focusNode != widget.focusNode) {
      _detachFocusNode();
      _attachFocusNode(widget.focusNode);
    }
    final wasOpen = oldWidget.open ?? _open;
    if (oldWidget.child != widget.child &&
        widget.child == null &&
        !widget._explicitSaveInput) {
      _open = false;
    } else if (widget.open != null) {
      _open = widget.open!;
    } else if (oldWidget.open != null) {
      _open = oldWidget.open!;
    } else if (oldWidget.initiallyOpen != widget.initiallyOpen) {
      _open = widget.initiallyOpen && widget.child != null;
    }
    final isOpen = _isOpen;
    if (!wasOpen && isOpen) {
      _disclosureOffstage = false;
      _scheduleExpandedContentReveal();
    } else if (wasOpen && !isOpen) {
      _cancelExpandedContentReveal();
    }
    if (widget._explicitSaveInput && !wasOpen && isOpen) {
      // Let the drawer finish first. Requesting native focus in the opening
      // frame makes the keyboard resize the viewport while the same subtree is
      // still revealing, which reads as a flicker on compact Host screens.
      _pendingExpansionFocus = true;
    } else if (wasOpen && !isOpen) {
      _pendingExpansionFocus = false;
      _focusNode.unfocus();
    }
    final oldController = oldWidget.controller ?? _internalController;
    if (oldController != _controller) {
      _attachControllerListener(_controller);
      _syncFieldValue();
    }
    if (widget.controller == null &&
        oldWidget.controller == null &&
        widget.initialValue != oldWidget.initialValue &&
        widget.initialValue != _internalController.text) {
      _internalController.value = TextEditingValue(
        text: widget.initialValue ?? '',
      );
      _syncFieldValue();
    }
  }

  void _announceStatusTransition(CatchFieldStatus status) {
    final message = switch (status) {
      CatchFieldStatus.idle => null,
      CatchFieldStatus.saving => widget.copy.savingSemanticLabel,
      CatchFieldStatus.saved => widget.copy.savedSemanticLabel,
    };
    if (message == null) return;
    unawaited(
      SemanticsService.sendAnnouncement(
        View.of(context),
        message,
        Directionality.of(context),
      ),
    );
  }

  void _disposeField() {
    _activeExpandedContentRevealPosition = null;
    _expandedContentRevealController.dispose();
    _singleChoiceCloseTimer?.cancel();
    _statusLaneDismissTimer?.cancel();
    _listenedController?.removeListener(_syncFieldValue);
    _detachFocusNode();
    _rowFocusNode.dispose();
    _internalController.dispose();
  }

  void _attachFocusNode(FocusNode? supplied) {
    _focusNode = supplied ?? FocusNode();
    _ownsFocusNode = supplied == null;
    _focused = _focusNode.hasFocus;
    _focusNode.addListener(_handleFocusChanged);
  }

  void _detachFocusNode() {
    _focusNode.removeListener(_handleFocusChanged);
    if (_ownsFocusNode) _focusNode.dispose();
  }

  void _handleFocusChanged() {
    final focused = _focusNode.hasFocus;
    if (_focused == focused) return;
    _focused = focused;
    widget.onFocusChanged?.call(_focused);
    if (!focused) widget.onBlur?.call(_controller.text);
    _update(() {});
  }

  void _attachControllerListener(TextEditingController controller) {
    _listenedController?.removeListener(_syncFieldValue);
    _listenedController = controller..addListener(_syncFieldValue);
  }

  void _syncFieldValue() {
    final text = _controller.text;
    final field = _fieldKey.currentState;
    if (field != null && field.value != text) {
      field.didChange(text);
    }
    final isEmpty = text.isEmpty;
    final needsParentRebuild = isEmpty != _inputWasEmpty;
    _inputWasEmpty = isEmpty;
    if (mounted && needsParentRebuild) _update(() {});
  }

  void _setTextEntryValidationError(bool hasError) {
    if (_textEntryHasValidationError == hasError) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _textEntryHasValidationError == hasError) return;
      _update(() => _textEntryHasValidationError = hasError);
    });
  }

  void _expandAndFocusTextEntry() {
    // Let EditableText own subsequent taps so it can position the native
    // insertion cursor. Re-requesting focus in a post-frame callback would
    // collapse every tap to the existing selection and make editing feel like
    // a two-step interaction.
    if (_focusNode.hasFocus) return;
    _update(() {
      if (!_focused) {
        _focused = true;
        widget.onFocusChanged?.call(true);
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _focusNode.requestFocus();
    });
  }

  void _requestExpansion(bool expanded) {
    if (_isOpen == expanded) return;
    if (!expanded) {
      _singleChoiceCloseTimer?.cancel();
      _cancelExpandedContentReveal();
    }
    if (widget.open == null) {
      _update(() {
        _open = expanded;
        if (expanded) _disclosureOffstage = false;
      });
      if (expanded) _scheduleExpandedContentReveal();
    }
    widget.onOpenChanged?.call(expanded);
  }

  void _cancelExpandedContentReveal() {
    _expandedContentRevealController.stop();
    _activeExpandedContentRevealPosition = null;
  }

  void _startExpandedContentReveal({
    required ScrollPosition position,
    required double destination,
    required Duration duration,
  }) {
    _expandedContentRevealController.stop();
    _activeExpandedContentRevealPosition = position;
    _expandedContentRevealStart = position.pixels;
    _expandedContentRevealDestination = destination;
    _expandedContentRevealController
      ..duration = duration
      ..value = 0
      ..forward();
  }

  void _handleExpandedContentRevealTick() {
    final position = _activeExpandedContentRevealPosition;
    if (!_isOpen || position == null || !position.hasPixels) {
      _expandedContentRevealController.stop();
      _activeExpandedContentRevealPosition = null;
      return;
    }
    if (position.isScrollingNotifier.value) {
      // A direct user drag always wins over the automatic field reveal.
      _expandedContentRevealController.stop();
      _activeExpandedContentRevealPosition = null;
      return;
    }

    final progress = CatchMotion.standardCurve.transform(
      _expandedContentRevealController.value,
    );
    final requested =
        _expandedContentRevealStart +
        (_expandedContentRevealDestination - _expandedContentRevealStart) *
            progress;
    final available = requested
        .clamp(position.minScrollExtent, position.maxScrollExtent)
        .toDouble();
    if (available > position.pixels) position.jumpTo(available);
  }

  void _handleExpandedContentRevealStatus(AnimationStatus status) {
    if (status == AnimationStatus.completed) {
      _activeExpandedContentRevealPosition = null;
    }
  }

  ScrollableState? _expandedContentRevealScrollable() {
    BuildContext searchContext = context;
    ScrollableState? nearestVertical;
    final visited = <ScrollableState>{};
    while (true) {
      final candidate = Scrollable.maybeOf(searchContext);
      if (candidate == null || !visited.add(candidate)) break;
      final position = candidate.position;
      if (position.axis == Axis.vertical) {
        nearestVertical ??= candidate;
        if (position.hasContentDimensions &&
            position.maxScrollExtent > position.minScrollExtent) {
          return candidate;
        }
      }
      // A Scrollable's own context sits outside its private inherited scope,
      // so the next lookup walks to the next enclosing scroll owner.
      searchContext = candidate.context;
    }
    return nearestVertical;
  }

  void _scheduleExpandedContentReveal({Duration? duration}) {
    if (_expandedContentRevealScheduled) return;
    _expandedContentRevealScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _expandedContentRevealScheduled = false;
      if (!mounted || !_isOpen) return;

      final targetContext =
          _actionBarRevealTargetKey.currentContext ??
          _disclosureRevealTargetKey.currentContext;
      final target = targetContext?.findRenderObject();
      if (target is! RenderBox || !target.attached || !target.hasSize) return;

      final bottomClearance = CatchFieldVisibilityScope.bottomClearanceOf(
        context,
      );
      final prioritizesActionBar =
          _actionBarRevealTargetKey.currentContext != null;
      final targetTop = prioritizesActionBar
          ? 0.0
          : target.size.height > 1
          ? target.size.height - 1
          : 0.0;
      final targetHeight = prioritizesActionBar ? target.size.height : 1.0;
      final revealDuration = duration ?? _expansionMotionDuration(context);
      final scrollable = _expandedContentRevealScrollable();
      final scrollPosition = scrollable?.position;
      final scrollViewport = scrollable?.context.findRenderObject();
      if (scrollPosition != null &&
          scrollPosition.axis == Axis.vertical &&
          scrollViewport is RenderBox &&
          scrollViewport.attached &&
          scrollViewport.hasSize) {
        final targetBottom = target
            .localToGlobal(Offset(0, targetTop + targetHeight))
            .dy;
        final viewportBottom = scrollViewport
            .localToGlobal(Offset(0, scrollViewport.size.height))
            .dy;
        final scrollDelta = targetBottom + bottomClearance - viewportBottom;
        if (scrollDelta > 0) {
          final destination = scrollPosition.pixels + scrollDelta;
          if (revealDuration == Duration.zero) {
            _expandedContentRevealController.stop();
            _activeExpandedContentRevealPosition = null;
            final available = destination
                .clamp(
                  scrollPosition.minScrollExtent,
                  scrollPosition.maxScrollExtent,
                )
                .toDouble();
            if (available > scrollPosition.pixels) {
              scrollPosition.jumpTo(available);
              return;
            }
          } else {
            // The field and viewport share one motion curve. Driving the
            // offset frame-by-frame lets the scroll extent grow with the
            // disclosure instead of clamping an animateTo target to the
            // collapsed card and snapping at the end.
            _startExpandedContentReveal(
              position: scrollPosition,
              destination: destination,
              duration: revealDuration,
            );
            return;
          }
        }
      }

      target.showOnScreen(
        rect: Rect.fromLTWH(
          0,
          targetTop,
          target.size.width,
          targetHeight + bottomClearance,
        ),
        duration: revealDuration,
        curve: CatchMotion.standardCurve,
      );
    });
  }

  void _scheduleStatusLaneDismiss() {
    _statusLaneDismissTimer?.cancel();
    final duration = catchFieldMotionDuration(context, CatchMotion.base);
    if (duration == Duration.zero) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _handleStatusLaneDismissed();
      });
      return;
    }
    _statusLaneDismissTimer = Timer(duration, _handleStatusLaneDismissed);
  }

  void _handleStatusLaneDismissed() {
    if (!mounted || widget.status != CatchFieldStatus.idle) return;
    _update(() => _statusLaneActive = false);
  }

  void _handleExpansionAnimationEnd() {
    // A zero-duration reveal can complete synchronously during widget update.
    // Wait until layout ends and recheck the current field before changing it.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (!_isOpen && !_disclosureOffstage) {
        _update(() => _disclosureOffstage = true);
      } else if (_isOpen) {
        // Correct the final scroll extent without a second visible animation.
        _scheduleExpandedContentReveal(duration: Duration.zero);
      }
      _requestPendingExpansionFocus();
    });
  }

  void _handlePointerDown(PointerDownEvent event) {
    if (_pressedPointer != null || event.buttons & kPrimaryButton == 0) return;
    _pressedPointer = event.pointer;
    _pressedDownPosition = event.position;
    if (!_pressed) _update(() => _pressed = true);
  }

  void _handlePointerMove(PointerMoveEvent event) {
    if (_pressedPointer != event.pointer) return;
    final origin = _pressedDownPosition;
    if (origin == null || (event.position - origin).distance <= kTouchSlop) {
      return;
    }
    _clearPressedPointer(event.pointer);
  }

  void _handlePointerEnd(PointerEvent event) {
    if (_pressedPointer != event.pointer) return;
    _pressedPointer = null;
    _pressedDownPosition = null;
    // Keep the contact outline alive through GestureDetector's onTap. The tap
    // may activate focus/disclosure in the same frame, so deferring this reset
    // prevents a transparent frame between pressed and focused chrome.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _pressedPointer == null && _pressed) {
        _update(() => _pressed = false);
      }
    });
  }

  void _handlePointerCancel(PointerEvent event) {
    _clearPressedPointer(event.pointer);
  }

  void _handlePointerExit(PointerExitEvent event) {
    _clearPressedPointer(event.pointer);
  }

  void _clearPressedPointer(int pointer) {
    if (_pressedPointer != pointer) return;
    _pressedPointer = null;
    _pressedDownPosition = null;
    if (_pressed && mounted) _update(() => _pressed = false);
  }

  void _handleOutsidePointerDown(PointerDownEvent event) {
    _outsidePointer = event.pointer;
    _outsideDownPosition = event.position;
  }

  void _handleOutsidePointerUp(PointerUpEvent event) {
    if (_outsidePointer != event.pointer) return;
    final downPosition = _outsideDownPosition;
    _outsidePointer = null;
    _outsideDownPosition = null;
    if (downPosition != null &&
        (event.position - downPosition).distance <= kTouchSlop) {
      _dismiss();
    }
  }

  void _clearOutsidePointer(PointerEvent event) {
    if (_outsidePointer != event.pointer) return;
    _outsidePointer = null;
    _outsideDownPosition = null;
  }

  void _requestPendingExpansionFocus() {
    if (!_pendingExpansionFocus ||
        !widget._explicitSaveInput ||
        !_isOpen ||
        !widget.enabled) {
      return;
    }
    _pendingExpansionFocus = false;
    _focusNode.requestFocus();
  }

  bool _handleChoicePicked(CatchFieldChoicePickedNotification notification) {
    if (!notification.autoClose || _isSaving) return true;
    _singleChoiceCloseTimer?.cancel();
    _singleChoiceCloseTimer = Timer(
      CatchFieldTokens.singleChoiceCloseDelay,
      () {
        if (mounted && !_isSaving) _requestExpansion(false);
      },
    );
    return true;
  }

  bool get _hasValue => _body != null && _body!.isNotEmpty;
  bool get _stacksTrailingValueText {
    final valueText = widget.valueText?.trim();
    return MediaQuery.textScalerOf(context).scale(1) >= 2 &&
        (_body?.trim().isNotEmpty != true) &&
        valueText != null &&
        valueText.isNotEmpty;
  }

  bool get _inlineControlAddAtRest => widget.addable && !_hasValue && !_isOpen;
  bool get _hasControl => widget.child != null || widget._explicitSaveInput;
  Object get _textFieldTapRegionGroup =>
      widget._explicitSaveInput ? _tapRegionGroup : EditableText;
  bool get _hasFieldValidationError => _textEntryHasValidationError;
  bool get _hasError =>
      (_displayError != null && _displayError!.isNotEmpty) ||
      _hasFieldValidationError;
  bool get _isOpen => widget.open ?? _open;
  bool get _isSaving => widget.status == CatchFieldStatus.saving;
  // Keep progress in the commit bar through its close animation. Once the
  // drawer is actually offstage, the header becomes the only visible owner.
  bool get _visibleCommitBarOwnsSavingIndicator =>
      _isSaving && !_disclosureOffstage && widget._onSubmit != null;
  bool get _active =>
      _focused ||
      _rowFocused ||
      widget.focused ||
      widget.states.contains(WidgetState.selected) ||
      _isOpen;
  bool get _isEdit => widget._config is _EditConfig;
  bool get _isToggle => widget._config is _ToggleConfig;
  bool get _isNavigation => switch (widget._config) {
    _ControlConfig _ => true,
    final _RowConfig config => config.navigation,
    _ => false,
  };
  bool get _hasInputValue => !_inputWasEmpty;
  bool get _usesUnderlineChrome =>
      _isEdit && widget.variant == CatchFieldVariant.underline;
  bool get _usesRowPrefixIcon =>
      _isEdit &&
      !_usesUnderlineChrome &&
      !_compactTextEntry &&
      widget.showLabel &&
      widget._hasInputLeading;
  bool get _usesRowTextEntryTrailing =>
      _isEdit &&
      (!widget._explicitSaveInput ||
          (_isOpen && !_isSaving && widget.enabled)) &&
      !_usesUnderlineChrome &&
      !_compactTextEntry &&
      (widget.showClearButton ||
          widget.trailing != null ||
          widget._hasRowActions);
  bool get _usesPositionedClearTrailing =>
      !widget._outlinedTextEntry &&
      _usesRowTextEntryTrailing &&
      widget.showClearButton &&
      widget.showLabel &&
      (_title?.isNotEmpty ?? false) &&
      _hasInputValue &&
      !_isSaving &&
      widget.status == CatchFieldStatus.idle &&
      !(widget.valid && !_hasError);
  bool get _hasLeadingSlot =>
      widget._hasRowLeading || widget.icon != null || _usesRowPrefixIcon;
  double get _leadingTextLaneInset => widget._hasRowLeading
      ? (widget.leadingExtent ?? CatchFieldTokens.leadingIconExtent) +
            CatchFieldTokens.leadingGap
      : CatchFieldRow.textLaneInset;
  String? get _title => widget._rowLayout?._subject ?? widget.title;
  String? get _body => widget.body;
  String? get _displayError => widget.errorText ?? widget.error;
  String? get _placeholderText => widget.placeholder;
  String? get _inputHintText {
    final hint = (widget.inputHint ?? widget.placeholder)?.trim();
    if (hint == null || hint.isEmpty) return null;

    final label = _title?.trim();
    if (widget.showLabel &&
        label != null &&
        label.toLowerCase() == hint.toLowerCase()) {
      return null;
    }
    return hint;
  }

  String? get _emptyEditableValueText {
    final label = _title?.trim();
    final isEditableRow =
        (_isEdit && !widget.readOnly) ||
        widget._onSubmit != null ||
        widget.addable;
    if (!isEditableRow || label == null || label.isEmpty) return null;
    return CatchField.resolveEmptyValueText(
      widget.copy,
      title: label,
      emptyValueText: widget.emptyValueText,
    );
  }

  bool get _shouldShowChevron =>
      widget.showChevron ??
      (_isNavigation &&
          widget.onTap != null &&
          widget.tone != CatchFieldTone.danger);

  // An outlined box always shows its label and empty box; only explicit-save
  // rows still rest as an inline Add line.
  bool get _textEntryCanCollapse =>
      _isEdit &&
      !widget._outlinedTextEntry &&
      widget.showLabel &&
      (_title?.isNotEmpty ?? false);
  bool get _textEntryExpanded =>
      !_textEntryCanCollapse ||
      _hasInputValue ||
      _active ||
      _hasError ||
      widget.autofocus;
  bool _inlineTextAddAtRestWith({required bool hasError}) =>
      _isEdit &&
      !widget.readOnly &&
      _textEntryCanCollapse &&
      !_hasInputValue &&
      !_active &&
      !hasError &&
      !widget.autofocus &&
      _emptyEditableValueText != null;
  bool get _inlineTextAddAtRest =>
      _inlineTextAddAtRestWith(hasError: _hasError);
  bool get _showsInlineAddAtRest =>
      _inlineControlAddAtRest || _inlineTextAddAtRest;
  bool get _textEntryCollapsed => _textEntryCanCollapse && !_textEntryExpanded;
  bool get _compactTextEntry =>
      _isEdit && widget.size == CatchFieldSize.floating && !widget.showLabel;

  Color _toneColor(
    CatchTokens t, {
    bool muted = false,
    Color? primaryFallback,
  }) {
    return switch (widget.tone) {
      CatchFieldTone.primary => t.primary,
      CatchFieldTone.danger => t.danger,
      _ => primaryFallback ?? (muted ? t.ink2 : t.ink),
    };
  }

  double get _contentTrailingReserve => _hasControl
      ? CatchFieldTokens.trailingGap + CatchFieldTokens.disclosureGlyphExtent
      : _usesPositionedClearTrailing
      ? CatchFieldTokens.trailingGap +
            CatchFieldTrailingRow.clearTargetConstraints.maxWidth
      : 0.0;
}
