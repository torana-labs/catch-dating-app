// Capture fixtures shared by more than one catalog entry. Only the entries
// that import this file depend on it.

import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import '../../../events/events_test_helpers.dart';

const captureViewerUid = 'runner-viewer';
final captureViewer =
    buildUser(
      uid: captureViewerUid,
      name: 'Rohan Mehta',
      email: 'rohan@example.com',
      phoneNumber: '+919870000001',
    ).copyWith(
      city: 'in-mh-mumbai',
      relationshipGoal: RelationshipGoal.relationship,
      activityPreferences: const ActivityPreferences(
        running: RunningPreferences(
          paceMinSecsPerKm: 320,
          paceMaxSecsPerKm: 395,
          preferredDistances: [PreferredDistance.fiveK, PreferredDistance.tenK],
          runningReasons: [RunReason.community, RunReason.social],
          preferredRunTimes: [PreferredRunTime.earlyMorning],
          version: currentRunPreferencesVersion,
        ),
      ),
    );
