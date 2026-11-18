import 'package:flutter/foundation.dart';

/// A guest's "help me say hi" request: who asked, who they want to meet,
/// and their note.
@immutable
class HostLiveIntroRequest {
  const HostLiveIntroRequest({
    required this.id,
    this.requesterName,
    this.requesterPhotoUrl,
    this.targetName,
    this.note,
  });

  final String id;

  /// Null while their profile is read.
  final String? requesterName;
  final String? requesterPhotoUrl;
  final String? targetName;
  final String? note;
}

/// A checked-in guest nobody has been grouped with for too long.
@immutable
class HostLiveLeftOut {
  const HostLiveLeftOut({required this.uid, this.name, this.photoUrl});

  final String uid;

  /// Null while their profile is read.
  final String? name;
  final String? photoUrl;
}

/// The night alerts the old console showed beside the plan: open intro
/// requests, and guests left out of every group past the threshold.
@immutable
class HostLiveNightAlerts {
  const HostLiveNightAlerts({
    this.intros = const <HostLiveIntroRequest>[],
    this.leftOut = const <HostLiveLeftOut>[],
    this.leftOutMinutes = 40,
  });

  /// Open intro requests, newest first.
  final List<HostLiveIntroRequest> intros;

  /// Guests past the threshold, by name.
  final List<HostLiveLeftOut> leftOut;

  /// How long counts as left out.
  final int leftOutMinutes;

  bool get isEmpty => intros.isEmpty && leftOut.isEmpty;
}
