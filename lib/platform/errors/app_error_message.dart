import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

enum AppErrorContext {
  generic,
  dashboard,
  explore,
  profile,
  event,
  organizer,
  customers,
  customer,
  applications,
  forms,
  formResponses,
  chat,
  swipes,
  payments,
  auth,
}

@immutable
class AppErrorDescriptor {
  const AppErrorDescriptor({
    required this.title,
    required this.message,
    required this.icon,
    required this.retryLabel,
    required this.retryable,
    required this.severity,
  });

  final String title;
  final String message;
  final IconData icon;
  final String retryLabel;
  final bool retryable;
  final AppErrorSeverity severity;
}

AppErrorDescriptor appErrorDescriptor(
  Object error, {
  required AppLocalizations l10n,
  AppErrorContext context = AppErrorContext.generic,
}) {
  final appException = _normalizeForPresentation(error);
  return AppErrorDescriptor(
    title: _titleFor(l10n, error, appException, context),
    message: _messageFor(l10n, error, appException, context),
    icon: _iconFor(error, appException),
    retryLabel: _retryLabelFor(l10n, appException, context),
    retryable: _isRetryable(error, appException),
    severity: appException?.severity ?? AppErrorSeverity.error,
  );
}

String appErrorMessage(
  Object error, {
  required AppLocalizations l10n,
  AppErrorContext context = AppErrorContext.generic,
}) {
  return appErrorDescriptor(error, l10n: l10n, context: context).message;
}

AppException? _normalizeForPresentation(Object error) {
  if (error is AppException) return error;
  if (error is FirebaseException) {
    return normalizeBackendError(
      error,
      context: backendContextForFirebaseException(error),
    );
  }
  return null;
}

String _messageFor(
  AppLocalizations l10n,
  Object error,
  AppException? appException,
  AppErrorContext context,
) {
  if (context == AppErrorContext.explore &&
      _isFirestoreIndexPrecondition(appException)) {
    return l10n.coreAppErrorMessageVisiblecopyExploreIsStillGetting;
  }
  if (appException is BackendOperationException &&
      appException.code == 'callable-unavailable') {
    return switch (context) {
      AppErrorContext.forms => l10n.hostFormsUnavailableBody,
      AppErrorContext.formResponses => l10n.hostFormResponsesUnavailableBody,
      _ => l10n.coreAppErrorMessageVisiblecopySomethingWentWrongPlease,
    };
  }
  if (appException == null) {
    return l10n.coreAppErrorMessageVisiblecopySomethingWentWrongPlease;
  }
  return _localizedExceptionMessage(l10n, appException);
}

