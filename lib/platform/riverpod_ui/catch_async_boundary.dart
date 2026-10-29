import 'dart:async';

import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/firebase/initial_load_policy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary_builders.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary_policy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

export 'catch_async_boundary_builders.dart';
export 'catch_async_boundary_policy.dart';

/// Exhaustive async-state selection with one timeout and recovery lifecycle.
///
/// The default constructor builds boxes; [CatchAsyncBoundary.sliver] requires
/// sliver-producing builders. The boundary supplies branded defaults and never
/// adds geometry around caller-produced data or custom states.
class CatchAsyncBoundary<T> extends StatefulWidget {
  const CatchAsyncBoundary({
    super.key,
    required this.value,
    required this.builder,
    this.loadingBuilder,
    this.errorBuilder,
    this.errorContext = AppErrorContext.generic,
    this.onRetry,
    this.retainDataOn = defaultCatchAsyncRetainedData,
    this.initialLoadTimeout = InitialLoadPolicy.standard,
  }) : _sliver = false,
       fillRemaining = true;

  const CatchAsyncBoundary.sliver({
    super.key,
    required this.value,
    required this.builder,
    this.loadingBuilder,
    this.errorBuilder,
    this.errorContext = AppErrorContext.generic,
    this.onRetry,
    this.retainDataOn = defaultCatchAsyncRetainedData,
    this.initialLoadTimeout = InitialLoadPolicy.standard,
    this.fillRemaining = true,
  }) : _sliver = true;

  final AsyncValue<T> value;
  final CatchAsyncBoundaryDataBuilder<T> builder;
  final WidgetBuilder? loadingBuilder;
  final CatchAsyncBoundaryErrorBuilder? errorBuilder;
  final AppErrorContext errorContext;
  final VoidCallback? onRetry;
  final Set<CatchAsyncBoundaryMode> retainDataOn;
  final Duration? initialLoadTimeout;

  /// Applies to default sliver loading and error states, not caller-owned
  /// builders.
  final bool fillRemaining;
  final bool _sliver;

  @override
  State<CatchAsyncBoundary<T>> createState() => _CatchAsyncBoundaryState<T>();
}

class _CatchAsyncBoundaryState<T> extends State<CatchAsyncBoundary<T>> {
  Timer? _deadline;
  bool _timedOut = false;

  @override
  void initState() {
    super.initState();
    _syncDeadline();
  }

  @override
  void didUpdateWidget(CatchAsyncBoundary<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialLoadTimeout != widget.initialLoadTimeout) {
      _deadline?.cancel();
      _deadline = null;
      _timedOut = false;
    }
    _syncDeadline();
  }

  @override
  void dispose() {
    _deadline?.cancel();
    super.dispose();
  }

  void _syncDeadline() {
    if (!isCatchAsyncBlockingLoading(widget.value)) {
      _deadline?.cancel();
      _deadline = null;
      _timedOut = false;
      return;
    }
    if (_timedOut || _deadline != null || widget.initialLoadTimeout == null) {
      return;
    }
    _deadline = Timer(widget.initialLoadTimeout!, () {
      if (!mounted || !isCatchAsyncBlockingLoading(widget.value)) return;
      setState(() => _timedOut = true);
    });
  }

  void _retry() {
    _deadline?.cancel();
    _deadline = null;
    setState(() => _timedOut = false);
    widget.onRetry?.call();
    _syncDeadline();
  }

  @override
  Widget build(BuildContext context) {
    final value = widget.value;
    final branch = _timedOut
        ? CatchAsyncBoundaryStatus.error
        : catchAsyncBoundaryStatus(value, retainDataOn: widget.retainDataOn);
    switch (branch) {
      case CatchAsyncBoundaryStatus.data:
        return widget.builder(context, value.requireValue);
      case CatchAsyncBoundaryStatus.loading:
        final custom = widget.loadingBuilder?.call(context);
        if (custom != null) return custom;
        if (!widget._sliver) return const CatchLoadingIndicator();
        return widget.fillRemaining
            ? const CatchStateViewport.sliverLoading()
            : const SliverToBoxAdapter(child: CatchLoadingIndicator());
      case CatchAsyncBoundaryStatus.error:
        final error = _timedOut
            ? catchAsyncInitialLoadTimeoutException
            : value.error!;
        final stack = _timedOut
            ? StackTrace.current
            : value.stackTrace ?? StackTrace.current;
        final retry = widget.onRetry == null ? null : _retry;
        final custom = widget.errorBuilder?.call(context, error, stack, retry);
        if (custom != null) return custom;
        return widget._sliver
            ? CatchLocalizedSliverErrorState(
                error,
                context: widget.errorContext,
                onRetry: retry,
                fillRemaining: widget.fillRemaining,
              )
            : CatchLocalizedErrorState(
                error,
                context: widget.errorContext,
                onRetry: retry,
              );
    }
  }
}
