enum HostFormPurpose {
  application,
  registration,
  intake,
  waiver,
  feedback,
  survey,
}

enum HostFormLifecycleStatus { draft, published, paused, archived }

enum HostFormIdentityPolicy {
  anonymous,
  emailVerified,
  phoneVerified,
  emailOrPhoneVerified,
  catchAccount,
}

enum HostFormTargetKind { organizer, event, campaign }

enum HostFormLifecycleAction { pause, resume, archive }

enum HostFormAppearancePreset { editorial, minimal, activity }

enum HostFormCompletionAction { none, externalUrl, event, eventRuntime }