String _localizedExceptionMessage(
  AppLocalizations l10n,
  AppException exception,
) {
  final service = exception.context?.service;
  if (service == BackendService.remoteConfig) {
    return l10n.coreAppErrorMessageVisiblecopyUnableToCheckThe;
  }
  if (service == BackendService.appCheck) {
    return l10n.coreAppErrorMessageVisiblecopyUnableToVerifyThis;
  }
  if (service == BackendService.messaging) {
    return l10n.coreAppErrorMessageVisiblecopyUnableToUpdateNotification;
  }
  if (exception is SignInRequiredException) {
    return l10n.coreAppErrorMessageVisiblecopyPleaseSignInTo;
  }
  if (exception is PaymentCancelledException) {
    return l10n.coreAppErrorMessageVisiblecopyPaymentWasCancelled;
  }
  if (exception is PaymentFailedException) {
    return l10n.coreAppErrorMessageVisiblecopyPaymentFailedPleaseTry;
  }
  if (exception is PaymentVerificationFailedException) {
    return l10n.coreAppErrorMessageVisiblecopyPaymentCouldNotBe;
  }
  if (exception is PaidBookingUnsupportedException) {
    return l10n.coreAppErrorMessageVisiblecopyPaidBookingsAreOnly;
  }
  if (exception is PaidBookingUnavailableException) {
    return switch (exception.reason) {
      PaidBookingUnavailableReason.organizerPaymentsNotReady =>
        l10n.coreAppErrorMessageVisiblecopyOrganizerPaymentsNotReady,
      PaidBookingUnavailableReason.notOfferedInApp =>
        l10n.coreAppErrorMessageVisiblecopyPaidBookingNotInApp,
    };
  }
  if (exception is DocumentNotFoundException) {
    return l10n.coreAppErrorMessageVisiblecopyWeCouldNotFind;
  }
  if (exception is StorageUploadPreflightException) {
    return switch (exception.constraint) {
      'max-bytes' => l10n.coreAppErrorMessageVisiblecopyThatImageIsToo,
      'content-type' => l10n.coreAppErrorMessageVisiblecopyPleaseChooseAnImage,
      _ => l10n.coreAppErrorMessageVisiblecopyThatImageCouldNot,
    };
  }
  return switch (exception.code) {
    'local-journal-quarantined' => l10n.coreSavedOperationsQuarantined,
    'local-journal-unavailable' => l10n.coreSavedOperationsUnavailable,
    'program-operation-needs-review' ||
    'arrival-observation-needs-review' => l10n.programsOperationsNeedsReview,
    'program-manifest-reload-required' ||
    'dispatch-manifest-needs-review' => l10n.programsOperationsReloadManifest,
    'dispatch-passengers-not-ready' =>
      l10n.programsOperationsPassengersNotReady,
    'invalid-phone-number' =>
      l10n.coreAppErrorMessageVisiblecopyPleaseEnterAValid,
    'invalid-verification-code' =>
      l10n.coreAppErrorMessageVisiblecopyThatCodeIsInvalid,
    'session-expired' ||
    'code-expired' => l10n.coreAppErrorMessageVisiblecopyThatCodeExpiredPlease,
    'connection-failed' ||
    'offline' => l10n.coreAppErrorMessageVisiblecopyWeAreHavingTrouble,
    'timeout' => l10n.coreAppErrorMessageVisiblecopyTheRequestTimedOut,
    'too-many-requests' =>
      l10n.coreAppErrorMessageVisiblecopyTooManyAttemptsPlease,
    'permission-denied' ||
    'unauthorized' => l10n.coreAppErrorMessageVisiblecopyYouDoNotHave,
    'already-exists' => l10n.coreAppErrorMessageVisiblecopyThisAlreadyExists,
    'aborted' => l10n.coreAppErrorMessageVisiblecopyTheOperationCouldNot,
    'failed-precondition' => l10n.coreAppErrorMessageVisiblecopyThisDataIsStill,
    'operation-not-allowed' =>
      l10n.coreAppErrorMessageVisiblecopyThisSignInMethod,
    'user-disabled' => l10n.coreAppErrorMessageVisiblecopyThisAccountHasBeen,
    'keychain-error' => l10n.coreAppErrorMessageVisiblecopyUnableToFinishSign,
    'web-context-canceled' || 'web-context-cancelled' =>
      l10n.coreAppErrorMessageVisiblecopyVerificationWasCancelledPlease,
    'captcha-check-failed' || 'web-context-already-present' =>
      l10n.coreAppErrorMessageVisiblecopyUnableToCompleteThe,
    'onboarding-incomplete-profile' =>
      l10n.coreAppErrorMessageVisiblecopyPleaseCompleteYourBasic,
    'onboarding-missing-gender' =>
      l10n.coreAppErrorMessageVisiblecopyPleaseChooseYourDating,
    'onboarding-missing-interest' =>
      l10n.coreAppErrorMessageVisiblecopyPleaseChooseWhoYou,
    'onboarding-invalid-phone' =>
      l10n.coreAppErrorMessageVisiblecopyPleaseAddAValid,
    'onboarding-phone-unverified' =>
      l10n.coreAppErrorMessageVisiblecopyPleaseVerifyYourPhone,
    'launch-access-incomplete' =>
      l10n.coreAppErrorMessageVisiblecopyPleaseCompleteYourAccess,
    'launch-access-locked' =>
      l10n.coreAppErrorMessageVisiblecopyThisAccessApplicationIs,
    'club-host-edit-required' =>
      l10n.coreAppErrorMessageVisiblecopyOnlyAOrganizerHost,
    'club-owner-edit-required' =>
      l10n.coreAppErrorMessageVisiblecopyOnlyTheOrganizerOwner,
    'event-club-required' =>
      l10n.coreAppErrorMessageVisiblecopyChooseAOrganizerBefore,
    'event-meeting-location-required' =>
      l10n.coreAppErrorMessageVisiblecopyAddAMeetingLocation,
    'swipe-candidates-timeout' =>
      l10n.coreAppErrorMessageVisiblecopyProfilesAreTakingToo,
    'profile-edit-session-changed' =>
      l10n.coreAppErrorMessageVisiblecopyProfileChangedWhileSaving,
    'validation-failed' =>
      l10n.coreAppErrorMessageVisiblecopyCheckTheHighlightedDetails,
    _ => l10n.coreAppErrorMessageVisiblecopySomethingWentWrongPlease,
  };
}

