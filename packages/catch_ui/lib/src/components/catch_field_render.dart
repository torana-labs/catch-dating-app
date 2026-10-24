part of 'catch_field.dart';

extension _CatchFieldRendering on _CatchFieldState {
  Widget _renderField(BuildContext context) {
    final textEntry = !_isEdit
        ? null
        : CatchFieldInput(
            configuration: widget,
            formFieldKey: _fieldKey,
            controller: _controller,
            focusNode: _focusNode,
            tapRegionGroupId: _textFieldTapRegionGroup,
            onValidationErrorChanged: _setTextEntryValidationError,
            onSubmitted: _handleSubmitted,
            mode: _usesUnderlineChrome
                ? CatchFieldInputMode.standalone
                : widget._explicitSaveInput
                ? CatchFieldInputMode.explicitSave
                : CatchFieldInputMode.row,
            states: {
              if (_active) WidgetState.selected,
              if (_focused) WidgetState.focused,
            },
            emptyValueText: _emptyEditableValueText,
            inputHintText: _inputHintText,
            addTextSpan: _inlineAddTextSpan(CatchTokens.of(context)),
            headerTrailingReserve: _contentTrailingReserve,
            expanded: _isOpen,
            inlineAddAtRest: _inlineTextAddAtRest,
          );
    final Widget field;
    switch (widget._config) {
      case _SelectConfig _:
        field = CatchSelectionField(
          copy: widget.copy,
          title: _title,
          values: widget._selectValues!,
          itemLabelBuilder: widget._selectItemLabel!,
          value: widget._selectValue,
          onChanged: widget._onSelectChanged,
          onValidate: widget._selectValidator,
          menuController: _menuController,
          focusNode: _focusNode,
          enabled: widget.enabled,
          showLabel: widget.showLabel,
          size: widget.size,
          placeholder: widget.placeholder,
          leading: widget.leading,
          error: _displayError,
          helperText: widget.helperText,
          helperTone: widget.helperTone,
          status: _active
              ? CatchFieldContentRowStatus.active
              : CatchFieldContentRowStatus.idle,
        );
      case _EditConfig _ when _usesUnderlineChrome:
        field = textEntry!;
      case _EditConfig _ || _RowConfig _ || _ToggleConfig _ || _ControlConfig _:
        final t = CatchTokens.of(context);
        final Widget configuredRow;
        {
          final canFocusTextEntry =
              _isEdit &&
              !widget._explicitSaveInput &&
              widget.enabled &&
              (widget.inputMode.canRequestFocus || widget.onTap != null);
          final canToggleRow =
              _isToggle &&
              widget.enabled &&
              widget.onToggle != null &&
              !_isSaving;
          final canExpand =
              _hasControl &&
              widget.enabled &&
              !_isSaving &&
              (widget.open == null || widget.onOpenChanged != null);
          final VoidCallback? rowAction;
          if (widget._explicitSaveInput && widget.enabled && !_isSaving) {
            rowAction = _isOpen
                ? _focusNode.requestFocus
                : () {
                    _requestExpansion(true);
                    widget.onTap?.call();
                  };
          } else if (canFocusTextEntry) {
            rowAction = () {
              if (widget.readOnly && widget.onTap != null) {
                widget.onTap!();
                return;
              }
              _expandAndFocusTextEntry();
              widget.onTap?.call();
            };
          } else if (canExpand) {
            rowAction = () {
              _requestExpansion(!_isOpen);
              widget.onTap?.call();
            };
          } else if (canToggleRow) {
            rowAction = () => widget.onToggle!(!widget.toggled);
          } else if (widget.enabled && widget.onTap != null && !_isEdit) {
            rowAction = widget.onTap;
          } else {
            rowAction = null;
          }
          final hasInlineMetadata =
              widget.inlineMetadata?.trim().isNotEmpty == true;
          final centerVertically =
              _showsInlineAddAtRest ||
              _isToggle ||
              hasInlineMetadata ||
              (widget._contentRow &&
                  widget.emphasis == CatchFieldEmphasis.title);
          final leadingTopPadding =
              widget._rowLayout != null || widget.add || centerVertically
              ? 0.0
              : widget._contentRow
              ? CatchSpacing.micro2
              : _rowTrailingTopPadding;
          final Widget? rawTrailingSlot;
          if (widget._rowConfig?.secondaryAction case final secondary?
              when !secondary._usesFooter) {
            rawTrailingSlot = Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                secondary._build(context),
                if (_isNavigation && _shouldShowChevron)
                  CatchFieldTrailingRow.fixedChevron(),
              ],
            );
          } else if (_isToggle) {
            rawTrailingSlot = CatchFieldTrailingRow.toggle(
              copy: widget.copy,
              value: widget.toggled,
              onChanged: _isSaving || !widget.enabled ? null : widget.onToggle,
              contract: widget.contract,
              contractExemption: widget.toggleContractExemption,
              semanticLabel: _title,
              status: widget.status,
              topPadding: 0,
            );
          } else if (_statusLaneActive &&
              !_visibleCommitBarOwnsSavingIndicator &&
              !_hasError) {
            rawTrailingSlot = CatchFieldTrailingRow.status(
              copy: widget.copy,
              status: widget.status,
            );
          } else if (!_isSaving && widget.valid && !_hasError) {
            rawTrailingSlot = CatchFieldTrailingRow.valid(topPadding: 0);
          } else if (_usesRowTextEntryTrailing) {
            final fallbackContent = widget.actions ?? widget.trailing;
            final fallback = fallbackContent == null
                ? null
                : CatchFieldTrailingRow.custom(
                    topPadding: 0,
                    color: t.ink3,
                    child: fallbackContent,
                  );
            if (!widget.showClearButton) {
              rawTrailingSlot = fallback;
            } else {
              rawTrailingSlot = ValueListenableBuilder<TextEditingValue>(
                valueListenable: _controller,
                builder: (_, value, _) {
                  if (value.text.isEmpty) {
                    return fallback ?? const SizedBox.shrink();
                  }
                  return CatchFieldTrailingRow.clear(
                    tooltip: widget.copy.clearTooltip(_title),
                    onPressed: () {
                      _controller.clear();
                      widget.onChanged?.call('');
                    },
                    topPadding: 0,
                  );
                },
              );
            }
          } else if (_hasControl) {
            rawTrailingSlot = CatchFieldTrailingRow.rotatingChevron(
              open: _isOpen,
              color: _active ? t.ink : t.ink3,
              topPadding: 0,
            );
          } else {
            final includeChevron = _isNavigation && _shouldShowChevron;
            final children = <Widget>[];
            final valueText = widget.valueText?.trim();
            if (!_stacksTrailingValueText &&
                valueText != null &&
                valueText.isNotEmpty) {
              children.add(
                CatchFieldTrailingRow.valueText(
                  text: valueText,
                  maxLines: widget.valueMaxLines,
                  topPadding: 0,
                ),
              );
            }
            final custom = !widget._hasRowActions
                ? null
                : CatchFieldTrailingRow.custom(
                    topPadding: 0,
                    color: t.ink3,
                    child: widget.actions!,
                  );
            if (custom != null) children.add(custom);
            if (children.isEmpty) {
              rawTrailingSlot = includeChevron
                  ? CatchFieldTrailingRow.fixedChevron(
                      color: t.ink3,
                      topPadding: 0,
                    )
                  : null;
            } else {
              final group = children.length == 1
                  ? children.single
                  : Wrap(
                      alignment: WrapAlignment.end,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: CatchSpacing.s2,
                      runSpacing: CatchSpacing.s1,
                      children: children,
                    );
              rawTrailingSlot = !includeChevron
                  ? group
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(child: group),
                        const SizedBox(width: CatchSpacing.s2),
                        CatchFieldTrailingRow.fixedChevron(
                          color: t.ink3,
                          topPadding: 0,
                        ),
                      ],
                    );
            }
          }
          final positionsTrailing = _hasControl || _usesPositionedClearTrailing;
          final trailingTopPadding = _rowTrailingTopPadding;
          final trailingSlot = rawTrailingSlot == null
              ? null
              : _usesPositionedClearTrailing || centerVertically
              ? rawTrailingSlot
              : Padding(
                  padding: EdgeInsets.only(top: trailingTopPadding),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: CatchFieldTokens.valueLineExtent,
                    ),
                    child: Align(
                      widthFactor: 1,
                      heightFactor: 1,
                      child: rawTrailingSlot,
                    ),
                  ),
                );
          final Widget? leadingSlot;
          if (widget.add) {
            leadingSlot = Icon(
              widget.icon ?? CatchIcons.add,
              size: CatchFieldRow.leadingSlotIconSize,
              color: t.primary,
            );
          } else if (widget._rowLayout case final layout?) {
            leadingSlot = ExcludeSemantics(child: layout._leading(context));
          } else if (widget._hasRowLeading) {
            final extent = widget.leadingExtent;
            leadingSlot = extent == null
                ? widget.leading
                : SizedBox(width: extent, child: widget.leading);
          } else if (widget.icon != null) {
            leadingSlot = Icon(
              widget.icon,
              size: CatchFieldRow.leadingSlotIconSize,
              color:
                  widget.iconColor ??
                  (_active
                      ? t.ink
                      : _showsInlineAddAtRest
                      ? t.primary
                      : _toneColor(t, muted: true)),
            );
          } else if (_usesRowPrefixIcon) {
            leadingSlot = IconTheme(
              data: IconThemeData(
                color: _hasError
                    ? t.danger
                    : _active
                    ? t.ink
                    : _showsInlineAddAtRest
                    ? t.primary
                    : t.ink2,
                size: CatchFieldRow.leadingSlotIconSize,
              ),
              child: widget.leading!,
            );
          } else {
            leadingSlot = null;
          }
          final Widget rowBody;
          final inlineMetadata = widget.inlineMetadata?.trim();
          if (widget._rowLayout case final layout?) {
            rowBody = layout._body(context);
          } else if (widget.add) {
            rowBody = Text(
              _title ?? '',
              style: CatchTextStyles.fieldRowValue(
                context,
                color: _toneColor(t, primaryFallback: t.primary),
                fontWeight: FontWeight.w600,
              ),
            );
          } else if (_inlineControlAddAtRest) {
            final addText = _emptyEditableValueText ?? _title ?? '';
            rowBody = Semantics(
              label: _inlineAddSemanticLabel(addText),
              excludeSemantics: true,
              child: Text.rich(
                _inlineAddTextSpan(t),
                style: CatchTextStyles.fieldRowValue(
                  context,
                  color: t.ink3,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            );
          } else if (widget._explicitSaveInput) {
            final error = _displayError?.trim();
            final inlineAddAtRest =
                error?.isNotEmpty != true && _inlineTextAddAtRest;
            final input = IgnorePointer(ignoring: !_isOpen, child: textEntry);
            rowBody = CatchFieldContentRow.value(
              labelCopy: widget.copy.label,
              titleMaxLines: widget.titleMaxLines,
              isOptional: widget.isOptional && widget.showLabel,
              badgeLabel: widget.badgeLabel,
              badgeTone: widget.badgeTone,
              tone: widget.tone,
              helperTone: widget.helperTone,
              headerTrailingReserve: _contentTrailingReserve,
              label: inlineAddAtRest ? null : _title,
              body: input,
              labelError: error,
              status: error?.isNotEmpty == true
                  ? CatchFieldContentRowStatus.error
                  : _active
                  ? CatchFieldContentRowStatus.active
                  : CatchFieldContentRowStatus.idle,
              labelStyle: CatchFieldContentRow.captionStyle(
                context,
                color: error?.isNotEmpty == true
                    ? t.danger
                    : _active
                    ? t.ink
                    : t.ink2,
              ),
            );
          } else if (_isEdit) {
            rowBody = textEntry!;
          } else if (inlineMetadata?.isNotEmpty == true) {
            final title = _title?.trim() ?? '';
            rowBody = Semantics(
              label: '$title, $inlineMetadata',
              excludeSemantics: true,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CatchText(
                    title,
                    variant: CatchTextVariant.sectionTitle,
                    color: _toneColor(t, primaryFallback: t.ink),
                  ),
                  const SizedBox(height: CatchRecordTokens.titleGap),
                  CatchText(
                    inlineMetadata!,
                    variant: CatchTextVariant.bodyS,
                    color: CatchTokens.of(context).ink2,
                  ),
                ],
              ),
            );
          } else if (widget._contentRow) {
            final hasError = _displayError?.trim().isNotEmpty == true;
            rowBody = CatchFieldContentRow(
              labelCopy: widget.copy.label,
              title: _title?.trim() ?? '',
              body: _body?.trim() ?? '',
              titleMaxLines: widget.titleMaxLines,
              bodyMaxLines: widget.bodyMaxLines,
              isOptional: widget.isOptional,
              titleColor: hasError
                  ? t.danger
                  : _toneColor(t, primaryFallback: t.ink),
              bodyColor: t.ink2,
            );
          } else {
            final title = _title?.trim();
            final value = _stacksTrailingValueText
                ? widget.valueText!.trim()
                : _body?.trim().isNotEmpty == true
                ? _body!.trim()
                : widget._onSubmit != null
                ? _emptyEditableValueText
                : _placeholderText?.trim();
            final error = _displayError?.trim();
            final hasValue = value != null && value.isNotEmpty;
            rowBody = CatchFieldContentRow.value(
              labelCopy: widget.copy.label,
              titleMaxLines: widget.titleMaxLines,
              isOptional: widget.isOptional && widget.showLabel,
              badgeLabel: widget.badgeLabel,
              badgeTone: widget.badgeTone,
              tone: widget.tone,
              helperTone: widget.helperTone,
              headerTrailingReserve: _contentTrailingReserve,
              label: title,
              value: value,
              supportText: _hasControl
                  ? error?.isNotEmpty == true
                        ? null
                        : widget.helperText
                  : error?.isNotEmpty == true
                  ? error
                  : widget.helperText,
              emphasis: widget.emphasis == CatchFieldEmphasis.title || !hasValue
                  ? CatchFieldEmphasis.title
                  : CatchFieldEmphasis.body,
              mode: !_hasValue
                  ? CatchFieldContentRowMode.placeholder
                  : CatchFieldContentRowMode.value,
              valueMaxLines: widget.bodyMaxLines,
              status: error?.isNotEmpty == true
                  ? CatchFieldContentRowStatus.error
                  : _active
                  ? CatchFieldContentRowStatus.active
                  : CatchFieldContentRowStatus.idle,
            );
          }
          final secondaryAction = widget._rowConfig?.secondaryAction;
          final composedBody = secondaryAction?._usesFooter == true
              ? Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [rowBody, gapH8, secondaryAction!._build(context)],
                )
              : rowBody;
          final rowContent = CatchFieldRow.standard(
            constraints: _usesPositionedClearTrailing
                ? _rowConstraints.enforce(
                    BoxConstraints(
                      minHeight: CatchFieldTrailingRow
                          .clearTargetConstraints
                          .minHeight,
                    ),
                  )
                : _rowConstraints,
            padding: _rowHeaderPadding,
            leading: leadingSlot,
            trailing: positionsTrailing ? null : trailingSlot,
            crossAxisAlignment: centerVertically
                ? CrossAxisAlignment.center
                : CrossAxisAlignment.start,
            leadingTopPadding: leadingTopPadding,
            paddingDuration: _hasControl
                ? _expansionMotionDuration(context)
                : Duration.zero,
            paddingCurve: CatchMotion.standardCurve,
            body: composedBody,
          );
          final row = positionsTrailing && trailingSlot != null
              ? Stack(
                  children: [
                    rowContent,
                    if (_usesPositionedClearTrailing)
                      PositionedDirectional(
                        top: 0,
                        bottom: 0,
                        end: _rowHeaderPadding.right,
                        width: CatchFieldTrailingRow
                            .clearTargetConstraints
                            .maxWidth,
                        child: LayoutBuilder(
                          builder: (context, available) {
                            final extent = CatchFieldTrailingRow
                                .clearTargetConstraints
                                .maxHeight;
                            final scaler = MediaQuery.textScalerOf(context);
                            final desiredTop =
                                _rowHeaderPadding.top +
                                scaler.scale(CatchFieldTokens.captionExtent) +
                                (scaler.scale(
                                          CatchFieldTokens.valueLineExtent,
                                        ) -
                                        extent) /
                                    2 +
                                CatchSpacing.micro3;
                            final top = desiredTop.clamp(
                              0.0,
                              available.maxHeight - extent,
                            );
                            return Align(
                              alignment: Alignment.topCenter,
                              child: Padding(
                                padding: EdgeInsets.only(top: top),
                                child: trailingSlot,
                              ),
                            );
                          },
                        ),
                      )
                    else
                      PositionedDirectional(
                        top: _rowHeaderPadding.top,
                        end: _rowHeaderPadding.right,
                        child: trailingSlot,
                      ),
                  ],
                )
              : rowContent;
          final action = rowAction;
          final canInteract = action != null;
          if (!canInteract && !_active && !_hasControl) {
            configuredRow = row;
          } else {
            final mouseCursor = canInteract
                ? _isEdit
                      ? SystemMouseCursors.text
                      : SystemMouseCursors.click
                : SystemMouseCursors.basic;
            final tapRegion = _isEdit
                ? TextFieldTapRegion(
                    groupId: _textFieldTapRegionGroup,
                    child: row,
                  )
                : row;
            final isToggle = _isToggle;
            final toggleStatusValue = switch (widget.status) {
              CatchFieldStatus.idle => null,
              CatchFieldStatus.saving => widget.copy.savingSemanticLabel,
              CatchFieldStatus.saved => widget.copy.savedSemanticLabel,
            };
            final pointerTarget = Listener(
              behavior: HitTestBehavior.opaque,
              onPointerDown: canInteract ? _handlePointerDown : null,
              onPointerMove: canInteract ? _handlePointerMove : null,
              onPointerUp: canInteract ? _handlePointerEnd : null,
              onPointerCancel: canInteract ? _handlePointerCancel : null,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                // Native text entry owns ordinary focus actions. Disclosures
                // and custom activations retain their separate gesture action.
                excludeFromSemantics:
                    canFocusTextEntry &&
                    !widget.readOnly &&
                    widget.onTap == null,
                onTap: action,
                child: tapRegion,
              ),
            );
            final keyboardTarget = _isEdit || isToggle
                ? pointerTarget
                : FocusableActionDetector(
                    enabled: canInteract,
                    focusNode: _rowFocusNode,
                    mouseCursor: mouseCursor,
                    onShowFocusHighlight: (focused) {
                      if (_rowFocused == focused) return;
                      _update(() => _rowFocused = focused);
                    },
                    actions: <Type, Action<Intent>>{
                      if (action != null)
                        ActivateIntent: CallbackAction<ActivateIntent>(
                          onInvoke: (_) {
                            if (_rowFocusNode.hasPrimaryFocus) action();
                            return null;
                          },
                        ),
                    },
                    child: pointerTarget,
                  );
            final rowPadding = _rowPadding;
            final disclosureStartPadding =
                rowPadding.left +
                (_hasLeadingSlot ? _leadingTextLaneInset : 0.0);
            final actionBar = widget._onSubmit == null
                ? null
                : CatchFieldActionRow(
                    cancelLabel: widget.copy.cancelLabel,
                    doneLabel: widget.copy.doneLabel,
                    savingLabel: widget.copy.savingLabel,
                    revealTargetKey: _actionBarRevealTargetKey,
                    loading: _isSaving,
                    leading:
                        widget._explicitSaveInput && widget.maxLength != null
                        ? ValueListenableBuilder<TextEditingValue>(
                            valueListenable: _controller,
                            builder: (context, value, _) => Text(
                              '${value.text.characters.length} / ${widget.maxLength}',
                              key: const ValueKey('catch-field-action-counter'),
                              style:
                                  CatchTextStyles.monoLabel(
                                    context,
                                    color: t.ink3,
                                  ).copyWith(
                                    fontSize: CatchFieldTokens.counterFontSize,
                                  ),
                            ),
                          )
                        : null,
                    onCancel: _handleCancel,
                    onSubmit: _handleSubmit,
                  );
            final rootError = _hasControl && !widget._explicitSaveInput
                ? _displayError?.trim()
                : null;
            final content = Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                keyboardTarget,
                if (_hasControl)
                  CatchFieldDrawer(
                    open: _isOpen,
                    offstage: _disclosureOffstage,
                    revealTargetKey: _disclosureRevealTargetKey,
                    body: widget.child,
                    meta: widget._explicitSaveInput ? widget.meta : null,
                    actions: widget._explicitSaveInput ? widget.actions : null,
                    footer: actionBar,
                    startPadding: disclosureStartPadding,
                    endPadding: rowPadding.right,
                    bottomPadding: rowPadding.bottom,
                    revealDuration: _expansionMotionDuration(context),
                    opacityDuration: catchFieldMotionDuration(
                      context,
                      CatchMotion.base,
                    ),
                    onRevealEnd: _handleExpansionAnimationEnd,
                  ),
                if (rootError?.isNotEmpty == true)
                  CatchFieldSupportRow(
                    key: const ValueKey('catch-field-root-support'),
                    text: rootError,
                    color: t.danger,
                    showErrorIcon: true,
                    padding: EdgeInsetsDirectional.only(
                      start: disclosureStartPadding,
                      end: rowPadding.right,
                      bottom: rowPadding.bottom,
                    ),
                  ),
              ],
            );
            final stack = CatchFieldSurface(
              pressedOverlayKey: CatchField.pressOverlayKey,
              states: {
                if (_active) WidgetState.selected,
                if (_rowFocused) WidgetState.focused,
                if (_pressed) WidgetState.pressed,
                if (_hovered) WidgetState.hovered,
              },
              child: content,
            );
            configuredRow = Semantics(
              container: true,
              excludeSemantics: isToggle,
              label: isToggle ? _title : null,
              button: !isToggle && !_isEdit && canInteract,
              enabled: canInteract,
              selected: widget.states.contains(WidgetState.selected)
                  ? true
                  : null,
              expanded: _hasControl ? _isOpen : null,
              toggled: isToggle ? widget.toggled : null,
              value: isToggle ? toggleStatusValue : null,
              onTap: isToggle && canInteract ? action : null,
              child: MouseRegion(
                cursor: mouseCursor,
                onEnter: canInteract
                    ? (_) => _update(() => _hovered = true)
                    : null,
                onExit: (event) {
                  if (_hovered) _update(() => _hovered = false);
                  if (canInteract) _handlePointerExit(event);
                },
                child: stack,
              ),
            );
          }
        }
        final rowStack = Stack(children: [configuredRow]);
        field = !_isEdit && !_hasControl
            ? rowStack
            : Shortcuts(
                shortcuts: const <ShortcutActivator, Intent>{
                  SingleActivator(LogicalKeyboardKey.escape):
                      _CatchFieldDismissIntent(),
                },
                child: Actions(
                  actions: <Type, Action<Intent>>{
                    _CatchFieldDismissIntent:
                        CallbackAction<_CatchFieldDismissIntent>(
                          onInvoke: (_) {
                            _dismiss();
                            return null;
                          },
                        ),
                  },
                  child: _isEdit
                      ? TextFieldTapRegion(
                          groupId: _textFieldTapRegionGroup,
                          onTapOutside: _handleOutsidePointerDown,
                          onTapUpOutside: _handleOutsidePointerUp,
                          onTapInside: _clearOutsidePointer,
                          onTapUpInside: _clearOutsidePointer,
                          child: rowStack,
                        )
                      : TapRegion(
                          groupId: _tapRegionGroup,
                          onTapOutside: _handleOutsidePointerDown,
                          onTapUpOutside: _handleOutsidePointerUp,
                          onTapInside: _clearOutsidePointer,
                          onTapUpInside: _clearOutsidePointer,
                          child: rowStack,
                        ),
                ),
              );
      default:
        throw StateError('Unsupported CatchField configuration.');
    }
    final listeningField =
        NotificationListener<CatchFieldChoicePickedNotification>(
          onNotification: _handleChoicePicked,
          child: field,
        );
    if (widget.enabled) return listeningField;
    return ExcludeFocus(
      child: IgnorePointer(
        child: Opacity(
          opacity: CatchFieldTokens.disabledOpacity,
          child: listeningField,
        ),
      ),
    );
  }
}
