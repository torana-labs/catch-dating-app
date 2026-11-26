import 'dart:async';

/// A test stand-in for a Firestore listener read owner. Each listener gets
/// the source's value when it starts listening, and [refresh] re-reads the
/// source and delivers it to every listener, the way the server rewrites a
/// read model after a command commits.
class ReadModelFeed<T> {
  ReadModelFeed(this._read);

  final FutureOr<T> Function() _read;
  final _listeners = <StreamController<T>>{};

  /// How many times the source was read.
  int reads = 0;

  Stream<T> get stream {
    late final StreamController<T> controller;
    controller = StreamController<T>(
      onListen: () {
        _listeners.add(controller);
        unawaited(_deliver(controller));
      },
      onCancel: () => _listeners.remove(controller),
    );
    return controller.stream;
  }

  /// Re-reads the source and delivers it to every current listener.
  Future<void> refresh() => Future.wait([..._listeners].map(_deliver));

  Future<void> _deliver(StreamController<T> controller) async {
    try {
      reads++;
      final value = await _read();
      if (!controller.isClosed) controller.add(value);
    } on Object catch (error, stackTrace) {
      if (!controller.isClosed) controller.addError(error, stackTrace);
    }
  }
}
