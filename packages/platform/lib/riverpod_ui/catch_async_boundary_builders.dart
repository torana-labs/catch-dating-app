import 'package:flutter/material.dart';

typedef CatchAsyncBoundaryDataBuilder<T> =
    Widget Function(BuildContext context, T value);

/// Receives the boundary's recovery callback, including its deadline reset.
typedef CatchAsyncBoundaryErrorBuilder =
    Widget Function(
      BuildContext context,
      Object error,
      StackTrace stackTrace,
      VoidCallback? onRetry,
    );