String _titleFor(
  AppLocalizations l10n,
  Object error,
  AppException? appException,
  AppErrorContext context,
) {
  if (_isNetworkError(error, appException)) {
    return l10n.coreAppErrorMessageVisiblecopyConnectionIssue;
  }
  if (_isAuthError(error, appException)) {
    return l10n.coreAppErrorMessageVisiblecopySignInRequired;
  }
  if (_isPermissionError(error, appException)) {
    return l10n.coreAppErrorMessageVisiblecopyActionUnavailable;
  }
  if (_isNotFoundError(error, appException)) {
    return _notFoundTitle(l10n, context);
  }
  if (appException is ValidationException) {
    return l10n.coreAppErrorMessageVisiblecopyCheckYourDetails;
  }
  if (appException is PaymentCancelledException) {
    return l10n.coreAppErrorMessageVisiblecopyPaymentCancelled;
  }
  if (appException is PaymentVerificationFailedException) {
    return l10n.coreAppErrorMessageVisiblecopyPaymentVerificationFailed;
  }
  if (appException is PaymentFailedException) {
    return l10n.coreAppErrorMessageVisiblecopyPaymentFailed;
  }
  if (appException is PaidBookingUnsupportedException ||
      appException is PaidBookingUnavailableException) {
    return l10n.coreAppErrorMessageVisiblecopyPaymentUnavailable;
  }
  if (appException is EventBookingFailedException) {
    return l10n.coreAppErrorMessageVisiblecopyEventSignupUnavailable;
  }
  if (appException is StorageException) {
    return l10n.coreAppErrorMessageVisiblecopyUploadFailed;
  }
  if (appException is ExternalActionException) {
    return l10n.coreAppErrorMessageVisiblecopyActionFailed;
  }
  if (appException is BackendOperationException) {
    final backendContext = appException.context;
    return switch (backendContext?.service) {
      BackendService.appCheck =>
        l10n.coreAppErrorMessageVisiblecopySessionVerificationFailed,
      BackendService.messaging =>
        l10n.coreAppErrorMessageVisiblecopyNotificationsUnavailable,
      BackendService.remoteConfig =>
        l10n.coreAppErrorMessageVisiblecopyUpdateCheckUnavailable,
      BackendService.storage => l10n.coreAppErrorMessageVisiblecopyUploadFailed,
      BackendService.auth => l10n.coreAppErrorMessageVisiblecopySignInProblem,
      BackendService.payments =>
        l10n.coreAppErrorMessageVisiblecopyPaymentFailed,
      _ => _contextTitle(l10n, context),
    };
  }

  return _contextTitle(l10n, context);
}

String _contextTitle(AppLocalizations l10n, AppErrorContext context) {
  return switch (context) {
    AppErrorContext.dashboard =>
      l10n.coreAppErrorMessageVisiblecopyDashboardUnavailable,
    AppErrorContext.explore =>
      l10n.coreAppErrorMessageVisiblecopyExploreUnavailable,
    AppErrorContext.profile =>
      l10n.coreAppErrorMessageVisiblecopyProfileUnavailable,
    AppErrorContext.event =>
      l10n.coreAppErrorMessageVisiblecopyEventUnavailable,
    AppErrorContext.organizer =>
      l10n.coreAppErrorMessageVisiblecopyOrganizerUnavailable,
    AppErrorContext.customers => l10n.hostCustomersUnavailable,
    AppErrorContext.customer => l10n.hostCustomersDetailUnavailable,
    AppErrorContext.applications => l10n.hostApplicationsUnavailable,
    AppErrorContext.forms => l10n.hostFormsUnavailableTitle,
    AppErrorContext.formResponses => l10n.hostFormResponsesUnavailableTitle,
    AppErrorContext.chat =>
      l10n.coreAppErrorMessageVisiblecopyMessagesUnavailable,
    AppErrorContext.swipes =>
      l10n.coreAppErrorMessageVisiblecopyCatchesUnavailable,
    AppErrorContext.payments =>
      l10n.coreAppErrorMessageVisiblecopyPaymentsUnavailable,
    AppErrorContext.auth => l10n.coreAppErrorMessageVisiblecopySignInProblem,
    AppErrorContext.generic =>
      l10n.coreAppErrorMessageVisiblecopySomethingWentWrong,
  };
}

IconData _iconFor(Object error, AppException? appException) {
  if (_isNetworkError(error, appException)) return CatchIcons.offline;
  if (_isAuthError(error, appException)) return CatchIcons.locked;
  if (_isPermissionError(error, appException)) return CatchIcons.block;
  if (_isNotFoundError(error, appException)) return CatchIcons.noResults;
  if (appException is ValidationException) return CatchIcons.note;
  if (appException is PaymentCancelledException ||
      appException is PaymentFailedException ||
      appException is PaymentVerificationFailedException ||
      appException is PaidBookingUnsupportedException ||
      appException is PaidBookingUnavailableException) {
    return CatchIcons.paymentUnavailable;
  }
  if (appException is EventBookingFailedException) {
    return CatchIcons.activity;
  }
  if (appException is StorageException) {
    return CatchIcons.upload;
  }
  if (appException is ExternalActionException) {
    return CatchIcons.openExternal;
  }
  if (appException is BackendOperationException) {
    final backendContext = appException.context;
    return switch (backendContext?.service) {
      BackendService.auth => CatchIcons.locked,
      BackendService.storage => CatchIcons.upload,
      BackendService.messaging => CatchIcons.notificationsOff,
      BackendService.payments => CatchIcons.paymentUnavailable,
      BackendService.external => CatchIcons.openExternal,
      _ => CatchIcons.error,
    };
  }
  return CatchIcons.error;
}

String _retryLabelFor(
  AppLocalizations l10n,
  AppException? appException,
  AppErrorContext context,
) {
  if (appException is SignInRequiredException) {
    return l10n.coreAppErrorMessageVisiblecopySignIn;
  }
  if (appException is StorageException) {
    return l10n.coreAppErrorMessageVisiblecopyTryUploadAgain;
  }
  if (appException is PaymentFailedException ||
      appException is PaymentVerificationFailedException) {
    return l10n.coreAppErrorMessageVisiblecopyTryPaymentAgain;
  }
  return switch (context) {
    AppErrorContext.chat => l10n.coreAppErrorMessageVisiblecopyReloadMessages,
    AppErrorContext.explore => l10n.coreAppErrorMessageVisiblecopyReloadExplore,
    AppErrorContext.profile => l10n.coreAppErrorMessageVisiblecopyReloadProfile,
    AppErrorContext.event => l10n.coreAppErrorMessageVisiblecopyReloadEvent,
    AppErrorContext.organizer =>
      l10n.coreAppErrorMessageVisiblecopyReloadOrganizer,
    AppErrorContext.customers => l10n.hostCustomersReload,
    AppErrorContext.customer => l10n.hostCustomersReloadDetail,
    AppErrorContext.applications => l10n.hostApplicationsReload,
    AppErrorContext.forms => l10n.hostFormsReload,
    AppErrorContext.formResponses => l10n.hostFormResponsesReload,
    AppErrorContext.swipes => l10n.coreAppErrorMessageVisiblecopyReloadCatches,
    AppErrorContext.payments =>
      l10n.coreAppErrorMessageVisiblecopyReloadPayments,
    _ => l10n.coreAppErrorMessageVisiblecopyTryAgain,
  };
}

bool _isRetryable(Object error, AppException? appException) {
  if (appException != null) return appException.retryable;
  if (_isNetworkError(error, appException)) return true;
  // Unknown load failures are still worth retrying when a screen supplies a
  // retry callback; the retry button is not shown unless such a callback exists.
  return true;
}

bool _isNetworkError(Object error, AppException? appException) {
  if (appException is NetworkException) return true;
  if (error is FirebaseException) {
    return switch (error.code) {
      'unavailable' ||
      'deadline-exceeded' ||
      'resource-exhausted' ||
      'network-request-failed' => true,
      _ => false,
    };
  }
  return false;
}

bool _isAuthError(Object error, AppException? appException) =>
    appException is SignInRequiredException ||
    (error is FirebaseException && error.code == 'unauthenticated');

bool _isPermissionError(Object error, AppException? appException) =>
    appException is PermissionException ||
    (error is FirebaseException && error.code == 'permission-denied');

bool _isNotFoundError(Object error, AppException? appException) =>
    appException is DocumentNotFoundException ||
    (error is FirebaseException && error.code == 'not-found');

String _notFoundTitle(AppLocalizations l10n, AppErrorContext context) {
  return switch (context) {
    AppErrorContext.profile =>
      l10n.coreAppErrorMessageVisiblecopyProfileNotFound,
    AppErrorContext.explore =>
      l10n.coreAppErrorMessageVisiblecopyExploreItemNotFound,
    AppErrorContext.event => l10n.coreAppErrorMessageVisiblecopyEventNotFound,
    AppErrorContext.organizer =>
      l10n.coreAppErrorMessageVisiblecopyOrganizerNotFound,
    AppErrorContext.customers => l10n.hostCustomersUnavailable,
    AppErrorContext.customer => l10n.hostCustomersDetailNotFound,
    AppErrorContext.applications => l10n.hostApplicationNotFound,
    AppErrorContext.forms => l10n.hostFormsNotFound,
    AppErrorContext.formResponses => l10n.hostFormResponseNotFound,
    AppErrorContext.chat => l10n.coreAppErrorMessageVisiblecopyChatNotFound,
    AppErrorContext.swipes =>
      l10n.coreAppErrorMessageVisiblecopyCatchesNotFound,
    AppErrorContext.payments =>
      l10n.coreAppErrorMessageVisiblecopyPaymentNotFound,
    _ => l10n.coreAppErrorMessageVisiblecopyNotFound,
  };
}

bool _isFirestoreIndexPrecondition(AppException? appException) {
  if (appException is! BackendOperationException) return false;
  return appException.code == 'failed-precondition' &&
      appException.context?.service == BackendService.firestore &&
      (appException.debugMessage?.contains('required index') ?? false);
}
