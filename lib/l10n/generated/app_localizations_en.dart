// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get hostAnalyticsPrivacyTitle => 'Host app analytics';

  @override
  String get hostAnalyticsPrivacyBody =>
      'Help improve Catch Host by sharing sign-in, onboarding and event setup activity with Google Analytics using a random app identifier. Names, contact details, guest data and event details are excluded. This choice applies to this device for 30 days. Advertising measurement stays off. You can turn analytics off here at any time.';

  @override
  String get hostAnalyticsPrivacyDeny => 'Keep analytics off';

  @override
  String get hostAnalyticsPrivacyAllow => 'Allow analytics';

  @override
  String get hostAnalyticsPrivacyOn => 'Allowed on this device';

  @override
  String get hostAnalyticsPrivacyOff => 'Off';

  @override
  String get eventsEventViewerCheckingBooking =>
      'Checking booking availability…';

  @override
  String get eventsEventViewerRetryBooking => 'Retry booking availability';

  @override
  String get eventsEventViewerBookingUnavailable => 'Booking unavailable';

  @override
  String get phoneImportTitle => 'Review phone contacts';

  @override
  String get phoneImportDemoTitle => 'Phone import demo · sharing unavailable';

  @override
  String get phoneImportDemoMessage =>
      'This review stays on this device. Nothing is saved or shared with a wedding or its program collaborators in this demo.';

  @override
  String get phoneImportCompletedTitle => 'Reviewed guests shared';

  @override
  String get phoneImportRetryTitle => 'Saved review needs confirmation';

  @override
  String get phoneImportReadyTitle => 'Ready to share';

  @override
  String get phoneImportSharingTitle => 'Sharing reviewed guests';

  @override
  String get phoneImportRecoveryTitle => 'Saved review needs recovery';

  @override
  String get phoneImportPrivacyTitle => 'Only reviewed guests are shared';

  @override
  String get phoneImportRetryMessage =>
      'A request may already have applied. Retry this exact saved review to confirm its outcome. Nothing retries automatically.';

  @override
  String get phoneImportRecoveryMessage =>
      'The saved review is preserved. Return to this wedding and retry loading it before starting a new import.';

  @override
  String get phoneImportSharingMessage =>
      'Keep this review unchanged while its result is checked.';

  @override
  String get phoneImportPrivacyMessage =>
      'Selecting contacts does not share them. Review the guests, confirm the selected wedding, then share explicitly.';

  @override
  String get phoneImportChooseMessage =>
      'Choose only the guests you want to include. Review their names and phone numbers before sharing with this wedding.';

  @override
  String get phoneImportSelectGuests => 'Select guests';

  @override
  String get phoneImportChooseContacts => 'Choose phone contacts';

  @override
  String get phoneImportAddContacts => 'Add phone contacts';

  @override
  String get phoneImportPickerHelp =>
      'Contact selection opens in the native Catch Host app. On older Android phones, add contacts one at a time and repeat this action.';

  @override
  String get phoneImportEmptyTitle => 'No guests selected';

  @override
  String get phoneImportEmptyMessage =>
      'Choose phone contacts or add a household member who does not have a phone contact.';

  @override
  String get phoneImportSharedNumber =>
      'A chosen number is shared by several guests. They stay separate; check their household assignments.';

  @override
  String get phoneImportAddMember => 'Add household member without a phone';

  @override
  String get phoneImportReviewSharing => 'Review sharing';

  @override
  String get phoneImportNoOwnership =>
      'A phone number does not prove ownership or verification and does not give permission to send messages. These contacts are not used for Catch discovery or marketing.';

  @override
  String get phoneImportNeedsReview =>
      'Enter every guest name, choose a phone for each selected contact and review its international country code. Remove contacts without a number, or add them as household members.';

  @override
  String get phoneImportPreview => 'Check reviewed guests';

  @override
  String get phoneImportShare => 'Share reviewed guests';

  @override
  String get phoneImportUnavailable =>
      'Sharing is unavailable until wedding member access and the workspace import service are connected.';

  @override
  String get phoneImportDiscard => 'Discard local review';

  @override
  String get phoneImportReload => 'Reload saved review';

  @override
  String get phoneImportRetry => 'Retry saved sharing';

  @override
  String get phoneImportDismiss => 'Dismiss saved review';

  @override
  String get phoneImportConfirmedGuests => 'Confirmed guests';

  @override
  String get phoneImportManualSource => 'Household member · no phone contact';

  @override
  String get phoneImportDismissTitle => 'Dismiss saved review?';

  @override
  String get phoneImportDismissMessage =>
      'An already-issued request may have applied to the wedding. Dismissing this local review does not remove shared guests. Check the guest list before importing them again.';

  @override
  String get phoneImportSource => 'Source';

  @override
  String get phoneImportEditedSource =>
      'Selected phone contact · name edited for this review';

  @override
  String get phoneImportPickerSource => 'Selected phone contact';

  @override
  String get phoneImportGuestName => 'Guest name';

  @override
  String get phoneImportNameRequired => 'Enter a guest name.';

  @override
  String get phoneImportPhoneNumber => 'Phone number';

  @override
  String get phoneImportNoPhoneNeeded =>
      'No phone needed for this household member.';

  @override
  String get phoneImportNoContactNumber =>
      'This contact has no phone number. Remove it and add a household member without a phone instead.';

  @override
  String get phoneImportChosenNumber => 'Chosen phone number';

  @override
  String get phoneImportChooseNumber => 'Choose number';

  @override
  String get phoneImportSharedGuest =>
      'Also chosen for another guest. Keep guests separate.';

  @override
  String get phoneImportChooseNumberHelp =>
      'Choose the number you want to share for this guest.';

  @override
  String get phoneImportReviewNumberHelp =>
      'Review this number before sharing.';

  @override
  String get phoneImportInternationalNumber => 'International number to share';

  @override
  String get phoneImportInternationalHelp =>
      'Include + and the country code. Check this is the chosen contact number.';

  @override
  String get phoneImportInternationalRequired =>
      'Enter the chosen number with + and its country code.';

  @override
  String get phoneImportFamilySide => 'Family side / cohort';

  @override
  String get phoneImportSideNone => 'Unassigned';

  @override
  String get phoneImportSideOne => 'Partner one’s side';

  @override
  String get phoneImportSideTwo => 'Partner two’s side';

  @override
  String get phoneImportSideBoth => 'Both sides';

  @override
  String get phoneImportHousehold => 'Household';

  @override
  String get phoneImportHouseholdHelp =>
      'Use the same label for guests grouped together.';

  @override
  String get phoneImportCancelled =>
      'Selection cancelled. Your review is unchanged.';

  @override
  String get phoneImportDenied =>
      'Contact selection was not allowed. You can add a household member manually.';

  @override
  String get phoneImportPickerUnavailable =>
      'Contact selection is available in the native Catch Host app.';

  @override
  String get phoneImportPickerFailed =>
      'Contact selection could not be read. Try again when you are ready.';

  @override
  String get phoneImportPickerLimit => 'Select up to 100 contacts at a time.';

  @override
  String get phoneImportReviewLimit =>
      'Review up to 100 guests at a time. Remove guests before adding more.';

  @override
  String get phoneImportEmptySelection =>
      'No contacts selected. Your review is unchanged.';

  @override
  String get phoneImportEntryTitle => 'Import phone contacts';

  @override
  String get phoneImportEntryHelp =>
      'Choose guests to review and share with this wedding.';

  @override
  String phoneImportCompletedMessage({required String wedding}) {
    return 'These reviewed guests were shared with $wedding and its authorized program collaborators.';
  }

  @override
  String phoneImportGuestIssue({required int number, required String message}) {
    return 'Guest $number: $message';
  }

  @override
  String phoneImportReviewCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count guests',
      one: '1 guest',
    );
    return '$_temp0 in this local review';
  }

  @override
  String phoneImportConsent({required String wedding}) {
    return 'I want to share only these reviewed guests with $wedding and its authorized program collaborators.';
  }

  @override
  String phoneImportGuestTitle({required int number}) {
    return 'Guest $number';
  }

  @override
  String phoneImportRemoveGuest({required int number}) {
    return 'Remove guest $number';
  }

  @override
  String phoneImportRemoveNamedGuest({required String name}) {
    return 'Remove $name from this review';
  }

  @override
  String get hostsTrackingSettingsTitle => 'Meta Pixel and Google Analytics';

  @override
  String get hostsTrackingSettingsPolicyBlocked =>
      'Tracking is disabled pending policy review. Saving these IDs does not activate scripts or send data to either provider.';

  @override
  String get hostsTrackingSettingsUnclaimed =>
      'This organiser is not eligible to edit tracking settings. Complete the verified ownership or claim process first.';

  @override
  String get hostsTrackingSettingsMetaId => 'Meta Pixel ID';

  @override
  String get hostsTrackingSettingsGoogleId => 'Google measurement ID';

  @override
  String get hostsTrackingSettingsEnabled => 'Enable provider tracking';

  @override
  String get hostsTrackingSettingsInvalidId =>
      'Enter a valid provider ID or leave this field blank.';

  @override
  String get hostsTrackingSettingsPrivacy =>
      'Sensitive social, dating and private events remain blocked. Guest lists, form answers, interests and payment details are never included in provider tracking.';

  @override
  String get hostsTrackingSettingsSaveDisabled => 'Save disabled configuration';

  @override
  String get hostsTrackingSettingsReload => 'Reload settings';

  @override
  String get hostsTrackingSettingsReloadForConflict =>
      'If another manager updated these settings, reload the current revision before saving again.';

  @override
  String get hostsHostAnalyticsLabelObservedStages => 'Observed booking stages';

  @override
  String get hostsHostAnalyticsLabelProviderBookingClicks =>
      'Provider booking clicks';

  @override
  String get hostsHostAnalyticsLabelFormDrafts => 'Form drafts';

  @override
  String get hostsHostAnalyticsLabelFormSubmissions => 'Form submissions';

  @override
  String get hostsHostAnalyticsLabelFormCheckoutAttempts =>
      'Form fee checkout attempts';

  @override
  String get hostsHostAnalyticsLabelFormFeesCaptured => 'Form fees captured';

  @override
  String get hostsHostAnalyticsLabelDirectCheckoutAttempts =>
      'Direct checkout attempts';

  @override
  String get hostsHostAnalyticsLabelDirectPaymentsCaptured =>
      'Direct payments captured';

  @override
  String get hostsHostAnalyticsLabelDirectPaidAdmissions =>
      'Direct paid admissions';

  @override
  String get hostsHostAnalyticsTextObservedStageLimits =>
      'Separate counts observed in this period, not a linked cohort or conversion rate. A form fee payment does not confirm admission. Direct bookings can skip forms and approval. Provider clicks do not confirm an external purchase. Missing stages are shown as —; partial stages may be incomplete.';

  @override
  String get hostsHostAnalyticsLabelPublicPresence => 'Public presence';

  @override
  String get hostsHostAnalyticsLabelOutboundSourceClicks =>
      'Outbound source clicks';

  @override
  String get hostsHostAnalyticsLabelLinkClicks => 'Link clicks';

  @override
  String get hostsHostAnalyticsLabelRemovedLink => 'Removed link';

  @override
  String hostsHostAnalyticsLabelTrafficSource({required String source}) {
    String _temp0 = intl.Intl.selectLogic(source, {
      'instagram': 'Instagram',
      'whatsapp': 'WhatsApp',
      'facebook': 'Facebook',
      'google': 'Google',
      'qr': 'QR codes',
      'email': 'Email',
      'direct': 'Direct visits',
      'other': 'Other places',
    });
    return '$_temp0';
  }

  @override
  String hostsHostAnalyticsTextLinkClicksBySource({required String sources}) {
    return 'Link clicks came from $sources.';
  }

  @override
  String hostsHostAnalyticsTextTrafficSourceClicks({
    required String source,
    required String count,
  }) {
    return '$source $count';
  }

  @override
  String get hostsHostAnalyticsTextPresenceUnavailable =>
      'Presence data is unavailable for this range. Missing data is shown as —.';

  @override
  String get hostsHostAnalyticsTextPresenceEmpty =>
      'No public views or outbound clicks were observed in this range.';

  @override
  String get hostsHostAnalyticsTextPresenceObservedTotals =>
      'Observed totals, not unique visitors or a linked conversion funnel. Repeat visits, owner previews and automated traffic may affect these counts.';

  @override
  String get hostsHostAnalyticsTextPresenceExternalLimits =>
      'Outbound source clicks include source and provider links. They do not confirm a booking or payment on another website.';

  @override
  String get appTitleConsumer => 'Catch';

  @override
  String get appTitleHost => 'Catch Host';

  @override
  String get sharedActionTryAgain => 'Try again';

  @override
  String get sharedOfflineTitle => 'You\'re offline';

  @override
  String get sharedOfflineBody => 'Some content may be out of date.';

  @override
  String get sharedForceUpdateCheckErrorTitle => 'Could not verify app version';

  @override
  String get sharedForceUpdateCheckErrorBody =>
      'Check your connection and try again.';

  @override
  String get consumerAuthContinueWithPhone => 'Continue with phone';

  @override
  String get consumerNavigationHome => 'Home';

  @override
  String get consumerNavigationExplore => 'Explore';

  @override
  String get consumerNavigationChats => 'Chats';

  @override
  String get consumerNavigationProfile => 'You';

  @override
  String get hostNavigationToday => 'Today';

  @override
  String get hostNavigationEvents => 'Events';

  @override
  String get hostNavigationCustomers => 'Customers';

  @override
  String get hostNavigationAudience => 'Audience';

  @override
  String get hostNavigationInbox => 'Inbox';

  @override
  String get hostNavigationOrganizer => 'Organizer';

  @override
  String get hostTodayEmptyTitle => 'You’re all caught up';

  @override
  String get hostTodayEmptyBody =>
      'No live or upcoming events need your attention. Check the calendar or rehearse a run-of-show.';

  @override
  String get hostTodayViewAllEvents => 'View full calendar';

  @override
  String get hostTodayLater => 'Next 7 days';

  @override
  String hostInboxUnreadCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Unread · $count',
      one: 'Unread · 1',
      zero: 'Unread',
    );
    return '$_temp0';
  }

  @override
  String get authPhoneTitle => 'What\'s your number?';

  @override
  String get authPhoneSubtitle => 'We\'ll send you a one-time code to verify.';

  @override
  String get authHostPhoneTitle => 'Sign in with your phone';

  @override
  String get authHostPhoneSubtitle =>
      'We\'ll send a one-time code to verify your account.';

  @override
  String get authPhoneFieldLabel => 'Mobile number';

  @override
  String get authPhoneFieldPlaceholder => 'Enter your mobile number';

  @override
  String get authSearchCountryHint => 'Search country';

  @override
  String get authSendCodeAction => 'Send code';

  @override
  String get authInvalidPhoneNumber => 'Please enter a valid phone number.';

  @override
  String get authOtpTitle => 'Enter the code';

  @override
  String get authHostEditNumberAction => 'Edit number';

  @override
  String authHostResendCountdownAction({
    required int minutes,
    required String seconds,
  }) {
    return 'Resend code in $minutes:$seconds';
  }

  @override
  String get authHostResendCodeAction => 'Resend code';

  @override
  String get authHostSendingCodeAction => 'Sending code...';

  @override
  String get authHostVerifyingStatus => 'Verifying...';

  @override
  String get authHostVerificationPendingHint => 'This may take a few seconds.';

  @override
  String authOtpSentTo({required String phoneNumber}) {
    return 'Sent to $phoneNumber';
  }

  @override
  String get authYourNumber => 'your number';

  @override
  String get authVerifyAction => 'Verify';

  @override
  String get authChangeNumberAction => 'Change number';

  @override
  String get authResendNowStatus => 'RESEND NOW';

  @override
  String authResendCountdownStatus({
    required int minutes,
    required String seconds,
  }) {
    return 'RESEND IN $minutes:$seconds';
  }

  @override
  String get authResendCodeAction => 'Resend OTP';

  @override
  String get authSendingCodeAction => 'Sending OTP...';

  @override
  String get consumerChatsTitle => 'Chats';

  @override
  String get hostInboxTitle => 'Messaging';

  @override
  String get hostInboxSubtitle => 'One-to-one conversations and replies.';

  @override
  String get sharedSearchByNameHint => 'Search by name';

  @override
  String get consumerSearchChatsAction => 'Search chats';

  @override
  String get hostSearchAttendeesAction => 'Search attendees';

  @override
  String get hostInboxAllFilter => 'All';

  @override
  String get chatsChatScreenLabelShareCard => 'Share card';

  @override
  String get chatsChatScreenLabelReport => 'Report';

  @override
  String get chatsChatScreenLabelBlock => 'Block';

  @override
  String get chatsChatScreenTooltipChatActions => 'Chat actions';

  @override
  String get chatsChatScreenTitleMessagesUnavailable => 'Messages unavailable';

  @override
  String get chatsChatScreenCatcherrorstateReloadMessages => 'Reload messages';

  @override
  String get chatsChatEventContextHeaderTitleTheSameEvent => 'the same event';

  @override
  String get chatsChatInputBarMessageSendAnImage => 'Send an image';

  @override
  String get chatsChatInputBarTitleMessage => 'Message';

  @override
  String get chatsChatInputBarPlaceholderMessage => 'Message...';

  @override
  String get chatsChatInputBarMessageSendMessage => 'Send message';

  @override
  String get chatsChatInputBarLabelUploadingImage => 'Uploading image';

  @override
  String get chatsChatInputBarLabelSendingMessage => 'Sending message';

  @override
  String get chatsChatMessageListTitleMessagesUnavailable =>
      'Messages unavailable';

  @override
  String get chatsChatMessageListMessageUnableToLoadMessages =>
      'Unable to load messages.';

  @override
  String get chatsChatMessageListTitleSayHi => 'Say hi';

  @override
  String get chatsChatShareCardTextSharedFromCatch => 'Shared from Catch.';

  @override
  String get chatsSuvbotActionBarTextSuvbotControls => 'Suvbot controls';

  @override
  String get chatsSuvbotActionBarTextNoTypingNeeded => 'No typing needed';

  @override
  String get chatsSuvbotActionBarLabelRefreshAll => 'Refresh all';

  @override
  String get chatsSuvbotActionBarTextCreateATestState => 'Create a test state';

  @override
  String get chatsSuvbotActionBarLabelReset => 'Reset...';

  @override
  String get chatsSuvbotActionBarLabelReloadControls => 'Reload controls';

  @override
  String get chatsSuvbotActionBarTitleResetDemoState => 'Reset demo state';

  @override
  String get chatsSuvbotActionBarSubtitleTheseActionsOnlyTouch =>
      'These actions only touch demo-owned data.';

  @override
  String get chatsSuvbotActionBarTextMatchTester => 'Match tester';

  @override
  String get chatsSuvbotActionBarTextEnterAnAllowlistedBeta =>
      'Enter an allowlisted beta tester phone number.';

  @override
  String get chatsSuvbotActionBarTitlePhoneNumber => 'Phone number';

  @override
  String get chatsSuvbotActionBarLabelCreateMatch => 'Create match';

  @override
  String get clubsClubDetailScreenBodyClubid => 'clubId';

  @override
  String get clubsClubDetailScreenBodyEventid => 'eventId';

  @override
  String get clubsClubDetailScreenBodyUid => 'uid';

  @override
  String get clubsClubDetailScreenTitleClubNotFound => 'Organizer not found';

  @override
  String get clubsClubDetailScreenMessageThisClubIsNo =>
      'This organizer is no longer available.';

  @override
  String get clubsClubContactSectionTitleContact => 'Contact';

  @override
  String get clubsClubDetailBodyTitleAbout => 'About';

  @override
  String get clubsClubDetailBodyTitleWhatWeDo => 'What we do';

  @override
  String get clubsClubDetailBodyTitleFromTheClub => 'From the organizer';

  @override
  String get clubsClubDetailBodyTitleYourHosts => 'Your hosts';

  @override
  String get organizersAuthorityBadgeUnclaimed => 'Unclaimed listing';

  @override
  String get organizersAuthorityBadgeSourceBacked => 'Source backed';

  @override
  String get organizersAuthorityBadgeClaimPending => 'Claim under review';

  @override
  String get organizersAuthorityBadgeClaimed => 'Claimed';

  @override
  String get organizersAuthorityBadgeCatchOrganizer => 'Catch organizer';

  @override
  String get organizersAuthorityBadgeOwnerVerified => 'Owner verified';

  @override
  String get organizersAuthorityBadgeUnavailable => 'Unavailable';

  @override
  String get clubsClubDetailBodyTitleReviews => 'Reviews';

  @override
  String get clubsClubDetailBodyTitleGetInTouch => 'Get in touch';

  @override
  String get clubsClubDetailDockLabelDisableClubPushNotifications =>
      'Disable organizer push notifications';

  @override
  String get clubsClubDetailDockLabelEnableClubPushNotifications =>
      'Enable organizer push notifications';

  @override
  String get clubsClubHeroAppBarTooltipBack => 'Back';

  @override
  String get clubsClubHeroAppBarTooltipShareClub => 'Share organizer';

  @override
  String get clubsClubHostSectionMessageMessageHost => 'Message host';

  @override
  String get clubsClubPhotoStripTextFromTheClub => 'FROM THE ORGANIZER';

  @override
  String get clubsClubScheduleSectionTitleNoEventsScheduled =>
      'No events scheduled';

  @override
  String get clubsClubScheduleSectionMessageFutureEventsWillAppear =>
      'Future events will appear here once the host publishes one.';

  @override
  String get clubsClubAvatarRailTitleYourClubs => 'Your organizers';

  @override
  String get clubsClubDiscoverListTitleClubDirectory => 'Organizer directory';

  @override
  String get clubsClubIdentityAtomsLabelOwner => 'Owner';

  @override
  String get clubsClubIdentityAtomsLabelHost => 'Host';

  @override
  String get coreCatchAdaptivePickerTextCancel => 'Cancel';

  @override
  String get coreCatchAdaptivePickerTextDone => 'Done';

  @override
  String get coreCatchErrorBannerLabelTryAgain => 'Try again';

  @override
  String get coreCatchFieldTooltipField => 'field';

  @override
  String get coreCatchFieldLabelCancel => 'Cancel';

  @override
  String get coreCatchFieldLabelDone => 'Done';

  @override
  String get coreCatchFieldLabelSaving => 'Saving…';

  @override
  String get coreCatchFieldTextOptionalSuffix => ' · Optional';

  @override
  String get coreCatchFieldSemanticSaving => 'Saving';

  @override
  String get coreCatchFieldSemanticSaved => 'Saved';

  @override
  String get coreCatchFormFieldLabelTextOptional => 'Optional';

  @override
  String coreCatchFormValidationRequired({required String field}) {
    return '$field is required';
  }

  @override
  String coreCatchFormValidationMinLength({
    required String field,
    required int minLength,
  }) {
    return '$field must be at least $minLength characters';
  }

  @override
  String coreCatchFormValidationMaxLength({
    required String field,
    required int maxLength,
  }) {
    return '$field must be $maxLength characters or fewer';
  }

  @override
  String coreCatchFormValidationPattern({required String field}) {
    return 'Enter a valid $field';
  }

  @override
  String get coreCatchFrameworkErrorViewTextSomethingWentWrong =>
      'Something went wrong';

  @override
  String get coreCatchFrameworkErrorViewTextDeveloperDetails =>
      'Developer details';

  @override
  String get coreCatchPersonRowTextTyping => 'Typing...';

  @override
  String get coreCatchPersonRowLabelUnreadChat => 'Unread chat';

  @override
  String get coreCatchPersonRowLabelNewMatch => 'New match';

  @override
  String get coreCatchShareCardFooterTextCatch => 'CATCH';

  @override
  String get coreCatchStartupLoadingScreenSemanticlabelCatch => 'Catch';

  @override
  String get coreOrderedPhotoPickerTextCover => 'COVER';

  @override
  String coreOrderedPhotoPickerActionManageAll({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Manage all $count photos',
      one: 'Manage 1 photo',
    );
    return '$_temp0';
  }

  @override
  String get coreOrderedPhotoPickerTitlePhotoManager => 'Photos';

  @override
  String coreOrderedPhotoPickerSubtitlePhotoCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count photos',
      one: '1 photo',
    );
    return '$_temp0';
  }

  @override
  String get coreOrderedPhotoPickerActionDone => 'Done';

  @override
  String get coreOrderedPhotoPickerBodyCoverPhoto =>
      'This is the first image guests see. Choose any gallery photo as the cover.';

  @override
  String get coreOrderedPhotoPickerTitleGallery => 'Gallery';

  @override
  String get coreOrderedPhotoPickerActionAddPhotos => 'Add photos';

  @override
  String get coreOrderedPhotoPickerActionPhotoOptions => 'Photo options';

  @override
  String get coreOrderedPhotoPickerActionSetAsCover => 'Set as cover';

  @override
  String get coreOrderedPhotoPickerActionMoveEarlier => 'Move earlier';

  @override
  String get coreOrderedPhotoPickerActionMoveLater => 'Move later';

  @override
  String get coreOrderedPhotoPickerActionRemove => 'Remove photo';

  @override
  String get coreOrderedPhotoPickerStatusUploading => 'Uploading…';

  @override
  String coreOrderedPhotoPickerStatusUploadingProgress({required int percent}) {
    return 'Uploading… $percent%';
  }

  @override
  String get coreOrderedPhotoPickerStatusQueued => 'Ready to upload';

  @override
  String get coreOrderedPhotoPickerStatusUploadFailed => 'Upload failed';

  @override
  String get coreOrderedPhotoPickerActionRetry => 'Retry';

  @override
  String get dashboardActivityScreenTitleActivity => 'Activity';

  @override
  String get dashboardDashboardScreenTooltipCalendar => 'Calendar';

  @override
  String get dashboardDashboardScreenTooltipNotifications => 'Notifications';

  @override
  String get dashboardActivitySectionTitleNoActivityYet => 'No activity yet';

  @override
  String get dashboardActivitySectionMessageSignInAndBook =>
      'Sign in and book an event to start seeing updates here.';

  @override
  String get dashboardActivitySectionTitleActivityUnavailable =>
      'Activity unavailable';

  @override
  String get dashboardActivitySectionMessageCouldNotLoadActivity =>
      'Could not load activity.';

  @override
  String get dashboardActivitySectionTitleNoNewActivity => 'No new activity';

  @override
  String get dashboardActivitySectionMessageNewCatchesBookingsAnd =>
      'New catches, bookings, and event reminders will collect here.';

  @override
  String get dashboardClubPostsHomeSectionTitleClubUpdates =>
      'Organizer updates';

  @override
  String get dashboardClubPostsHomeSectionTextLinkedEvent => 'Linked event';

  @override
  String get dashboardEmptyHeroCardTextWelcomeToCatch => 'WELCOME TO CATCH';

  @override
  String get dashboardEmptyHeroCardTextNoEventsBooked => '● NO EVENTS BOOKED';

  @override
  String get dashboardEmptyHeroCardTextYourCatchesUnlockAfter =>
      'Your catches unlock\nafter your first event.';

  @override
  String get dashboardEmptyHeroCardTextTheDatingAppWhere =>
      'The dating app where you\'ve already met. No cold swiping — just people you actually crossed paths with.';

  @override
  String get dashboardEmptyHeroCardLabelFindAnEventNear =>
      'Find an event near me';

  @override
  String get dashboardEventFocusRailTextEventFocus => 'Event Focus';

  @override
  String get eventSuccessEventSuccessCompanionScreenTitleEventCompanion =>
      'Event companion';

  @override
  String get eventSuccessEventSuccessFeatureBlocksTitlePostEventHostReport =>
      'Post-event host report';

  @override
  String
  get eventSuccessEventSuccessFeatureBlocksSubtitleAConcreteReportSurface =>
      'A concrete report surface that turns event outcomes into the next change the host should make.';

  @override
  String get eventSuccessEventSuccessFeatureBlocksLabelCheckIn16e104 =>
      'Check-in';

  @override
  String get eventSuccessEventSuccessFeatureBlocksLabelIntroCoverage =>
      'Intro coverage';

  @override
  String get eventSuccessEventSuccessFeatureBlocksLabelCaughtSomeone =>
      'Caught someone';

  @override
  String get eventSuccessEventSuccessFeatureBlocksLabelHostHelp => 'Host help';

  @override
  String get eventSuccessEventSuccessFeatureBlocksLabelChatStart =>
      'Chat start';

  @override
  String get eventSuccessEventSuccessFeatureBlocksTextWorkingWell =>
      'Working well';

  @override
  String get eventSuccessEventSuccessFeatureBlocksTextImproveNextTime =>
      'Improve next time';

  @override
  String get eventSuccessEventSuccessQuestionnaireConfigEditorTextQuestionSet =>
      'Question set';

  @override
  String get eventSuccessEventSuccessQuestionnaireConfigEditorLabelCustom =>
      'Custom';

  @override
  String
  get eventSuccessEventSuccessQuestionnaireConfigEditorTitleCustomQuestionSetName =>
      'Custom question set name';

  @override
  String
  get eventSuccessEventSuccessQuestionnaireConfigEditorLabelAddQuestion =>
      'Add question';

  @override
  String get eventSuccessEventSuccessQuestionnaireConfigEditorLabelReset =>
      'Reset';

  @override
  String
  get eventSuccessEventSuccessQuestionnaireConfigEditorMessageRemoveQuestion =>
      'Remove question';

  @override
  String get eventSuccessEventSuccessSetupBodyTitleYourGoalForTheEvent =>
      'Your goal for the event';

  @override
  String get eventSuccessEventSuccessSetupBodyTitleMessageToAttendees =>
      'Message to attendees';

  @override
  String get eventSuccessEventSuccessSetupBodyTitleConversationCheckDefaults =>
      'Conversation check defaults';

  @override
  String get eventSuccessEventSuccessSetupBodyLabelAskEveryoneToChoose =>
      'Ask everyone to choose';

  @override
  String
  get eventSuccessEventSuccessSetupBodyTextAssignedPeopleAppearFirstButNobodyIsSelected =>
      'Assigned people appear first as suggestions, but nobody is selected.';

  @override
  String get eventSuccessEventSuccessSetupBodyLabelPreselectAssignedPeople =>
      'Preselect assigned people';

  @override
  String
  get eventSuccessEventSuccessSetupBodyTextAssignedPeopleStartSelectedAndCanBeRemoved =>
      'Assigned people start selected; attendees can remove anyone before saving.';

  @override
  String
  get eventSuccessEventSuccessSetupBodyPlaceholderSomethingAttendeesSeeBeforeTheEventKicksOff =>
      'Something attendees see before the event kicks off.';

  @override
  String get eventSuccessEventSuccessSetupBodyTitleBeforeTheEvent =>
      'Before the event';

  @override
  String get eventSuccessEventSuccessSetupBodyTitleWhenPeopleArrive =>
      'When people arrive';

  @override
  String get eventSuccessEventSuccessSetupBodyTitleDuringTheEvent =>
      'During the event';

  @override
  String get eventSuccessEventSuccessSetupBodyTitleAfterTheEvent =>
      'After the event';

  @override
  String get eventSuccessEventSuccessSetupBodyLabelSwitchPartnersEvery =>
      'Switch partners every';

  @override
  String get eventSuccessEventSuccessSetupBodyLabelReset => 'Reset';

  @override
  String get eventSuccessEventSuccessSetupBodyTitleFormat => 'Format';

  @override
  String get eventSuccessEventSuccessSetupBodyLabelCustomizeTools =>
      'Customize';

  @override
  String get eventSuccessEventSuccessSetupBodyLabelDoneCustomizing => 'Done';

  @override
  String get eventSuccessEventSuccessSetupBodyTextMatchClueQuestions =>
      'Match clue questions';

  @override
  String get eventSuccessEventSuccessSetupBodyLabelRevealCountdown =>
      'Reveal countdown';

  @override
  String get eventSuccessEventSuccessSetupBodyTitleHowTheRoomIsGrouped =>
      'How the room is grouped';

  @override
  String get eventSuccessEventSuccessSetupBodyLabelOff => 'Off';

  @override
  String get eventSuccessEventSuccessSetupBodyLabelCluesOnly => 'Clues only';

  @override
  String get eventSuccessEventSuccessSetupBodyLabelCluesSoftPairing =>
      'Clues + soft pairing';

  @override
  String get eventSuccessEventSuccessSetupBodyTextOptionalPromptsAreOff =>
      'Optional prompts are off.';

  @override
  String get eventSuccessEventSuccessSetupBodyTextAnswersCreateRevealClues =>
      'Answers create reveal clues.';

  @override
  String
  get eventSuccessEventSuccessSetupBodyTextAnswersCreateCluesAndSoftlyGuidePairings =>
      'Answers create clues and softly guide pairings.';

  @override
  String get eventSuccessEventSuccessStructureConfigEditorTextGroupPeopleInto =>
      'Group people into';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorDetailSetTheNumberYourselfOrLetCatchWorkItOutFromAttendance =>
      'Set the number yourself, or let Catch work it out from attendance.';

  @override
  String get eventSuccessEventSuccessStructureConfigEditorLabelAuto => 'Auto';

  @override
  String get eventSuccessEventSuccessStructureConfigEditorLabelFixed => 'Fixed';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorTextOneSharedGroupFor =>
      'One shared group for the full event.';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorTextCatchUsesThisWhenItBuildsTheGroups =>
      'Catch uses this when it builds the groups.';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorTitleSpreadPeopleOutBy =>
      'Spread people out by';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorTitleKeepSimilarPeopleTogetherBy =>
      'Keep similar people together by';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorTextMeetingTheSamePersonAgain =>
      'Meeting the same person again';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorLabelMaxTimesTheSamePairMeets =>
      'Max times the same pair meets';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorDetailOnlyUsedWhenThereAreMoreRoundsThanPeopleToMeet =>
      'Only used when there are more rounds than people to meet.';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorSemanticDecreasePeoplePerUnit =>
      'Decrease people per unit';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorSemanticIncreasePeoplePerUnit =>
      'Increase people per unit';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorSemanticDecreaseUnitCount =>
      'Decrease unit count';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorSemanticIncreaseUnitCount =>
      'Increase unit count';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorSemanticDecreaseMeetingsPerPair =>
      'Decrease meetings per pair';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorSemanticIncreaseMeetingsPerPair =>
      'Increase meetings per pair';

  @override
  String
  get eventSuccessEventSuccessStructureConfigEditorTextStructureIsLockedOnce =>
      'Structure is locked once attendance or waitlist activity exists.';

  @override
  String get eventsCalendarScreenLabelCalendarDateHeaderDrag =>
      'Calendar date header. Drag up to collapse the month.';

  @override
  String get eventsCalendarScreenLabelCalendarDateHeaderDrag0f5be6 =>
      'Calendar date header. Drag down to expand the month.';

  @override
  String get eventsCalendarScreenLabelToday => 'Today';

  @override
  String get eventsCalendarScreenLabelPlanned => 'Planned';

  @override
  String get eventsCalendarScreenLabelDistance => 'Distance';

  @override
  String get eventsCalendarScreenLabelNext => 'Next';

  @override
  String get eventsEventDetailScreenBodyEventid => 'eventId';

  @override
  String get eventsEventDetailScreenBodyClubid => 'clubId';

  @override
  String get eventsEventLocationMapBodyScreenLabelGetDirections =>
      'Get directions';

  @override
  String get eventsEventLocationMapDirectionsOpenFailed =>
      'Could not open directions. Please try again.';

  @override
  String get eventsEventMapScreenTitleNoMappedEventsYet =>
      'No mapped events yet';

  @override
  String get eventsEventMapScreenMessageJoinClubsBookEvents =>
      'Follow organizers, book events, or save future events to see starting points here.';

  @override
  String get eventsLocationPickerScreenTitleSearchForAMeeting =>
      'Search for a meeting point';

  @override
  String get eventsLocationPickerScreenPlaceholderSearchForAMeeting =>
      'Search for a meeting point';

  @override
  String get eventsLocationPickerScreenTitlePinnedLocation => 'Pinned location';

  @override
  String get eventsLocationPickerScreenTitleNoLocationSelected =>
      'No location selected';

  @override
  String get eventsLocationPickerScreenSubtitleConfirmThisMapPin =>
      'Confirm this map pin or tap elsewhere to adjust.';

  @override
  String get eventsLocationPickerScreenSubtitleConfirmThisPlaceOr =>
      'Confirm this place or tap elsewhere to adjust.';

  @override
  String get eventsLocationPickerScreenSubtitleSearchForAPlace =>
      'Search for a place or tap the map to set the meeting point.';

  @override
  String get eventsLocationPickerScreenLabelConfirmLocation =>
      'Confirm location';

  @override
  String get eventsSavedEventsScreenTitleNoSavedEventsYet =>
      'No saved events yet';

  @override
  String get eventsSavedEventsScreenMessageSaveEventsYouWant =>
      'Save events you want to revisit before booking.';

  @override
  String get eventsEventDetailBodyTitleBringSomeoneIntoThe =>
      'Bring someone into the room';

  @override
  String get eventsEventDetailBodyBodyYourSpotIsBooked =>
      'Your spot is booked. Invite a friend who would make this event better.';

  @override
  String get eventsEventDetailBodyActionlabelInviteAFriend => 'Invite a friend';

  @override
  String get eventsEventDetailBodyTitleEventCompanion => 'Event companion';

  @override
  String get eventsEventDetailBodyBodyCheckInSeeYour =>
      'Check in, see your social prompt, and handle private follow-up after the event.';

  @override
  String get eventsEventDetailBodyActionlabelOpenCompanion => 'Open companion';

  @override
  String get eventsEventDetailBodyLabelSignInToBook =>
      'Sign in to book this event';

  @override
  String get eventsEventDetailBodyTitleHostedBy => 'Hosted by';

  @override
  String get eventsEventDetailBodyTooltipMessageHost => 'Message host';

  @override
  String get eventsEventDetailCtaLabelYouReIn => 'You\'re in!';

  @override
  String get eventsEventDetailCtaLabelCompleted => 'Completed';

  @override
  String get eventsEventDetailCtaTextPerPerson => 'per person';

  @override
  String get eventsEventDetailCtaLabelDeclining => 'Declining';

  @override
  String get eventsEventDetailCtaLabelDecline => 'Decline';

  @override
  String get eventsEventDetailDesignPrimitivesTextEventPhotos => 'EVENT PHOTOS';

  @override
  String get eventsEventDetailHeroAppBarTooltipBack => 'Back';

  @override
  String get eventsEventDetailHeroAppBarTooltipShareEvent => 'Share event';

  @override
  String get eventsEventDetailHeroAppBarTooltipAddToCalendar =>
      'Add to calendar';

  @override
  String get eventsEventDetailHeroAppBarTooltipUnsaveEvent => 'Unsave event';

  @override
  String get eventsEventDetailHeroAppBarTooltipSaveEvent => 'Save event';

  @override
  String get eventsEventDetailLoadingSkeletonTitleThePlan => 'The plan';

  @override
  String get eventsEventDetailLoadingSkeletonTitleWhyYouMightClick =>
      'Why you might click';

  @override
  String get eventsEventDetailLoadingSkeletonTitleItinerary => 'Itinerary';

  @override
  String get eventsEventDetailLoadingSkeletonTitleWhere => 'Where';

  @override
  String get eventsEventDetailLoadingSkeletonTitleHowSignUpsWork =>
      'How sign-ups work';

  @override
  String get eventsEventDetailLoadingSkeletonTitleWhoSGoing => 'Who\'s going';

  @override
  String get eventsEventDetailOverviewSectionTitleThePlan => 'The plan';

  @override
  String get eventsEventDetailOverviewSectionTitleWhyYouMightClick =>
      'Why you might click';

  @override
  String get eventsEventDetailOverviewSectionTextBasedOnEventFormat =>
      'Based on event format, capacity and booking rules — never shown to the group.';

  @override
  String get eventsEventDetailOverviewSectionTitleItinerary => 'Itinerary';

  @override
  String get eventsEventDetailOverviewSectionTitlePhotos => 'Photos';

  @override
  String get eventsEventDetailOverviewSectionTitleWhere => 'Where';

  @override
  String get eventsEventDetailOverviewSectionTitleHowSignUpsWork =>
      'How sign-ups work';

  @override
  String get eventsEventDetailOverviewSectionTitleGoodToKnow => 'Good to know';

  @override
  String get eventsEventDetailOverviewSectionTextAboutThisEvent =>
      'About this event';

  @override
  String get eventsEventDetailOverviewSectionTitleDemandPricing =>
      'Demand pricing';

  @override
  String get eventsEventDetailSocialSectionTitleWhoSGoing => 'Who\'s going';

  @override
  String get eventsEventDetailSocialSectionTitleReviews => 'Reviews';

  @override
  String get eventsEventDetailSocialSectionTextWhoSGoing => 'Who\'s going';

  @override
  String get eventsEventDetailSocialSectionTextSignInToSee =>
      'Sign in to see who has booked this event.';

  @override
  String get eventsEventPinsMapLabelEventMapPreview => 'Event map preview';

  @override
  String get eventsRequirementsRowTextRequirements => 'Requirements';

  @override
  String get eventsWhoIsGoingTextWhoSGoing => 'Who\'s going';

  @override
  String get eventsWhoIsGoingTitleNoAttendeesYet => 'No attendees yet';

  @override
  String get eventsWhoIsGoingTitleNoAttendeesBooked => 'No attendees booked';

  @override
  String get eventsWhoIsGoingMessageBeTheFirstTo =>
      'Be the first to book this event.';

  @override
  String get eventsWhoIsGoingMessageThisEventDidNot =>
      'This event did not have any booked attendees.';

  @override
  String get eventsWhoIsGoingMessageCatchesUnlockFor24 =>
      'Catches unlock for 24 hours after the event finishes.';

  @override
  String get eventsWhoIsGoingMessageTheCatchWindowIs =>
      'The catch window is open for 24 hours after the event finishes.';

  @override
  String get eventsWhoIsGoingMessageTheCatchWindowFor =>
      'The catch window for this event has closed.';

  @override
  String get eventsEventCheckInCelebrationScreenEyebrowCheckedIn =>
      'Checked in';

  @override
  String get eventsEventCheckInCelebrationScreenTitleCheckedIn => 'Checked in.';

  @override
  String get eventsEventCheckInCelebrationScreenMessageYouReOnThe =>
      'You\'re on the roster. Have a great event.';

  @override
  String get eventsEventCheckInCelebrationScreenLabelEvent => 'Event';

  @override
  String get eventsEventCheckInCelebrationScreenLabelStarts => 'Starts';

  @override
  String get eventsEventCheckInCelebrationScreenLabelMeetPoint => 'Meet point';

  @override
  String get eventsEventCheckInCelebrationScreenLabelViewEvent => 'View event';

  @override
  String get eventsEventCheckInCelebrationScreenLabelBackToHome =>
      'Back to home';

  @override
  String get eventsEventJoinedCelebrationScreenEyebrowBookingConfirmed =>
      'Booking confirmed';

  @override
  String get eventsEventJoinedCelebrationScreenTitleYouReIn => 'You\'re in.';

  @override
  String get eventsEventJoinedCelebrationScreenLabelWhen => 'When';

  @override
  String get eventsEventJoinedCelebrationScreenLabelWhere => 'Where';

  @override
  String get eventsEventJoinedCelebrationScreenLabelEvent => 'Event';

  @override
  String get eventsEventJoinedCelebrationScreenLabelPaid => 'Paid';

  @override
  String get eventsEventJoinedCelebrationScreenLabelPaymentId => 'Payment ID';

  @override
  String get eventsEventJoinedCelebrationScreenNoteArriveByTheMeeting =>
      'Arrive by the meeting time. Catches unlock automatically when the event finishes.';

  @override
  String get eventsEventJoinedCelebrationScreenLabelViewEvent => 'View event';

  @override
  String get eventsEventJoinedCelebrationScreenLabelBackToHome =>
      'Back to home';

  @override
  String get eventsEventShareCardTextCatchInvite => 'CATCH INVITE';

  @override
  String get eventsMapPinTileTitlePinnedLocation => 'Pinned location';

  @override
  String get eventsMapPinTileTitleChooseOnMap => 'Choose on map';

  @override
  String get exploreExploreMapScreenTooltipBackToExplore => 'Back to Explore';

  @override
  String get exploreExploreScreenTooltipSavedEvents => 'Saved events';

  @override
  String get exploreExploreScreenActionLoadMorePlans => 'Load more plans';

  @override
  String get exploreExploreScreenTitleNoClubsMatchThis =>
      'No organizers match this search';

  @override
  String get exploreExploreScreenMessageClearTheSearchOr =>
      'Clear the search or filters to bring nearby organizers back into view.';

  @override
  String get exploreExploreScreenMessageTryAnotherClubNeighborhood =>
      'Try another organizer, neighborhood, host, or tag.';

  @override
  String get exploreExploreScreenTitleNoClubsMatchThese =>
      'No organizers match these filters';

  @override
  String get exploreExploreScreenMessageClearOneOrMore =>
      'Clear one or more filters to bring nearby organizers back into view.';

  @override
  String get exploreExploreScreenLabelClearSearchAndFilters =>
      'Clear search and filters';

  @override
  String get exploreExploreScreenLabelClearSearch => 'Clear search';

  @override
  String get exploreExploreScreenLabelClearFilters => 'Clear filters';

  @override
  String get exploreExploreScreenLabelClear => 'Clear';

  @override
  String get exploreExploreScreenLabelChangeCity => 'Change city';

  @override
  String get exploreCatchCoverStoryMessageChangeLocation => 'Change location';

  @override
  String get exploreCatchCoverStoryTooltipSearch => 'Search';

  @override
  String get exploreExploreCityPickerTextCity => 'City';

  @override
  String get exploreExploreEventRowsTitleThisWeek => 'This week';

  @override
  String get exploreExploreEventTypeBrowseGridTextByActivity => 'BY ACTIVITY';

  @override
  String get exploreExploreFilterRailTitleExploreFilters => 'Explore filters';

  @override
  String get exploreExploreFilterRailSubtitleNarrowTheMapAnd =>
      'Narrow the map and feed without changing your time scope.';

  @override
  String get exploreExploreFilterRailLabelClear => 'Clear';

  @override
  String get exploreExploreFilterRailLabelUpdatingPlans => 'Updating plans';

  @override
  String exploreExploreFilterRailLabelShowPlans({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Show $count plans',
      one: 'Show 1 plan',
    );
    return '$_temp0';
  }

  @override
  String exploreExploreFilterRailLabelShowPlansPlus({required int count}) {
    return 'Show $count+ plans';
  }

  @override
  String get exploreExploreFilterRailTextDistanceEventsOnly =>
      'DISTANCE · EVENTS ONLY';

  @override
  String exploreExploreFilterRailAppliedDistance({required Object distance}) {
    return '$distance · events only';
  }

  @override
  String get exploreExploreFilterRailTextClubs => 'ORGANIZERS';

  @override
  String get exploreExploreFilterRailLabelJoinedClubs => 'Followed organizers';

  @override
  String get exploreExploreFilterRailLabelRated45 => 'Rated 4.5+';

  @override
  String get exploreExploreFilterRailTextActivity => 'ACTIVITY';

  @override
  String get exploreExploreFilterRailTextArea => 'AREA';

  @override
  String get forceUpdateUpdateRequiredScreenTextUpdateRequired =>
      'Update required';

  @override
  String get forceUpdateUpdateRequiredScreenLabelUpdateNow => 'Update now';

  @override
  String get hostsCreateClubScreenTitleClubBasics => 'Organizer basics';

  @override
  String get hostsCreateClubScreenTitleClubDetails => 'Organizer details';

  @override
  String get hostsCreateClubScreenTitleHostDefaults => 'Host defaults';

  @override
  String get hostsCreateClubScreenTitleEventSuccessDefaults =>
      'Event success defaults';

  @override
  String get hostsClubBasicsStepTitleClubName => 'Organizer name';

  @override
  String get hostsOrganizerTypeLabel => 'Organizer type';

  @override
  String get hostsOrganizerTypeClub => 'Club';

  @override
  String get hostsOrganizerTypeCommunity => 'Community';

  @override
  String get hostsOrganizerTypeIndividual => 'Individual organizer';

  @override
  String get hostsOrganizerTypeEventProducer => 'Event producer';

  @override
  String get hostsOrganizerTypeVenue => 'Venue';

  @override
  String get hostsOrganizerTypeBrand => 'Brand';

  @override
  String get hostsClubBasicsStepTitleCity => 'City';

  @override
  String get hostsClubBasicsStepTitleAreaNeighbourhood =>
      'Area / neighbourhood';

  @override
  String get hostsClubBasicsStepPlaceholderEGBandraKoramangala =>
      'e.g. Bandra, Koramangala';

  @override
  String get hostsClubDetailsStepTitleDescription => 'Description';

  @override
  String get hostsClubEventSuccessDefaultsStepTitleLiveEventGuide =>
      'Live event guide';

  @override
  String
  get hostsClubEventSuccessDefaultsStepSubtitleNewEventsStartWithAReadyToRunPlanForThisActivity =>
      'New events start with a ready-to-run plan for this activity. You can adjust any event\'s plan later.';

  @override
  String get hostsClubHostDefaultsStepTextDefaultActivity => 'Default activity';

  @override
  String get hostsClubHostDefaultsStepTextNewEventsStartFrom =>
      'New events start from this activity. Hosts can still change the activity and override the event-specific setup.';

  @override
  String get hostsClubHostDefaultsStepTextDefaultEventPolicy =>
      'Default event policy';

  @override
  String get hostsClubHostDefaultsStepTextTheseDefaultsPrefillNew =>
      'These defaults prefill new events. Hosts can override them per event before anyone books or joins the waitlist.';

  @override
  String get hostsClubHostDefaultsStepTitleCohortCaps => 'Cohort caps';

  @override
  String get hostsClubHostDefaultsStepBodyOptionallyPrefillStraightMen =>
      'Optionally prefill straight men and straight women caps for open events.';

  @override
  String get hostsClubHostDefaultsStepTitleMaxStraightMen => 'Max straight men';

  @override
  String get hostsClubHostDefaultsStepTitleMaxStraightWomen =>
      'Max straight women';

  @override
  String get hostsClubHostDefaultsStepTitleDemandPricing => 'Demand pricing';

  @override
  String get hostsClubHostDefaultsStepBodyPrefillDynamicPricingControls =>
      'Prefill dynamic pricing controls for balanced singles events.';

  @override
  String get hostsClubHostDefaultsStepTitleStep => 'Step';

  @override
  String get hostsClubHostDefaultsStepTitleMax => 'Max';

  @override
  String get hostsCreateClubContactFieldsTitleInstagramHandle =>
      'Instagram handle';

  @override
  String get hostsCreateClubContactFieldsPlaceholderYourclub => '@yourclub';

  @override
  String get hostsCreateClubContactFieldsTitlePhoneNumber => 'Phone number';

  @override
  String get hostsCreateClubContactFieldsTitleEmail => 'Email';

  @override
  String get hostsCreateClubContactFieldsPlaceholderHelloYourclubCom =>
      'hello@yourclub.com';

  @override
  String get hostsCreateClubPhotosPickerTextDragToReorderThe =>
      'Add as many as you need. The first photo is the cover.';

  @override
  String get hostsCreateClubPhotosPickerTextASquareLogoShown =>
      'A square logo shown on your organizer profile and events. It stays separate from your gallery.';

  @override
  String get hostsCreateClubPhotosPickerLabelChangeClubProfileImage =>
      'Change organizer logo';

  @override
  String get hostsCreateClubPhotosPickerLabelAddClubProfileImage =>
      'Add organizer logo';

  @override
  String get hostsCreateClubPhotosPickerTextAddImage => 'Add image';

  @override
  String get hostsCreateClubPhotosPickerActionAddLogo => 'Add logo';

  @override
  String get hostsCreateClubPhotosPickerActionReplaceLogo => 'Replace';

  @override
  String get hostsCreateClubPhotosPickerActionRemoveLogo => 'Remove';

  @override
  String get hostsEditHostedEventScreenBodyDecreaseDuration =>
      'Decrease duration';

  @override
  String get hostsEditHostedEventScreenBodyIncreaseDuration =>
      'Increase duration';

  @override
  String get hostsEditHostedEventScreenTitleLocationName => 'Location name';

  @override
  String get hostsEditHostedEventScreenPlaceholderEGBandstandPromenade =>
      'e.g. Bandstand Promenade, Bandra';

  @override
  String get hostsEditHostedEventScreenHelpertextThisIsWhatAttendees =>
      'This is what attendees see in event cards and details.';

  @override
  String get hostsEditHostedEventScreenBodyRequired => 'Required';

  @override
  String get hostsEditHostedEventScreenTitleExtraDirections =>
      'Extra directions';

  @override
  String get hostsEditHostedEventScreenPlaceholderEGMeetOutside =>
      'e.g. Meet outside the blue gate, third entrance';

  @override
  String get hostsEditHostedEventScreenTitleDistanceKm => 'Distance (km)';

  @override
  String get hostsEditHostedEventScreenBodyDD => '^\\d*\\.?\\d*';

  @override
  String get hostsEditHostedEventScreenBodyInvalid => 'Invalid';

  @override
  String get hostsEditHostedEventScreenBodyMustBe0 => 'Must be > 0';

  @override
  String get hostsEditHostedEventScreenTitleDescription => 'Description';

  @override
  String get hostsEditHostedEventScreenPlaceholderWhatShouldAttendeesExpect =>
      'What should attendees expect? Any tips for the route or venue?';

  @override
  String get hostsEditHostedEventScreenTitleEventDate => 'Event date';

  @override
  String get hostsEditHostedEventScreenTitleStartTime => 'Start time';

  @override
  String get hostsEditHostedEventScreenTitleCancelledEvent => 'Cancelled event';

  @override
  String get hostsEditHostedEventScreenTitleScheduleLocked => 'Schedule locked';

  @override
  String get hostsEditHostedEventScreenTitlePublishedEvent => 'Published event';

  @override
  String get hostsEditHostedEventScreenMessageCancelledEventsCannotBe =>
      'Cancelled events cannot be edited. Create a new event if you need to host this again.';

  @override
  String get hostsEditHostedEventScreenMessageYouCanStillUpdate =>
      'You can still update location and descriptive details. Date, time, and duration stay locked after the event starts or once people have joined.';

  @override
  String get hostsEditHostedEventScreenMessageYouCanEditThe =>
      'You can edit the schedule, location, distance, and description. Capacity, pricing, admission policy, and invite setup are locked by existing event activity.';

  @override
  String get hostsEditHostedEventScreenMessageYouCanEditSchedule =>
      'You can edit schedule, location, event details, capacity, pricing, admission policy, and invite setup until the first booking or waitlist join.';

  @override
  String get hostsEditHostedEventScreenTextEditableUntilTheFirst =>
      'Editable until the first booking or waitlist join.';

  @override
  String get hostsEditHostedEventScreenTitleMaxAttendees => 'Max attendees';

  @override
  String get hostsEditHostedEventScreenTextLoadingCurrentInviteCode =>
      'Loading current invite code...';

  @override
  String get hostsEditHostedEventScreenTitleInviteCode => 'Invite code';

  @override
  String get hostsEditHostedEventScreenPlaceholderCatchDelhi => 'CATCH-DELHI';

  @override
  String get hostsEditHostedEventScreenTitleCohortCaps => 'Cohort caps';

  @override
  String get hostsEditHostedEventScreenBodyOptionallyCapStraightMen =>
      'Optionally cap straight men and straight women without making this a separate admission format.';

  @override
  String get hostsEditHostedEventScreenTitleMaxStraightMen =>
      'Max straight men';

  @override
  String get hostsEditHostedEventScreenTitleMaxStraightWomen =>
      'Max straight women';

  @override
  String get hostsEditHostedEventScreenTextRequestsAppearInHost =>
      'Requests appear in host manage with each person\'s public profile so the host can review fit before confirming spots.';

  @override
  String get hostsEditHostedEventScreenTitleDemandPricing => 'Demand pricing';

  @override
  String get hostsEditHostedEventScreenBodyIncreasePriceForThe =>
      'Increase price for the over-demand cohort while preserving the event balance.';

  @override
  String get hostsEditHostedEventScreenTextPolicyLocked => 'Policy locked';

  @override
  String get hostsEditHostedEventScreenTextCapacityPricingAdmissionAnd =>
      'Capacity, pricing, admission, and cancellation policy lock once the event starts or someone books or joins the waitlist.';

  @override
  String get hostsEditHostedEventScreenLabelCapacity => 'Capacity';

  @override
  String get hostsEditHostedEventScreenLabelPrice => 'Price';

  @override
  String get hostsEditHostedEventScreenLabelAdmission => 'Admission';

  @override
  String get hostsEditHostedEventScreenLabelCancellation => 'Cancellation';

  @override
  String get hostsEditHostedEventScreenTextScheduleChangesAreBlocked =>
      'Schedule changes are blocked here to avoid changing attendee commitments.';

  @override
  String get hostsCreateEventScreenTitleEventDate => 'Event date';

  @override
  String get hostsCreateEventScreenTitleStartTime => 'Start time';

  @override
  String get hostsCreateEventSuccessScreenEyebrowEventCreated =>
      'Event created';

  @override
  String get hostsCreateEventSuccessScreenTitleYourEventIsLive =>
      'Your event is live.';

  @override
  String get hostsCreateEventSuccessScreenLabelWhen => 'When';

  @override
  String get hostsCreateEventSuccessScreenLabelWhere => 'Where';

  @override
  String get hostsCreateEventSuccessScreenLabelEvent => 'Event';

  @override
  String get hostsCreateEventSuccessScreenLabelCapacity => 'Capacity';

  @override
  String get hostsCreateEventSuccessScreenLabelInviteCode => 'Invite code';

  @override
  String get hostsCreateEventSuccessScreenLabelPrivateLink => 'Private link';

  @override
  String get hostsCreateEventSuccessScreenNoteBookingsWaitlistAndAttendance =>
      'Bookings, waitlist, and attendance are tracked from Manage event.';

  @override
  String get hostsCreateEventSuccessScreenLabelManageEvent => 'Manage event';

  @override
  String get hostsCreateEventSuccessScreenLabelBackToClub =>
      'Back to organizer';

  @override
  String get hostsHostCreateEventRouteLoadingScreenTitleEventBasics =>
      'Event basics';

  @override
  String get hostsHostCreateEventRouteLoadingScreenBodyLoadingClub =>
      'Loading organizer';

  @override
  String get hostsDraftPickerSheetMessageDeleteDraft => 'Delete draft';

  @override
  String get hostsEventDetailsStepTitleEventName => 'Event name';

  @override
  String get hostsEventDetailsStepPlaceholderEventName => 'Friday night social';

  @override
  String get hostsEventDetailsStepTitleFormatName => 'Format name';

  @override
  String get hostsEventDetailsStepPlaceholderSalsaNight => 'Salsa night';

  @override
  String get hostsEventDetailsStepTitleDistanceKm => 'Distance (km)';

  @override
  String get hostsEventDetailsStepTitleDescription => 'Description';

  @override
  String get hostsEventDetailsStepPlaceholderWhatShouldAttendeesExpect =>
      'What should attendees expect? Any tips for the route or venue?';

  @override
  String get hostsEventDetailsStepExternalProviderTitle => 'Booking platform';

  @override
  String get hostsEventDetailsStepExternalProviderCatch => 'Catch';

  @override
  String get hostsEventDetailsStepExternalProviderOther =>
      'Another booking platform';

  @override
  String get hostsEventDetailsStepExternalProviderLuma => 'Luma';

  @override
  String get hostsEventDetailsStepExternalProviderEventbrite => 'Eventbrite';

  @override
  String get hostsEventDetailsStepExternalProviderPartiful => 'Partiful';

  @override
  String get hostsEventDetailsStepExternalProviderPosh => 'POSH';

  @override
  String get hostsEventDetailsStepExternalProviderBookMyShow => 'BookMyShow';

  @override
  String get hostsEventDetailsStepExternalProviderDistrict => 'District';

  @override
  String get hostsEventDetailsStepExternalProviderSortMyScene => 'SortMyScene';

  @override
  String get hostsEventDetailsStepExternalProviderAirbnbExperiences =>
      'Airbnb Experiences';

  @override
  String get hostsEventDetailsStepExternalEventUrlTitle => 'Booking page';

  @override
  String get hostsEventDetailsStepExternalEventUrlPlaceholder =>
      'https://your-booking-platform.com/event';

  @override
  String get hostsEventDetailsStepExternalEventUrlInvalid =>
      'Enter a secure https URL';

  @override
  String get hostsEventDetailsStepExternalEventIdTitle => 'Booking reference';

  @override
  String get hostsEventDetailsStepExternalEventIdPlaceholder =>
      'Event ID or internal reference';

  @override
  String get hostsEventDetailsStepExternalWalkInTitle => 'Unlisted guests';

  @override
  String get hostsEventDetailsStepExternalWalkInDeny => 'Roster only';

  @override
  String get hostsEventDetailsStepExternalWalkInApproval =>
      'Ask me to approve them';

  @override
  String get hostsEventDetailsStepExternalWalkInAutomatic =>
      'Allow them automatically';

  @override
  String get hostsEventPolicyStepTextConfigureWhoCanBook =>
      'Configure who can book, how waitlists open, what attendees pay, and what happens if plans change.';

  @override
  String get hostsEventPolicyStepExternalOperationsIntro =>
      'Set your capacity and guest access. Bookings stay with your provider.';

  @override
  String get hostsEventPolicyStepTitleMaxAttendees => 'Max attendees';

  @override
  String get hostsEventPolicyStepTextTheCodeIsStored =>
      'The code is stored in the host-only private access document. Public event listings only show that an invite is required.';

  @override
  String get hostsEventPolicyStepTitleInviteCode => 'Invite code';

  @override
  String get hostsEventPolicyStepPlaceholderCatchDelhi => 'CATCH-DELHI';

  @override
  String get hostsEventPolicyStepTitleCohortCaps => 'Cohort caps';

  @override
  String get hostsEventPolicyStepBodyOptionallyCapStraightMen =>
      'Optionally cap straight men and straight women without making this a separate admission format.';

  @override
  String get hostsEventPolicyStepTitleMaxStraightMen => 'Max straight men';

  @override
  String get hostsEventPolicyStepPlaceholderMaxMen => 'Max men';

  @override
  String get hostsEventPolicyStepTitleMaxStraightWomen => 'Max straight women';

  @override
  String get hostsEventPolicyStepPlaceholderMaxWomen => 'Max women';

  @override
  String get hostsEventPolicyStepTextRequestsAppearInHost =>
      'Requests appear in host manage with each person\'s public profile so the host can review fit before confirming spots.';

  @override
  String get hostsEventPolicyStepTitleDemandPricing => 'Demand pricing';

  @override
  String get hostsEventPolicyStepBodyIncreaseTheStraightMen =>
      'Increase the straight-men price when that cohort has more booked and waitlisted demand than the balancing cohort.';

  @override
  String get hostsEventPolicyStepTextHostPayoutIsReleased =>
      'Host payout is released after event completion. If the host cancels, attendees are made complete before any host payout.';

  @override
  String get hostsEventSuccessStepTitleLiveEventGuide => 'Live event guide';

  @override
  String get hostsEventSuccessStepSubtitleSaveASimplePlan =>
      'Save a simple plan with this event so Live mode is ready when it starts.';

  @override
  String get hostsWhenStepPlaceholderSelectADate => 'Select a date';

  @override
  String get hostsWhenStepPlaceholderSelectStartTime => 'Select start time';

  @override
  String get hostsWhereStepSavedPlacesTitle => 'Saved places';

  @override
  String get hostsWhereStepSavedPlacesSubtitle =>
      'Choose a team-saved place to fill the location, or save the current place for next time.';

  @override
  String get hostsWhereStepSavedPlaceSelected => 'Selected';

  @override
  String get hostsWhereStepSaveCurrentPlace => 'Save current place';

  @override
  String get hostsWhereStepUpdateSavedPlace => 'Update saved place';

  @override
  String get hostsWhereStepTitleLocationName => 'Location name';

  @override
  String get hostsWhereStepPlaceholderEGBandstandPromenade =>
      'e.g. Bandstand Promenade, Bandra';

  @override
  String get hostsWhereStepHelpertextPickAMapLocation =>
      'Pick a map location first. Google Places fills this when available.';

  @override
  String get hostsWhereStepHelpertextEditThisIfAttendees =>
      'Edit this if attendees need a clearer name.';

  @override
  String get hostsWhereStepTitleExtraDirections => 'Extra directions';

  @override
  String get hostsWhereStepPlaceholderEGMeetOutside =>
      'e.g. Meet outside the blue gate, third entrance';

  @override
  String get hostsWhereStepHelpertextGateEntranceFloorOr =>
      'Gate, entrance, floor, or landmark for the group.';

  @override
  String get hostsHostEventManageScreenTitleCancelThisEvent =>
      'Cancel this event?';

  @override
  String get hostsHostEventManageScreenMessageCancellingRemovesItFrom =>
      'Cancelling removes it from schedules but keeps attendee, payment, and history records. Attendees are notified and refunded per your cancellation policy.';

  @override
  String get hostsHostEventManageScreenTitleDeleteUnusedEvent =>
      'Delete unused event?';

  @override
  String get hostsHostEventManageScreenMessageOnlyEventsWithNo =>
      'Only events with no bookings, waitlist, attendance, payments, or reviews can be deleted. This permanently removes the event.';

  @override
  String get hostsHostEventManageScreenTitleDisableInviteLink =>
      'Disable invite link?';

  @override
  String get hostsHostEventManageScreenTextLoadingInviteAccess =>
      'Loading invite access...';

  @override
  String get hostsHostEventManageScreenTextPrivateAccess => 'Private access';

  @override
  String get hostsHostEventManageScreenLabelCode => 'Code';

  @override
  String get hostsHostEventManageScreenLabelLink => 'Link';

  @override
  String get hostsHostEventManageScreenLabelSharePrivateLink =>
      'Share private link';

  @override
  String get hostsHostEventManageScreenLabelNewLink => 'New link';

  @override
  String get hostsHostEventManageScreenTextNamedInviteLinks =>
      'Named invite links';

  @override
  String get hostsHostEventManageScreenTextTrackWhichChannelsCreate =>
      'Track which channels create demand, bookings, arrivals, catches, and chats.';

  @override
  String get hostsHostEventManageScreenTextLoadingInviteLinks =>
      'Loading invite links...';

  @override
  String get hostsHostEventManageScreenMessageCopyLink => 'Copy link';

  @override
  String get hostsHostEventManageScreenMessageDisableLink => 'Disable link';

  @override
  String get hostsHostEventManageScreenTitleNewInviteLink => 'New invite link';

  @override
  String get hostsHostEventManageScreenLabelCancel => 'Cancel';

  @override
  String get hostsHostEventManageScreenLabelCreate => 'Create';

  @override
  String get hostsHostEventManageScreenTitleLabel => 'Label';

  @override
  String get hostsHostEventManageScreenPlaceholderInstagramBio =>
      'Instagram bio';

  @override
  String get hostsHostEventManageScreenTitleSource => 'Source';

  @override
  String get hostsHostEventManageScreenPlaceholderInstagram => 'instagram';

  @override
  String get hostsHostEventManageScreenLabelBooked => 'Booked';

  @override
  String get hostsHostEventManageScreenLabelWaitlist => 'Waitlist';

  @override
  String get hostsHostEventManageScreenDetail1ToReview => '1 to review';

  @override
  String get hostsHostEventManageScreenLabelRevenueEst => 'Revenue est';

  @override
  String get hostsHostEventManageScreenLabelRefundPolicy => 'Refund policy';

  @override
  String get hostsHostEventManageScreenTextFullCapacityReached =>
      'FULL - CAPACITY REACHED';

  @override
  String get hostsHostEventManageScreenTextWaitlistOpen => 'WAITLIST OPEN';

  @override
  String get hostsHostEventManageScreenTextHostActions => 'HOST ACTIONS';

  @override
  String get hostsHostEventManageScreenLabelEditEventDetails =>
      'Edit event details';

  @override
  String get hostsHostEventManageScreenDetailScheduleLocation =>
      'Schedule · location';

  @override
  String get hostsHostEventManageScreenTextDangerZone => 'DANGER ZONE';

  @override
  String get hostsHostEventManageScreenLabelCancelEvent => 'Cancel event';

  @override
  String get hostsHostEventManageScreenLabelDeleteUnusedEvent =>
      'Delete unused event';

  @override
  String get hostsHostEventManageScreenLabelClub => 'Organizer';

  @override
  String get hostsHostEventManageScreenLabelMeet => 'Meet';

  @override
  String get hostsHostEventManageScreenLabelEvent => 'Event';

  @override
  String get hostsHostEventManageScreenLabelPrice => 'Price';

  @override
  String get hostsHostBroadcastComposerSheetTitleNewBroadcast =>
      'New broadcast';

  @override
  String get hostsHostBroadcastComposerSheetTextAudience => 'Audience';

  @override
  String get hostsHostBroadcastComposerSheetTextTemplate => 'Template';

  @override
  String get hostsHostBroadcastComposerSheetTitleMessage => 'Message';

  @override
  String get hostsHostBroadcastComposerSheetPlaceholderWriteAClearUpdate =>
      'Write a clear update for attendees';

  @override
  String get hostsHostBroadcastComposerSheetTextSendingStaysOffIn =>
      'Sending stays off in this build until the production callable passes the release preflight.';

  @override
  String get hostsHostBroadcastComposerSheetTextThisAudienceHasNo =>
      'This audience has no eligible recipients yet.';

  @override
  String get hostsHostBroadcastComposerSheetLabelSendTo1Person =>
      'Send to 1 person';

  @override
  String get hostsHostInboxScreenLabelInboxScope => 'Inbox scope';

  @override
  String get hostsHostInboxScreenTitleBookedAttendees => 'booked attendees';

  @override
  String get hostsHostInboxScreenTitleProspectiveAttendees =>
      'prospective attendees';

  @override
  String get hostsHostPaymentAccountCardTitleSetUpPayouts => 'Set up payouts';

  @override
  String get hostsHostPaymentAccountCardSubtitlePoweredByStripe =>
      'Powered by Stripe';

  @override
  String get hostsHostPaymentAccountCardLabelContinueToStripe =>
      'Continue to Stripe';

  @override
  String get hostsHostPaymentAccountCardTextCatchPaysHostsThrough =>
      'Catch pays hosts through Stripe. Finish a short verification on Stripe, then come back here before paid non-INR events can take checkout.';

  @override
  String get hostsHostPaymentAccountCardTitleCountry => 'Country';

  @override
  String get hostsHostPaymentAccountCardTitleDefaultCurrency =>
      'Default currency';

  @override
  String get hostsHostPaymentAccountCardTextWeWillRefreshYour =>
      'We will refresh your payout status when you return.';

  @override
  String get hostsHostPaymentAccountCardLabelRefresh => 'Refresh';

  @override
  String get hostsHostPaymentAccountCardSubtitlePoweredByRazorpay =>
      'Powered by Razorpay Route';

  @override
  String get hostsHostPaymentAccountCardLabelContinueToRazorpay =>
      'Set up Razorpay';

  @override
  String get hostsHostPaymentAccountCardTextCatchPaysIndiaHostsThrough =>
      'Catch uses Razorpay Route for INR payouts. Provide the legal, stakeholder, and bank details Razorpay needs to review your linked account.';

  @override
  String get hostsHostPaymentAccountCardLabelRecommended => 'Recommended';

  @override
  String get hostsHostPaymentAccountCardTitleRazorpay => 'Razorpay';

  @override
  String get hostsHostPaymentAccountCardTitleRazorpayPayoutAccountReady =>
      'Razorpay payout account is ready';

  @override
  String get hostsHostPaymentAccountCardTitleStripe => 'Stripe';

  @override
  String get hostsHostPaymentAccountCardBodyRazorpayInr =>
      'Razorpay Route account setup for INR payouts in India.';

  @override
  String get hostsHostPaymentAccountCardBodyStripeInternational =>
      'Non-INR checkout and international payouts.';

  @override
  String get hostsHostPaymentAccountCardTitleLegalBusinessName =>
      'Legal business name';

  @override
  String get hostsHostPaymentAccountCardTitleBusinessType => 'Business type';

  @override
  String get hostsHostPaymentAccountCardTitleContactName => 'Contact name';

  @override
  String get hostsHostPaymentAccountCardTitleEmail => 'Business email';

  @override
  String get hostsHostPaymentAccountCardTitlePhone => 'Business phone';

  @override
  String get hostsHostPaymentAccountCardTitleBusinessModel =>
      'Business description';

  @override
  String get hostsHostPaymentAccountCardTitleBusinessPan => 'Business PAN';

  @override
  String get hostsHostPaymentAccountCardTitleBankAccountNumber =>
      'Bank account number';

  @override
  String get hostsHostPaymentAccountCardTitleIfscCode => 'IFSC code';

  @override
  String get hostsHostPaymentAccountCardTitleBeneficiaryName =>
      'Beneficiary name';

  @override
  String get hostsHostPaymentAccountCardTitleStakeholderName =>
      'Stakeholder name';

  @override
  String get hostsHostPaymentAccountCardTitleStakeholderEmail =>
      'Stakeholder email';

  @override
  String get hostsHostPaymentAccountCardTitleStakeholderPhone =>
      'Stakeholder phone';

  @override
  String get hostsHostPaymentAccountCardTitleStakeholderPan =>
      'Stakeholder PAN';

  @override
  String get hostsHostPaymentAccountCardTitleOwnershipPercent =>
      'Ownership percentage';

  @override
  String get hostsHostPaymentAccountCardTitleStakeholderDirector =>
      'This stakeholder is a director';

  @override
  String get hostsHostPaymentAccountCardTitleStakeholderExecutive =>
      'This stakeholder is an executive';

  @override
  String get hostsHostPaymentAccountCardTitleAcceptRazorpayTerms =>
      'Accept Razorpay Route terms';

  @override
  String get hostsHostPaymentAccountCardBodyRazorpayTerms =>
      'You confirm these details are accurate and authorize Catch to submit them to Razorpay for linked-account review.';

  @override
  String get hostsHostPaymentAccountCardLabelSubmitRazorpay =>
      'Submit to Razorpay';

  @override
  String get hostsCatchRosterBoardLabelOpenProfile => 'Open profile';

  @override
  String get hostsCatchRosterBoardLabelApproveRequest => 'Approve request';

  @override
  String get hostsCatchRosterBoardLabelDeclineRequest => 'Decline request';

  @override
  String get hostsHostClubToolsLabelPostUpdate => 'Post update';

  @override
  String get hostsHostClubToolsTitlePostToFollowers => 'Post to followers';

  @override
  String get hostsHostClubToolsLabelPosting => 'Posting...';

  @override
  String get hostsHostClubToolsCatchbuttonPostedToFollowers =>
      'Posted to followers.';

  @override
  String get hostsHostClubToolsTitleUpdate => 'Update';

  @override
  String get hostsHostClubToolsPlaceholderShareARouteNote =>
      'Share a route note, meetup detail, or organizer update.';

  @override
  String get hostsHostClubToolsTextCouldNotPostThis =>
      'Could not post this update. Please try again.';

  @override
  String get hostsHostEventAttendancePanelTitleEventNotFound =>
      'Event not found';

  @override
  String get hostsHostEventAttendancePanelMessageThisEventIsNo =>
      'This event is no longer available.';

  @override
  String get hostsHostEventAttendancePanelTitleParticipation => 'Participation';

  @override
  String get hostsHostEventAttendancePanelSubtitleReviewProfilesAndApprove =>
      'Review profiles and approve requests before launch.';

  @override
  String get hostsHostEventAttendancePanelSubtitleReviewBookingStatusBefore =>
      'Review booking status before launch.';

  @override
  String get hostsHostEventAttendancePanelLabelSearchPeople => 'Search people';

  @override
  String get hostsHostEventAttendancePanelTitleCheckInBoard => 'Check-in board';

  @override
  String get hostsHostEventAttendancePanelSubtitleUseTheStatusTiles =>
      'Use the status tiles to focus the roster as people arrive.';

  @override
  String get hostsHostEventAttendancePanelTitleCheckInQr => 'Check-in QR';

  @override
  String get hostsHostEventAttendancePanelBodyCheckInQr =>
      'Keep this live code on screen as attendees arrive. It refreshes automatically and cannot be printed for later check-in.';

  @override
  String get hostsHostEventAttendancePanelRuntimeShareLabel =>
      'Share attendee link';

  @override
  String get hostsHostEventAttendancePanelRuntimeShareSubject =>
      'Your event companion link';

  @override
  String hostsHostEventAttendancePanelRuntimeShareText({
    required String runtimeUrl,
  }) {
    return 'Open this link to join the event companion. Scan the Host\'s live QR at the venue to check in: $runtimeUrl';
  }

  @override
  String get hostsHostEventAttendancePanelRuntimeShareReady =>
      'Attendee link ready to share';

  @override
  String get hostsHostEventAttendancePanelLabelSearchRoster => 'Search roster';

  @override
  String get hostsHostEventAttendancePanelTitleEventReport => 'Event report';

  @override
  String get hostsHostEventAttendancePanelSubtitleAttendancePayoutAndExport =>
      'Attendance, payout, and export-ready roster history.';

  @override
  String get hostsHostEventAttendancePanelLabelOpsCsv => 'Ops CSV';

  @override
  String get hostsHostEventAttendancePanelLabelRevenueCsv => 'Revenue CSV';

  @override
  String get hostsHostEventAttendancePanelLabelExport => 'Export report';

  @override
  String get hostsHostEventAttendancePanelTextWaitlistMovement =>
      'Waitlist movement';

  @override
  String get hostsHostEventToolsLabelHostEventToolsCarousel =>
      'Host event tools carousel';

  @override
  String get hostsHostTeamManagementSectionTitleHostTeam => 'Host team';

  @override
  String get hostsHostTeamManagementSectionTextNoHostTeamMembers =>
      'No host team members yet.';

  @override
  String get hostsHostTeamManagementSectionTooltipHostActions => 'Host actions';

  @override
  String get hostsHostTeamManagementSectionLabelTransferOwnership =>
      'Transfer ownership';

  @override
  String get hostsHostTeamManagementSectionLabelRemoveHost => 'Remove host';

  @override
  String get hostsHostTeamManagementSectionTitleAddHost => 'Add host';

  @override
  String get hostsHostTeamManagementSectionSubtitleEnterThePhoneNumber =>
      'Enter the phone number on their Catch profile.';

  @override
  String get hostsHostTeamManagementSectionLabelAddHost => 'Add host';

  @override
  String get hostsHostTeamManagementSectionTitlePhoneNumber => 'Phone number';

  @override
  String get hostsStepperFooterLabelNext => 'Next';

  @override
  String get imageUploadsProfilePhotoEditorScreenTitleDeletePhoto =>
      'Delete photo?';

  @override
  String get imageUploadsProfilePhotoEditorScreenMessageThisRemovesThePhoto =>
      'This removes the photo from your profile.';

  @override
  String get imageUploadsProfilePhotoEditorScreenTitleAddPhoto => 'Add photo';

  @override
  String get imageUploadsProfilePhotoEditorScreenTitleEditPhoto => 'Edit photo';

  @override
  String get imageUploadsProfilePhotoEditorScreenTitlePhotoPrompt =>
      'Photo prompt';

  @override
  String get imageUploadsProfilePhotoEditorScreenLabelSaving => 'Saving';

  @override
  String get imageUploadsProfilePhotoEditorScreenLabelSaveChanges =>
      'Save changes';

  @override
  String get imageUploadsProfilePhotoEditorScreenLabelChoosePhoto =>
      'Choose photo';

  @override
  String get imageUploadsProfilePhotoEditorScreenLabelChangePhoto =>
      'Change photo';

  @override
  String get imageUploadsProfilePhotoEditorScreenLabelDeleting => 'Deleting';

  @override
  String get imageUploadsProfilePhotoEditorScreenLabelDeletePhoto =>
      'Delete photo';

  @override
  String
  get imageUploadsProfilePhotoEditorScreenCatchbuttonDeletePhotoUnavailable =>
      'Delete photo unavailable';

  @override
  String get launchAccessLaunchAccessApplicationScreenTitleVerifyYourPhone =>
      'Verify your phone';

  @override
  String
  get launchAccessLaunchAccessApplicationScreenMessagePhoneVerificationIsRequired =>
      'Phone verification is required before applying for access.';

  @override
  String
  get launchAccessLaunchAccessApplicationScreenMessageAccessIsApprovedProfile =>
      'Access approved. You\'re ready for the next Catch city drop.';

  @override
  String
  get launchAccessLaunchAccessApplicationScreenMessageYourApplicationIsSaved =>
      'Your application is saved for the next launch cohort.';

  @override
  String get launchAccessLaunchAccessApplicationScreenTextJoinTheNextCity =>
      'Join the next city drop';

  @override
  String get launchAccessLaunchAccessApplicationScreenTextTellUsWhereYou =>
      'Tell us where you fit so we can open access around real events.';

  @override
  String get launchAccessLaunchAccessApplicationScreenTitleCity => 'City';

  @override
  String get launchAccessLaunchAccessApplicationScreenHinttextSelectCity =>
      'Select city';

  @override
  String get launchAccessLaunchAccessApplicationScreenLabelJoiningAs =>
      'Joining as';

  @override
  String get launchAccessLaunchAccessApplicationScreenLabelEventsYouWouldShow =>
      'Events you would show up for';

  @override
  String get launchAccessLaunchAccessApplicationScreenLabelBestTimes =>
      'Best times';

  @override
  String get launchAccessLaunchAccessApplicationScreenTitleIMightHost =>
      'I might host';

  @override
  String get launchAccessLaunchAccessApplicationScreenBodyUsefulIfYouAlready =>
      'Useful if you already run a club, venue, or social format.';

  @override
  String get launchAccessLaunchAccessApplicationScreenTitleInviteCode =>
      'Invite code';

  @override
  String get launchAccessLaunchAccessApplicationScreenTitleInstagram =>
      'Instagram';

  @override
  String get launchAccessLaunchAccessApplicationScreenTitleWhoReferredYou =>
      'Who referred you?';

  @override
  String get launchAccessLaunchAccessApplicationScreenTitleWhyDoYouWant =>
      'Why do you want to join?';

  @override
  String get launchAccessLaunchAccessApplicationScreenLabelSubmitApplication =>
      'Submit application';

  @override
  String get launchAccessLaunchAccessApplicationScreenLabelUpdateApplication =>
      'Update application';

  @override
  String get matchesMatchCelebrationDialogEyebrowNewCatch => 'New catch';

  @override
  String get matchesMatchCelebrationDialogTitleItSACatch => 'It\'s a Catch.';

  @override
  String get matchesMatchCelebrationDialogLabelMatch => 'Match';

  @override
  String get matchesMatchCelebrationDialogNoteStartWithSomethingSpecific =>
      'Start with something specific from their profile or event history.';

  @override
  String get matchesMatchCelebrationDialogLabelSendAMessage => 'Send a message';

  @override
  String get matchesMatchCelebrationDialogLabelKeepCatching => 'Keep catching';

  @override
  String get onboardingGenderInterestPageLabelContinue => 'Continue';

  @override
  String get onboardingGenderInterestPageLabelIAmA => 'I AM A';

  @override
  String get onboardingGenderInterestPageLabelShowMe => 'SHOW ME';

  @override
  String get onboardingInstagramPageLabelContinue => 'Continue';

  @override
  String get onboardingInstagramPageLabelSkipForNow => 'Skip for now';

  @override
  String get onboardingInstagramPageTitleHandle => 'HANDLE';

  @override
  String get onboardingInstagramPagePlaceholderYourhandle => '@yourhandle';

  @override
  String get onboardingNameDobPageLabelContinue => 'Continue';

  @override
  String get onboardingNameDobPageTitleFirstName => 'FIRST NAME';

  @override
  String get onboardingNameDobPageHelpertextDisplayedOnYourProfile =>
      'Displayed on your profile.';

  @override
  String get onboardingNameDobPageTitleLastName => 'LAST NAME';

  @override
  String get onboardingNameDobPageHelpertextPrivateWeNeverShow =>
      'Private. We never show this on your public profile.';

  @override
  String get onboardingNameDobPageTitleDateOfBirth => 'DATE OF BIRTH';

  @override
  String get onboardingNameDobPageHelpertextWeNeverShowYour =>
      'We never show your birth year.';

  @override
  String get onboardingNameDobPageTitlePhone => 'PHONE';

  @override
  String get onboardingNameDobPageHelpertextVerifiedViaOtp =>
      'Verified via OTP.';

  @override
  String get onboardingPhotosPageLabelContinue => 'Continue';

  @override
  String get onboardingProfilePromptsPageLabelContinue => 'Continue';

  @override
  String get onboardingProfilePromptsPageTitleProfilePrompt => 'Profile prompt';

  @override
  String get onboardingProfilePromptsPageTitleAnswer => 'Answer';

  @override
  String get onboardingRunningPrefsPageTextTypicalPacePerKm =>
      'TYPICAL PACE · PER KM';

  @override
  String onboardingRunningPrefsPageBodyPaceRange({
    required String minPace,
    required String maxPace,
  }) {
    return '$minPace - $maxPace';
  }

  @override
  String get onboardingRunningPrefsPageText400Fast => '4:00 FAST';

  @override
  String get onboardingRunningPrefsPageText900Easy => '9:00 EASY';

  @override
  String get onboardingRunningPrefsPageLabelFavouriteDistances =>
      'FAVOURITE DISTANCES';

  @override
  String get paymentsPaymentConfirmationScreenTitlePaymentNotCompleted =>
      'Payment not completed';

  @override
  String get paymentsPaymentConfirmationScreenTitleCheckoutIsWaiting =>
      'Checkout is waiting';

  @override
  String get paymentsPaymentConfirmationScreenLabelFailed => 'Failed';

  @override
  String get paymentsPaymentConfirmationScreenLabelPending => 'Pending';

  @override
  String get paymentsPaymentConfirmationScreenLabelViewPaymentHistory =>
      'View payment history';

  @override
  String get paymentsPaymentConfirmationScreenLabelBackToEvent =>
      'Back to event';

  @override
  String get paymentsPaymentConfirmationScreenLabelAddToCalendar =>
      'Add to calendar';

  @override
  String get paymentsPaymentConfirmationScreenLabelGetDirections =>
      'Get directions';

  @override
  String get paymentsPaymentConfirmationScreenLabelInviteFriend =>
      'Invite friend';

  @override
  String get paymentsPaymentConfirmationScreenTextHeadsUp => 'HEADS UP';

  @override
  String get paymentsPaymentConfirmationScreenTextBringSomeoneYouActually =>
      'Bring someone you actually want there';

  @override
  String get paymentsPaymentConfirmationScreenTextTheBestInvitesHappen =>
      'The best invites happen while the plan still feels fresh.';

  @override
  String get paymentsPaymentConfirmationScreenTextShare => 'Share';

  @override
  String get paymentsPaymentHistoryScreenTitleSignInRequired =>
      'Sign in required';

  @override
  String get paymentsPaymentHistoryScreenMessageSignInAgainTo =>
      'Sign in again to view payment history.';

  @override
  String get paymentsPaymentHistoryScreenTitleNoPaymentsYet =>
      'No payments yet';

  @override
  String get paymentsPaymentHistoryScreenMessageEventBookingsAndRefunds =>
      'Event bookings and refunds will appear here.';

  @override
  String get paymentsPaymentHistoryScreenTitlePaymentId => 'Payment ID';

  @override
  String get paymentsPaymentHistoryScreenTitleOrderId => 'Order ID';

  @override
  String get paymentsPaymentHistoryScreenTitleEventId => 'Event ID';

  @override
  String get paymentsPaymentHistoryScreenTitleDate => 'Date';

  @override
  String get paymentsPaymentHistoryScreenTitleStatus => 'Status';

  @override
  String get paymentsPaymentHistoryScreenLabelGetHelpWithThis =>
      'How to get help with this booking';

  @override
  String get publicProfilePublicProfileScreenTooltipProfileActions =>
      'Profile actions';

  @override
  String get publicProfilePublicProfileScreenLabelReport => 'Report';

  @override
  String get publicProfilePublicProfileScreenLabelBlock => 'Block';

  @override
  String get publicProfilePublicProfileScreenTitleProfileUnavailable =>
      'Profile unavailable';

  @override
  String get publicProfilePublicProfileScreenMessageThisProfileIsNo =>
      'This profile is no longer available on Catch.';

  @override
  String get publicProfilePublicProfileScreenLabelHarassmentOrAbuse =>
      'Harassment or abuse';

  @override
  String get publicProfilePublicProfileScreenLabelFakeOrMisleadingProfile =>
      'Fake or misleading profile';

  @override
  String get publicProfilePublicProfileScreenLabelInappropriateContent =>
      'Inappropriate content';

  @override
  String get publicProfilePublicProfileScreenLabelOtherSafetyConcern =>
      'Other safety concern';

  @override
  String get reviewsReviewsSectionLabelEditYourReview => 'Edit your review';

  @override
  String get reviewsReviewsSectionLabelWriteAReview => 'Write a review';

  @override
  String get reviewsReviewsSectionMessageBeTheFirstToReviewThisEvent =>
      'Be the first to review this event.';

  @override
  String get reviewsReviewsSectionTextReviews => 'Reviews';

  @override
  String get reviewsReviewsSectionTitleNoReviewsYet => 'No reviews yet';

  @override
  String get reviewsReviewsSectionMessageReviewsAppearAfterMembers =>
      'Reviews appear after members attend an event.';

  @override
  String get reviewsReviewsSectionMessageReviewsFromAttendeesWill =>
      'Reviews from attendees will appear here after an event.';

  @override
  String get reviewsReviewsSectionTextYou => 'You';

  @override
  String get reviewsReviewsSectionMessageEditReview => 'Edit review';

  @override
  String get reviewsReviewsSectionMessageRespondAsHost => 'Respond as host';

  @override
  String get reviewsReviewsSectionMessageEditHostResponse =>
      'Edit host response';

  @override
  String get reviewsReviewsSectionTitleRespondToReview => 'Respond to review';

  @override
  String get reviewsReviewsSectionTitleEditResponse => 'Edit response';

  @override
  String get reviewsReviewsSectionLabelSaveResponse => 'Save response';

  @override
  String get reviewsReviewsSectionTitleResponse => 'Response';

  @override
  String get reviewsReviewsSectionPlaceholderThankTheAttendeeOr =>
      'Thank the attendee or clarify what happened';

  @override
  String get reviewsStarRatingMessageS => 's';

  @override
  String get reviewsStarRatingLabelS => 's';

  @override
  String get reviewsWriteReviewSheetTitleDeleteReview => 'Delete review?';

  @override
  String get reviewsWriteReviewSheetMessageThisRemovesYourReview =>
      'This removes your review from this event.';

  @override
  String get reviewsWriteReviewSheetTitleEditReview => 'Edit review';

  @override
  String get reviewsWriteReviewSheetTitleWriteAReview => 'Write a review';

  @override
  String get reviewsWriteReviewSheetLabelDeleteReview => 'Delete review';

  @override
  String get reviewsWriteReviewSheetLabelSave => 'Save';

  @override
  String get reviewsWriteReviewSheetLabelSubmit => 'Submit';

  @override
  String get reviewsWriteReviewSheetTitleReview => 'Review';

  @override
  String get reviewsWriteReviewSheetPlaceholderShareYourExperience =>
      'Share your experience';

  @override
  String get safetySettingsScreenTitleDeleteAccount => 'Delete account?';

  @override
  String get safetySettingsScreenTitleAccount => 'Account';

  @override
  String get safetySettingsScreenTitlePhoneNumber => 'Phone number';

  @override
  String get safetySettingsScreenTitleEmail => 'Email';

  @override
  String get safetySettingsScreenTitleReviewHistory => 'Review history';

  @override
  String get safetySettingsScreenBodyEventsYouReviewed => 'Events you reviewed';

  @override
  String get safetySettingsScreenTitlePaymentHistory => 'Payment history';

  @override
  String get safetySettingsScreenBodyBookingsAndReceipts =>
      'Bookings and receipts';

  @override
  String get safetySettingsScreenTitleCatchHost => 'Catch Host';

  @override
  String get safetySettingsScreenBodyManageEventsAndClubs =>
      'Manage events and organizers';

  @override
  String get safetySettingsScreenTitleNotifications => 'Notifications';

  @override
  String get safetySettingsScreenTitlePushNotifications => 'Push notifications';

  @override
  String get safetySettingsScreenTitleMessages => 'Messages';

  @override
  String get safetySettingsScreenTitleEventReminders => 'Event reminders';

  @override
  String get safetySettingsScreenTitleEventChangesAndCancellations =>
      'Event changes and cancellations';

  @override
  String get safetySettingsScreenTitleClubAnnouncements =>
      'Organizer announcements';

  @override
  String get safetySettingsScreenTitleCrossPathsInvitations =>
      'Cross Paths invitations';

  @override
  String get safetySettingsScreenTitleEmailUpdates => 'Email updates';

  @override
  String get safetySettingsScreenTitlePrivacySafety => 'Privacy & safety';

  @override
  String get safetySettingsScreenTitleBlockedUsers => 'Blocked users';

  @override
  String get safetySettingsScreenTitleWhoCanSeeYou => 'Who can see you';

  @override
  String get safetySettingsScreenTitleShowInCrossPaths =>
      'Show me in Cross Paths';

  @override
  String get safetySettingsScreenBodyShowInCrossPaths =>
      'Allow Catch to suggest your profile to compatible members at events you separately opt into.';

  @override
  String get crossPathsEventConsentSectionTitleCrossPaths => 'Cross Paths';

  @override
  String get crossPathsEventConsentSectionTitleMeetPeopleAtThisEvent =>
      'Meet people at this event';

  @override
  String get crossPathsEventConsentSectionBodyConsentDisclosure =>
      'Your profile and plan to attend may be shown to compatible Catch members for this event, and they may send a limited invitation. This is not a public attendee list. You can turn it off before the event; safety and cancellation controls still apply.';

  @override
  String get crossPathsEventConsentSectionBodyConsentUnavailable =>
      'Cross Paths settings are unavailable right now. Try again shortly.';

  @override
  String get crossPathsExploreCardLabelPeopleYouCouldMeet =>
      'People you could meet';

  @override
  String get crossPathsExploreCardLabelCrossPaths => 'Cross Paths';

  @override
  String get crossPathsExploreCardReasonCompatibleAtThisEvent =>
      'A compatible person at this event';

  @override
  String crossPathsExploreCardContextPersonGoingToEvent({
    required String firstName,
    required String eventTitle,
  }) {
    return '$firstName is going to $eventTitle';
  }

  @override
  String crossPathsExploreCardEventDateTime({
    required String date,
    required String time,
  }) {
    return '$date at $time';
  }

  @override
  String get crossPathsExploreCardActionSeeEvent => 'See the event';

  @override
  String crossPathsExploreCardSemanticsViewProfile({
    required String firstName,
  }) {
    return 'View $firstName’s profile';
  }

  @override
  String get crossPathsProfilePreviewTitle => 'Cross Paths profile';

  @override
  String get crossPathsProfilePreviewTooltipClose => 'Close profile';

  @override
  String get crossPathsInvitationActionSend => 'Invite to this event';

  @override
  String get crossPathsInvitationActionJoinFirst => 'Join the event to invite';

  @override
  String get crossPathsInvitationActionCancel => 'Cancel invitation';

  @override
  String get crossPathsInvitationActionOpenPlan => 'Open event plan';

  @override
  String get crossPathsInvitationStatusPending =>
      'Invitation sent — waiting for a reply';

  @override
  String get crossPathsInvitationStatusClosed => 'This invitation is closed';

  @override
  String crossPathsInvitationConfirmTitle({required String firstName}) {
    return 'Invite $firstName?';
  }

  @override
  String get crossPathsInvitationConfirmBody =>
      'They’ll be able to accept or decline. If they accept, you’ll get a private event-planning chat.';

  @override
  String get crossPathsInvitationConfirmAction => 'Send invitation';

  @override
  String get crossPathsInvitationSentMessage => 'Invitation sent';

  @override
  String get crossPathsInvitationScreenTitle => 'Cross Paths invitation';

  @override
  String get crossPathsInvitationScreenIncomingBody =>
      'They’d like to make a plan to meet you at this event.';

  @override
  String get crossPathsInvitationScreenOutgoingBody =>
      'Your invitation is waiting for a reply.';

  @override
  String get crossPathsInvitationScreenAcceptedBody =>
      'You both agreed to make a plan for this event.';

  @override
  String get crossPathsInvitationScreenActionAccept => 'Accept and make a plan';

  @override
  String get crossPathsInvitationScreenActionDecline => 'Decline';

  @override
  String get crossPathsInvitationScreenActionCancelPlan => 'Cancel event plan';

  @override
  String get crossPathsInvitationScreenUnavailableTitle =>
      'Invitation unavailable';

  @override
  String get crossPathsInvitationScreenUnavailableBody =>
      'This invitation may have expired, been cancelled, or become unavailable.';

  @override
  String get safetySettingsScreenBodyRunnersOnMyEvents =>
      'Runners on my events';

  @override
  String get safetySettingsScreenTitleShowMeOnMap => 'Show me on map';

  @override
  String get safetySettingsScreenTitlePrivacyPolicy => 'Privacy policy';

  @override
  String get safetySettingsScreenTitleDeleteAccount658588 => 'Delete account';

  @override
  String get safetySettingsScreenTitleAbout => 'About';

  @override
  String get safetySettingsScreenTitleHelpSupport => 'Help & support';

  @override
  String get safetySettingsScreenBodyContactUs => 'Contact us';

  @override
  String get safetySettingsScreenExternalLinkOpenFailed =>
      'Could not open that link. Please try again.';

  @override
  String get safetySettingsScreenTitleTerms => 'Terms';

  @override
  String get safetySettingsScreenBodyLegal => 'Legal';

  @override
  String get safetySettingsScreenTitleVersion => 'Version';

  @override
  String get safetySettingsScreenTitleLogOut => 'Log out';

  @override
  String safetySettingsScreenTextVersionMade({required String version}) {
    return 'Catch $version · made in Bombay';
  }

  @override
  String get safetySettingsScreenTitleNoBlockedAccounts =>
      'No blocked accounts';

  @override
  String get safetySettingsScreenMessagePeopleYouBlockWill =>
      'People you block will appear here.';

  @override
  String get safetySettingsScreenLabelUnblock => 'Unblock';

  @override
  String get swipesEventRecapScreenTitleEventRecap => 'Event recap';

  @override
  String get swipesEventRecapScreenTooltipCloseRecap => 'Close recap';

  @override
  String get swipesEventRecapScreenTextWhoBroughtTheVibe =>
      'Who brought the vibe?';

  @override
  String get swipesEventRecapScreenTextTapPeopleYouRemember =>
      'Tap people you remember. They\'ll be easier to spot when you open the catches deck.';

  @override
  String get swipesEventRecapScreenTitleNoAttendeesToTag =>
      'No attendees to tag';

  @override
  String get swipesEventRecapScreenMessageNoOtherCheckedIn =>
      'No other checked-in attendees are attached to this event yet.';

  @override
  String get swipesEventRecapScreenLabelOpenCatchesDeck => 'Open catches deck';

  @override
  String get swipesEventRecapScreenLabelWhen => 'When';

  @override
  String get swipesEventRecapScreenLabelTime => 'Time';

  @override
  String get swipesEventRecapScreenLabelCatches => 'Catches';

  @override
  String get swipesFiltersScreenTitleFilters => 'Filters';

  @override
  String get swipesFiltersScreenTooltipCloseFilters => 'Close filters';

  @override
  String get swipesFiltersScreenLabelReset => 'Reset';

  @override
  String get swipesFiltersScreenTitleAge => 'Age';

  @override
  String get swipesFiltersScreenTitleInterestedIn => 'Interested in';

  @override
  String get swipesFiltersScreenLabelApplyFilters => 'Apply filters';

  @override
  String get swipesSwipeScreenTooltipBackToCatches => 'Back to Catches';

  @override
  String get swipesSwipeScreenTooltipFilters => 'Filters';

  @override
  String get swipesCatchesPassButtonMessagePassing => 'Passing';

  @override
  String get swipesCatchesPassButtonMessagePass => 'Pass';

  @override
  String get swipesCatchesPassButtonLabelPassingProfile => 'Passing profile';

  @override
  String get swipesCatchesPassButtonLabelPassProfile => 'Pass profile';

  @override
  String get swipesCatchProfileViewLabelPace => 'PACE';

  @override
  String get swipesCatchProfileViewLabelDistance => 'DISTANCE';

  @override
  String get swipesProfileReactionControlsSubtitleSendACommentWith =>
      'Send a comment with your like.';

  @override
  String get swipesProfileReactionControlsLabelCancel => 'Cancel';

  @override
  String get swipesProfileReactionControlsLabelSendLike => 'Send like';

  @override
  String get swipesProfileReactionControlsTitleComment => 'Comment';

  @override
  String get swipesProfileReactionControlsPlaceholderWriteSomethingSpecific =>
      'Write something specific...';

  @override
  String get userProfileProfileScreenLabelProfileTabs => 'Profile tabs';

  @override
  String get userProfileProfileScreenBodyDragLeftOrRight =>
      'Drag left or right to switch between Edit, Preview, and Insights.';

  @override
  String get userProfileProfileScreenTitleProfileNotAvailable =>
      'Profile not available';

  @override
  String get userProfileProfileScreenMessageFinishOnboardingOrSign =>
      'You can review submitted details in Forms & cards before setting up the rest of your profile.';

  @override
  String get userProfileInlineEditorHeightTooltipDecreaseHeight =>
      'Decrease height';

  @override
  String get userProfileInlineEditorHeightTooltipIncreaseHeight =>
      'Increase height';

  @override
  String get userProfileProfileSliverHeaderTooltipSettings => 'Settings';

  @override
  String get userProfileProfileTabTitlePrompts => 'Prompts';

  @override
  String get userProfileProfileTabTitleAboutYou => 'About you';

  @override
  String get userProfileProfileTabTitleRunning => 'Running';

  @override
  String get userProfileProfileTabTitleLifestyle => 'Lifestyle';

  @override
  String get userProfileProfileTabTitlePhotos => 'Photos';

  @override
  String get userProfileProfileTabSkeletonTitlePhotos => 'Photos';

  @override
  String get clubsClubHeroAppBarTitleClubDetailCollapsedTitle =>
      'club-detail-collapsed-title';

  @override
  String get clubsClubHeroAppBarTextClubDetailExpandedTitle =>
      'club-detail-expanded-title';

  @override
  String get clubsClubScheduleSectionTitleSchedule => 'Schedule';

  @override
  String get clubsClubShareCardTextClubOnCatch => 'ORGANIZER ON CATCH';

  @override
  String get dashboardDashboardEmptyTitleHowCatchWorks => 'How Catch works';

  @override
  String get dashboardEventFocusRailLabelReviewPending => 'Review pending';

  @override
  String dashboardEventFocusListLabelTimeLeft({required String timeLeft}) {
    return '$timeLeft left';
  }

  @override
  String dashboardEventFocusListLabelStaticTimeLeft({required int hours}) {
    return '${hours}h left';
  }

  @override
  String dashboardEventFocusListLabelAttendeesCheckedIn({
    required int attendedCount,
  }) {
    return '$attendedCount checked in';
  }

  @override
  String get eventSuccessEventSuccessSetupBodyLabelNoTimer => 'No timer';

  @override
  String get eventSuccessEventSuccessSetupBodyLabel10Min => '10 min';

  @override
  String get eventSuccessEventSuccessSetupBodyLabel15Min => '15 min';

  @override
  String get eventSuccessEventSuccessSetupBodyLabel20Min => '20 min';

  @override
  String get eventSuccessEventSuccessSetupBodyLabel30Min => '30 min';

  @override
  String get eventSuccessEventSuccessSetupBodyLabel5s => '5s';

  @override
  String get eventSuccessEventSuccessSetupBodyLabel10s => '10s';

  @override
  String get eventSuccessEventSuccessSetupBodyLabel15s => '15s';

  @override
  String get eventsEventDetailScreenTitleEventNotFound => 'Event not found';

  @override
  String get eventsEventDetailScreenMessageThisEventIsNo =>
      'This event is no longer available.';

  @override
  String get eventsEventLocationMapScreenTitleEventNotFound =>
      'Event not found';

  @override
  String get eventsEventLocationMapScreenMessageThisEventIsNo =>
      'This event is no longer available.';

  @override
  String get eventsSavedEventsScreenTitleSavedEvents => 'Saved events';

  @override
  String get eventsEventDetailHeroAppBarTitleEventDetailCollapsedTitle =>
      'event-detail-collapsed-title';

  @override
  String get exploreExploreMapScreenBodyNoSelectedMapEvent =>
      'no-selected-map-event';

  @override
  String get hostsClubHostDefaultsStepLabelAdmissionFormat =>
      'Admission format';

  @override
  String get hostsClubHostDefaultsStepLabelCancellationPolicy =>
      'Cancellation policy';

  @override
  String get hostsCreateClubContactFieldsLabelContact => 'Contact';

  @override
  String get hostsCreateClubPhotosPickerLabelClubPhotos => 'Gallery & cover';

  @override
  String get hostsCreateClubPhotosPickerLabelClubProfileImage =>
      'Organizer logo';

  @override
  String get hostsEditHostedEventScreenTitleEditEvent => 'Edit event';

  @override
  String get hostsEditHostedEventScreenLabelSchedule => 'Schedule';

  @override
  String get hostsEditHostedEventScreenLabelDuration => 'Duration';

  @override
  String get hostsEditHostedEventScreenLabelWhere => 'Where';

  @override
  String get hostsEditHostedEventScreenLabelEventDetails => 'Event details';

  @override
  String get hostsEditHostedEventScreenLabelEventPolicy => 'Event policy';

  @override
  String get hostsEditHostedEventScreenLabelLocked => 'Locked';

  @override
  String get hostsEditHostedEventScreenLabelAdmissionFormat =>
      'Admission format';

  @override
  String get hostsEditHostedEventScreenLabelCancellationPolicy =>
      'Cancellation policy';

  @override
  String get hostsHostCreateEventScreenTitleEventSetupUnavailable =>
      'Event setup unavailable';

  @override
  String get hostsHostCreateEventScreenMessageThatOrganizerDoesNot =>
      'That organizer does not match this event route.';

  @override
  String get hostsHostCreateEventScreenTitleRepeatUnavailable =>
      'Repeat unavailable';

  @override
  String get hostsHostCreateEventScreenMessageThatEventBelongsTo =>
      'That event belongs to a different organizer.';

  @override
  String get hostsHostCreateEventScreenTitleClubNotFound =>
      'Organizer not found';

  @override
  String get hostsHostCreateEventScreenMessageThisClubIsNo =>
      'This organizer is no longer available.';

  @override
  String get hostsHostCreateEventScreenTitleHostAccessRequired =>
      'Host access required';

  @override
  String get hostsHostCreateEventScreenMessageOnlyThisClubS =>
      'Only this organizer\'s host team can create events for this organizer.';

  @override
  String get hostsCreateEventPhotoPickerTitleCoverAndGallery =>
      'Event cover & gallery';

  @override
  String get hostsCreateEventPhotoPickerBodyInheritedLogo =>
      'Organizer logo · inherited';

  @override
  String get hostsCreateEventPhotoPickerBodyUnlimitedGallery =>
      'Add as many event photos as you need. The first photo is the cover.';

  @override
  String get hostsEventDetailsStepLabelActivityType => 'Activity type';

  @override
  String get hostsRouteEventPlanSectionTitle => 'Route plan';

  @override
  String get hostsRouteEventPlanOptInTitle => 'Route-based event';

  @override
  String get hostsRouteEventPlanOptInBody =>
      'Plan how people move, stop, and stay accounted for.';

  @override
  String get hostsRouteEventPlanSummaryTitle => 'Route operations';

  @override
  String get hostsRouteEventPlanMovementTitle => 'Movement';

  @override
  String get hostsRouteEventPlanMovementRun => 'Run';

  @override
  String get hostsRouteEventPlanMovementWalk => 'Walk';

  @override
  String get hostsRouteEventPlanMovementRide => 'Ride';

  @override
  String get hostsRouteEventPlanMovementMixed => 'Mixed';

  @override
  String get hostsRouteEventPlanShapeTitle => 'Route shape';

  @override
  String get hostsRouteEventPlanShapeLoop => 'Loop';

  @override
  String get hostsRouteEventPlanShapeOutAndBack => 'Out and back';

  @override
  String get hostsRouteEventPlanShapePointToPoint => 'Point to point';

  @override
  String get hostsRouteEventPlanGroupTitle => 'Group movement';

  @override
  String get hostsRouteEventPlanGroupTogether => 'One group';

  @override
  String get hostsRouteEventPlanGroupPaceGroups => 'Pace groups';

  @override
  String get hostsRouteEventPlanGroupSelfDirected => 'Self-directed';

  @override
  String get hostsRouteEventPlanCadenceTitle => 'Stop rhythm';

  @override
  String get hostsRouteEventPlanCadenceContinuous => 'Continuous';

  @override
  String get hostsRouteEventPlanCadenceFlexible => 'Flexible stops';

  @override
  String get hostsRouteEventPlanCadenceHosted => 'Hosted stops';

  @override
  String get hostsRouteEventPlanStopsTitle => 'Stops to prepare';

  @override
  String get hostsRouteEventPlanStopWater => 'Water';

  @override
  String get hostsRouteEventPlanStopRegroup => 'Regroup point';

  @override
  String get hostsRouteEventPlanStopVenue => 'Venue';

  @override
  String get hostsRouteEventPlanStopPhoto => 'Photo spot';

  @override
  String get hostsRouteEventPlanStopViewpoint => 'Viewpoint';

  @override
  String get hostsRouteEventPlanStopHazard => 'Hazard';

  @override
  String get hostsRouteEventPlanStopTurnaround => 'Turnaround';

  @override
  String get hostsRouteEventPlanRolesTitle => 'Route roles';

  @override
  String get hostsRouteEventPlanRoleLead => 'Route lead';

  @override
  String get hostsRouteEventPlanRoleSweep => 'Sweep';

  @override
  String get hostsRouteEventPlanRolePacer => 'Pacer';

  @override
  String get hostsRouteEventPlanRoleStopHost => 'Stop host';

  @override
  String get hostsRouteEventPlanRoleMarshal => 'Marshal';

  @override
  String get hostsRouteEventPlanRolePhotographer => 'Photographer';

  @override
  String get hostsEventDetailsStepLabelFormatStructure => 'Format structure';

  @override
  String get hostsEventDetailsStepLabelPaceLevel => 'Pace level';

  @override
  String get hostsEventPolicyStepLabelAdmissionFormat => 'Admission format';

  @override
  String get hostsEventPolicyStepLabelCancellationPolicy =>
      'Cancellation policy';

  @override
  String get hostsWhenStepLabelDate => 'Date';

  @override
  String get hostsWhenStepLabelStartTime => 'Start time';

  @override
  String get hostsWhenStepLabelDuration => 'Duration';

  @override
  String get hostsWhereStepLabelMeetingLocation => 'Meeting location';

  @override
  String get hostsHostEventManageScreenBodyHostEventManageScroll =>
      'host_event_manage_scroll_view';

  @override
  String get hostsHostEventManageScreenLabelKeepEvent => 'Keep event';

  @override
  String get hostsHostEventManageScreenLabelKeepActive => 'Keep active';

  @override
  String get hostsHostEventManageScreenLabelDisable => 'Disable';

  @override
  String get hostsHostEventManageScreenLabelInvite => 'Invite';

  @override
  String get hostsHostEventManageScreenLabelDisabled => 'Disabled';

  @override
  String get hostsHostEventManageScreenLabelEventCancelled => 'Event cancelled';

  @override
  String get hostsHostEventManageScreenDetailRecordsAreRetained =>
      'Records are retained';

  @override
  String get hostsHostInboxScreenTitleNoGeneralInquiries =>
      'No general inquiries';

  @override
  String get hostsHostInboxScreenTitleNoProgramConversations =>
      'No guest conversations for this program yet';

  @override
  String get hostsHostPaymentAccountCardTitlePayouts => 'Payouts';

  @override
  String get hostsHostEventToolsLabelHostEvent => 'Host event';

  @override
  String chatsChatEventContextHeaderTextTitleDate({
    required Object title,
    required Object date,
  }) {
    return '$title · $date';
  }

  @override
  String clubsClubDetailDockTextMembers({required Object members}) {
    return '$members';
  }

  @override
  String clubsClubHeroAppBarSemanticlabelNameCoverPhoto({
    required Object name,
  }) {
    return '$name cover photo';
  }

  @override
  String clubsClubHostSectionLabelViewDisplaynameProfile({
    required Object displayName,
  }) {
    return 'View $displayName profile';
  }

  @override
  String clubsClubPhotoStripTextLengthPhotos({required Object length}) {
    return '$length PHOTOS';
  }

  @override
  String clubsClubShareCardLabelAreaCitylabel({
    required Object area,
    required Object cityLabel,
  }) {
    return '$area, $cityLabel';
  }

  @override
  String clubsClubShareCardSemanticlabelNameCoverPhoto({required Object name}) {
    return '$name cover photo';
  }

  @override
  String dashboardActivitySectionLabelTitleBody({
    required Object title,
    required Object body,
  }) {
    return '$title. $body';
  }

  @override
  String dashboardEventFocusRailLabelSignedupcountCapacitylimit({
    required Object signedUpCount,
    required Object capacityLimit,
  }) {
    return '$signedUpCount/$capacityLimit';
  }

  @override
  String eventSuccessEventSuccessFeatureBlocksLabelRound({
    required Object round,
  }) {
    return '$round%';
  }

  @override
  String eventSuccessEventSuccessQuestionnaireConfigEditorLabelLengthQuestions({
    required Object length,
  }) {
    return '$length questions';
  }

  @override
  String eventSuccessEventSuccessQuestionnaireConfigEditorTextQuestionValue1({
    required Object value1,
  }) {
    return 'Question $value1';
  }

  @override
  String eventSuccessEventSuccessQuestionnaireConfigEditorTitleOptionValue1({
    required Object value1,
  }) {
    return 'Option $value1';
  }

  @override
  String eventSuccessEventSuccessSetupBodyTextAttendeesWillSeeText({
    required Object text,
  }) {
    return 'Attendees will see: \"$text\"';
  }

  @override
  String eventSuccessEventSuccessStructureConfigEditorDetailTargetSizeForEach({
    required Object singularLabel,
  }) {
    return 'Target size for each $singularLabel.';
  }

  @override
  String
  eventSuccessEventSuccessStructureConfigEditorTextAutoAboutEstimatedunitcountTolowercase({
    required Object estimatedUnitCount,
    required Object toLowerCase,
    required Object targetAttendeeCount,
  }) {
    return 'Auto: about $estimatedUnitCount $toLowerCase from $targetAttendeeCount target attendees.';
  }

  @override
  String eventsEventDetailDesignPrimitivesTextLengthUploaded({
    required Object length,
  }) {
    return '$length UPLOADED';
  }

  @override
  String eventsEventDetailOverviewSectionTitleTitleCancellation({
    required Object title,
  }) {
    return '$title cancellation';
  }

  @override
  String eventsEventPinsMapLabelLocationnameLocation({
    required Object locationName,
  }) {
    return '$locationName location';
  }

  @override
  String eventsEventPinsMapLabelSelectLocationname({
    required Object locationName,
  }) {
    return 'Select $locationName';
  }

  @override
  String eventsWhoIsGoingTextTotalCapacitylimit({
    required Object total,
    required Object capacityLimit,
  }) {
    return '$total/$capacityLimit';
  }

  @override
  String exploreExploreScreenTitleNoClubsInCitylabel({
    required Object cityLabel,
  }) {
    return 'No organizers in $cityLabel yet';
  }

  @override
  String exploreCatchCoverStoryLabelChangeLocationLocation({
    required Object location,
  }) {
    return 'Change location, $location';
  }

  @override
  String exploreExploreCityPickerLabelSelectLabel({required Object label}) {
    return 'Select $label';
  }

  @override
  String exploreExploreEventTypeBrowseGridLabelLabelCountlabel({
    required Object label,
    required Object countLabel,
  }) {
    return '$label, $countLabel';
  }

  @override
  String exploreExploreEventTypeBrowseGridTextCount({required Object count}) {
    return '$count';
  }

  @override
  String exploreExploreEventTypeBrowseGridLabelRemainingcountMoreTypes({
    required Object remainingCount,
  }) {
    return '+ $remainingCount MORE TYPES';
  }

  @override
  String exploreExploreEventTypeBrowseGridLabelShowRemainingcountMoreActivity({
    required Object remainingCount,
  }) {
    return 'Show $remainingCount more activity types';
  }

  @override
  String hostsEditHostedEventScreenTitleBasePriceCurrencycode({
    required Object currencyCode,
  }) {
    return 'Base price ($currencyCode)';
  }

  @override
  String hostsEditHostedEventScreenTitleStepCurrencycode({
    required Object currencyCode,
  }) {
    return 'Step ($currencyCode)';
  }

  @override
  String hostsEditHostedEventScreenTitleMaxCurrencycode({
    required Object currencyCode,
  }) {
    return 'Max ($currencyCode)';
  }

  @override
  String hostsCreateEventSuccessScreenMessageDisplaynameIsNowListed({
    required Object displayName,
    required Object name,
  }) {
    return '$displayName is now listed on $name. People can discover it from their home feed.';
  }

  @override
  String hostsCreateEventSuccessScreenMessageDisplaynameIsNowListed244c65({
    required Object displayName,
    required Object name,
  }) {
    return '$displayName is now listed on $name. People can discover it, but only attendees with the invite code or private link can book.';
  }

  @override
  String hostsEventPolicyStepTitleBasePriceCurrencycode({
    required Object currencyCode,
  }) {
    return 'Base price ($currencyCode)';
  }

  @override
  String hostsEventPolicyStepTitleStepCurrencycode({
    required Object currencyCode,
  }) {
    return 'Step ($currencyCode)';
  }

  @override
  String hostsEventPolicyStepTitleMaxCurrencycode({
    required Object currencyCode,
  }) {
    return 'Max ($currencyCode)';
  }

  @override
  String hostsHostEventManageScreenMessageThisStopsNewAttribution({
    required Object label,
  }) {
    return 'This stops new attribution for $label, but keeps its history in reporting.';
  }

  @override
  String hostsHostEventManageScreenDetailOpenOpen({required Object open}) {
    return '$open open';
  }

  @override
  String hostsHostEventManageScreenDetailWaitlistedToReview({
    required Object waitlisted,
  }) {
    return '$waitlisted to review';
  }

  @override
  String hostsHostBroadcastComposerSheetLabelBookedBookedcount({
    required Object bookedCount,
  }) {
    return 'Booked · $bookedCount';
  }

  @override
  String hostsHostBroadcastComposerSheetLabelWaitlistProspectivecount({
    required Object prospectiveCount,
  }) {
    return 'Waitlist · $prospectiveCount';
  }

  @override
  String hostsHostBroadcastComposerSheetLabelEveryoneRecipientcount({
    required Object recipientCount,
  }) {
    return 'Everyone · $recipientCount';
  }

  @override
  String hostsHostBroadcastComposerSheetLabelSendToRecipientcountPeople({
    required Object recipientCount,
  }) {
    return 'Send to $recipientCount people';
  }

  @override
  String hostsHostInboxScreenLabelBookedBookedthreadcount({
    required Object bookedThreadCount,
  }) {
    return 'Booked · $bookedThreadCount';
  }

  @override
  String hostsHostInboxScreenLabelProspectiveProspectivethreadcount({
    required Object prospectiveThreadCount,
  }) {
    return 'Prospective · $prospectiveThreadCount';
  }

  @override
  String hostsHostInboxScreenTitleNoValue1HaveWritten({
    required Object value1,
  }) {
    return 'No $value1 have written yet';
  }

  @override
  String hostsHostClubToolsSubtitleRemainingquotaOfWeeklyquotaPosts({
    required Object remainingQuota,
    required Object weeklyQuota,
  }) {
    return '$remainingQuota of $weeklyQuota posts left this week.';
  }

  @override
  String hostsHostClubToolsHelpertextValue1CharactersLeft({
    required Object value1,
  }) {
    return '$value1 characters left';
  }

  @override
  String hostsHostEventAttendancePanelLabelOfferNextCount({
    required Object count,
  }) {
    return 'Offer next $count';
  }

  @override
  String hostsHostEventToolsLabelHostEventValue1Of({
    required Object value1,
    required Object itemCount,
  }) {
    return 'Host event $value1 of $itemCount';
  }

  @override
  String hostsHostEventToolsTextValue1OfItemcount({
    required Object value1,
    required Object itemCount,
  }) {
    return '$value1 of $itemCount';
  }

  @override
  String hostsHostEventToolsLabelShortdatelabelTimerangelabel({
    required Object shortDateLabel,
    required Object timeRangeLabel,
  }) {
    return '$shortDateLabel · $timeRangeLabel';
  }

  @override
  String coreBlockUserDialogTitleBlockName({required Object name}) {
    return 'Block $name?';
  }

  @override
  String coreCatchFieldTooltipClearValue1({required Object value1}) {
    return 'Clear $value1';
  }

  @override
  String coreCatchFormFieldLabelLabelLabelOptional({required Object label}) {
    return '$label, optional';
  }

  @override
  String get notificationArrivalMatchTitle => 'It\'s a catch';

  @override
  String get notificationArrivalMessageTitle => 'New message';

  @override
  String get coreCatchNoticeTooltipDismiss => 'Dismiss';

  @override
  String coreCatchPersonAvatarTextCount({required Object count}) {
    return '+$count';
  }

  @override
  String coreCatchPersonRowLabelLabelUnreadChats({required Object label}) {
    return '$label unread chats';
  }

  @override
  String coreCatchSearchFieldTooltipClearPlaceholder({
    required Object placeholder,
  }) {
    return 'Clear $placeholder';
  }

  @override
  String get coreCatchStartupLoadingScreenBodyStartupLoadingIndicator =>
      'startup-loading-indicator';

  @override
  String get coreCatchStartupLoadingScreenBodyStartupLoadingDelay =>
      'startup-loading-delay';

  @override
  String coreCatchStepFlowHeaderTextStepClampedstepOfTotal({
    required Object clampedStep,
    required Object total,
  }) {
    return 'STEP $clampedStep OF $total';
  }

  @override
  String coreCatchStepFlowHeaderTextCompactStepClampedstepTotal({
    required int clampedStep,
    required int total,
  }) {
    return '$clampedStep/$total';
  }

  @override
  String coreCatchTopBarLabelViewNameProfile({required Object name}) {
    return 'View $name profile';
  }

  @override
  String coreOrderedPhotoPickerLabelPhotoValue1({required Object value1}) {
    return 'Photo $value1';
  }

  @override
  String coreOrderedPhotoPickerMessagePhotoValue1({required Object value1}) {
    return 'Photo $value1';
  }

  @override
  String coreOrderedPhotoPickerMessageRemovePhotoValue1({
    required Object value1,
  }) {
    return 'Remove photo $value1';
  }

  @override
  String eventsEventJoinedCelebrationScreenMessageYourSpotIsConfirmed({
    required Object title,
    required Object value2,
  }) {
    return 'Your spot is confirmed for $title$value2.';
  }

  @override
  String eventsEventDateMarkerLabelDayDay2({
    required Object day,
    required Object day2,
  }) {
    return '$day $day2';
  }

  @override
  String eventsEventDateMarkerTextDay({required Object day}) {
    return '$day';
  }

  @override
  String eventsEventDateMarkerLabelDay({required Object day}) {
    return '$day';
  }

  @override
  String eventsEventDateRailCardTextDay({required Object day}) {
    return '$day';
  }

  @override
  String get eventsEventDateRailCardSemanticsOpensEventDetails =>
      'Opens event details';

  @override
  String imageUploadsPhotoSlotLabelPhotoValue1Uploading({
    required Object value1,
  }) {
    return 'Photo $value1 uploading';
  }

  @override
  String imageUploadsPhotoSlotLabelEditPhotoValue1({required Object value1}) {
    return 'Edit photo $value1';
  }

  @override
  String imageUploadsPhotoSlotLabelAddPhotoValue1({required Object value1}) {
    return 'Add photo $value1';
  }

  @override
  String imageUploadsPhotoSlotLabelPhotoSlotValue1Unavailable({
    required Object value1,
  }) {
    return 'Photo slot $value1 unavailable';
  }

  @override
  String imageUploadsPhotoSlotMessageDeletePhotoValue1({
    required Object value1,
  }) {
    return 'Delete photo $value1';
  }

  @override
  String imageUploadsPhotoSlotTextPhotoPadleft({required Object padLeft}) {
    return 'PHOTO $padLeft';
  }

  @override
  String imageUploadsProfilePhotoEditorScreenCatchbuttonDeletePhotoValue1({
    required Object value1,
  }) {
    return 'Delete photo $value1';
  }

  @override
  String
  imageUploadsProfilePhotoEditorScreenTextKeepAtLeastMinimumprofilephotocount({
    required Object minimumProfilePhotoCount,
  }) {
    return 'Keep at least $minimumProfilePhotoCount photos on your profile.';
  }

  @override
  String get launchAccessLaunchAccessApplicationScreenTitleApplyForAccess =>
      'Apply for access';

  @override
  String matchesMatchCelebrationDialogMessageYouAndNameBoth({
    required Object name,
  }) {
    return 'You and $name both liked each other.';
  }

  @override
  String
  onboardingProfilePromptsPageHelpertextLengthMaximumprofilepromptanswerlength({
    required Object length,
    required Object maximumProfilePromptAnswerLength,
  }) {
    return '$length / $maximumProfilePromptAnswerLength';
  }

  @override
  String get onboardingWelcomePageLabelSkipWelcomeAnimation =>
      'Skip welcome animation';

  @override
  String get onboardingWelcomePageTextCatch => 'Catch';

  @override
  String get onboardingWelcomePageLabelContinueWithPhone =>
      'Continue with phone';

  @override
  String get onboardingWelcomePageLabelSeeWhatSOn => 'See what\'s on';

  @override
  String get paymentsPaymentConfirmationScreenTitleEventNotFound =>
      'Event not found';

  @override
  String get paymentsPaymentConfirmationScreenMessageThisEventIsNo =>
      'This event is no longer available.';

  @override
  String paymentsPaymentConfirmationScreenLabelTryProviderlabelAgain({
    required Object providerLabel,
  }) {
    return 'Try $providerLabel again';
  }

  @override
  String paymentsPaymentConfirmationScreenLabelOpenProviderlabelCheckout({
    required Object providerLabel,
  }) {
    return 'Open $providerLabel checkout';
  }

  @override
  String get paymentsPaymentHistoryScreenTitlePaymentHistory =>
      'Payment history';

  @override
  String paymentsPaymentHistoryScreenLabelPaymentForEventtitle({
    required Object eventTitle,
  }) {
    return 'Payment for $eventTitle';
  }

  @override
  String publicProfilePublicProfileScreenTitleReportProfilename({
    required Object profileName,
  }) {
    return 'Report $profileName';
  }

  @override
  String get reviewsReviewsHistoryScreenTitleSignInToSee =>
      'Sign in to see reviews';

  @override
  String get reviewsReviewsHistoryScreenMessageYourPastEventReviews =>
      'Your past event reviews will appear here.';

  @override
  String get reviewsReviewsHistoryScreenTitleReviewHistory => 'Review history';

  @override
  String reviewsReviewsSectionTitleAllReviewsLength({required Object length}) {
    return 'All reviews ($length)';
  }

  @override
  String reviewsReviewsSectionTextTostringasfixedLength({
    required Object toStringAsFixed,
    required Object length,
  }) {
    return '$toStringAsFixed · $length';
  }

  @override
  String reviewsReviewsSectionLabelSeeAllLengthReviews({
    required Object length,
  }) {
    return 'See all $length reviews';
  }

  @override
  String reviewsReviewsSectionTextHostResponseHostname({
    required Object hostName,
  }) {
    return 'Host response · $hostName';
  }

  @override
  String reviewsStarRatingMessageValueStarValue2({
    required Object value,
    required Object value2,
  }) {
    return '$value star$value2';
  }

  @override
  String reviewsStarRatingLabelRateValueStarValue2({
    required Object value,
    required Object value2,
  }) {
    return 'Rate $value star$value2';
  }

  @override
  String get safetySettingsScreenTitleSettings => 'Settings';

  @override
  String get safetySettingsScreenTitleAccountUnavailable =>
      'Review your form details';

  @override
  String get safetySettingsScreenMessageSignOutAndSign =>
      'Your Catch profile is not set up yet. Review your submitted details in Forms & cards. Profile preferences become available after setup.';

  @override
  String get swipesEventRecapScreenTitleEventNotFound => 'Event not found';

  @override
  String get swipesEventRecapScreenMessageThisEventIsNo =>
      'This event is no longer available.';

  @override
  String swipesSwipeScreenTextCatchesRemainingcountLeft({
    required Object remainingCount,
  }) {
    return 'Catches · $remainingCount left';
  }

  @override
  String swipesCatchProfileViewTextNameAge({
    required Object name,
    required Object age,
  }) {
    return '$name, $age';
  }

  @override
  String swipesProfileReactionControlsTooltipLikeLabel({
    required Object label,
  }) {
    return 'Like $label';
  }

  @override
  String swipesProfileReactionControlsTooltipCommentOnLabel({
    required Object label,
  }) {
    return 'Comment on $label';
  }

  @override
  String swipesProfileReactionControlsTitleStartWithLabel({
    required Object label,
  }) {
    return 'Start with $label';
  }

  @override
  String
  swipesProfileReactionControlsHelpertextLengthMaxswipereactioncommentlengthCharacters({
    required Object length,
    required Object maxSwipeReactionCommentLength,
  }) {
    return '$length / $maxSwipeReactionCommentLength characters';
  }

  @override
  String swipesProfileSurfaceLabelProfileOfNameAge({
    required Object name,
    required Object age,
  }) {
    return 'Profile of $name, $age';
  }

  @override
  String get userProfileProfileScreenTitleYourProfile => 'Your profile';

  @override
  String userProfileInlineEditorPromptLabelPromptNumber({
    required Object number,
  }) {
    return 'Prompt $number';
  }

  @override
  String get userProfileInlineEditorPromptLabelAnswer => 'Answer';

  @override
  String get userProfileInlineEditorPromptLabelAddAnotherPrompt =>
      'Add another prompt';

  @override
  String get userProfileProfileSliverHeaderLabelEdit => 'Edit';

  @override
  String get userProfileProfileSliverHeaderLabelPreview => 'Preview';

  @override
  String get userProfileProfileSliverHeaderLabelInsights => 'Insights';

  @override
  String get userProfileProfileTabSkeletonTitlePrompts => 'Prompts';

  @override
  String get userProfileProfileTabSkeletonTitleAboutYou => 'About you';

  @override
  String get userProfileProfileTabSkeletonTitleLifestyle => 'Lifestyle';

  @override
  String clubsAvatarChipLabelOpenNameClub({required Object name}) {
    return 'Open $name organizer';
  }

  @override
  String get clubsAvatarChipTextEventSoon => 'Event soon';

  @override
  String clubsDirectoryCardLabelOpenNameClub({required Object name}) {
    return 'Open $name organizer';
  }

  @override
  String get clubsDirectoryCardLabelJoined => 'Following';

  @override
  String get clubsDirectoryCardLabelJoin => 'Follow';

  @override
  String get dashboardDashboardEmptyHomeScreenLabelHome => 'Home';

  @override
  String get dashboardDashboardHomeScreenLabelHome => 'Home';

  @override
  String get eventSuccessEventSuccessCompanionAfterglowLabelPrivateAfterglow =>
      'Private afterglow';

  @override
  String eventSuccessEventSuccessCompanionAfterglowTextYourNightAtTitle({
    required Object title,
  }) {
    return 'Your night at $title';
  }

  @override
  String get eventSuccessEventSuccessCompanionAfterglowTextASmallRecapFor =>
      'A small recap for you, not a public share card.';

  @override
  String get eventSuccessEventSuccessCompanionAfterglowLabelYouShowedUp =>
      'You showed up';

  @override
  String get eventSuccessEventSuccessCompanionAfterglowLabelOpenersReady =>
      'Openers ready';

  @override
  String get eventSuccessEventSuccessCompanionAfterglowLabelMemorySaved =>
      'Memory saved';

  @override
  String get eventSuccessEventSuccessCompanionAfterglowLabelYourRead =>
      'Your read';

  @override
  String get eventSuccessEventSuccessCompanionAfterglowLabelYourReadSaved =>
      'Your read saved';

  @override
  String get eventSuccessEventSuccessCompanionAfterglowTextOnlyYouSeeThis =>
      'Only you see this recap. Hosts get aggregate coaching, never your private notes or individual opener choices.';

  @override
  String get eventSuccessEventSuccessCompanionArrivalMissionLabelFirstHello =>
      'First Hello';

  @override
  String
  get eventSuccessEventSuccessCompanionArrivalMissionTextStartYourFirstHello =>
      'Start your First Hello.';

  @override
  String
  get eventSuccessEventSuccessCompanionArrivalMissionTextWeWillConfirmYou =>
      'We will confirm you are at the venue, then give you one person and one tiny question. Complete it to check in.';

  @override
  String
  get eventSuccessEventSuccessCompanionArrivalMissionTextThisIsAPrivate =>
      'This is a private prompt. It is designed to make the first conversation easier, not to put your answers on display.';

  @override
  String
  get eventSuccessEventSuccessCompanionArrivalMissionLabelStartFirstHello =>
      'Start First Hello';

  @override
  String
  get eventSuccessEventSuccessCompanionArrivalMissionLabelUseNormalCheckIn =>
      'Use normal check-in';

  @override
  String
  eventSuccessEventSuccessCompanionArrivalMissionTextFindTargetdisplayname({
    required Object targetDisplayName,
  }) {
    return 'Find $targetDisplayName.';
  }

  @override
  String
  get eventSuccessEventSuccessCompanionArrivalMissionTextCompleteThisTinyMission =>
      'Complete this tiny mission to check in. If the room is crowded or the person is late, use the fallback.';

  @override
  String
  get eventSuccessEventSuccessCompanionArrivalMissionLabelCompleteCheckIn =>
      'Complete check-in';

  @override
  String get eventSuccessEventSuccessCompanionArrivalMissionLabelCanTFindThem =>
      'Can\'t find them';

  @override
  String get eventSuccessEventSuccessCompanionFeedbackTextHowDidItFeel =>
      'How did it feel?';

  @override
  String get eventSuccessEventSuccessCompanionFeedbackTextYourFeedbackIsSaved =>
      'Your feedback is saved';

  @override
  String get eventSuccessEventSuccessCompanionFeedbackTextThisIsPrivateFirst =>
      'This is private-first: hosts see aggregate trends, while private notes and safety concerns stay with Catch.';

  @override
  String get eventSuccessEventSuccessCompanionFeedbackLabelWelcome => 'Welcome';

  @override
  String get eventSuccessEventSuccessCompanionFeedbackLabelStructure =>
      'Structure';

  @override
  String get eventSuccessEventSuccessCompanionFeedbackTitleIWantCatchTo =>
      'I want Catch to review a safety or comfort concern';

  @override
  String get eventSuccessEventSuccessCompanionFeedbackTitlePrivateNoteToCatch =>
      'Private note to Catch';

  @override
  String get eventSuccessEventSuccessCompanionFeedbackLabelSubmitFeedback =>
      'Submit feedback';

  @override
  String get eventSuccessEventSuccessCompanionFeedbackLabelUpdateFeedback =>
      'Update feedback';

  @override
  String eventSuccessEventSuccessCompanionFeedbackTooltipLabelI({
    required Object label,
    required Object i,
  }) {
    return '$label $i';
  }

  @override
  String get eventSuccessEventSuccessCompanionFeedbackTextPeopleIMet =>
      'People I met';

  @override
  String
  get eventSuccessEventSuccessCompanionFeedbackTooltipDecreasePeopleMet =>
      'Decrease people met';

  @override
  String eventSuccessEventSuccessCompanionFeedbackTextValue({
    required Object value,
  }) {
    return '$value';
  }

  @override
  String
  get eventSuccessEventSuccessCompanionFeedbackTooltipIncreasePeopleMet =>
      'Increase people met';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsLabelStarterGroup =>
      'Starter group';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsTextStarterGroupsPausedFor =>
      'Starter groups paused for you';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsTextYourStarterGroupIs =>
      'Your starter group is forming';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsTextYouWonTBe =>
      'You won\'t be included when the host runs the generator.';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsTextTheHostWillPublish =>
      'The host will publish starter groups once everyone is checked in.';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsLabelLoadingGroupMembers =>
      'Loading group members';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsLabelIncludeMeInStarter =>
      'Include me in starter groups';

  @override
  String eventSuccessEventSuccessCompanionLiveCardsLabelValue1People({
    required Object value1,
  }) {
    return '$value1 people';
  }

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsLabelTimedRotations =>
      'Timed rotations';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsTextTimedRotationsPausedFor =>
      'Timed rotations paused for you';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsTextYourRotationScheduleIs =>
      'Your rotation schedule is forming';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsTextYourTimedPairingsAppear =>
      'Your timed pairings appear once the host generates rotations.';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsLabelLoadingPartnerNames =>
      'Loading partner names';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsLabelIncludeMeInTimed =>
      'Include me in timed rotations';

  @override
  String eventSuccessEventSuccessCompanionLiveCardsTextTimerangePeername({
    required Object timeRange,
    required Object peerName,
  }) {
    return '$timeRange · $peerName';
  }

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsLabelLiveCue =>
      'Live cue';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsTextEventIsLive =>
      'Event is live';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsTextFollowTheHostFor =>
      'Follow the host for the next event moment.';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsTextSmallStarterGroupWhen =>
      'Small starter group when you check in.';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsTextTimedPartnerRotationsDuring =>
      'Timed partner rotations during the event.';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsTextSynchronizedPartnerRevealsAs =>
      'Synchronized partner reveals as the event unfolds.';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsTextLiveConversationPromptsFrom =>
      'Live conversation prompts from the host.';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsTextYouCanAskThe =>
      'You can ask the host for an intro to someone specific.';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsLabelPreview =>
      'Preview';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsTextWhatWeLlGuide =>
      'What we\'ll guide you through';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsTextLivePartnerAndGroup =>
      'Live partner and group details unlock after check-in. Here\'s what to expect at the event:';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsLabelArrival =>
      'Arrival';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsTextArrivalCheckIn =>
      'Arrival check-in';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsTextConfirmYouAreAt =>
      'Confirm you are at the event so post-event follow-up only includes actual attendees.';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsLabelScanHostQr =>
      'Scan host QR';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsLabelCheckIn =>
      'Check in';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsTextScanHostQr =>
      'Scan host QR';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsMessageClose => 'Close';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsTextLocationStillVerifiesThe =>
      'Only the Host\'s current live QR confirms venue presence. Printed and shared join codes cannot check you in.';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsMessageCopyOpener =>
      'Copy opener';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsMessageCopyCue =>
      'Copy cue';

  @override
  String
  get eventSuccessEventSuccessCompanionQuestionnaireTextAFewQuickQuestions =>
      'A few quick questions';

  @override
  String
  get eventSuccessEventSuccessCompanionQuestionnaireLabelCanGuidePairings =>
      'Can guide pairings';

  @override
  String get eventSuccessEventSuccessCompanionQuestionnaireLabelCluesOnly =>
      'Clues only';

  @override
  String get eventSuccessEventSuccessCompanionQuestionnaireLabelSaved =>
      'Saved';

  @override
  String
  get eventSuccessEventSuccessCompanionQuestionnaireTextYourAnswersCanShape =>
      'Your answers can shape reveal clues and help guide pairings. Hosts never see individual answers.';

  @override
  String
  get eventSuccessEventSuccessCompanionQuestionnaireTextYourAnswersCanShape025884 =>
      'Your answers can shape reveal clues. Hosts never see individual answers, and this event will not use them for pairings.';

  @override
  String get eventSuccessEventSuccessCompanionQuestionnaireLabelSaveClues =>
      'Save clues';

  @override
  String get eventSuccessEventSuccessCompanionQuestionnaireLabelUpdateClues =>
      'Update clues';

  @override
  String eventSuccessEventSuccessCompanionQuestionnaireMessageQuestionValue1({
    required Object value1,
  }) {
    return 'Question $value1';
  }

  @override
  String
  eventSuccessEventSuccessCompanionQuestionnaireSemanticlabelQuestionValue1({
    required Object value1,
  }) {
    return 'Question $value1';
  }

  @override
  String eventSuccessEventSuccessCompanionQuestionnaireTextValue1({
    required Object value1,
  }) {
    return '$value1';
  }

  @override
  String get eventSuccessEventSuccessCompanionSharedTextEventCompanion =>
      'Event companion';

  @override
  String eventSuccessEventSuccessCompanionSharedTextPadleftTotalsteps({
    required Object padLeft,
    required Object totalSteps,
  }) {
    return '$padLeft / $totalSteps';
  }

  @override
  String get eventSuccessEventSuccessCompanionSharedTextYourTicketToday =>
      'YOUR TICKET - TODAY';

  @override
  String get eventSuccessEventSuccessCompanionSharedLabelWhen => 'WHEN';

  @override
  String get eventSuccessEventSuccessCompanionSharedLabelWhere => 'WHERE';

  @override
  String get eventSuccessEventSuccessCompanionSharedLabelEntry => 'ENTRY';

  @override
  String eventSuccessEventSuccessCompanionSharedTextTitleLocationname({
    required Object title,
    required Object locationName,
  }) {
    return '$title - $locationName';
  }

  @override
  String get eventSuccessEventSuccessCompanionSharedLabelWhatToExpect =>
      'What to expect';

  @override
  String get eventSuccessEventSuccessCompanionSharedLabelIMHereCheck =>
      'I\'m here - check me in';

  @override
  String get eventSuccessEventSuccessCompanionSharedMessageBack => 'Back';

  @override
  String eventSuccessEventSuccessCompanionSharedTextTitleLocationname29e462({
    required Object title,
    required Object locationName,
  }) {
    return '$title · $locationName';
  }

  @override
  String eventSuccessEventSuccessCompanionSharedTextCheckedincount({
    required Object checkedInCount,
  }) {
    return '$checkedInCount';
  }

  @override
  String get eventSuccessEventSuccessCompanionSharedText1PersonIsChecked =>
      '1 person is checked in alongside you';

  @override
  String eventSuccessEventSuccessCompanionSharedTextCountPeopleInThe({
    required Object count,
  }) {
    return '$count people in the room with you';
  }

  @override
  String get eventSuccessEventSuccessCompanionSharedTextTheHostIsRunning =>
      'The host is running the room';

  @override
  String get eventSuccessEventSuccessCompanionSharedTextYourNextPromptOr =>
      'Your next prompt or partner reveal will show up here.';

  @override
  String get eventSuccessEventSuccessCompanionWingmanTextAskTheHostFor =>
      'Ask the host for an intro';

  @override
  String get eventSuccessEventSuccessCompanionWingmanTextTellTheHostWho =>
      'Tell the host who you\'d like to be introduced to. The host can see this request — the other person is not notified.';

  @override
  String eventSuccessEventSuccessCompanionWingmanTextRequestSentForValue1({
    required Object value1,
  }) {
    return 'Request sent for $value1.';
  }

  @override
  String get eventSuccessEventSuccessCompanionWingmanLabelWithdraw =>
      'Withdraw';

  @override
  String get eventSuccessEventSuccessCompanionWingmanTitlePrivateNoteToHost =>
      'Private note to host';

  @override
  String get eventSuccessEventSuccessCompanionWingmanTextNoCheckedInAttendees =>
      'No checked-in attendees available yet.';

  @override
  String get eventSuccessEventSuccessCompanionWingmanLabelRequested =>
      'Requested';

  @override
  String get eventSuccessEventSuccessCompanionWingmanLabelAskHost => 'Ask host';

  @override
  String get eventSuccessEventSuccessCompanionWingmanLabelSwitch => 'Switch';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenTitleSocialPrompt =>
      'Social prompt';

  @override
  String
  get eventSuccessEventSuccessCompanionBodyScreenTitleSuggestedFirstMessageOpeners =>
      'Suggested first-message openers';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenTitleConversationCues =>
      'Conversation cues';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenSubtitleUseOneAfterA =>
      'Use one after a mutual match opens.';

  @override
  String
  get eventSuccessEventSuccessCompanionBodyScreenSubtitlePickOneWhenThe =>
      'Pick one when the room needs an easy next line.';

  @override
  String get eventSuccessEventSuccessHostLiveTitleLiveModeNeedsSaved =>
      'Live mode needs saved setup';

  @override
  String get eventSuccessEventSuccessHostLiveTitleLiveModeWasNot =>
      'Live mode was not configured';

  @override
  String get eventSuccessEventSuccessHostLiveBodySaveTheLiveGuide =>
      'Save the live guide before the event to enable guided controls. Attendance and check-in stay available from this Live tab.';

  @override
  String get eventSuccessEventSuccessHostLiveBodyThisEventDidNot =>
      'This event did not have a live guide saved before it started. Attendance and check-in remain available; guided live controls stay unavailable for this event.';

  @override
  String get eventSuccessEventSuccessHostLiveTitleNoLiveStepsSelected =>
      'No live steps selected';

  @override
  String get eventSuccessEventSuccessHostLiveBodyThisSavedSetupDoes =>
      'This saved setup does not include any tools the host can use during the event.';

  @override
  String get eventSuccessEventSuccessHostLiveTitleConversationCues =>
      'Conversation cues';

  @override
  String get eventSuccessEventSuccessHostLiveSubtitleUseOneWhenThe =>
      'Use one when the room needs a cleaner next interaction.';

  @override
  String get eventSuccessEventSuccessHostLiveSubtitleCloseWithOneSuggested =>
      'Close with one suggested first message after mutual matches.';

  @override
  String get eventSuccessEventSuccessHostLiveTitleGuestPresence =>
      'Guest presence';

  @override
  String
  get eventSuccessEventSuccessHostLiveSubtitlePresenceNeverChangesPublished =>
      'Presence can update the next prepared round. Published rounds stay unchanged.';

  @override
  String eventSuccessEventSuccessHostLiveTextGuestsMayHaveLeft({
    required int count,
  }) {
    return '$count guests may have left. Regenerate the next round before publishing?';
  }

  @override
  String get eventSuccessEventSuccessHostLiveLabelRegenerateNextRound =>
      'Regenerate next round';

  @override
  String get eventSuccessEventSuccessHostLiveTitleLateArrivals =>
      'Late arrivals';

  @override
  String get eventSuccessEventSuccessHostLiveLabelPlaceNextRound =>
      'Place next round';

  @override
  String get eventSuccessEventSuccessHostLiveTitleSupportingControls =>
      'Supporting controls';

  @override
  String
  get eventSuccessEventSuccessHostLiveSubtitleControlsThatStayAvailable =>
      'Controls that stay available without competing with the current live step.';

  @override
  String get eventSuccessEventSuccessHostLiveLabelMarkLiveGuideComplete =>
      'Mark live guide complete';

  @override
  String get eventSuccessEventSuccessHostLiveTitleControlsForThisStep =>
      'Controls for this step';

  @override
  String get eventSuccessEventSuccessHostLiveSubtitleHandleTheseBeforeMoving =>
      'Handle these before moving the room forward.';

  @override
  String
  get eventSuccessEventSuccessHostLiveCatchbuttonEventsuccesspreviousstepbutton =>
      'eventSuccessPreviousStepButton';

  @override
  String get eventSuccessEventSuccessHostLiveLabelPrevious => 'Previous';

  @override
  String
  get eventSuccessEventSuccessHostLiveCatchbuttonEventsuccessnextstepbutton =>
      'eventSuccessNextStepButton';

  @override
  String get eventSuccessEventSuccessHostOverridesTextSmallStarterGroups =>
      'Small starter groups';

  @override
  String eventSuccessEventSuccessHostOverridesLabelLengthAssigned({
    required Object length,
  }) {
    return '$length assigned';
  }

  @override
  String eventSuccessEventSuccessHostOverridesLabelOptedoutcountOptedOut({
    required Object optedOutCount,
  }) {
    return '$optedOutCount opted out';
  }

  @override
  String get eventSuccessEventSuccessHostOverridesLabelHostEdited =>
      'Host edited';

  @override
  String get eventSuccessEventSuccessHostOverridesTextRegenerateToRemoveOpted =>
      'Regenerate to remove opted-out attendee cards from the current pod set.';

  @override
  String
  get eventSuccessEventSuccessHostOverridesTextGenerateAttendeePodCards =>
      'Generate attendee pod cards from the roster, excluding opted-out attendees.';

  @override
  String
  get eventSuccessEventSuccessHostOverridesTextGenerateAttendeePodCards4cbcdf =>
      'Generate attendee pod cards from the current booked and checked-in roster.';

  @override
  String
  get eventSuccessEventSuccessHostOverridesCatchbuttonEventsuccessgeneratemicropodsbutton =>
      'eventSuccessGenerateMicroPodsButton';

  @override
  String get eventSuccessEventSuccessHostOverridesLabelGenerateMicroPods =>
      'Generate micro-pods';

  @override
  String get eventSuccessEventSuccessHostOverridesLabelRegenerate =>
      'Regenerate';

  @override
  String get eventSuccessEventSuccessHostOverridesLabelEditGroups =>
      'Edit groups';

  @override
  String get eventSuccessEventSuccessHostOverridesTitleEditGroups =>
      'Edit groups';

  @override
  String get eventSuccessEventSuccessHostOverridesSubtitleHostOverride =>
      'Host override';

  @override
  String get eventSuccessEventSuccessHostOverridesLabelSaveOverrides =>
      'Save overrides';

  @override
  String eventSuccessEventSuccessHostOverridesLabelGroupValue1({
    required Object value1,
  }) {
    return 'Group $value1';
  }

  @override
  String eventSuccessEventSuccessHostOverridesTextRoundValue1({
    required Object value1,
  }) {
    return 'Round $value1';
  }

  @override
  String get eventSuccessEventSuccessHostOverridesLabelAddGroup => 'Add group';

  @override
  String get eventSuccessEventSuccessHostOverridesTextNoGroupsInThis =>
      'No groups in this round.';

  @override
  String get eventSuccessEventSuccessHostOverridesTitleGroupLabel =>
      'Group label';

  @override
  String get eventSuccessEventSuccessHostOverridesTooltipRemoveGroup =>
      'Remove group';

  @override
  String get eventSuccessEventSuccessHostOverridesLabelAddAttendee =>
      'Add attendee';

  @override
  String get eventSuccessEventSuccessHostOverridesTitleGroupAttendee =>
      'Group attendee';

  @override
  String get eventSuccessEventSuccessHostOverridesHinttextAttendee =>
      'Attendee';

  @override
  String get eventSuccessEventSuccessHostOverridesTooltipRemoveAttendee =>
      'Remove attendee';

  @override
  String get eventSuccessEventSuccessHostOverridesTextTimedPartnerRotations =>
      'Timed partner rotations';

  @override
  String eventSuccessEventSuccessHostOverridesLabelRoundcountRounds({
    required Object roundCount,
  }) {
    return '$roundCount rounds';
  }

  @override
  String
  get eventSuccessEventSuccessHostOverridesTextRegenerateToRemoveOpted4eddde =>
      'Regenerate to remove opted-out attendees from timed rotations.';

  @override
  String
  get eventSuccessEventSuccessHostOverridesTextGeneratePairingsFromEvent =>
      'Generate pairings from event duration, saved cadence, checked-in participants, and mutual gender interest.';

  @override
  String
  eventSuccessEventSuccessHostOverridesLabelEventrotationcapacityPossible({
    required Object eventRotationCapacity,
  }) {
    return '$eventRotationCapacity possible';
  }

  @override
  String
  eventSuccessEventSuccessHostOverridesLabelSitoutroundcountPlannedBreaks({
    required Object sitOutRoundCount,
  }) {
    return '$sitOutRoundCount planned breaks';
  }

  @override
  String
  eventSuccessEventSuccessHostOverridesLabelRepeatpeercountRepeatedPeers({
    required Object repeatPeerCount,
  }) {
    return '$repeatPeerCount repeated peers';
  }

  @override
  String
  get eventSuccessEventSuccessHostOverridesCatchbuttonEventsuccessgeneraterotationsbutton =>
      'eventSuccessGenerateRotationsButton';

  @override
  String get eventSuccessEventSuccessHostOverridesLabelGenerateRotations =>
      'Generate rotations';

  @override
  String get eventSuccessEventSuccessHostOverridesLabelEditRotations =>
      'Edit rotations';

  @override
  String get eventSuccessEventSuccessHostOverridesTitleEditRotations =>
      'Edit rotations';

  @override
  String get eventSuccessEventSuccessHostOverridesLabelAddPair => 'Add pair';

  @override
  String get eventSuccessEventSuccessHostOverridesTextNoPairsInThis =>
      'No pairs in this round.';

  @override
  String get eventSuccessEventSuccessHostOverridesTitleFirstRotationAttendee =>
      'First rotation attendee';

  @override
  String get eventSuccessEventSuccessHostOverridesTitleSecondRotationAttendee =>
      'Second rotation attendee';

  @override
  String get eventSuccessEventSuccessHostOverridesHinttextPartner => 'Partner';

  @override
  String get eventSuccessEventSuccessHostOverridesTooltipRemovePair =>
      'Remove pair';

  @override
  String eventSuccessEventSuccessHostOverridesLabelKeyValueAssigned({
    required Object key,
    required Object value,
  }) {
    return '$key · $value assigned';
  }

  @override
  String get eventSuccessEventSuccessHostOverridesTextAssignmentNotes =>
      'Assignment notes';

  @override
  String get eventSuccessEventSuccessHostReportTitleNoEventReportYet =>
      'No event report yet';

  @override
  String get eventSuccessEventSuccessHostReportBodyTheLiveEventGuide =>
      'The live event guide was not saved for this event, so there is no post-event report to review. Attendance reporting remains available on this screen.';

  @override
  String get eventSuccessEventSuccessHostReportTitlePostEventInsightsAre =>
      'Post-event insights are off';

  @override
  String get eventSuccessEventSuccessHostReportBodyThisEventGuideDoes =>
      'This event guide does not include post-event coaching for the host.';

  @override
  String
  get eventSuccessEventSuccessHostReportTitleWaitingForAttendeeFeedback =>
      'Waiting for attendee feedback';

  @override
  String
  eventSuccessEventSuccessHostReportTitleFeedbackcountAttendeeFeedbackResponse({
    required Object feedbackCount,
    required Object value2,
  }) {
    return '$feedbackCount attendee feedback response$value2';
  }

  @override
  String
  get eventSuccessEventSuccessHostReportBodyTheReportCombinesAttendance =>
      'The report combines attendance, safe aggregate feedback, assignment coverage, and explicit host-help requests. Private notes, safety concerns, and individual opener choices are not shown to hosts.';

  @override
  String get eventSuccessEventSuccessHostReportTextHowReliableIsThis =>
      'How reliable is this report?';

  @override
  String get eventSuccessEventSuccessHostReportTextShowsWhetherTheReport =>
      'Shows whether the report is based on enough live data to trust.';

  @override
  String get eventSuccessEventSuccessHostReportLabelFeedback => 'Feedback';

  @override
  String get eventSuccessEventSuccessHostReportLabelConversationExclusions =>
      'Conversation exclusions';

  @override
  String
  eventSuccessEventSuccessHostReportLabelConversationgraphresponsecountCheckedincountResponses({
    required Object conversationGraphResponseCount,
    required Object checkedInCount,
  }) {
    return '$conversationGraphResponseCount/$checkedInCount responses';
  }

  @override
  String get eventSuccessEventSuccessHostReportLabelCaughtSomeone =>
      'Caught someone';

  @override
  String get eventSuccessEventSuccessHostReportLabelPeopleIncluded =>
      'People included';

  @override
  String get eventSuccessEventSuccessHostReportLabelOptedOut => 'Opted out';

  @override
  String get eventSuccessEventSuccessHostReportLabelWingmanHelp =>
      'Wingman help';

  @override
  String
  eventSuccessEventSuccessHostReportLabelFeedbackresponsecountCheckedincountFeedback({
    required Object feedbackResponseCount,
    required Object checkedInCount,
  }) {
    return '$feedbackResponseCount/$checkedInCount feedback';
  }

  @override
  String
  eventSuccessEventSuccessHostReportLabelAttendeeswhocaughtsomeoneCaughtSomeone({
    required Object attendeesWhoCaughtSomeone,
  }) {
    return '$attendeesWhoCaughtSomeone caught someone';
  }

  @override
  String get eventSuccessEventSuccessHostReportLabelCatchesSent =>
      'Catches sent';

  @override
  String
  eventSuccessEventSuccessHostReportLabelAssignmentparticipantcountAssigned({
    required Object assignmentParticipantCount,
  }) {
    return '$assignmentParticipantCount assigned';
  }

  @override
  String eventSuccessEventSuccessHostReportLabelAssignmentoptoutcountOptedOut({
    required Object assignmentOptOutCount,
  }) {
    return '$assignmentOptOutCount opted out';
  }

  @override
  String
  eventSuccessEventSuccessHostReportLabelWingmanrequestcountHostHelpRequests({
    required Object wingmanRequestCount,
  }) {
    return '$wingmanRequestCount host-help requests';
  }

  @override
  String get eventSuccessEventSuccessHostReportTextEventFunnel =>
      'Event funnel';

  @override
  String get eventSuccessEventSuccessHostReportLabelDemandToBooked =>
      'Demand to booked';

  @override
  String get eventSuccessEventSuccessHostReportLabelRequestsApproved =>
      'Requests approved';

  @override
  String get eventSuccessEventSuccessHostReportLabelOffersAccepted =>
      'Offers accepted';

  @override
  String get eventSuccessEventSuccessHostReportLabelPaymentComplete =>
      'Payment complete';

  @override
  String get eventSuccessEventSuccessHostReportLabelRepeatAttendees =>
      'Repeat attendees';

  @override
  String eventSuccessEventSuccessHostReportLabelTotaldemandcountPeopleInDemand({
    required Object totalDemandCount,
  }) {
    return '$totalDemandCount people in demand';
  }

  @override
  String eventSuccessEventSuccessHostReportLabelWaitlistjoincountWaitlisted({
    required Object waitlistJoinCount,
  }) {
    return '$waitlistJoinCount waitlisted';
  }

  @override
  String eventSuccessEventSuccessHostReportLabelPaymentcompletedcountPaid({
    required Object paymentCompletedCount,
  }) {
    return '$paymentCompletedCount paid';
  }

  @override
  String eventSuccessEventSuccessHostReportLabelChatstartedcountChatsStarted({
    required Object chatStartedCount,
  }) {
    return '$chatStartedCount chats started';
  }

  @override
  String get eventSuccessEventSuccessHostSetupTitleEventStartedWithoutA =>
      'Event started without a saved guide';

  @override
  String get eventSuccessEventSuccessHostSetupTitleLiveGuideCanNo =>
      'Live guide can no longer be saved';

  @override
  String get eventSuccessEventSuccessHostSetupBodyThisEventBeganBefore =>
      'This event began before a live guide was saved. Attendance and check-in still work, but the Live tab won\'t have any guided controls for this event.';

  @override
  String get eventSuccessEventSuccessHostSetupBodyBookingsHaveAlreadyStarted =>
      'Bookings have already started. Attendance and check-in still work, but the Live tab won\'t have guided controls unless a guide was saved first.';

  @override
  String get eventSuccessEventSuccessHostSetupTitleSetupNotSavedYet =>
      'Setup not saved yet';

  @override
  String get eventSuccessEventSuccessHostSetupBodyThisDefaultPlanIs =>
      'This default plan is visible here only. Save it so the Live tab is ready when the event starts.';

  @override
  String get eventSuccessEventSuccessHostSetupTitleSettingsAreLocked =>
      'Settings are locked';

  @override
  String get eventSuccessEventSuccessHostSetupBodyBookingsHaveStartedSo =>
      'Bookings have started, so the saved guide is locked in. Switch to the Live tab to drive the event in real time once it starts.';

  @override
  String get eventSuccessEventSuccessHostSetupBodyTheEventHasStarted =>
      'The event has started — setup is locked. Use the Live tab to control the event right now, and the Report tab afterward.';

  @override
  String get eventSuccessEventSuccessHostSetupTitleYourPlan => 'Your plan';

  @override
  String get eventSuccessEventSuccessHostSetupLabelSaveChanges =>
      'Save changes';

  @override
  String get eventSuccessEventSuccessHostSetupLabelSaveSetup => 'Save setup';

  @override
  String get eventSuccessEventSuccessHostSetupLabelSaveLiveGuide =>
      'Save live guide';

  @override
  String get eventSuccessEventSuccessHostSetupTextTargetAttendees =>
      'Target attendees';

  @override
  String
  eventSuccessEventSuccessHostSetupTextRecommendedRangeRecommendedminRecommendedmax({
    required Object recommendedMin,
    required Object recommendedMax,
  }) {
    return 'Recommended range: $recommendedMin-$recommendedMax';
  }

  @override
  String
  get eventSuccessEventSuccessHostSetupTextAddAGoalSoTheLiveGuideKnowsWhatToAimFor =>
      'Add a goal so the live guide knows what to aim for.';

  @override
  String get eventSuccessEventSuccessHostSetupTitleBeforeLaunch =>
      'Before launch';

  @override
  String get eventSuccessEventSuccessHostSetupTextUnsavedChanges =>
      'Unsaved changes';

  @override
  String eventSuccessEventSuccessHostSharedLabelLengthTools({
    required Object length,
  }) {
    return '$length tools';
  }

  @override
  String get eventSuccessEventSuccessHostSharedLabelNotSaved => 'Not saved';

  @override
  String eventSuccessEventSuccessHostSharedLabelLengthSelected({
    required Object length,
  }) {
    return '$length selected';
  }

  @override
  String get eventSuccessEventSuccessHostSharedTextMatchClueQuestions =>
      'Match clue questions';

  @override
  String get eventSuccessEventSuccessHostSharedLabelCanGuidePairings =>
      'Can guide pairings';

  @override
  String get eventSuccessEventSuccessHostSharedLabelCluesOnly => 'Clues only';

  @override
  String get eventSuccessEventSuccessHostSharedTextSuggestedPairingsCanUse =>
      'Suggested pairings can use shared answers as one light input after interest, safety, and attendee opt-out checks.';

  @override
  String get eventSuccessEventSuccessHostSharedTextAnswersCanStillShape =>
      'Answers can still shape reveal clues, but suggested pairings will not use them.';

  @override
  String get eventSuccessEventSuccessHostSharedTextHelpMeSayHi =>
      '\"Help me say hi\" requests';

  @override
  String eventSuccessEventSuccessHostSharedLabelLengthActive({
    required Object length,
  }) {
    return '$length active';
  }

  @override
  String
  get eventSuccessEventSuccessHostSharedTextAttendeesExplicitlyAskedThe =>
      'Attendees explicitly asked the host for help. Use rotation edits or live facilitation to pair them safely.';

  @override
  String
  get eventSuccessEventSuccessHostSharedTextAttendeesExplicitlyAskedThef44110 =>
      'Attendees explicitly asked the host for help. Use this as live facilitation context.';

  @override
  String get eventSuccessEventSuccessHostSharedTextNoHostHelpRequests =>
      'No host-help requests yet.';

  @override
  String get eventSuccessEventSuccessHostSharedLabelHostVisible =>
      'Host visible';

  @override
  String
  get eventSuccessEventSuccessLiveRevealActionsLabelGenerateAssignmentsFirst =>
      'Generate assignments first';

  @override
  String get eventSuccessEventSuccessLiveRevealActionsLabelRevealNow =>
      'Reveal now';

  @override
  String eventSuccessEventSuccessLiveRevealActionsLabelRevealRoundValue1({
    required Object value1,
  }) {
    return 'Reveal round $value1';
  }

  @override
  String
  eventSuccessEventSuccessLiveRevealActionsLabelDropCountdownsecondsSCountdown({
    required Object countdownSeconds,
  }) {
    return 'Drop ${countdownSeconds}s countdown';
  }

  @override
  String get eventSuccessEventSuccessLiveRevealAttendeeLabelUnlocking =>
      'Unlocking';

  @override
  String get eventSuccessEventSuccessLiveRevealAttendeeLabelRevealed =>
      'Revealed';

  @override
  String get eventSuccessEventSuccessLiveRevealAttendeeLabelWaiting =>
      'Waiting';

  @override
  String
  get eventSuccessEventSuccessLiveRevealHostLabelSynchronizedPartnerReveal =>
      'Synchronized partner reveal';

  @override
  String get eventSuccessEventSuccessLiveRevealHostLabelNoAssignments =>
      'No assignments';

  @override
  String eventSuccessEventSuccessLiveRevealHostLabelValue1RoundcountShown({
    required Object value1,
    required Object roundCount,
  }) {
    return '$value1/$roundCount shown';
  }

  @override
  String get eventSuccessEventSuccessLiveRevealHostCaptionSeconds => 'seconds';

  @override
  String get eventSuccessEventSuccessLiveRevealHostCaptionRevealed =>
      'revealed';

  @override
  String get eventSuccessEventSuccessLiveRevealHostCaptionNextRound =>
      'next round';

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsLabelRoomHold =>
      'Room hold';

  @override
  String
  eventSuccessEventSuccessLiveRevealWidgetsTextEveryoneGetsThisAssignmentnoun({
    required Object assignmentNoun,
  }) {
    return 'Everyone gets this $assignmentNoun at the same time. No names shown yet.';
  }

  @override
  String eventSuccessEventSuccessLiveRevealWidgetsTextSeconds({
    required Object seconds,
  }) {
    return '$seconds';
  }

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsTextSeconds3fb8f1 =>
      'SECONDS';

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsLabelHold => 'Hold';

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsLabelWatch => 'Watch';

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsLabelMove => 'Move';

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsTitleNoNamesShownYet =>
      'No names shown yet';

  @override
  String
  get eventSuccessEventSuccessLiveRevealWidgetsBodyPartnerDetailsStayLocked =>
      'Partner details stay locked until the shared release.';

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsTitleClueIsLive =>
      'Clue is live';

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsTextTheRoomIsHolding =>
      'The room is holding for the reveal.';

  @override
  String eventSuccessEventSuccessLiveRevealWidgetsTextTheHostControlsThe({
    required Object assignmentNoun,
  }) {
    return 'The host controls the $assignmentNoun unlock from live mode.';
  }

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsTitleUnlockedTogether =>
      'Unlocked together';

  @override
  String eventSuccessEventSuccessLiveRevealWidgetsLabelValue1People({
    required Object value1,
  }) {
    return '$value1 people';
  }

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsLabelLoadingPodmates =>
      'Loading podmates';

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsLabelLoadingPartners =>
      'Loading partners';

  @override
  String
  get eventSuccessEventSuccessLiveRevealWidgetsLabelLoadingGroupMembers =>
      'Loading group members';

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsLabelNamesLoading =>
      'Names loading';

  @override
  String eventSuccessEventSuccessLiveRevealWidgetsTextTimerangePeername({
    required Object timeRange,
    required Object peerName,
  }) {
    return '$timeRange · $peerName';
  }

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsLabelHiddenUntilReveal =>
      'Hidden until reveal';

  @override
  String eventSuccessEventSuccessLiveRevealWidgetsLabelRoundValue1({
    required Object value1,
  }) {
    return 'Round $value1';
  }

  @override
  String eventSuccessEventSuccessLiveRevealWidgetsTextRValue1({
    required Object value1,
  }) {
    return 'R$value1';
  }

  @override
  String eventSuccessEventSuccessLiveRevealWidgetsLabelRValue1({
    required Object value1,
  }) {
    return 'R$value1';
  }

  @override
  String eventsEventJoinedCelebrationScreenMessageWithClubname({
    required Object clubName,
  }) {
    return 'with $clubName';
  }

  @override
  String get hostsEditHostedEventRouteScreenTitleEditEvent => 'Edit event';

  @override
  String get hostsEditHostedEventRouteScreenTitleEventNotFound =>
      'Event not found';

  @override
  String get hostsEditHostedEventRouteScreenMessageThisHostedEventIs =>
      'This hosted event is no longer available.';

  @override
  String get hostsEditHostedEventRouteScreenTitleActionUnavailable =>
      'Action unavailable';

  @override
  String get hostsEditHostedEventRouteScreenMessageYouCanEditOnly =>
      'You can edit only events that you host.';

  @override
  String get hostsHostEventManageRouteScreenTitleManageEvent => 'Manage event';

  @override
  String get hostsHostEventManageRouteScreenTitleEventNotFound =>
      'Event not found';

  @override
  String get hostsHostEventManageRouteScreenMessageThisHostedEventIs =>
      'This hosted event is no longer available.';

  @override
  String get hostsHostEventManageRouteScreenTitleActionUnavailable =>
      'Action unavailable';

  @override
  String get hostsHostEventManageRouteScreenMessageYouCanManageOnly =>
      'You can manage only events that you host.';

  @override
  String get hostsHostClubTeamScreenTitleSignOut => 'Sign out';

  @override
  String get hostsHostClubTeamScreenLabelEdit => 'Edit';

  @override
  String get hostsHostClubTeamScreenLabelPreview => 'Preview';

  @override
  String get hostsHostClubTeamScreenTitleProfile => 'Profile';

  @override
  String get hostsHostClubTeamScreenTitleDisplayName => 'Display name';

  @override
  String get hostsHostClubTeamScreenTitleRoleTitle => 'Role title';

  @override
  String get hostsHostClubTeamScreenTitleStatus => 'Status';

  @override
  String get hostsHostClubTeamScreenTitleAboutYouAsA => 'About you as a host';

  @override
  String get hostsHostClubTeamScreenTitleClubsYouHost => 'Organizers you host';

  @override
  String get hostsHostClubTeamScreenTextNoHostClubsYet =>
      'No hosted organizers yet.';

  @override
  String get hostsHostAnalyticsLabelAllEvents => 'All events';

  @override
  String get hostsHostAnalyticsLabel30Days => '30 days';

  @override
  String get hostsHostAnalyticsLabel90Days => '90 days';

  @override
  String get hostsHostAnalyticsLabel12Months => '12 months';

  @override
  String hostsHostAnalyticsTextUpdatedRelative({required Object relative}) {
    return 'Updated $relative';
  }

  @override
  String get hostsHostAnalyticsTextSomeDataIsStillSyncingNumbersMayUpdate =>
      'Some data is still syncing — numbers may update.';

  @override
  String get hostsHostAnalyticsLabelAllTime => 'All time';

  @override
  String get hostsHostAnalyticsLabelPerformancePeriod => 'Performance period';

  @override
  String get hostsHostAnalyticsLabelPerformance => 'Performance';

  @override
  String get hostsHostAnalyticsLabelProfileAndEventViews =>
      'Profile & event views';

  @override
  String get hostsHostAnalyticsLabelProfileViews => 'Profile views';

  @override
  String get hostsHostAnalyticsLabelEventViews => 'Event views';

  @override
  String get hostsHostAnalyticsLabelAttendanceRate => 'Attendance rate';

  @override
  String get hostsHostAnalyticsLabelRevenue => 'Revenue';

  @override
  String get hostsHostAnalyticsLabelConnections => 'Connections';

  @override
  String get hostsHostAnalyticsLabelCheckoutDropOff => 'Checkout drop-off';

  @override
  String get hostsHostAnalyticsLabelCheckoutConversion => 'Checkout conversion';

  @override
  String get hostsHostAnalyticsLabelChatsStarted => 'Chats started';

  @override
  String get hostsHostAnalyticsLabelMoreMetrics => 'More metrics';

  @override
  String get hostsHostAnalyticsBodyCheckoutChatsAndSaves =>
      'Checkout, chats and saves';

  @override
  String get hostsHostAnalyticsLabelPartial => 'Partial';

  @override
  String get hostsHostAnalyticsLabelMissing => 'Missing';

  @override
  String hostsHostAnalyticsTextDirectionPercentVsPreviousPeriod({
    required Object direction,
    required Object percent,
    required Object period,
  }) {
    return '$direction $percent% vs previous $period';
  }

  @override
  String get hostsHostAnalyticsTextNoAnalyticsInThisRange =>
      'No analytics in this range.';

  @override
  String hostsHostAnalyticsTextPeriodDemandBookings({
    required Object period,
    required Object demand,
    required Object bookings,
  }) {
    return '$period: $demand demand · $bookings bookings';
  }

  @override
  String get hostsHostAnalyticsLabelRecentEvents => 'Recent events';

  @override
  String get hostsHostAnalyticsLabelPaymentIssues => 'Payment issues';

  @override
  String hostsHostAnalyticsTextBookedAttendedMatches({
    required Object booked,
    required Object attended,
    required Object matches,
  }) {
    return '$booked booked · $attended attended · $matches matches';
  }

  @override
  String hostsHostAnalyticsTextEventDateStatus({
    required Object date,
    required Object status,
  }) {
    return '$date · $status';
  }

  @override
  String get hostsHostAnalyticsLabelReviews => 'Reviews';

  @override
  String get hostsHostAnalyticsLabelPublishedReviews => 'Published reviews';

  @override
  String get hostsHostAnalyticsStatusLive => 'Live';

  @override
  String get hostsHostAnalyticsStatusActive => 'Active';

  @override
  String get hostsHostAnalyticsStatusOpen => 'Open';

  @override
  String get hostsHostAnalyticsStatusPublished => 'Published';

  @override
  String get hostsHostAnalyticsStatusCompleted => 'Completed';

  @override
  String get hostsHostAnalyticsStatusPast => 'Past';

  @override
  String get hostsHostAnalyticsStatusDraft => 'Draft';

  @override
  String get hostsHostAnalyticsStatusPending => 'Pending';

  @override
  String get hostsHostAnalyticsStatusScheduled => 'Scheduled';

  @override
  String get hostsHostAnalyticsStatusCancelled => 'Cancelled';

  @override
  String get hostsHostAnalyticsLabelTrendBookingsVsDemand =>
      'Trend · bookings vs demand';

  @override
  String get hostsHostAnalyticsLabelDemand => 'Demand';

  @override
  String get hostsHostAnalyticsLabelBookings => 'Bookings';

  @override
  String get hostsHostAnalyticsTextNoEventsInThis => 'No events in this range.';

  @override
  String get hostsHostAnalyticsLabelNewReviews => 'New reviews';

  @override
  String get hostsHostAnalyticsLabelAverageRating => 'Average rating';

  @override
  String get hostsHostAnalyticsLabelEventSaves => 'Event saves';

  @override
  String get hostsHostAnalyticsLabelResponses => 'Responses';

  @override
  String get hostsHostAnalyticsTitleCoach => 'Coach';

  @override
  String get hostsHostAnalyticsCoachAttendance =>
      'Almost half your bookings didn\'t show. Reminders and check-in help — see how your last event ran.';

  @override
  String get hostsHostAnalyticsCoachCheckoutDropoff =>
      'Lots of people started paying and stopped. Review your price or enable demand pricing.';

  @override
  String hostsHostAnalyticsCoachDemandCapacity({required String event}) {
    return 'Demand outran capacity on $event. Consider a bigger venue or a second date.';
  }

  @override
  String get hostsHostAnalyticsCoachNoRepeatAttendees =>
      'No repeat attendees this period. Organizer posts and follows help people come back.';

  @override
  String get hostsHostAuthRequiredScreenTitleSignInRequired =>
      'Sign in required';

  @override
  String get hostsHostAuthRequiredScreenMessageSignInToManage =>
      'Sign in to manage host operations.';

  @override
  String get hostsHostClubProfileTitleIdentity => 'Identity';

  @override
  String get hostsHostClubProfileTitleMedia => 'Media';

  @override
  String get hostsHostClubEditTabActionManageImages => 'Manage images';

  @override
  String get hostsHostClubEditTabBadgeLogo => 'LOGO';

  @override
  String get hostsHostClubProfileLabelClubName => 'Organizer name';

  @override
  String get hostsHostClubProfileLabelCity => 'City';

  @override
  String get hostsHostClubProfileLabelAreaNeighbourhood =>
      'Area / neighbourhood';

  @override
  String get hostsHostClubProfileLabelDescription => 'Description';

  @override
  String get hostsHostClubProfileTitleContact => 'Contact';

  @override
  String get hostsHostClubProfileLabelInstagram => 'Instagram';

  @override
  String get hostsHostClubProfilePlaceholderYourclub => '@yourclub';

  @override
  String get hostsHostClubProfileLabelPhone => 'Phone';

  @override
  String get hostsHostClubProfileLabelEmail => 'Email';

  @override
  String get hostsHostClubProfilePlaceholderHelloYourclubCom =>
      'hello@yourclub.com';

  @override
  String get hostsHostClubEditTabTitleClubSettings => 'Organizer settings';

  @override
  String get hostsHostClubEditTabActionSaveMedia => 'Save media';

  @override
  String get hostsHostClubEditTabActionDiscardMedia => 'Discard';

  @override
  String get hostsHostClubEditTabLabelEventDefaults => 'Event defaults';

  @override
  String get hostsHostClubEditTabLabelLiveEventGuide => 'Live event guide';

  @override
  String get hostsHostClubEditTabLabelPayments => 'Payments';

  @override
  String get hostsHostClubEditTabLabelHostTeam => 'Host team';

  @override
  String get hostsHostClubEditTabValueOn => 'On';

  @override
  String get hostsHostClubEditTabValueOff => 'Off';

  @override
  String hostsHostClubEditTabValueHostCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count hosts',
      one: '1 host',
    );
    return '$_temp0';
  }

  @override
  String get hostsHostClubProfileTitleDefaultActivity => 'Default activity';

  @override
  String get hostsHostClubProfileTitleAdmission => 'Admission';

  @override
  String get hostsHostClubProfileTitleAgeRange => 'Age range';

  @override
  String get hostsHostClubProfileTitleCancellationPolicy =>
      'Cancellation policy';

  @override
  String get hostsHostClubsScaffoldLabelClubWorkspaceTabs =>
      'Organizer workspace tabs';

  @override
  String get hostsHostClubsScaffoldBodyDragLeftOrRight =>
      'Drag left or right to switch between Edit, Insights, and Preview.';

  @override
  String get hostsHostClubsScaffoldLabelEdit => 'Edit';

  @override
  String get hostsHostClubsScaffoldLabelInsights => 'Insights';

  @override
  String get hostsHostClubsScaffoldLabelPreview => 'Preview';

  @override
  String get hostsHostClubsScaffoldTitleNoHostClubsYet =>
      'No hosted organizers yet';

  @override
  String get hostsHostClubsScaffoldBodyCreateAClubOr =>
      'Create an organizer or accept a host invite to start managing events.';

  @override
  String get hostsHostClubsScaffoldLabelCreateClub => 'Create organizer';

  @override
  String get hostsHostEventsListTextEvents => 'Events';

  @override
  String get hostsHostEventsListLabelNewEvent => 'Create event';

  @override
  String get hostsHostEventEntrySheetSectionContinueExisting => 'Continue';

  @override
  String get hostsHostEventEntrySheetSectionStartNew => 'Start new';

  @override
  String get hostsHostEventEntrySheetTitleContinueDraft => 'Continue draft';

  @override
  String get hostsHostEventEntrySheetTitleRepeatLastEvent =>
      'Repeat last event';

  @override
  String hostsHostEventEntrySheetBodySavedDraftCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count saved drafts',
      one: '1 saved draft',
    );
    return '$_temp0';
  }

  @override
  String hostsHostEventEntrySheetBodyReuseEventSetup({
    required String eventTitle,
  }) {
    return 'Reuse the setup from $eventTitle and choose a new date.';
  }

  @override
  String get hostEventsUpcomingTab => 'Upcoming';

  @override
  String get hostEventsPastTab => 'Past';

  @override
  String get hostEventsPastEmptyTitle => 'No past events yet';

  @override
  String get hostEventsPastEmptyBody =>
      'Completed events will appear here with their attendance history.';

  @override
  String hostEventsTodayDate({required String date}) {
    return 'Today · $date';
  }

  @override
  String hostEventsLiveSchedule({required String schedule}) {
    return 'Live · $schedule';
  }

  @override
  String hostEventsAttended({required int count}) {
    return '$count attended';
  }

  @override
  String hostEventsRegisteredCapacity({
    required int count,
    required int capacity,
  }) {
    return '$count of $capacity registered';
  }

  @override
  String hostEventsRegistered({required int count}) {
    return '$count registered';
  }

  @override
  String get hostEventsTimelineLoadMoreSchedule => 'Load more events';

  @override
  String get hostEventsTimelineLoadMoreHistory => 'Load older events';

  @override
  String get hostEventsRowUnpublished => 'Not published';

  @override
  String get hostEventsRowSetupPending => 'Setup in progress';

  @override
  String get hostEventsRowCancelled => 'Cancelled';

  @override
  String get hostsHostEventsScaffoldTitleCreateYourFirstClub =>
      'Create your first organizer';

  @override
  String get hostsHostEventsScaffoldBodyCreateAClubTo =>
      'Create an organizer to publish events, manage attendees, and run Event Success.';

  @override
  String get hostsHostEventsScaffoldLabelCreateClub => 'Create organizer';

  @override
  String get hostsHostOrganizerLabelMembers => 'Followers';

  @override
  String hostsHostOrganizerLabelRatingReviewcountReviews({
    required Object reviewCount,
  }) {
    return 'Rating · $reviewCount reviews';
  }

  @override
  String get hostsHostOrganizerLabelRating => 'Rating';

  @override
  String get hostsHostOrganizerLabelEventsHosted => 'Events hosted';

  @override
  String get hostsHostOrganizerLabelUpcoming => 'Upcoming';

  @override
  String get hostsHostOrganizerCrmTitle => 'Audience';

  @override
  String get hostsHostOrganizerCrmContacts => 'Total contacts';

  @override
  String get hostsHostOrganizerCrmPastAttendees => 'Past attendees';

  @override
  String get hostsHostOrganizerCrmRepeatAttendees => 'Repeat attendees';

  @override
  String get hostsHostOrganizerCrmImportedContacts => 'Imported contacts';

  @override
  String get hostsHostOrganizerCrmChannels => 'Messaging channels';

  @override
  String get hostsHostOrganizerCrmLoading =>
      'Counting deduplicated roster history…';

  @override
  String get hostsHostOrganizerCrmUnavailable =>
      'Audience counts are temporarily unavailable.';

  @override
  String get hostsHostOrganizerCrmCatchApp => 'Catch app';

  @override
  String hostsHostOrganizerCrmLinked({required Object count}) {
    return '$count linked';
  }

  @override
  String get hostsHostOrganizerCrmCurrentEventLive =>
      'Current-event broadcasts live';

  @override
  String get hostsHostOrganizerCrmWhatsapp => 'WhatsApp';

  @override
  String hostsHostOrganizerCrmOptedIn({required Object count}) {
    return '$count opted in';
  }

  @override
  String get hostsHostOrganizerCrmWhatsappSetup =>
      'Business provider + template setup required';

  @override
  String get hostsHostOrganizerCrmTextMessage => 'Text message';

  @override
  String get hostsHostOrganizerCrmSmsSetup =>
      'SMS provider + India DLT setup required';

  @override
  String get hostsHostOrganizerCrmTruncated =>
      'This preview is capped at 2,500 roster records.';

  @override
  String get hostsHostTodayTitleNeedsYou => 'Needs attention';

  @override
  String get hostsHostTodayTooltipSwitchClub => 'Switch organizer';

  @override
  String hostsHostTodayTextEventdaylabelTime({
    required Object eventDayLabel,
    required Object time,
  }) {
    return '$eventDayLabel · $time';
  }

  @override
  String get hostsHostTodayLabelGoing => 'expected';

  @override
  String get hostsHostTodayLabelNeedsYou => 'things to finish';

  @override
  String get hostsHostTodayLabelOpenRunOfShow => 'Open run-of-show';

  @override
  String get hostsHostTodayLabelSetUpRun => 'Continue setup';

  @override
  String get hostTodayTaskSummary => 'Setup, guests, run sheet';

  @override
  String get hostTodayAttentionLiveTitle => 'Event is live';

  @override
  String hostTodayAttentionLiveBody({required Object eventName}) {
    return '$eventName is happening now. Keep guest operations moving.';
  }

  @override
  String get hostTodayAttentionOpenLive => 'Open live controls';

  @override
  String hostTodayAttentionHelpBody({
    required int count,
    required Object eventName,
  }) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count guests need help at $eventName.',
      one: 'One guest needs help at $eventName.',
    );
    return '$_temp0';
  }

  @override
  String hostTodayAttentionDeliveryBody({
    required int count,
    required Object eventName,
  }) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count guest updates need delivery review for $eventName.',
      one: 'One guest update needs delivery review for $eventName.',
    );
    return '$_temp0';
  }

  @override
  String hostTodayAttentionWaitlistBody({
    required Object count,
    required Object eventName,
  }) {
    return '$count people are waiting for $eventName.';
  }

  @override
  String get hostTodayAttentionJoinTitle => 'Review join requests';

  @override
  String hostTodayAttentionJoinBody({
    required Object count,
    required Object eventName,
  }) {
    return '$count join requests are waiting for $eventName.';
  }

  @override
  String get hostTodayAttentionApplicationTitle => 'Review application';

  @override
  String hostTodayAttentionApplicationBody({required Object subjectLabel}) {
    return '$subjectLabel is waiting for a decision.';
  }

  @override
  String get hostTodayAttentionReview => 'Review';

  @override
  String get hostTodayAttentionOfferPaymentTitle => 'Collect offer payments';

  @override
  String hostTodayAttentionOfferPaymentBody({
    required Object count,
    required Object eventName,
  }) {
    return '$count offers for $eventName are still waiting for payment.';
  }

  @override
  String get hostTodayAttentionOfferPaymentOpen => 'Review guests';

  @override
  String get hostTodayAttentionProviderTitle => 'Resolve guest sync';

  @override
  String hostTodayAttentionProviderBody({required Object eventName}) {
    return '$eventName has a guest-list sync that needs reconciliation.';
  }

  @override
  String get hostTodayAttentionAutomationTitle => 'Fix form automation';

  @override
  String hostTodayAttentionAutomationBody({required Object subjectLabel}) {
    return '$subjectLabel stopped before every action completed.';
  }

  @override
  String get hostTodayAttentionFix => 'Fix';

  @override
  String get hostTodayAttentionPayoutTitle => 'Finish payout setup';

  @override
  String hostTodayAttentionPayoutBody({
    required Object count,
    required Object provider,
  }) {
    return '$count paid events need an active $provider payout account.';
  }

  @override
  String get hostTodayAttentionSetUpPayouts => 'Set up payouts';

  @override
  String get hostTodayAttentionAttendanceTitle => 'Resolve attendance sync';

  @override
  String hostTodayAttentionAttendanceBody({required Object eventName}) {
    return '$eventName has an attendance change that needs review.';
  }

  @override
  String get hostTodayAttentionReviewAttendance => 'Review attendance';

  @override
  String get hostTodayAttentionFallbackEvent => 'This event';

  @override
  String get hostTodayAttentionFallbackSubject => 'This item';

  @override
  String get hostTodayAttentionGenericTitle => 'Review task';

  @override
  String get hostTodayAttentionGenericBody =>
      'This item needs a host decision.';

  @override
  String get hostTodayAttentionOpen => 'Open';

  @override
  String get coreBlockUserDialogMessageYouWillStopSeeing =>
      'You will stop seeing each other in chats, matches, Catches, and future event slots where the other person is already booked.';

  @override
  String get coreCatchFrameworkErrorViewTextThisScreenHitA =>
      'This screen hit a temporary app error. Please go back or try again in a moment.';

  @override
  String dashboardEventFocusRailLabelShortweekdayDayShortmonthTimerangelabel({
    required Object shortWeekday,
    required Object day,
    required Object shortMonth,
    required Object timeRangeLabel,
  }) {
    return '$shortWeekday, $day $shortMonth · $timeRangeLabel';
  }

  @override
  String eventSuccessEventSuccessCompanionSharedLabelAdmitOneNoPadleft({
    required Object padLeft,
    required Object capacity,
  }) {
    return 'ADMIT ONE - NO $padLeft / $capacity';
  }

  @override
  String get eventSuccessEventSuccessCompanionWingmanTextThisAttendee =>
      'this attendee';

  @override
  String get eventSuccessEventSuccessHostReportBodyThePostEventReport =>
      'The post-event report appears once checked-in attendees share feedback. There is no signal to summarize yet.';

  @override
  String get eventSuccessEventSuccessHostReportTitleS => 's';

  @override
  String get exploreExploreScreenMessageTryAnotherCityFrom =>
      'Try another city from the location control, or create the first organizer when you are ready to host.';

  @override
  String get forceUpdateUpdateRequiredScreenTextANewVersionOf =>
      'A new version of Catch is available. Please update to continue.';

  @override
  String hostsHostEventToolsLabelSignedupcountCapacitylimitBookedWaitlistcount({
    required Object signedUpCount,
    required Object capacityLimit,
    required Object waitlistCount,
  }) {
    return '$signedUpCount/$capacityLimit booked · $waitlistCount waitlist';
  }

  @override
  String get onboardingWelcomePageTextShowUpToSomething =>
      'Show up to something you\'d do anyway — a long run, a long table, trivia night. Match only with the people who were actually there.';

  @override
  String
  paymentsPaymentConfirmationScreenTextLongdatelabelTimerangelabelLocationnamePriceinpaise({
    required Object longDateLabel,
    required Object timeRangeLabel,
    required Object locationName,
    required Object priceInPaise,
    required Object capacityLimit,
  }) {
    return '$longDateLabel · $timeRangeLabel · $locationName. $priceInPaise · $capacityLimit spots.';
  }

  @override
  String paymentsPaymentConfirmationScreenMessageProviderlabelDidNotComplete({
    required Object providerLabel,
  }) {
    return '$providerLabel did not complete this booking. If money moved, it stays visible in payment history while support resolves it.';
  }

  @override
  String paymentsPaymentConfirmationScreenMessageFinishPaymentInProviderlabel({
    required Object providerLabel,
    required Object providerLabel2,
  }) {
    return 'Finish payment in $providerLabel. Your spot is reserved only after $providerLabel2 confirms the payment and Catch writes the booking.';
  }

  @override
  String get paymentsPaymentConfirmationScreenTextBringAWaterBottle =>
      'Bring a water bottle and arrive by the meeting time. Catches unlock automatically when the event finishes — keep your phone charged.';

  @override
  String get safetySettingsScreenMessageThisRemovesYourPublic =>
      'This removes your public profile, signs you out, and keeps only the minimal records required for safety and payment history.';

  @override
  String get onboardingOnboardingStepTitleWelcome => 'Welcome';

  @override
  String get onboardingOnboardingStepTitleWhatSYourName => 'What\'s your name?';

  @override
  String get onboardingOnboardingStepSubtitleLastNameStaysPrivate =>
      'Last name stays private until you catch.';

  @override
  String get onboardingOnboardingStepTitleHowDoYouIdentify =>
      'How do you identify?';

  @override
  String get onboardingOnboardingStepTitleYourInstagram => 'Your Instagram';

  @override
  String get onboardingOnboardingStepSubtitleHelpsUsVerifyYou =>
      'Helps us verify you for early access. Your handle is never shown to other users.';

  @override
  String get onboardingOnboardingStepTitleCompleteYourProfileFor =>
      'Complete your profile for Catches';

  @override
  String get onboardingOnboardingStepSubtitleCatchesNeedPhotosSo =>
      'Catches need photos so people can decide who they want to meet. You can still book events with your current details.';

  @override
  String get onboardingOnboardingStepTitleShowYourself => 'Show yourself';

  @override
  String get onboardingOnboardingStepSubtitleAddAtLeast2 =>
      'Add at least 2 photos so others can find you.';

  @override
  String get onboardingOnboardingStepTitleAddPromptsToStart =>
      'Add prompts to start catching';

  @override
  String get onboardingOnboardingStepSubtitlePromptsGivePeopleSomething =>
      'Prompts give people something real to respond to before you match.';

  @override
  String get onboardingOnboardingStepTitleShowYourPersonality =>
      'Show your personality';

  @override
  String get onboardingOnboardingStepSubtitleAnswer3PromptsTo =>
      'Answer 3 prompts to complete your profile.';

  @override
  String get onboardingOnboardingStepTitleFinishYourCatchesProfile =>
      'Finish your Catches profile';

  @override
  String get onboardingOnboardingStepSubtitleTheseAreOptionalBut =>
      'These are optional, but they help us rank compatible people in Catches.';

  @override
  String get onboardingOnboardingStepTitleSetYourRunPreferences =>
      'Set your run preferences';

  @override
  String get onboardingOnboardingStepSubtitleWeOnlyAskFor =>
      'We only ask for these before run events so hosts can plan pace groups and distances.';

  @override
  String get onboardingOnboardingStepTitleYourRunningStyle =>
      'Your running style';

  @override
  String get onboardingOnboardingStepSubtitleHelpUsFindCompatible =>
      'Help us find compatible running partners.';

  @override
  String get userProfileSelfProfileEditTabStateLabelDisplayName =>
      'Display name';

  @override
  String get userProfileSelfProfileEditTabStateLabelDateOfBirth =>
      'Date of birth';

  @override
  String userProfileSelfProfileEditTabStateBodyPadleftPadleft2YearAgeon({
    required Object padLeft,
    required Object padLeft2,
    required Object year,
    required Object ageOn,
  }) {
    return '$padLeft/$padLeft2/$year  ($ageOn years)';
  }

  @override
  String get userProfileSelfProfileEditTabStateLabelGender => 'Gender';

  @override
  String get userProfileSelfProfileEditTabStateLabelPhone => 'Phone';

  @override
  String get userProfileSelfProfileEditTabStateLabelEmail => 'Email';

  @override
  String get userProfileSelfProfileEditTabStateLabelInstagram => 'Instagram';

  @override
  String get userProfileSelfProfileEditTabStateLabelHeight => 'Height';

  @override
  String get userProfileSelfProfileEditTabStateLabelCity => 'City';

  @override
  String get userProfileSelfProfileEditTabStateLabelJobTitle => 'Job title';

  @override
  String get userProfileSelfProfileEditTabStateLabelCompany => 'Company';

  @override
  String get userProfileSelfProfileEditTabStateLabelEducation => 'Education';

  @override
  String get userProfileSelfProfileEditTabStateLabelReligion => 'Religion';

  @override
  String get userProfileSelfProfileEditTabStateLabelLanguages => 'Languages';

  @override
  String get userProfileSelfProfileEditTabStateLabelLookingFor => 'Looking for';

  @override
  String get userProfileSelfProfileEditTabStateLabelPaceRange => 'Pace range';

  @override
  String get userProfileSelfProfileEditTabStateLabelPreferredDistances =>
      'Distances';

  @override
  String get userProfileSelfProfileEditTabStateLabelWhyIEvent => 'Motivation';

  @override
  String get userProfileSelfProfileEditTabStateLabelFavoriteEventTimes =>
      'Run times';

  @override
  String get userProfileSelfProfileEditTabStateLabelDrinking => 'Drinking';

  @override
  String get userProfileSelfProfileEditTabStateLabelSmoking => 'Smoking';

  @override
  String get userProfileSelfProfileEditTabStateLabelWorkout => 'Workout';

  @override
  String get userProfileSelfProfileEditTabStateLabelDiet => 'Diet';

  @override
  String get userProfileSelfProfileEditTabStateLabelChildren => 'Children';

  @override
  String get eventsEventDetailScreenStateLabelPaidBookingUnavailable =>
      'Paid booking unavailable';

  @override
  String get eventsEventDetailScreenStateLabelAcceptSpot => 'Accept spot';

  @override
  String get eventsEventDetailScreenStateLabelAcceptSpotAndPay =>
      'Accept spot and pay';

  @override
  String get eventsEventDetailScreenStateLabelSetRunPreferences =>
      'Set run preferences';

  @override
  String get eventsEventDetailScreenStateLabelRequestToJoin =>
      'Request to join';

  @override
  String get eventsEventDetailScreenStateLabelJoinWaitlist => 'Join waitlist';

  @override
  String get eventsEventDetailScreenStateLabelWithdrawRequest =>
      'Withdraw request';

  @override
  String get eventsEventDetailScreenStateLabelLeaveWaitlist => 'Leave waitlist';

  @override
  String get eventsEventDetailScreenStateLabelYouAttendedThisEvent =>
      'You attended this event';

  @override
  String get eventsEventDetailScreenStateLabelThisEventHasEnded =>
      'This event has ended';

  @override
  String get eventsEventDetailScreenStateLabelEventCancelled =>
      'This event was cancelled';

  @override
  String eventsEventDetailScreenStateLabelMustBeMinageTo({
    required Object minAge,
  }) {
    return 'Must be $minAge+ to join';
  }

  @override
  String eventsEventDetailScreenStateLabelMustBeMaxageOr({
    required Object maxAge,
  }) {
    return 'Must be $maxAge or younger';
  }

  @override
  String get eventsEventDetailScreenStateLabelInviteRequired =>
      'Invite required';

  @override
  String get eventsEventDetailScreenStateLabelRequestRequired =>
      'Request required';

  @override
  String get eventsEventDetailScreenStateLabelSpotsForYourGender =>
      'Spots for your gender are full';

  @override
  String get eventsEventDetailScreenStateLabelNotEligibleForThis =>
      'Not eligible for this event';

  @override
  String get eventsEventDetailScreenStateLabelJoinApprovedEvent =>
      'Join approved event';

  @override
  String get eventsEventDetailScreenStateLabelCompleteApprovedBooking =>
      'Complete approved booking';

  @override
  String eventsEventDetailScreenStateLabelJoinEventJoinctaavailabilitylabel({
    required Object joinCtaAvailabilityLabel,
  }) {
    return 'Join event — $joinCtaAvailabilityLabel';
  }

  @override
  String get eventsEventDetailScreenStateLabelBookEvent => 'Book event';

  @override
  String get eventsEventDetailScreenStateLabelEventFull => 'Event full';

  @override
  String get eventsEventDetailScreenStateLabelEventInProgress =>
      'Event in progress';

  @override
  String get eventsEventDetailScreenLabelCompleteBookingProfile =>
      'Complete booking profile';

  @override
  String get eventsEventDetailScreenStateLabelCancelBooking => 'Cancel booking';

  @override
  String get coreEventActivityVisualsLabelSocialRun => 'Social run';

  @override
  String get coreEventActivityVisualsLabelRunning => 'Running';

  @override
  String get coreEventActivityVisualsLabelWalking => 'Walking';

  @override
  String get coreEventActivityVisualsLabelPickleball => 'Pickleball';

  @override
  String get coreEventActivityVisualsLabelPadel => 'Padel';

  @override
  String get coreEventActivityVisualsLabelTennis => 'Tennis';

  @override
  String get coreEventActivityVisualsLabelBadminton => 'Badminton';

  @override
  String get coreEventActivityVisualsLabelCycling => 'Cycling';

  @override
  String get coreEventActivityVisualsLabelSpinClass => 'Spin class';

  @override
  String get coreEventActivityVisualsLabelYoga => 'Yoga';

  @override
  String get coreEventActivityVisualsLabelStrength => 'Strength';

  @override
  String get coreEventActivityVisualsLabelDinner => 'Dinner';

  @override
  String get coreEventActivityVisualsLabelPubQuiz => 'Pub quiz';

  @override
  String get coreEventActivityVisualsLabelBarCrawl => 'Bar crawl';

  @override
  String get coreEventActivityVisualsLabelSinglesMixer => 'Singles mixer';

  @override
  String get coreEventActivityVisualsLabelOpenFormat => 'Open format';

  @override
  String eventSuccessEventSuccessCompanionScreenStateBodyWhenCheckInOpens({
    required Object locationName,
  }) {
    return 'When check-in opens, this screen turns into the live guide for $locationName.';
  }

  @override
  String get eventSuccessEventSuccessCompanionScreenStateBodyOneTapTellsThe =>
      'One tap tells the host you are in the room and ready for the live flow.';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateBodyFindOnePersonAsk =>
      'Find one person, ask one tiny question, and let the room start with permission instead of pressure.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateBodyQuickAnswersHelpCatch =>
      'Quick answers help Catch shape prompts without turning the event into a form.';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateBodyTheHostIsPacing =>
      'The host is pacing the room from live mode.';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateBodyUseItIfThe =>
      'Use it if the room needs an easy next line.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateBodyTheseAreLightNudges =>
      'These are light nudges for the current event moment.';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateBodyUseItAsA =>
      'Use it as a nudge into the next interaction, then let the room breathe.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateBodyTheHostControlsThe =>
      'The host controls the timing so the room unlocks together instead of leaking awkwardly.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateBodyChooseSomeoneYouWant =>
      'Choose someone you want help meeting and the host can use that as live facilitation context.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateBodyKeepTheUsefulParts =>
      'Keep the useful parts of the room, send private feedback, and use event-specific openers when a match appears.';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateBodyTheHostIsRunning =>
      'The host is running the room. Your next prompt or reveal appears here when it is time.';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateTitleEventNotFound =>
      'Event not found';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateMessageThisEventIsNo =>
      'This event is no longer available.';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateTitleSignInRequired =>
      'Sign in required';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateMessageSignInToOpen =>
      'Sign in to open your event companion.';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateTitleNoBookingFound =>
      'No booking found';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateMessageBookThisEventBefore =>
      'Book this event before opening the companion.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateTitleCompanionNotAvailable =>
      'Companion not available';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateMessageTheHostHasNot =>
      'The host has not enabled the live event guide for this event yet.';

  @override
  String get paymentsPaymentHistoryScreenLabelRefunded => 'Refunded';

  @override
  String get paymentsPaymentHistoryScreenDetailBookingFailedButYour =>
      'Booking failed, but your payment was refunded.';

  @override
  String get paymentsPaymentHistoryScreenLabelRefundPending => 'Refund pending';

  @override
  String get paymentsPaymentHistoryScreenDetailNoSpotWasReserved =>
      'No spot was reserved and the refund needs attention. Please contact support.';

  @override
  String get paymentsPaymentHistoryScreenLabelBookingFailed => 'Booking failed';

  @override
  String get paymentsPaymentHistoryScreenDetailNoSpotWasReservedd0a580 =>
      'No spot was reserved. Refund may still be pending.';

  @override
  String get paymentsPaymentHistoryScreenLabelPaid => 'Paid';

  @override
  String get paymentsPaymentHistoryScreenLabelFailed => 'Failed';

  @override
  String get paymentsPaymentHistoryScreenDetailYourRefundNeedsAttention =>
      'Your refund needs attention. Please contact support.';

  @override
  String get paymentsPaymentHistoryScreenLabelPending => 'Pending';

  @override
  String get swipesSwipeEmptyContentTitleNoMoreAttendees => 'No more attendees';

  @override
  String get swipesSwipeEmptyContentMessageJoinMoreEventsTo =>
      'Join more events to meet new people';

  @override
  String get swipesSwipeEmptyContentTitleCatchUnavailable =>
      'Catch unavailable';

  @override
  String get swipesSwipeEmptyContentMessageThisEventCouldNot =>
      'This event could not be found.';

  @override
  String get swipesSwipeEmptyContentTitleSignInRequired => 'Sign in required';

  @override
  String get swipesSwipeEmptyContentMessageSignInAgainTo =>
      'Sign in again to catch fellow attendees.';

  @override
  String get swipesSwipeEmptyContentMessageYouCanOnlyCatch =>
      'You can only catch attendees from events you attended.';

  @override
  String get swipesSwipeEmptyContentTitleEventInProgress => 'Event in progress';

  @override
  String get swipesSwipeEmptyContentMessageCatchesUnlockFor24 =>
      'Catches unlock for 24 hours after the event finishes.';

  @override
  String get swipesSwipeEmptyContentTitleCatchWindowClosed =>
      'Catch window closed';

  @override
  String get swipesSwipeEmptyContentMessageThisEventIsPast =>
      'This event is past the 24-hour catch window.';

  @override
  String get reviewsReviewsHistoryViewModelTitleSignInToSee =>
      'Sign in to see reviews';

  @override
  String get reviewsReviewsHistoryViewModelMessageYourPastEventReviews =>
      'Your past event reviews will appear here.';

  @override
  String get reviewsReviewsHistoryViewModelTitleReviewsUnavailable =>
      'Reviews unavailable';

  @override
  String get reviewsReviewsHistoryViewModelMessageCouldNotLoadYour =>
      'Could not load your profile.';

  @override
  String get reviewsReviewsHistoryViewModelMessageCouldNotLoadYourb38403 =>
      'Could not load your reviews.';

  @override
  String get reviewsReviewsHistoryViewModelTitleNoReviewsYet =>
      'No reviews yet';

  @override
  String get reviewsReviewsHistoryViewModelMessageAfterYouReviewA =>
      'After you review a completed event, it will appear here.';

  @override
  String get exploreExploreScreenStateLabelMap => 'Map';

  @override
  String exploreExploreScreenStateSemanticsMapEventCount({
    required int mappableEventCount,
  }) {
    String _temp0 = intl.Intl.pluralLogic(
      mappableEventCount,
      locale: localeName,
      other: '$mappableEventCount events',
      one: '1 event',
    );
    return 'Map, $_temp0';
  }

  @override
  String get exploreExploreScreenStateLabelAny => 'Any';

  @override
  String get exploreExploreScreenStateLabel1Km => '1 km';

  @override
  String get exploreExploreScreenStateLabel3Km => '3 km';

  @override
  String get exploreExploreScreenStateLabel5Km => '5 km';

  @override
  String get exploreExploreScreenStateLabel10Km => '10 km';

  @override
  String get exploreExploreScreenStateCtaViewAndBook => 'View and book';

  @override
  String get exploreExploreScreenStateCtaViewAndRequest => 'View and request';

  @override
  String get exploreExploreScreenStateCtaViewWaitlist => 'View waitlist';

  @override
  String get exploreExploreScreenStateCtaViewEvent => 'View event';

  @override
  String get exploreExploreScreenStateActionlabelOpen => 'Open';

  @override
  String get exploreExploreScreenStateActionlabelNoLink => 'No link';

  @override
  String get exploreExploreScreenStateCaptionClubToKnow => 'Organizer to know';

  @override
  String get exploreExploreScreenStateLabelHostedBy => 'Hosted by';

  @override
  String get exploreExploreScreenStateTitleNoEventsMatchThis =>
      'No events match this search';

  @override
  String get exploreExploreScreenStateMessageClearTheSearchAnd =>
      'Clear the search and filters to see every upcoming event.';

  @override
  String get exploreExploreScreenStateActionlabelClearSearchAndFilters =>
      'Clear search and filters';

  @override
  String get exploreExploreScreenStateTitleNothingTonight => 'Nothing tonight';

  @override
  String get exploreExploreScreenStateMessageTheNextGoodFit =>
      'The next good fit may be over the weekend.';

  @override
  String get exploreExploreScreenStateTitleNothingTomorrow =>
      'Nothing tomorrow';

  @override
  String get exploreExploreScreenStateMessageOpenUpTheWeekend =>
      'Open up the weekend to catch more event slots.';

  @override
  String get exploreExploreScreenStateTitleNothingThisWeekend =>
      'Nothing this weekend';

  @override
  String get exploreExploreScreenStateMessageThisWeekHasThe =>
      'This week has the broader event slate.';

  @override
  String get exploreExploreScreenStateActionlabelSeeThisWeek => 'See this week';

  @override
  String get exploreExploreScreenStateTitleNothingThisWeek =>
      'Nothing this week';

  @override
  String get exploreExploreScreenStateMessageRemoveTheTimeWindow =>
      'Remove the time window to see every upcoming event.';

  @override
  String get exploreExploreScreenStateActionlabelSeeAnytime => 'See anytime';

  @override
  String get exploreExploreScreenStateTitleNoUpcomingEventsMatch =>
      'No upcoming events match this view';

  @override
  String get exploreExploreScreenStateMessageTryADifferentArea =>
      'Try a different area, a wider distance, or check the organizer directory below.';

  @override
  String get exploreExploreScreenStateActionlabelClearFilters =>
      'Clear filters';

  @override
  String get hostsHostEventManageScreenStateDescriptionThisEventCanStay =>
      'This event can stay listed; only people with this code or private link can book.';

  @override
  String get hostsHostEventManageScreenStateDescriptionThisEventRequiresAn =>
      'This event requires an invite, but no host-readable access code was found.';

  @override
  String get hostsHostEventManageScreenStateLabelAll => 'All';

  @override
  String get hostsHostEventManageScreenStateLabelBooked => 'Booked';

  @override
  String get hostsHostEventManageScreenStateLabelRequests => 'Requests';

  @override
  String get hostsHostEventManageScreenStateLabelWaitlist => 'Waitlist';

  @override
  String get hostsHostEventManageScreenStateLabelSlots => 'Slots';

  @override
  String get hostsHostEventManageScreenStateEmptytitleNoMatches => 'No matches';

  @override
  String get hostsHostEventManageScreenStateEmptytitleOpenSlotsAreNot =>
      'Open slots are not people';

  @override
  String get hostsHostEventManageScreenStateEmptytitleNoParticipantsYet =>
      'No participants yet';

  @override
  String get hostsHostEventManageScreenStateLabelDue => 'Due';

  @override
  String get hostsHostEventManageScreenStateLabelIn => 'In';

  @override
  String get hostsHostEventManageScreenStateLabelAttended => 'Attended';

  @override
  String get hostsHostEventManageScreenStateLabelNoShow => 'No-show';

  @override
  String get hostsHostEventManageScreenStateLabelSetup => 'Setup';

  @override
  String get hostsHostEventManageScreenStateLabelGuests => 'Guests';

  @override
  String get hostsHostEventManageScreenStateLabelLive => 'Live';

  @override
  String get hostsHostEventManageScreenStateLabelReport => 'Report';

  @override
  String get hostsHostEventManageScreenStateLabelOffered => 'Offered';

  @override
  String get hostsHostEventManageScreenStateLabelAccepted => 'Accepted';

  @override
  String get hostsHostEventManageScreenStateLabelRequest => 'Request';

  @override
  String get hostsHostEventManageScreenStateLabelWait => 'Wait';

  @override
  String get hostsHostEventManageScreenStateLabelExpired => 'Expired';

  @override
  String get hostsHostEventManageScreenStateLabelNew => 'New';

  @override
  String get eventsEventDetailDesignPrimitivesActionViewMap => 'View map';

  @override
  String get eventsEventDetailInformationStateTitleIfItFillsSpotsReopen =>
      'If it fills, spots reopen';

  @override
  String get eventsEventDetailInformationStateBodyEligiblePeopleAreNotified =>
      'Eligible people are notified together; the first completed booking gets the spot.';

  @override
  String get eventsEventDetailInformationStateTitleHostManagedWaitlist =>
      'Host-managed waitlist';

  @override
  String
  get eventsEventDetailInformationStateBodyTheHostReviewsWaitingRequests =>
      'The host reviews waiting requests when capacity opens.';

  @override
  String get eventsEventDetailInformationStateTitleVariablePricing =>
      'Variable pricing';

  @override
  String get eventsEventDetailInformationStateTitlePlansChange =>
      'Plans change?';

  @override
  String get eventsEventDetailInformationStateBodyReleaseYourSpotEarly =>
      'Release your spot early so the waitlist can move.';

  @override
  String get eventsEventDetailDesignPrimitivesLabelWhen => 'When';

  @override
  String get eventsEventDetailDesignPrimitivesLabelWhere => 'Where';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyThisEventIsCurrently =>
      'This event is currently full; the waitlist keeps priority order.';

  @override
  String eventsEventDetailDesignPrimitivesVisiblecopyOnlyRemainingValue2Left({
    required Object remaining,
    required Object value2,
  }) {
    return 'Only $remaining $value2 left before sign-ups move to waitlist.';
  }

  @override
  String eventsEventDetailDesignPrimitivesVisiblecopySpotslabelSpotsAreAlready({
    required Object spotsLabel,
  }) {
    return '$spotsLabel spots are already spoken for.';
  }

  @override
  String get eventsEventDetailDesignPrimitivesTitleIfItFillsA =>
      'If it fills, a waitlist';

  @override
  String get eventsEventDetailDesignPrimitivesDetailSpotsFreeUpIn =>
      'Spots free up in order as capacity changes or people cancel.';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyTheFormatKeepsThe =>
      'The format keeps the pace conversational, with regroup points so nobody gets stranded.';

  @override
  String
  get eventsEventDetailDesignPrimitivesVisiblecopyRotationsGiveYouNatural =>
      'Rotations give you natural one-on-one moments without managing the room yourself.';

  @override
  String
  get eventsEventDetailDesignPrimitivesVisiblecopyTeamStructureCreatesLow =>
      'Team structure creates low-pressure reasons to talk throughout the event.';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyASeatedFormatAnd =>
      'A seated format and host cues make the first conversation easier.';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyHostNudgesKeepThe =>
      'Host nudges keep the room moving when it needs a little structure.';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyTheHostRunsThe =>
      'The host runs the arc, so you can just show up and follow the moment.';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyTheHostShapesThe =>
      'The host shapes the format around the room and venue.';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyPace => 'Pace';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyOpenSignUp =>
      'Open sign-up';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyInviteOnly =>
      'Invite only';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyHostApproval =>
      'Host approval';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyCohortCaps =>
      'Cohort caps';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyBalancedSingles =>
      'Balanced singles';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyMembersOnly =>
      'Members only';

  @override
  String eventsEventDetailDesignPrimitivesVisiblecopyNoApprovalNeededRsvp({
    required Object capacityLimit,
  }) {
    return 'No approval needed; RSVP until $capacityLimit spots are filled.';
  }

  @override
  String
  get eventsEventDetailDesignPrimitivesVisiblecopyBookWithinTotalCapacity =>
      'Book within total capacity while cohort caps keep the room balanced.';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyStraightMenAndWomen =>
      'Straight men and women are balanced within a small tolerance; other cohorts book within total capacity.';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyOnlyAttendeesWithThe =>
      'Only attendees with the host invite can book this event.';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopyRequestASpotFirst =>
      'Request a spot first; the host reviews requests before confirming.';

  @override
  String
  get eventsEventDetailDesignPrimitivesVisiblecopyOnlyActiveClubMembers =>
      'Only active organizer followers can book this event.';

  @override
  String get clubsClubDetailDockVisiblecopyFreeToJoinLeave =>
      'FREE TO JOIN · LEAVE ANYTIME';

  @override
  String get clubsClubDetailDockVisiblecopyMemberManageAnytime =>
      'MEMBER · MANAGE ANYTIME';

  @override
  String get dashboardEventFocusRailVisiblecopy1Event => '1 event';

  @override
  String dashboardEventFocusRailVisiblecopyLengthEvents({
    required Object length,
  }) {
    return '$length events';
  }

  @override
  String dashboardEventFocusRailVisiblecopyValue1Cardcount({
    required Object value1,
    required Object cardCount,
  }) {
    return '$value1/$cardCount';
  }

  @override
  String get hostsHostPaymentAccountCardTitleSetUpInternationalPayouts =>
      'Set up international payouts';

  @override
  String get hostsHostPaymentAccountCardBodyRequiredBeforePaidNon =>
      'Required before paid non-INR events can accept checkout through Stripe.';

  @override
  String get hostsHostPaymentAccountCardTitleInternationalCheckoutIsReady =>
      'International checkout is ready';

  @override
  String get hostsHostPaymentAccountCardBodyNonInrPaidBookings =>
      'Non-INR paid bookings can route through Stripe for this host account.';

  @override
  String get hostsHostPaymentAccountCardTitleStripeNeedsMoreInformation =>
      'Stripe needs more information';

  @override
  String get hostsHostPaymentAccountCardBodyFinishTheOutstandingStripe =>
      'Finish the outstanding Stripe requirements to accept payments.';

  @override
  String get hostsHostPaymentAccountCardTitleStripeOnboardingIsIn =>
      'Stripe onboarding is in progress';

  @override
  String get hostsHostPaymentAccountCardBodyRefreshAfterCompletingStripe =>
      'Refresh after completing Stripe onboarding to update checkout readiness.';

  @override
  String get hostsCreateEventPolicyStateLabelOpen => 'OPEN';

  @override
  String get hostsCreateEventPolicyStateLabelInvite => 'INVITE';

  @override
  String get hostsCreateEventPolicyStateLabelRequest => 'REQUEST';

  @override
  String get hostsCreateEventPolicyStateLabelBalanced => 'BALANCED';

  @override
  String get hostsCreateEventPolicyStateTitleOpenCapacity => 'Open capacity';

  @override
  String get hostsCreateEventPolicyStateTitleInviteOnly => 'Invite only';

  @override
  String get hostsCreateEventPolicyStateTitleRequestToJoin => 'Request to join';

  @override
  String get hostsCreateEventPolicyStateTitleBalancedSingles =>
      'Balanced singles';

  @override
  String get dashboardDashboardEmptyTitleBookAGroupEvent =>
      'Book a group event';

  @override
  String get dashboardDashboardEmptyBodyPickAClubNear =>
      'Pick an organizer near you. Pay the fee — or don\'t; some are free.';

  @override
  String get dashboardDashboardEmptyTitleActuallyShowUp => 'Actually show up';

  @override
  String get dashboardDashboardEmptyBodyMeetTheClubAt =>
      'Meet the organizer at the event. No cold matching happens here.';

  @override
  String get dashboardDashboardEmptyTitleCatchWithin24Hours =>
      'Catch within 24 hours';

  @override
  String get dashboardDashboardEmptyBodyYouGetTheRoster =>
      'You get the roster of who came. Catch anyone who caught your eye.';

  @override
  String get dashboardDashboardEmptyTitleTheyCatchYouBack =>
      'They catch you back?';

  @override
  String get dashboardDashboardEmptyBodyMatchMessagePlanThe =>
      'Match. Message. Plan the next event together.';

  @override
  String get hostsHostTeamManagementSectionTitleRemoveHost => 'Remove host?';

  @override
  String get hostsHostTeamManagementSectionTitleTransferOwnership =>
      'Transfer ownership?';

  @override
  String hostsHostTeamManagementSectionMessageDisplaynameWillStayA({
    required Object displayName,
  }) {
    return '$displayName will stay an organizer follower but will lose host tools.';
  }

  @override
  String hostsHostTeamManagementSectionMessageDisplaynameWillBecomeThe({
    required Object displayName,
  }) {
    return '$displayName will become the organizer owner. You will remain a host.';
  }

  @override
  String get hostsHostTeamManagementSectionLabelCancel => 'Cancel';

  @override
  String get hostsHostTeamManagementSectionLabelRemove => 'Remove';

  @override
  String get hostsHostTeamManagementSectionLabelTransfer => 'Transfer';

  @override
  String hostsHostTeamManagementSectionSuccessmessageDisplaynameRemoved({
    required Object displayName,
  }) {
    return '$displayName removed.';
  }

  @override
  String
  hostsHostTeamManagementSectionSuccessmessageOwnershipTransferredToDisplayname({
    required Object displayName,
  }) {
    return 'Ownership transferred to $displayName.';
  }

  @override
  String get eventSuccessEventSuccessCompanionSharedLabelPostEventFollowUp =>
      'Post-event follow-up opens after attendance is confirmed.';

  @override
  String
  get eventSuccessEventSuccessCompanionSharedLabelConversationStartersStayPrivate =>
      'Conversation starters stay private to your event context.';

  @override
  String eventSuccessEventSuccessCompanionSharedLabelCheckInWhenYou({
    required Object locationName,
  }) {
    return 'Check in when you reach $locationName.';
  }

  @override
  String get eventSuccessEventSuccessCompanionSharedLabelASmallStarterGroup =>
      'A small starter group will form when arrivals open.';

  @override
  String
  get eventSuccessEventSuccessCompanionSharedLabelTimedPartnerRotationsAs =>
      'Timed partner rotations as the event unfolds.';

  @override
  String
  get eventSuccessEventSuccessCompanionSharedLabelConversationCuesAppearWhen =>
      'Conversation cues appear when the room needs an easy opener.';

  @override
  String
  get eventSuccessEventSuccessCompanionSharedLabelOneSynchronizedRevealEvery =>
      'One synchronized reveal - every phone at once.';

  @override
  String
  get eventSuccessEventSuccessCompanionSharedLabelYourGuideStaysPrivate =>
      'Your guide stays private to your ticket and attendance.';

  @override
  String swipesEventRecapScreenStateVisiblecopyCatchesOpenUntilTime({
    required Object time,
  }) {
    return 'Catches open until $time';
  }

  @override
  String get swipesEventRecapScreenStateVisiblecopyCatchWindowClosed =>
      'Catch window closed';

  @override
  String swipesEventRecapScreenStateKickerTouppercaseComplete({
    required Object toUpperCase,
  }) {
    return '$toUpperCase · COMPLETE';
  }

  @override
  String
  swipesEventRecapScreenStateVisiblecopyActivitysummarylabelCheckedincountCheckedIn({
    required Object activitySummaryLabel,
    required Object checkedInCount,
  }) {
    return '$activitySummaryLabel · $checkedInCount checked in';
  }

  @override
  String get swipesEventRecapScreenStateDisplaynameGuest => 'Guest';

  @override
  String get swipesEventRecapScreenStateVisiblecopyGuest => 'guest';

  @override
  String swipesEventRecapScreenStateTooltipRemoveTooltipname({
    required Object tooltipName,
  }) {
    return 'Remove $tooltipName';
  }

  @override
  String swipesEventRecapScreenStateTooltipRememberTooltipname({
    required Object tooltipName,
  }) {
    return 'Remember $tooltipName';
  }

  @override
  String get exploreExploreFilterRailLabelTonight => 'Tonight';

  @override
  String get exploreExploreFilterRailLabelTomorrow => 'Tomorrow';

  @override
  String get exploreExploreFilterRailLabelWeekend => 'Weekend';

  @override
  String get exploreExploreFilterRailLabelThisWeek => 'This week';

  @override
  String get exploreExploreFilterRailLabelAny => 'Any';

  @override
  String exploreExploreFilterRailDateSupply({
    required Object label,
    required int count,
  }) {
    return '$label · $count';
  }

  @override
  String exploreExploreFilterRailDateSupplyPlus({
    required Object label,
    required int count,
  }) {
    return '$label · $count+';
  }

  @override
  String get dashboardNotificationsListStateVisiblecopyMarking => 'Marking...';

  @override
  String get dashboardNotificationsListStateVisiblecopyMarkAllRead =>
      'Mark all read';

  @override
  String get dashboardNotificationsListStateLabelToday => 'Today';

  @override
  String get dashboardNotificationsListStateLabelYesterday => 'Yesterday';

  @override
  String get dashboardNotificationsListStateLabelThisWeek => 'This week';

  @override
  String get dashboardNotificationsListStateLabelEarlier => 'Earlier';

  @override
  String get dashboardNotificationsListStateVisiblecopyNow => 'Now';

  @override
  String dashboardNotificationsListStateVisiblecopyInminutesM({
    required Object inMinutes,
  }) {
    return '${inMinutes}m';
  }

  @override
  String dashboardNotificationsListStateVisiblecopyInhoursH({
    required Object inHours,
  }) {
    return '${inHours}h';
  }

  @override
  String dashboardNotificationsListStateVisiblecopyIndaysD({
    required Object inDays,
  }) {
    return '${inDays}d';
  }

  @override
  String get onboardingNameDobPageStateVisiblecopyDateOfBirth =>
      'Date of birth';

  @override
  String get onboardingNameDobPageStateVisiblecopyFirstName => 'First name';

  @override
  String get onboardingNameDobPageStateVisiblecopyLastName => 'Last name';

  @override
  String get swipesProfileViewMapperTitleProfileSignals => 'Profile signals';

  @override
  String get swipesProfileViewMapperTitleWhyYouMightClick =>
      'Why you might click';

  @override
  String get swipesProfileViewMapperTitleDetails => 'Details';

  @override
  String get swipesProfileViewMapperTitleLifestyle => 'Lifestyle';

  @override
  String get hostsHostClubsScaffoldVisiblecopyOwner => 'Owner';

  @override
  String
  eventSuccessEventSuccessQuestionnaireConfigEditorPromptCustomQuestionQuestionnumber({
    required Object questionNumber,
  }) {
    return 'Custom question $questionNumber';
  }

  @override
  String get eventSuccessEventSuccessQuestionnaireConfigEditorLabelOption1 =>
      'Option 1';

  @override
  String get eventSuccessEventSuccessQuestionnaireConfigEditorLabelOption2 =>
      'Option 2';

  @override
  String get eventSuccessEventSuccessQuestionnaireConfigEditorLabelOption3 =>
      'Option 3';

  @override
  String get hostsHostEventToolsLabelManageEvent => 'Manage event';

  @override
  String get hostsHostEventToolsLabelTakeAttendance => 'Take attendance';

  @override
  String get hostsHostEventToolsLabelViewReport => 'View report';

  @override
  String get hostsHostEventToolsBadgelabelAttendanceOpen => 'Attendance open';

  @override
  String get hostsHostEventToolsBadgelabelUpcoming => 'Upcoming';

  @override
  String get hostsHostEventToolsBadgelabelAttendanceClosed =>
      'Attendance closed';

  @override
  String get hostsHostBroadcastComposerSheetLabelReminder => 'Reminder';

  @override
  String get hostsHostBroadcastComposerSheetLabelMeetingPoint =>
      'Meeting point';

  @override
  String get hostsHostBroadcastComposerSheetLabelChange => 'Change';

  @override
  String get hostsHostBroadcastComposerSheetDescriptionConfirmTimingAndHelp =>
      'Confirm timing and help everyone arrive ready.';

  @override
  String
  get hostsHostBroadcastComposerSheetDescriptionShareArrivalNotesParking =>
      'Share arrival notes, parking, or table details.';

  @override
  String get hostsHostBroadcastComposerSheetDescriptionCallOutAnImportant =>
      'Call out an important update to the plan.';

  @override
  String hostsHostBroadcastComposerSheetBodyforReminderForTitleDoors({
    required Object title,
  }) {
    return 'Reminder for $title: doors open shortly before the start. See you there!';
  }

  @override
  String hostsHostBroadcastComposerSheetBodyforWeAreMeetingAt({
    required Object locationName,
  }) {
    return 'We are meeting at $locationName. Please arrive a few minutes early.';
  }

  @override
  String hostsHostBroadcastComposerSheetBodyforQuickUpdateForTitle({
    required Object title,
  }) {
    return 'Quick update for $title:';
  }

  @override
  String get clubsClubDetailBodyLabelMembers => 'Followers';

  @override
  String get clubsClubDetailBodyLabelRating => 'Rating';

  @override
  String get clubsClubDetailBodyLabelReviews => 'Reviews';

  @override
  String get clubsClubDetailBodyLabelEst => 'Established';

  @override
  String get eventsEventDetailOverviewSectionTitleAttendanceMatters =>
      'Attendance matters';

  @override
  String get eventsEventDetailOverviewSectionBodyCheckInOrHost =>
      'Check-in or host-marked attendance decides who can use post-event follow-up and feedback.';

  @override
  String
  eventsEventDetailOverviewSectionVisiblecopyTostringasfixedKmTolowercaseTolowercase2({
    required Object toStringAsFixed,
    required Object toLowerCase,
    required Object toLowerCase2,
  }) {
    return '$toStringAsFixed km $toLowerCase $toLowerCase2';
  }

  @override
  String get eventsEventDetailOverviewSectionVisiblecopyArriveReadyForThe =>
      'Arrive ready for the listed pace and route. The host may split attendees into smaller groups if the crowd needs structure.';

  @override
  String get eventsEventDetailOverviewSectionVisiblecopyExpectPairedOrCourt =>
      'Expect paired or court-based rotations so attendees can meet more people without managing the logistics themselves.';

  @override
  String
  get eventsEventDetailOverviewSectionVisiblecopyExpectTeamStructureAnd =>
      'Expect team structure and host-led moments that create natural reasons to talk.';

  @override
  String get eventsEventDetailOverviewSectionVisiblecopyExpectASeatedFormat =>
      'Expect a seated format with table-level structure and host cues for easier conversation.';

  @override
  String get eventsEventDetailOverviewSectionVisiblecopyExpectALooserSocial =>
      'Expect a looser social format with host nudges when the room needs more mixing.';

  @override
  String get eventsEventDetailOverviewSectionVisiblecopyExpectAHostLed =>
      'Expect a host-led activity with clear arrival, activity, and follow-up moments.';

  @override
  String get eventsEventDetailOverviewSectionVisiblecopyExpectTheHostTo =>
      'Expect the host to shape the format around the room and venue.';

  @override
  String get eventsEventDetailOverviewSectionVisiblecopyPriceCanChangeBased =>
      'Price can change based on live demand.';

  @override
  String eventsEventDetailOverviewSectionVisiblecopyPriceCanIncreaseBy({
    required Object step,
    required Object max,
  }) {
    return 'Price can increase by $step per demand step, capped at $max above the base price.';
  }

  @override
  String get dashboardEventFocusRailLabelViewEvent => 'View event';

  @override
  String get dashboardEventFocusRailLabelCheckIn => 'Check in';

  @override
  String get dashboardEventFocusRailLabelDirections => 'Directions';

  @override
  String get dashboardEventFocusRailLabelAddToCalendar => 'Add to calendar';

  @override
  String get dashboardEventFocusRailLabelStartCatching => 'Start catching';

  @override
  String get dashboardEventFocusRailLabelWriteReview => 'Write review';

  @override
  String get dashboardEventFocusRailBadgelabelCheckInOpen => 'Check-in open';

  @override
  String get dashboardEventFocusRailBadgelabelAfterTheEvent =>
      'After the event';

  @override
  String get dashboardEventFocusRailBadgelabelNextEvent => 'Next event';

  @override
  String get clubsClubDetailDockLabelSignInToJoin => 'Sign in to follow';

  @override
  String get clubsClubDetailDockLabelJoinClub => 'Follow organizer';

  @override
  String get clubsClubDetailDockLabelJoined => 'Following';

  @override
  String get clubsClubDetailDockLabelManage => 'Manage';

  @override
  String get clubsClubDetailDockLabelNewEvent => 'New event';

  @override
  String get hostsHostEventAttendancePanelLabelAccepted => 'Accepted';

  @override
  String get hostsHostEventAttendancePanelLabelOffered => 'Offered';

  @override
  String get hostsHostEventAttendancePanelLabelOffer => 'Offer';

  @override
  String get hostsHostEventAttendancePanelLabelProfile => 'Profile';

  @override
  String get hostsClubHostDefaultsStepLabelOpen => 'OPEN';

  @override
  String get hostsClubHostDefaultsStepLabelInvite => 'INVITE';

  @override
  String get hostsClubHostDefaultsStepLabelBalanced => 'BALANCED';

  @override
  String get hostsClubHostDefaultsStepDescriptionAnyoneEligibleCanBook =>
      'Anyone eligible can book until the event reaches capacity.';

  @override
  String get hostsClubHostDefaultsStepDescriptionNewInviteOnlyEvents =>
      'New invite-only events will ask for an event-specific code.';

  @override
  String get hostsClubHostDefaultsStepDescriptionStraightMenAndWomen =>
      'Straight men and women are kept within one spot of each other.';

  @override
  String get hostsClubHostDefaultsStepDescriptionNewEventsStartOpen =>
      'New events start open with optional straight men and straight women caps.';

  @override
  String get hostsCreateEventPolicyStateDescriptionAnyoneEligibleCanBook =>
      'Anyone eligible can book until the event reaches capacity.';

  @override
  String get hostsCreateEventPolicyStateDescriptionOnlyPeopleWithThe =>
      'Only people with the invite code or private link can book. Waitlist is off by default.';

  @override
  String get hostsCreateEventPolicyStateDescriptionPeopleRequestASpot =>
      'People request a spot first. The host reviews their public profile before confirming who gets in.';

  @override
  String get hostsCreateEventPolicyStateDescriptionStraightMenAndWomen =>
      'Straight men and women are kept within one spot of each other. Queer, open, non-binary, and other attendees can book within total capacity.';

  @override
  String get eventsCalendarScreenStateTitleNoPlannedEventsYet =>
      'No planned events yet';

  @override
  String get eventsCalendarScreenStateBodyEventsYouBookOr =>
      'Events you book or save will show up here by day and time.';

  @override
  String get eventsCalendarScreenStateBadgelabelCancelled => 'CANCELLED';

  @override
  String get eventsCalendarScreenStateBadgelabelSaved => 'SAVED';

  @override
  String get eventsCalendarScreenStateBadgelabelJoined => 'JOINED';

  @override
  String get hostsHostHomeScreenStateVisiblecopyRepeatLast => 'Repeat last';

  @override
  String hostsHostHomeScreenStateVisiblecopyRepeatLabel({
    required Object label,
  }) {
    return 'Repeat ‘$label’';
  }

  @override
  String get hostsHostHomeScreenStateEmptytitleNoUpcomingEvents =>
      'No upcoming events';

  @override
  String get hostsHostHomeScreenStateEmptybodyCreateYourNextEvent =>
      'Create your next event to start filling this list.';

  @override
  String get hostsHostHomeScreenStateTitleReviewWaitlist => 'Review waitlist';

  @override
  String get hostsHostHomeScreenStateVisiblecopyReview => 'Review';

  @override
  String get eventSuccessEventSuccessConversationCueCopyLabelLivePrompt =>
      'Live prompt';

  @override
  String get eventSuccessEventSuccessConversationCueCopyLabelPostMatchOpener =>
      'Post-match opener';

  @override
  String get eventSuccessEventSuccessConversationCueCopyTitleSharedRoom =>
      'Shared room';

  @override
  String eventSuccessEventSuccessConversationCueCopyBodyIAmGladWe({
    required Object label,
  }) {
    return 'I am glad we both made it to $label.';
  }

  @override
  String get eventSuccessEventSuccessConversationCueCopyTitleEasyFollowUp =>
      'Easy follow-up';

  @override
  String
  get eventSuccessEventSuccessConversationCueCopyBodyWhatWasYourFavorite =>
      'What was your favorite moment from the event?';

  @override
  String
  get eventSuccessEventSuccessConversationCueCopyVisiblecopyLowPressure =>
      'Low pressure';

  @override
  String
  get eventSuccessEventSuccessConversationCueCopyBodyAskSomeoneWhatRoute =>
      'Ask someone what route, cafe, or park they would do again.';

  @override
  String
  get eventSuccessEventSuccessConversationCueCopyBodyAskYourNextPartner =>
      'Ask your next partner what shot they are trying to improve.';

  @override
  String get eventSuccessEventSuccessConversationCueCopyBodyAskWhichRoundThey =>
      'Ask which round they wanted more questions from.';

  @override
  String get eventSuccessEventSuccessConversationCueCopyBodyAskWhatDishThey =>
      'Ask what dish they would order again.';

  @override
  String get eventSuccessEventSuccessConversationCueCopyBodyAskWhatAnswerFrom =>
      'Ask what answer from tonight surprised them.';

  @override
  String get eventSuccessEventSuccessConversationCueCopyBodyAskWhatMadeThem =>
      'Ask what made them say yes to this event.';

  @override
  String get eventSuccessSocialMissionTitleLight => 'Easy start';

  @override
  String get eventSuccessSocialMissionTitlePersonal => 'A little more personal';

  @override
  String get eventSuccessSocialMissionTitleReflective => 'One level deeper';

  @override
  String get eventSuccessSocialMissionBodyPersonal =>
      'Take turns sharing something you changed your mind about recently and what shifted it.';

  @override
  String get eventSuccessSocialMissionBodyReflective =>
      'Take turns answering: what do you hope the people close to you understand about you?';

  @override
  String get eventSuccessSocialMissionLevelLight => 'Light disclosure';

  @override
  String get eventSuccessSocialMissionLevelPersonal => 'Personal disclosure';

  @override
  String get eventSuccessSocialMissionLevelReflective =>
      'Reflective disclosure';

  @override
  String get eventSuccessEventSuccessConversationCueCopyBodyILikedTalkingOn =>
      'I liked talking on the run. Want to compare routes sometime?';

  @override
  String get eventSuccessEventSuccessConversationCueCopyBodyGoodGameTodayI =>
      'Good game today. I am still thinking about that rally.';

  @override
  String get eventSuccessEventSuccessConversationCueCopyBodyILikedBeingOn =>
      'I liked being on a quiz night with you. Which round was your favorite?';

  @override
  String get eventSuccessEventSuccessConversationCueCopyBodyILikedMeetingYou =>
      'I liked meeting you over dinner. What was your favorite dish?';

  @override
  String
  get eventSuccessEventSuccessConversationCueCopyBodyILikedOurConversation =>
      'I liked our conversation tonight. Want to keep it going?';

  @override
  String
  get eventSuccessEventSuccessConversationCueCopyBodyILikedMeetingYou957a50 =>
      'I liked meeting you at the event. What did you think of it?';

  @override
  String
  get eventSuccessEventSuccessConversationCueCopyTitleUseTheSharedMoment =>
      'Use the shared moment';

  @override
  String get chatsChatShareCardVisiblecopyCatchChatCardPng =>
      'catch-chat-card.png';

  @override
  String get chatsChatShareCardVisiblecopyShareCard => 'Share card';

  @override
  String get chatsChatShareCardVisiblecopyNamesPhotosAndTimestamps =>
      'Names, photos, and timestamps are hidden.';

  @override
  String get chatsChatShareCardVisiblecopyCatchChatCard => 'Catch chat card';

  @override
  String get chatsMessageBubbleVisiblecopySending => 'Sending...';

  @override
  String get chatsSuvbotActionBarVisiblecopyWarmsignupstate =>
      'warmSignupState';

  @override
  String get chatsSuvbotActionBarVisiblecopyWarmposteventstate =>
      'warmPostEventState';

  @override
  String get chatsSuvbotActionBarVisiblecopyWarmchatstate => 'warmChatState';

  @override
  String get chatsSuvbotActionBarVisiblecopyWarmpaymentstate =>
      'warmPaymentState';

  @override
  String get chatsSuvbotActionBarVisiblecopyResetchats => 'resetChats';

  @override
  String get chatsSuvbotActionBarVisiblecopyResetbookings => 'resetBookings';

  @override
  String get chatsSuvbotActionBarVisiblecopyResetnotifications =>
      'resetNotifications';

  @override
  String get chatsSuvbotActionBarVisiblecopyCleardemostate => 'clearDemoState';

  @override
  String get chatsSuvbotActionBarVisiblecopyCheckdemostate => 'checkDemoState';

  @override
  String get chatsSuvbotActionBarVisiblecopyRefreshdemostate =>
      'refreshDemoState';

  @override
  String get chatsSuvbotActionBarVisiblecopyHelp => 'help';

  @override
  String get chatsSuvbotActionBarVisiblecopyMatchtesterbyphone =>
      'matchTesterByPhone';

  @override
  String get coreBlockUserDialogVisiblecopyBlock => 'Block';

  @override
  String get coreCatchAdaptiveDialogVisiblecopyConfirm => 'Confirm';

  @override
  String get coreCatchAdaptiveDialogVisiblecopyCancel => 'Cancel';

  @override
  String get coreCatchAdaptivePickerVisiblecopySelectDate => 'Select date';

  @override
  String get coreCatchAdaptivePickerVisiblecopySelectTime => 'Select time';

  @override
  String coreCatchEventActivityCardsVisiblecopyTimelabelCountdownlabel({
    required Object timeLabel,
    required Object countdownLabel,
  }) {
    return '$timeLabel / $countdownLabel';
  }

  @override
  String get coreCatchFieldVisiblecopySelect => 'Select';

  @override
  String get coreCatchOtpCodeFieldSemanticLabel => 'One-time code';

  @override
  String get coreCatchSearchFieldVisiblecopyCloseSearch => 'Close search';

  @override
  String get coreCatchShareCardSheetVisiblecopyUnableToShareThis =>
      'Unable to share this card.';

  @override
  String get dashboardActivityScreenVisiblecopyMarkNotificationsRead =>
      'mark notifications read';

  @override
  String get dashboardActivityScreenVisiblecopyActivityScreen =>
      'activity_screen';

  @override
  String get dashboardDashboardScreenVisiblecopyHeader => 'header';

  @override
  String get dashboardDashboardScreenVisiblecopyCalendar => 'calendar';

  @override
  String dashboardDashboardScreenVisiblecopyStatevalueModule({
    required Object stateValue,
    required Object module,
  }) {
    return '$stateValue:$module';
  }

  @override
  String get dashboardDashboardScreenVisiblecopyClubPosts => 'club_posts';

  @override
  String get dashboardDashboardScreenVisiblecopyHome => 'home';

  @override
  String get dashboardDashboardScreenVisiblecopyNotifications =>
      'notifications';

  @override
  String get dashboardNotificationRouteUtilVisiblecopyCouldNotOpenThis =>
      'Could not open this activity update.';

  @override
  String get dashboardDashboardFullVisiblecopyCatchWindow => 'catch_window';

  @override
  String get dashboardDashboardFullVisiblecopyFocusRail => 'focus_rail';

  @override
  String get dashboardDashboardFullVisiblecopyIdleCta => 'idle_cta';

  @override
  String get dashboardDashboardFullVisiblecopyFindEvent => 'find_event';

  @override
  String get dashboardDashboardFullVisiblecopyClubPosts => 'club_posts';

  @override
  String get dashboardDashboardFullVisiblecopyOpenPost => 'open_post';

  @override
  String get dashboardDashboardFullVisiblecopyViewEvent => 'view_event';

  @override
  String get dashboardDashboardFullVisiblecopyDirections => 'directions';

  @override
  String get dashboardDashboardFullVisiblecopyAddToCalendar =>
      'add_to_calendar';

  @override
  String get dashboardDashboardFullVisiblecopyOpenCatchWindow =>
      'open_catch_window';

  @override
  String get dashboardDashboardFullVisiblecopyWriteReview => 'write_review';

  @override
  String get dashboardDashboardFullVisiblecopyCheckIn => 'check_in';

  @override
  String get dashboardEmptyHeroCardVisiblecopyOpensTheExplorePage =>
      'Opens the explore page to find events near your location.';

  @override
  String
  eventSuccessEventSuccessCompanionAfterglowVisiblecopyLongdatelabelActivitysummarylabel({
    required Object longDateLabel,
    required Object activitySummaryLabel,
  }) {
    return '$longDateLabel | $activitySummaryLabel';
  }

  @override
  String
  get eventSuccessEventSuccessCompanionAfterglowVisiblecopyUseTheSharedEvent =>
      'Use the shared event context when a match opens.';

  @override
  String
  get eventSuccessEventSuccessCompanionAfterglowVisiblecopyKeepTheUsefulParts =>
      'Keep the useful parts of the room for yourself.';

  @override
  String
  get eventSuccessEventSuccessCompanionAfterglowVisiblecopyLeaveAQuickNote =>
      'Leave a quick note while the event is fresh.';

  @override
  String
  get eventSuccessEventSuccessCompanionAfterglowVisiblecopyCatchKeepsThisRecap =>
      'Catch keeps this recap private to you.';

  @override
  String
  eventSuccessEventSuccessCompanionAfterglowVisiblecopyMetnewpeoplecountPeopleRememberedWelcome({
    required Object metNewPeopleCount,
    required Object welcomeRating,
  }) {
    return '$metNewPeopleCount people remembered, welcome $welcomeRating/5.';
  }

  @override
  String get eventSuccessEventSuccessCompanionAfterglowVisiblecopyD => '\\d+';

  @override
  String eventSuccessEventSuccessCompanionLiveCardsVisiblecopyValue1People({
    required Object value1,
  }) {
    return '$value1 people';
  }

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsVisiblecopyLoadingGroupMembers =>
      'Loading group members';

  @override
  String eventSuccessEventSuccessCompanionLiveCardsVisiblecopyFormatFormat2({
    required Object format,
    required Object format2,
  }) {
    return '$format-$format2';
  }

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsVisiblecopyPartner =>
      'Partner';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsVisiblecopyThisIsNotA =>
      'This is not a Catch event QR.';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsVisiblecopyThisQrBelongsTo =>
      'This QR belongs to another event.';

  @override
  String
  get eventSuccessEventSuccessCompanionLiveCardsVisiblecopyOpenerCopied =>
      'Opener copied.';

  @override
  String get eventSuccessEventSuccessCompanionLiveCardsVisiblecopyCueCopied =>
      'Cue copied.';

  @override
  String get eventSuccessEventSuccessCompanionSharedVisiblecopyFree => 'Free';

  @override
  String
  get eventSuccessEventSuccessCompanionSharedVisiblecopyPersonHereSoFar =>
      'person here so far';

  @override
  String
  get eventSuccessEventSuccessCompanionSharedVisiblecopyPeopleHereSoFar =>
      'people here so far';

  @override
  String
  get eventSuccessEventSuccessCompanionSharedVisiblecopyWaitingForTheRoom =>
      'waiting for the room to fill';

  @override
  String
  get eventSuccessEventSuccessCompanionWingmanVisiblecopyHostHelpRequestActive =>
      'Host-help request active';

  @override
  String
  get eventSuccessEventSuccessCompanionWingmanVisiblecopyCheckedInToThis =>
      'Checked in to this event';

  @override
  String
  get eventSuccessEventSuccessCompanionBodyScreenVisiblecopySelfCheckIn =>
      'self-check-in';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenTitleLateArrival =>
      'Your next round';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyFirstHello =>
      'first-hello';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyPreArrival =>
      'pre-arrival';

  @override
  String
  get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyQuestionnaire =>
      'questionnaire';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyPrompt =>
      'prompt';

  @override
  String
  get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyAfterglowRecap =>
      'afterglow-recap';

  @override
  String
  get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyPostOpeners =>
      'post-openers';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyLiveCues =>
      'live-cues';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyLiveStep =>
      'live-step';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyMicroPod =>
      'micro-pod';

  @override
  String
  get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyRotationSchedule =>
      'rotation-schedule';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyLiveReveal =>
      'live-reveal';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyWingman =>
      'wingman';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyFeedback =>
      'feedback';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyEmpty =>
      'empty';

  @override
  String get eventSuccessEventSuccessCompanionBodyScreenVisiblecopyStage =>
      'stage';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateVisiblecopyNoStage =>
      'no-stage';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateVisiblecopyNoStep =>
      'no-step';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyBeforeArrival =>
      'Before arrival';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyYourEventGuideIs =>
      'Your event guide is warming up.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyPreEventDetailsStay =>
      'Pre-event details stay informational until the host starts the room.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyArrivalCue =>
      'Arrival cue';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyCheckInWhenYou =>
      'Check in when you reach the venue.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyCheckInOnlyUpdates =>
      'Check-in only updates attendance and the event companion flow.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyFirstHello =>
      'First Hello';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyYourFirstArrivalMission =>
      'Your first arrival mission is live.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyThisChecksYouIn =>
      'This checks you in. Hosts do not see the individual answer.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyMatchClues =>
      'Match clues';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyAddAFewClues =>
      'Add a few clues before the room moves.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyHostsDoNotSee =>
      'Hosts do not see individual match clue answers.';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateVisiblecopyLiveNow =>
      'Live now';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyFollowTheHostFor =>
      'Follow the host for the next beat.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyEveryoneSeesTheSame =>
      'Everyone sees the same room cue; personal details stay scoped to you.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyLivePrompt =>
      'Live prompt';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyAFreshPromptJust =>
      'A fresh prompt just dropped.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyPromptsAreSharedGuidance =>
      'Prompts are shared guidance, not a public record of what you say.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyConversationCues =>
      'Conversation cues';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyPickACueAnd =>
      'Pick a cue and keep the room moving.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyConversationCuesAreSuggestions =>
      'Conversation cues are suggestions only; nothing is sent for you.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyYourNextGroup =>
      'Your next group';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyYourAssignmentIsReady =>
      'Your assignment is ready.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyOnlyYourOwnAssignment =>
      'Only your own assignment details appear on this screen.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopySharedReveal =>
      'Shared reveal';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyYourDetailsStayHidden =>
      'Your details stay hidden on this screen until the shared reveal moment.';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateVisiblecopyHostHelp =>
      'Host help';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyAskForOneSpecific =>
      'Ask for one specific intro.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyOnlyTheHostSees =>
      'Only the host sees this request; the other attendee is not notified.';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateVisiblecopyAfterglow =>
      'Afterglow';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyYourAfterglowIsReady =>
      'Your afterglow is ready.';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyThisRecapIsPrivate =>
      'This recap is private to you. Hosts only see safe aggregate coaching.';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateVisiblecopyWrapped =>
      'Wrapped';

  @override
  String get eventSuccessEventSuccessCompanionScreenStateVisiblecopyBooked =>
      'Booked';

  @override
  String
  get eventSuccessEventSuccessCompanionScreenStateVisiblecopyCatchOnlyShowsThe =>
      'Catch only shows the live details that are relevant to this event moment.';

  @override
  String eventSuccessEventSuccessStructureConfigEditorVisiblecopyTointPeople({
    required Object toInt,
  }) {
    return '$toInt people';
  }

  @override
  String
  eventSuccessEventSuccessStructureConfigEditorVisiblecopyTointTolowercase({
    required Object toInt,
    required Object toLowerCase,
  }) {
    return '$toInt $toLowerCase';
  }

  @override
  String eventSuccessEventSuccessStructureConfigEditorVisiblecopyTointValue2({
    required Object toInt,
    required Object value2,
  }) {
    return '$toInt $value2';
  }

  @override
  String eventSuccessEventSuccessHostLiveVisiblecopyAttendeesAtLocationnameSee({
    required Object locationName,
    required Object attendeeExperience,
  }) {
    return 'Attendees at $locationName see: $attendeeExperience';
  }

  @override
  String get eventSuccessEventSuccessHostLiveVisiblecopyFinalStep =>
      'Final step';

  @override
  String eventSuccessEventSuccessHostLiveVisiblecopyNextTitle({
    required Object title,
  }) {
    return 'Next: $title';
  }

  @override
  String get eventSuccessEventSuccessHostOverridesVisiblecopyHostOverrideV1 =>
      'host_override_v1';

  @override
  String get eventSuccessEventSuccessHostOverridesVisiblecopyAddAtLeastOne =>
      'Add at least one group.';

  @override
  String get eventSuccessEventSuccessHostOverridesVisiblecopyNameEveryGroup =>
      'Name every group.';

  @override
  String
  get eventSuccessEventSuccessHostOverridesVisiblecopyAddAtLeastOne64c0b6 =>
      'Add at least one attendee to every group.';

  @override
  String
  get eventSuccessEventSuccessHostOverridesVisiblecopyChooseEveryAttendeeSlot =>
      'Choose every attendee slot.';

  @override
  String
  get eventSuccessEventSuccessHostOverridesVisiblecopyEachAttendeeCanAppear =>
      'Each attendee can appear once per round.';

  @override
  String
  get eventSuccessEventSuccessHostOverridesVisiblecopyAddAtLeastOne76e783 =>
      'Add at least one pair.';

  @override
  String
  get eventSuccessEventSuccessHostOverridesVisiblecopyChooseBothAttendeesFor =>
      'Choose both attendees for every pair.';

  @override
  String
  get eventSuccessEventSuccessHostOverridesVisiblecopyChooseTwoDifferentAttendees =>
      'Choose two different attendees.';

  @override
  String eventSuccessEventSuccessHostSetupVisiblecopyToint({
    required Object toInt,
  }) {
    return '$toInt';
  }

  @override
  String
  get eventSuccessEventSuccessHostSetupVisiblecopyDecreaseTargetAttendees =>
      'Decrease target attendees';

  @override
  String
  get eventSuccessEventSuccessHostSetupVisiblecopyIncreaseTargetAttendees =>
      'Increase target attendees';

  @override
  String get eventSuccessEventSuccessHostSharedVisiblecopyThisAttendee =>
      'this attendee';

  @override
  String get eventSuccessEventSuccessHostSharedVisiblecopyAttendee =>
      'Attendee';

  @override
  String eventSuccessEventSuccessHostSharedVisiblecopyAskedForHelpMeeting({
    required Object targetName,
  }) {
    return 'Asked for help meeting $targetName';
  }

  @override
  String eventSuccessEventSuccessLiveRevealHostVisiblecopyRemainingseconds({
    required Object remainingSeconds,
  }) {
    return '$remainingSeconds';
  }

  @override
  String get eventSuccessEventSuccessLiveRevealHostVisiblecopyOk => 'OK';

  @override
  String eventSuccessEventSuccessLiveRevealHostVisiblecopyValue1({
    required Object value1,
  }) {
    return '$value1';
  }

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsVisiblecopyPartner =>
      'Partner';

  @override
  String eventSuccessEventSuccessLiveRevealWidgetsVisiblecopyFormatFormat2({
    required Object format,
    required Object format2,
  }) {
    return '$format-$format2';
  }

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsVisiblecopyDone => 'Done';

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsVisiblecopyNow => 'Now';

  @override
  String get eventSuccessEventSuccessLiveRevealWidgetsVisiblecopyHidden =>
      'Hidden';

  @override
  String eventsCalendarScreenVisiblecopyCalendarAgendaDayDatekey({
    required Object dateKey,
  }) {
    return 'calendar-agenda-day-$dateKey';
  }

  @override
  String eventsCalendarScreenVisiblecopyLength({required Object length}) {
    return '$length';
  }

  @override
  String eventsCalendarScreenVisiblecopyRoundKm({required Object round}) {
    return '$round km';
  }

  @override
  String get eventsCalendarScreenVisiblecopyNone => 'None';

  @override
  String get eventsCalendarScreenVisiblecopyS => 'S';

  @override
  String get eventsCalendarScreenVisiblecopyM => 'M';

  @override
  String get eventsCalendarScreenVisiblecopyT => 'T';

  @override
  String get eventsCalendarScreenVisiblecopyW => 'W';

  @override
  String get eventsCalendarScreenVisiblecopyF => 'F';

  @override
  String eventsEventDetailScreenVisiblecopyEventidInvitelinkid({
    required Object eventId,
    required Object inviteLinkId,
  }) {
    return '$eventId:$inviteLinkId';
  }

  @override
  String get eventsEventDetailScreenVisiblecopyBookingConfirmed =>
      'Booking confirmed!';

  @override
  String get eventsEventDetailScreenVisiblecopyBookingCancelled =>
      'Booking cancelled.';

  @override
  String get eventsEventDetailScreenVisiblecopyEventSaved => 'Event saved.';

  @override
  String get eventsEventDetailScreenVisiblecopyEventRemoved => 'Event removed.';

  @override
  String
  get eventsEventDetailScreenVisiblecopyEventdetailscreenTogglesavedeventFailed =>
      'EventDetailScreen._toggleSavedEvent failed';

  @override
  String get eventsEventDetailScreenVisiblecopyCouldNotOpenCalendar =>
      'Could not open calendar.';

  @override
  String get eventsEventDetailScreenVisiblecopyFailedToAddEvent =>
      'Failed to add event to calendar';

  @override
  String get eventsEventDetailScreenVisiblecopyAddEventToCalendar =>
      'add event to calendar';

  @override
  String get eventsEventDetailScreenVisiblecopyCalendarLink => 'calendar_link';

  @override
  String eventsEventDetailScreenStateVisiblecopySpotsremainingSpotsLeft({
    required Object spotsRemaining,
  }) {
    return '$spotsRemaining spots left';
  }

  @override
  String get eventsEventDetailScreenStateVisiblecopyMatchingOpensForEveryone =>
      'Matching opens for everyone who goes';

  @override
  String get eventsLocationPickerScreenVisiblecopySelecting => 'Selecting...';

  @override
  String get eventsLocationPickerScreenVisiblecopySearching => 'Searching...';

  @override
  String get eventsEventDetailCtaVisiblecopyOfferActive => 'Offer active';

  @override
  String eventsEventDetailCtaVisiblecopyUntilTime({required Object time}) {
    return 'Until $time';
  }

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopySpot => 'spot';

  @override
  String get eventsEventDetailDesignPrimitivesVisiblecopySpots => 'spots';

  @override
  String get eventsEventPinsMapVisiblecopyCatchEventMap => 'catch event map';

  @override
  String get eventsEventPinsMapVisiblecopyBuildingEventMapPin =>
      'building event map pin bitmap';

  @override
  String get exploreExploreScreenVisiblecopyCoverHeader => 'cover_header';

  @override
  String get exploreExploreScreenVisiblecopyExternalSupply => 'external_supply';

  @override
  String get exploreExploreScreenVisiblecopyExternalOutbound =>
      'external_outbound';

  @override
  String get exploreExploreScreenVisiblecopyExternalPlatform =>
      'external_platform';

  @override
  String exploreExploreScreenStateVisiblecopyChooseCityLabel({
    required Object label,
  }) {
    return 'Choose city: $label';
  }

  @override
  String exploreExploreScreenStateVisiblecopyExploreLabel({
    required Object label,
  }) {
    return 'EXPLORE · $label';
  }

  @override
  String get exploreExploreScreenStateVisiblecopyExplore => 'Explore';

  @override
  String get exploreExploreScreenStateVisiblecopySearchEventsOrClubs =>
      'Search events or organizers';

  @override
  String get exploreExploreScreenStateVisiblecopyOpenExploreFilters =>
      'Open explore filters';

  @override
  String exploreExploreScreenStateVisiblecopyOpenExploreFiltersActivecount({
    required Object activeCount,
  }) {
    return 'Open explore filters, $activeCount active';
  }

  @override
  String exploreExploreScreenStateVisiblecopyTimePricelabel({
    required Object time,
    required Object priceLabel,
  }) {
    return '$time - $priceLabel';
  }

  @override
  String exploreExploreScreenStateVisiblecopySignedupcountGoingCoverspotslabel({
    required Object signedUpCount,
    required Object coverSpotsLabel,
  }) {
    return '$signedUpCount going - $coverSpotsLabel';
  }

  @override
  String exploreExploreScreenStateVisiblecopyFromTouppercase({
    required Object toUpperCase,
  }) {
    return 'FROM $toUpperCase';
  }

  @override
  String get exploreExploreScreenStateVisiblecopyExternal => 'External';

  @override
  String exploreExploreScreenStateVisiblecopyTimePricelabelc30029({
    required Object time,
    required Object priceLabel,
  }) {
    return '$time · $priceLabel';
  }

  @override
  String get exploreExploreScreenStateVisiblecopyOpenExternalEventSource =>
      'Open external event source';

  @override
  String get exploreExploreScreenStateVisiblecopyExternalEventLinkUnavailable =>
      'External event link unavailable';

  @override
  String get exploreExploreScreenStateVisiblecopyReadOnlySupplyNo =>
      'READ-ONLY SUPPLY · NO CATCH BOOKING';

  @override
  String get exploreExploreScreenStateVisiblecopyClubToKnow =>
      'ORGANIZER TO KNOW';

  @override
  String get exploreExploreScreenStateVisiblecopyPlan => 'PLAN';

  @override
  String get exploreExploreScreenStateVisiblecopyPlans => 'PLANS';

  @override
  String exploreExploreScreenStateVisiblecopyCountNoun({
    required Object count,
    required Object noun,
  }) {
    return '$count $noun';
  }

  @override
  String exploreExploreScreenStateVisiblecopyCountPlusNoun({
    required Object count,
    required Object noun,
  }) {
    return '$count+ $noun';
  }

  @override
  String exploreExploreScreenStateVisiblecopyCountNounDatespan({
    required Object count,
    required Object noun,
    required Object dateSpan,
  }) {
    return '$count $noun · $dateSpan';
  }

  @override
  String exploreExploreScreenStateVisiblecopyCountPlusNounDatespan({
    required Object count,
    required Object noun,
    required Object dateSpan,
  }) {
    return '$count+ $noun · $dateSpan';
  }

  @override
  String exploreExploreScreenStateVisiblecopyNextNextevent({
    required Object nextEvent,
  }) {
    return 'Next: $nextEvent';
  }

  @override
  String exploreExploreScreenStateVisiblecopyClubmembercountlabelArea({
    required Object clubMemberCountLabel,
    required Object area,
  }) {
    return '$clubMemberCountLabel - $area';
  }

  @override
  String exploreExploreScreenStateVisiblecopyCovertimescopeNameLocationname({
    required Object coverTimeScope,
    required Object name,
    required Object locationName,
  }) {
    return '$coverTimeScope - $name - $locationName';
  }

  @override
  String get exploreExploreScreenStateVisiblecopyTonight => 'Tonight';

  @override
  String get exploreExploreScreenStateVisiblecopyTomorrow => 'Tomorrow';

  @override
  String get exploreExploreScreenStateVisiblecopyThisWeek => 'This week';

  @override
  String get exploreExploreScreenStateVisiblecopy1Left => '1 left';

  @override
  String exploreExploreScreenStateVisiblecopySpotsLeft({
    required Object spots,
  }) {
    return '$spots left';
  }

  @override
  String exploreExploreEventRowsVisiblecopyComingUpLength({
    required Object length,
  }) {
    return 'COMING UP · $length';
  }

  @override
  String get hostsCreateClubScreenVisiblecopyRestoredYourClubDraft =>
      'Restored your organizer draft';

  @override
  String
  get hostsCreateClubScreenVisiblecopyCreateclubscreenRestoresaveddraftFailed =>
      'CreateClubScreen._restoreSavedDraft failed';

  @override
  String get hostsCreateClubScreenVisiblecopyDraftUpdated => 'Draft updated';

  @override
  String get hostsCreateClubScreenVisiblecopyDraftSaved => 'Draft saved';

  @override
  String get hostsCreateClubScreenVisiblecopyCreateclubscreenSubmitFailed =>
      'CreateClubScreen._submit failed';

  @override
  String get hostsClubBasicsStepVisiblecopyPleaseEnterAClub =>
      'Please enter an organizer name';

  @override
  String get hostsClubBasicsStepVisiblecopyPleaseSelectACity =>
      'Please select a city';

  @override
  String get hostsClubBasicsStepVisiblecopyPleaseEnterAnArea =>
      'Please enter an area';

  @override
  String get hostsClubDetailsStepVisiblecopyPleaseAddADescription =>
      'Please add a description';

  @override
  String get hostsCreateClubPhotosPickerVisiblecopyAddPhotos => 'Add photos';

  @override
  String get hostsCreateClubPhotosPickerVisiblecopyAddClubPhotos =>
      'Add organizer photos';

  @override
  String get hostsEditHostedEventScreenVisiblecopyDD => '^\\d*\\.?\\d*';

  @override
  String get hostsEditHostedEventScreenVisiblecopyAZaZ09 => '[A-Za-z0-9_-]';

  @override
  String hostsEditHostedEventScreenVisiblecopyCapacitylimit({
    required Object capacityLimit,
  }) {
    return '$capacityLimit';
  }

  @override
  String get hostsEditHostedEventScreenVisiblecopyFree => 'Free';

  @override
  String get hostsCreateEventScreenVisiblecopyConfiguredin => 'configuredIn';

  @override
  String get hostsCreateEventScreenVisiblecopyCreateEvent => 'create_event';

  @override
  String hostsCreateEventSuccessScreenVisiblecopyCapacitylimitAttendees({
    required Object capacityLimit,
  }) {
    return '$capacityLimit attendees';
  }

  @override
  String get hostsCreateEventPhotoPickerVisiblecopyAddEventPhotos =>
      'Add event photos';

  @override
  String get hostsCreateEventPhotoPickerVisiblecopyAddPhotos => 'Add photos';

  @override
  String get hostsEventDetailsStepVisiblecopyRequired => 'Required';

  @override
  String get hostsEventDetailsStepVisiblecopyTooLong => 'Too long';

  @override
  String get hostsEventDetailsStepVisiblecopyDD => '^\\d*\\.?\\d*';

  @override
  String get hostsEventDetailsStepVisiblecopyInvalid => 'Invalid';

  @override
  String get hostsEventDetailsStepVisiblecopyMustBe0 => 'Must be > 0';

  @override
  String get hostsEventDetailsStepVisiblecopySelectAPace => 'Select a pace';

  @override
  String get hostsEventPolicyStepVisiblecopyRequired => 'Required';

  @override
  String get hostsEventPolicyStepVisiblecopyMin1 => 'Min 1';

  @override
  String get hostsEventPolicyStepVisiblecopyDD => '^\\d*\\.?\\d*';

  @override
  String get hostsEventPolicyStepVisiblecopyInvalid => 'Invalid';

  @override
  String get hostsEventPolicyStepVisiblecopyAZaZ09 => '[A-Za-z0-9_-]';

  @override
  String get hostsWhenStepVisiblecopyPleaseSelectADate =>
      'Please select a date';

  @override
  String get hostsWhenStepVisiblecopyRequired => 'Required';

  @override
  String get hostsWhenStepVisiblecopyDecreaseDuration => 'Decrease duration';

  @override
  String get hostsWhenStepVisiblecopyIncreaseDuration => 'Increase duration';

  @override
  String get hostsWhereStepVisiblecopyChooseAMeetingLocation =>
      'Choose a meeting location';

  @override
  String get hostsWhereStepVisiblecopyAddALocationName => 'Add a location name';

  @override
  String get hostsHostEventManageScreenVisiblecopyEventCancelled =>
      'Event cancelled.';

  @override
  String get hostsHostEventManageScreenVisiblecopyEventDeleted =>
      'Event deleted.';

  @override
  String hostsHostEventManageScreenVisiblecopyLabelCopied({
    required Object label,
  }) {
    return '$label copied.';
  }

  @override
  String
  get hostsHostEventManageScreenVisiblecopyHosteventmanagescreenCreatenamedinvitelinkFailed =>
      'HostEventManageScreen._createNamedInviteLink failed';

  @override
  String
  get hostsHostEventManageScreenVisiblecopyHosteventmanagescreenCopynamedinvitelinkFailed =>
      'HostEventManageScreen._copyNamedInviteLink failed';

  @override
  String hostsHostEventManageScreenVisiblecopyLabelDisabled({
    required Object label,
  }) {
    return '$label disabled.';
  }

  @override
  String
  get hostsHostEventManageScreenVisiblecopyHosteventmanagescreenDisablenamedinvitelinkFailed =>
      'HostEventManageScreen._disableNamedInviteLink failed';

  @override
  String
  get hostsHostEventManageScreenVisiblecopyHosteventmanagescreenSharehostprivatelinkFailed =>
      'HostEventManageScreen._shareHostPrivateLink failed';

  @override
  String get hostsHostEventManageScreenVisiblecopyFree => 'Free';

  @override
  String hostsHostEventManageScreenVisiblecopyBooked({required Object booked}) {
    return '$booked';
  }

  @override
  String hostsHostEventManageScreenVisiblecopyCapacitylimit({
    required Object capacityLimit,
  }) {
    return '/$capacityLimit';
  }

  @override
  String hostsHostEventManageScreenVisiblecopyWaitlisted({
    required Object waitlisted,
  }) {
    return '$waitlisted';
  }

  @override
  String get hostsHostEventManageScreenStateVisiblecopyNoPeopleMatchThis =>
      'No people match this search.';

  @override
  String get hostsHostEventManageScreenStateVisiblecopySlotsShowCapacityLeft =>
      'Slots show capacity left after booked people. New people appear here once they book or request access.';

  @override
  String
  get hostsHostEventManageScreenStateVisiblecopyBookedAndWaitlistedPeople =>
      'Booked and waitlisted people will appear here.';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyNoLiveRosterRows =>
      'No live roster rows match this search.';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyNoReportRowsMatch =>
      'No report rows match this search.';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyCheckedIn =>
      'Checked in';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyUndo => 'Undo';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyCheckIn => 'Check in';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyFree => 'Free';

  @override
  String get hostsHostEventManageScreenStateVisiblecopySharing => 'Sharing...';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyPublicEventLink =>
      'Public event link';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyLoadingLink =>
      'Loading link';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyInviteSetupUnavailable =>
      'Invite setup unavailable';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyPrivateInviteLink =>
      'Private invite link';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyInviteLinksUnavailable =>
      'Invite links unavailable';

  @override
  String get hostsHostEventManageScreenStateVisiblecopy1InviteLink =>
      '1 invite link';

  @override
  String hostsHostEventManageScreenStateVisiblecopyCountInviteLinks({
    required Object count,
  }) {
    return '$count invite links';
  }

  @override
  String
  get hostsHostEventManageScreenStateVisiblecopyEveryoneVisibleIsChecked =>
      'Everyone visible is checked in';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyNoCheckedInPeople =>
      'No checked-in people yet';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyNoWaitlistedPeople =>
      'No waitlisted people';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyRosterIsEmpty =>
      'Roster is empty';

  @override
  String get hostsHostEventManageScreenStateVisiblecopySwitchToInTo =>
      'Switch to In to review arrivals or All to see the full roster.';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyCheckedInPeopleWill =>
      'Checked-in people will appear here during the event.';

  @override
  String
  get hostsHostEventManageScreenStateVisiblecopyWaitlistedPeopleWillAppear =>
      'Waitlisted people will appear here for context.';

  @override
  String
  get hostsHostEventManageScreenStateVisiblecopySignedUpParticipantsWill =>
      'Signed-up participants will appear here when they book.';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyNoAttendedPeopleYet =>
      'No attended people yet';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyNoNoShowsYet =>
      'No no-shows yet';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyNoParticipantsYet =>
      'No participants yet';

  @override
  String
  get hostsHostEventManageScreenStateVisiblecopyCheckedInPeopleWill186cb6 =>
      'Checked-in people will appear here after the event.';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyBookedPeopleWhoDid =>
      'Booked people who did not check in will appear here.';

  @override
  String
  get hostsHostEventManageScreenStateVisiblecopyWaitlistHistoryWillAppear =>
      'Waitlist history will appear here when people queue for this event.';

  @override
  String
  get hostsHostEventManageScreenStateVisiblecopyAttendanceAndWaitlistHistory =>
      'Attendance and waitlist history will appear here once people sign up.';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyOfferSent =>
      'Offer sent';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyAcceptedOffer =>
      'Accepted offer';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyOfferExpired =>
      'Offer expired';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyApproved => 'Approved';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyViewProfile =>
      'View profile';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyWaitlisted =>
      'Waitlisted';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyProfileReady =>
      'Profile ready';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyBooked => 'Booked';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyCancelled => 'Cancelled';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyDeleted => 'Deleted';

  @override
  String get hostsHostEventManageScreenStateVisiblecopyParticipant =>
      'Participant';

  @override
  String get hostsHostClubTeamScreenVisiblecopyHostProfileSaved =>
      'Host profile saved.';

  @override
  String get hostsHostClubTeamScreenVisiblecopyHostProfileCreated =>
      'Host profile created.';

  @override
  String get hostsHostClubTeamScreenVisiblecopyCreatingProfile =>
      'Creating profile...';

  @override
  String get hostsHostClubTeamScreenVisiblecopyCreateHostProfile =>
      'Create host profile';

  @override
  String get hostsHostClubTeamScreenVisiblecopyAddRoleTitle => 'Add role title';

  @override
  String get hostsHostClubTeamScreenVisiblecopyAddAHostBio => 'Add a host bio';

  @override
  String get hostsHostAuthRequiredScreenVisiblecopySignIn => 'Sign in';

  @override
  String hostsHostClubProfileVisiblecopyMinageMaxage({
    required Object minAge,
    required Object maxAge,
  }) {
    return '$minAge–$maxAge';
  }

  @override
  String hostsHostTodayVisiblecopySignedupcount({
    required Object signedUpCount,
  }) {
    return '$signedUpCount';
  }

  @override
  String hostsHostTodayVisiblecopyTaskcount({required Object taskCount}) {
    return '$taskCount';
  }

  @override
  String get hostsHostInboxScreenVisiblecopySomePushAttemptsFailed =>
      'Some push attempts failed; Activity updates are still available.';

  @override
  String hostsHostInboxScreenVisiblecopyBroadcastSentToRecipientcount({
    required Object recipientCount,
    required Object suffix,
  }) {
    return 'Broadcast sent to $recipientCount people.$suffix';
  }

  @override
  String get hostsHostInboxScreenVisiblecopySelectAnEventOr =>
      'Select an event or general inquiries';

  @override
  String get hostsHostInboxScreenVisiblecopyGeneralInquiries =>
      'General inquiries';

  @override
  String get hostsHostInboxScreenVisiblecopyEventInquiry => 'Event inquiry';

  @override
  String get hostsHostInboxScreenVisiblecopyProgramGuests => 'Program guests';

  @override
  String hostsHostInboxScreenVisiblecopyLongweekdayEventtitlelabel({
    required Object longWeekday,
    required Object eventTitleLabel,
  }) {
    return '$longWeekday $eventTitleLabel';
  }

  @override
  String hostsHostInboxScreenVisiblecopyTonightTime({required Object time}) {
    return 'Tonight $time';
  }

  @override
  String hostsHostInboxScreenVisiblecopyShortdatelabelTime({
    required Object shortDateLabel,
    required Object time,
  }) {
    return '$shortDateLabel · $time';
  }

  @override
  String hostsHostInboxScreenVisiblecopyEventnameTiming({
    required Object eventName,
    required Object timing,
  }) {
    return '$eventName · $timing';
  }

  @override
  String
  hostsHostInboxScreenVisiblecopyTitleShortdatelabelCompacttimerangelabel({
    required Object title,
    required Object shortDateLabel,
    required Object compactTimeRangeLabel,
  }) {
    return '$title · $shortDateLabel · $compactTimeRangeLabel';
  }

  @override
  String get hostsHostPaymentAccountCardVisiblecopyNotSetUp => 'Not set up';

  @override
  String get hostsHostPaymentAccountCardVisiblecopyReady => 'Ready';

  @override
  String get hostsHostPaymentAccountCardVisiblecopyActionNeeded =>
      'Action needed';

  @override
  String get hostsHostPaymentAccountCardVisiblecopyPending => 'Pending';

  @override
  String
  get hostsHostPaymentAccountControllerCardVisiblecopyHostpaymentaccountcontrollercardStartonboardingFailed =>
      'HostPaymentAccountControllerCard.startOnboarding failed';

  @override
  String
  get hostsHostPaymentAccountControllerCardVisiblecopyHostpaymentaccountcontrollercardRefreshFailed =>
      'HostPaymentAccountControllerCard.refresh failed';

  @override
  String get hostsHostEventAttendancePanelVisiblecopyRevenueCsvReady =>
      'Revenue CSV ready.';

  @override
  String get hostsHostEventAttendancePanelVisiblecopySharerevenuereportFailed =>
      '_shareRevenueReport failed';

  @override
  String get hostsHostEventAttendancePanelVisiblecopyOpsCsvReady =>
      'Ops CSV ready.';

  @override
  String get hostsHostEventAttendancePanelVisiblecopyShareopsreportFailed =>
      '_shareOpsReport failed';

  @override
  String get hostsHostEventAttendancePanelVisiblecopyGuest => 'Guest';

  @override
  String get hostsHostEventAttendancePanelVisiblecopySignal => 'Signal';

  @override
  String get hostsHostEventAttendancePanelVisiblecopyHostAction =>
      'Host action';

  @override
  String get hostsHostEventAttendancePanelVisiblecopyStatus => 'Status';

  @override
  String get hostsHostEventAttendancePanelVisiblecopyName => 'Name';

  @override
  String get hostsHostEventAttendancePanelVisiblecopyAttendance => 'Attendance';

  @override
  String get hostsHostEventAttendancePanelVisiblecopyPayment => 'Payment';

  @override
  String hostsHostEventAttendancePanelVisiblecopyValue({
    required Object value,
  }) {
    return '$value';
  }

  @override
  String
  hostsHostEventAttendancePanelVisiblecopyRemainingaftersendStillWaitingAfter({
    required Object remainingAfterSend,
  }) {
    return '$remainingAfterSend still waiting after this offer';
  }

  @override
  String hostsHostEventAttendancePanelVisiblecopyNextCountPersonnounOn({
    required Object count,
    required Object personNoun,
  }) {
    return 'Next $count $personNoun on the waitlist';
  }

  @override
  String hostsHostEventToolsVisiblecopyHostedEventValue1Of({
    required Object value1,
    required Object length,
  }) {
    return 'Hosted event $value1 of $length';
  }

  @override
  String hostsHostEventToolsVisiblecopyHostedEventSelectedindexOf({
    required Object selectedIndex,
    required Object length,
  }) {
    return 'Hosted event $selectedIndex of $length';
  }

  @override
  String
  get hostsHostTeamManagementSectionVisiblecopyHostteammanagementsectionShowaddhostsheetFailed =>
      'HostTeamManagementSection._showAddHostSheet failed';

  @override
  String get hostsHostTeamManagementSectionVisiblecopyHostAdded =>
      'Host added.';

  @override
  String
  get hostsHostTeamManagementSectionVisiblecopyHostteammanagementsectionConfirmhostactionFailed =>
      'HostTeamManagementSection._confirmHostAction failed';

  @override
  String get hostsHostTeamManagementSectionVisiblecopyTransfer => 'transfer';

  @override
  String get hostsHostTeamManagementSectionVisiblecopyRemove => 'remove';

  @override
  String get imageUploadsProfilePhotoEditorScreenVisiblecopyDelete => 'Delete';

  @override
  String get onboardingOnboardingStepVisiblecopyWelcome => 'Welcome';

  @override
  String get onboardingOnboardingStepVisiblecopyYourName => 'Your name';

  @override
  String get onboardingOnboardingStepVisiblecopyGender => 'Gender';

  @override
  String get onboardingOnboardingStepVisiblecopyInstagram => 'Instagram';

  @override
  String get onboardingOnboardingStepVisiblecopyPhotos => 'Photos';

  @override
  String get onboardingOnboardingStepVisiblecopyPrompts => 'Prompts';

  @override
  String get onboardingOnboardingStepVisiblecopyRunningStyle => 'Running style';

  @override
  String get onboardingPhotosPageVisiblecopyUploadFailedPleaseTry =>
      'Upload failed. Please try again.';

  @override
  String get onboardingWelcomePageVisiblecopyReducedMotion => 'reduced_motion';

  @override
  String get onboardingWelcomePageVisiblecopyDirect => 'direct';

  @override
  String get onboardingWelcomePageVisiblecopyAnimated => 'animated';

  @override
  String get onboardingWelcomePageVisiblecopyContinuePhone => 'continue_phone';

  @override
  String get onboardingWelcomePageVisiblecopySeeWhatsOn => 'see_whats_on';

  @override
  String get onboardingWelcomePageVisiblecopyFrom => 'from';

  @override
  String get onboardingWelcomePageVisiblecopyAuth => '/auth';

  @override
  String publicProfilePublicProfileScreenVisiblecopyNameHasBeenBlocked({
    required Object name,
  }) {
    return '$name has been blocked.';
  }

  @override
  String get publicProfilePublicProfileScreenVisiblecopyReportSubmitted =>
      'Report submitted.';

  @override
  String get publicProfilePublicProfileScreenVisiblecopyReport => 'report';

  @override
  String get publicProfilePublicProfileScreenVisiblecopyBlock => 'block';

  @override
  String get publicProfilePublicProfileScreenVisiblecopyHarassmentOrAbuse =>
      'harassment_or_abuse';

  @override
  String
  get publicProfilePublicProfileScreenVisiblecopyFakeOrMisleadingProfile =>
      'fake_or_misleading_profile';

  @override
  String get publicProfilePublicProfileScreenVisiblecopyInappropriateContent =>
      'inappropriate_content';

  @override
  String get publicProfilePublicProfileScreenVisiblecopyOther => 'other';

  @override
  String swipesFiltersScreenVisiblecopyRoundFormatpreferredmatchage({
    required Object round,
    required Object formatPreferredMatchAge,
  }) {
    return '$round – $formatPreferredMatchAge';
  }

  @override
  String get swipesCatchProfileViewVisiblecopyRunningRhythm => 'Running rhythm';

  @override
  String get swipesProfileViewMapperVisiblecopyCompatibility => 'compatibility';

  @override
  String swipesProfileViewMapperVisiblecopyProfilePromptPromptid({
    required Object promptId,
  }) {
    return 'profile-prompt-$promptId';
  }

  @override
  String get swipesProfileViewMapperVisiblecopyRunning => 'running';

  @override
  String get swipesProfileViewMapperVisiblecopyRunningRhythm =>
      'Running rhythm';

  @override
  String get swipesProfileViewMapperVisiblecopyDetails => 'details';

  @override
  String get swipesProfileViewMapperVisiblecopyDetails4d7b56 => 'Details';

  @override
  String get swipesProfileViewMapperVisiblecopyLifestyle => 'lifestyle';

  @override
  String get swipesProfileViewMapperVisiblecopyLifestyle900024 => 'Lifestyle';

  @override
  String get swipesProfileViewMapperVisiblecopyHeroPhoto => 'hero-photo';

  @override
  String get swipesProfileViewMapperVisiblecopyMainPhoto => 'Main photo';

  @override
  String get swipesProfileViewMapperVisiblecopyMainProfilePhoto =>
      'main profile photo';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyDisplayname =>
      'displayName';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyEmaile69bb2 =>
      'email';

  @override
  String
  get userProfileSelfProfileEditTabStateVisiblecopyInstagramhandle71eebb =>
      'instagramHandle';

  @override
  String userProfileSelfProfileEditTabStateVisiblecopyHeightCm({
    required Object height,
  }) {
    return '$height cm';
  }

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyHeight => 'Height';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyCity => 'city';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyOccupation =>
      'occupation';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyCompanyfd8aec =>
      'company';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyEducation =>
      'education';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyReligion =>
      'religion';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyLanguages =>
      'languages';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyRelationshipgoal =>
      'relationshipGoal';

  @override
  String userProfileSelfProfileEditTabStateVisiblecopyFormatpaceKm({
    required Object formatPace,
  }) {
    return '$formatPace/km';
  }

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyPreferreddistances =>
      'preferredDistances';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyRunningreasons =>
      'runningReasons';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyPreferredruntimes =>
      'preferredRunTimes';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyDrinking =>
      'drinking';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopySmoking => 'smoking';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyWorkout => 'workout';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyDiet => 'diet';

  @override
  String get userProfileSelfProfileEditTabStateVisiblecopyChildren =>
      'children';

  @override
  String userProfileInlineEditorHeightBodyHeightcmCm({
    required Object heightCm,
  }) {
    return '$heightCm cm';
  }

  @override
  String userProfileInlineEditorRangeBodyLabeltextLabeltext2({
    required Object labelText,
    required Object labelText2,
  }) {
    return '$labelText - $labelText2';
  }

  @override
  String
  userProfileProfileTabVisiblecopyCompletedpromptcountOfMaxprofilepromptanswersAnswered({
    required Object completedPromptCount,
    required Object maxProfilePromptAnswers,
  }) {
    return '$completedPromptCount of $maxProfilePromptAnswers answered';
  }

  @override
  String
  userProfileProfileTabVisiblecopyCompletedcountOfMaximumprofilephotocountAdded({
    required Object completedCount,
    required Object maximumProfilePhotoCount,
  }) {
    return '$completedCount of $maximumProfilePhotoCount added';
  }

  @override
  String get userProfileProfileTabSkeletonVisiblecopyLoading => 'loading';

  @override
  String get profileQualityPhotosTitle => 'Add 3 clear photos';

  @override
  String get profileQualityPhotosDetail =>
      'A mix of face, full-body, and running/social photos gives people confidence.';

  @override
  String get profileQualityPromptsTitle => 'Answer all 3 prompts';

  @override
  String get profileQualityPromptsDetail =>
      'Specific prompts create the easiest openings for comments and likes.';

  @override
  String get profileQualityPhotoPromptsTitle => 'Add photo prompts';

  @override
  String get profileQualityPhotoPromptsDetail =>
      'Prompts make photos easier to react to without writing captions.';

  @override
  String get profileQualityRelationshipGoalTitle =>
      'Add what you are looking for';

  @override
  String get profileQualityRelationshipGoalDetail =>
      'Intent helps people decide whether starting a conversation makes sense.';

  @override
  String get profileQualityRunningIdentityTitle =>
      'Fill out your running identity';

  @override
  String get profileQualityRunningIdentityDetail =>
      'Distance, reason, and time-of-day preferences power better compatibility signals.';

  @override
  String get profileQualityBackgroundTitle => 'Add one background detail';

  @override
  String get profileQualityBackgroundDetail =>
      'Height, work, education, or languages help round out the card.';

  @override
  String get profileQualityLifestyleTitle => 'Add one lifestyle detail';

  @override
  String get profileQualityLifestyleDetail =>
      'Small details make the profile feel less generic.';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyProfileInsights =>
      'Profile insights';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyLoadingProfileInsights =>
      'Loading profile insights';

  @override
  String get userAnalyticsUserAnalyticsCopyEmptytitleInsightsAreWarmingUp =>
      'Insights are warming up';

  @override
  String get userAnalyticsUserAnalyticsCopyEmptybodyYouWillSeeTrends =>
      'You will see trends here after Catch has enough event and profile activity.';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyRange => 'Range';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyTrend => 'Trend';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopySuggestions =>
      'Suggestions';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyDataCoverage =>
      'Data coverage';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyPartial => 'Partial';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyMissing => 'Missing';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyLast7Days =>
      'Last 7 days';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyLast30Days =>
      'Last 30 days';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyLast90Days =>
      'Last 90 days';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyThisMonth => 'This month';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyProfileViews =>
      'Profile views';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyCaughtYou => 'Caught you';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyMutualCatches =>
      'Mutual catches';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyChatsStarted =>
      'Chats started';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyEventsAttended =>
      'Events attended';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyFollowThrough =>
      'Follow-through';

  @override
  String
  get userAnalyticsUserAnalyticsCopyVisiblecopyPostEventProfileAttention =>
      'Post-event profile attention.';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyPeopleWhoShowedInterest =>
      'People who showed interest.';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyMatchesWhereInterestWas =>
      'Matches where interest was mutual.';

  @override
  String
  get userAnalyticsUserAnalyticsCopyVisiblecopyConversationsThatOpenedAfter =>
      'Conversations that opened after matching.';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyEventsYouAttended =>
      'Events you attended.';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyChatsStartedFromMutual =>
      'Chats started from mutual catches.';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyViews => 'Views';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyInterest => 'Interest';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyMatches => 'Matches';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyChats => 'Chats';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyAttended => 'Attended';

  @override
  String get userAnalyticsUserAnalyticsCopyTitleTuneYourProfile =>
      'Tune your profile';

  @override
  String get userAnalyticsUserAnalyticsCopyBodyAFreshPromptOr =>
      'A fresh prompt or first photo can make post-event interest easier to read.';

  @override
  String get userAnalyticsUserAnalyticsCopyTitleOpenTheLoop => 'Open the loop';

  @override
  String get userAnalyticsUserAnalyticsCopyBodyAShortMessageAfter =>
      'A short message after a mutual catch is the clearest follow-through signal.';

  @override
  String get userAnalyticsUserAnalyticsCopyTitleShowUpInPerson =>
      'Show up in person';

  @override
  String get userAnalyticsUserAnalyticsCopyBodyTheStrongestProfileTrends =>
      'The strongest profile trends start after attended events.';

  @override
  String get userAnalyticsUserAnalyticsCopyTitleKeepShowingUp =>
      'Keep showing up';

  @override
  String get userAnalyticsUserAnalyticsCopyBodyRepeatedEventAttendanceGives =>
      'Repeated event attendance gives Catch better connection signal.';

  @override
  String get userAnalyticsUserAnalyticsCopyTitleKeepBuildingSignal =>
      'Keep building signal';

  @override
  String get userAnalyticsUserAnalyticsCopyBodyInsightsGetSharperAfter =>
      'Insights get sharper after more post-event profile views.';

  @override
  String get coreCatchPrivacyBadgeLabelPrivateToYou => 'Private to you';

  @override
  String get coreCatchPrivacyBadgeLabelHostCanSee => 'Host can see';

  @override
  String get coreCatchPrivacyBadgeLabelCatchPrivate => 'Catch private';

  @override
  String get eventSuccessEventSuccessLiveRevealCardLabelPodReveal =>
      'Pod reveal';

  @override
  String get eventSuccessEventSuccessLiveRevealCardLabelRotationReveal =>
      'Rotation reveal';

  @override
  String get eventSuccessControlRoomSynced => 'Synced';

  @override
  String eventSuccessControlRoomLiveSyncStatus({required String syncStatus}) {
    return 'Live now · $syncStatus';
  }

  @override
  String get eventSuccessControlRoomSyncing => 'Saving';

  @override
  String get eventSuccessControlRoomSaveFailed => 'Save failed';

  @override
  String get eventSuccessControlRoomOffline => 'Offline';

  @override
  String get eventSuccessControlRoomNeedsReview => 'Needs review';

  @override
  String eventSuccessControlRoomStepProgress({
    required int current,
    required int total,
    required String stage,
  }) {
    return 'Step $current of $total · $stage';
  }

  @override
  String eventSuccessEventSuccessHostLiveLabelBeatNumber({
    required int number,
  }) {
    return 'Beat $number';
  }

  @override
  String eventSuccessEventSuccessHostLiveLabelRoundNumber({
    required int number,
  }) {
    return 'Round $number';
  }

  @override
  String get eventSuccessEventSuccessHostLiveLabelFirstCourse => 'First course';

  @override
  String get eventSuccessEventSuccessHostLiveLabelSecondCourse =>
      'Second course';

  @override
  String get eventSuccessEventSuccessHostLiveLabelThirdCourse => 'Third course';

  @override
  String get eventSuccessEventSuccessHostLiveLabelFourthCourse =>
      'Fourth course';

  @override
  String eventSuccessEventSuccessHostLiveLabelCourseNumber({
    required int number,
  }) {
    return 'Course $number';
  }

  @override
  String eventSuccessEventSuccessHostLiveLabelLegNumber({required int number}) {
    return 'Leg $number';
  }

  @override
  String get eventSuccessControlRoomUpNext => 'Up next';

  @override
  String get eventSuccessControlRoomGuests => 'Guests';

  @override
  String eventSuccessControlRoomGuestsSummary({
    required int checkedIn,
    required int expected,
  }) {
    return '$checkedIn checked in · $expected expected';
  }

  @override
  String eventSuccessControlRoomGuestsCheckedInOnly({required int checkedIn}) {
    return '$checkedIn checked in';
  }

  @override
  String get eventSuccessControlRoomExclusionAlertTitle =>
      'Guests need an introduction';

  @override
  String eventSuccessControlRoomExclusionAlertBody({
    required int count,
    required int minutes,
  }) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count people have',
      one: '1 person has',
    );
    return '$_temp0 not been assigned to anyone in $minutes minutes.';
  }

  @override
  String get eventSuccessControlRoomHelpFallback => 'Help & fallback';

  @override
  String get eventSuccessControlRoomHelpFallbackSubtitle =>
      'Recovery steps for the room';

  @override
  String eventSuccessControlRoomContinueTo({required String title}) {
    return 'Continue to $title';
  }

  @override
  String get eventSuccessControlRoomFallbackTitle => 'Keep the room moving';

  @override
  String get eventSuccessControlRoomFallbackSubtitle =>
      'A simple reset when the plan or connection gets in the way.';

  @override
  String get eventSuccessControlRoomFallbackStayTitle => 'Stay on this step';

  @override
  String get eventSuccessControlRoomFallbackStayBody =>
      'Keep using the instruction on screen while you settle the room.';

  @override
  String get eventSuccessControlRoomFallbackGuestsTitle =>
      'Take attendance manually';

  @override
  String get eventSuccessControlRoomFallbackGuestsBody =>
      'Open Guests to check people in or add anyone who was not booked through Catch.';

  @override
  String get eventSuccessControlRoomFallbackContinueTitle =>
      'Continue when ready';

  @override
  String get eventSuccessControlRoomFallbackContinueBody =>
      'The guide only moves when you tap the primary action, so the room stays in your control.';

  @override
  String get eventSuccessControlRoomFallbackDone => 'Back to Control Room';

  @override
  String get eventSuccessEventSuccessHostSharedLabelSetup => 'Setup';

  @override
  String get eventSuccessEventSuccessHostSharedLabelLive => 'Live';

  @override
  String get eventSuccessEventSuccessHostSharedLabelReport => 'Report';

  @override
  String eventsEventDetailScreenStateVisiblecopyClubReviewSummary({
    required Object rating,
    required Object reviewCount,
  }) {
    return '$rating FROM $reviewCount ORGANIZER REVIEWS';
  }

  @override
  String get dashboardDashboardFullViewModelTitleLetSFindYour =>
      'Let\'s find your first event';

  @override
  String dashboardDashboardFullViewModelTitleDashboardgreetingName({
    required Object dashboardGreeting,
    required Object name,
  }) {
    return '$dashboardGreeting, $name';
  }

  @override
  String get dashboardDashboardFullViewModelVisiblecopyMorning => 'Morning';

  @override
  String get dashboardDashboardFullViewModelVisiblecopyAfternoon => 'Afternoon';

  @override
  String get dashboardDashboardFullViewModelVisiblecopyEvening => 'Evening';

  @override
  String get coreAppErrorMessageVisiblecopyExploreIsStillGetting =>
      'Explore is still getting set up. Please try again in a moment.';

  @override
  String get coreAppErrorMessageVisiblecopyConnectionIssue =>
      'Connection issue';

  @override
  String get coreAppErrorMessageVisiblecopySignInRequired => 'Sign in required';

  @override
  String get coreAppErrorMessageVisiblecopyActionUnavailable =>
      'Action unavailable';

  @override
  String get coreAppErrorMessageVisiblecopyCheckYourDetails =>
      'Check your details';

  @override
  String get coreAppErrorMessageVisiblecopyPaymentCancelled =>
      'Payment cancelled';

  @override
  String get coreAppErrorMessageVisiblecopyPaymentVerificationFailed =>
      'Payment verification failed';

  @override
  String get coreAppErrorMessageVisiblecopyPaymentFailed => 'Payment failed';

  @override
  String get coreAppErrorMessageVisiblecopyPaymentUnavailable =>
      'Payment unavailable';

  @override
  String get coreAppErrorMessageVisiblecopyEventSignupUnavailable =>
      'Event signup unavailable';

  @override
  String get coreAppErrorMessageVisiblecopyUploadFailed => 'Upload failed';

  @override
  String get coreAppErrorMessageVisiblecopyActionFailed => 'Action failed';

  @override
  String get coreAppErrorMessageVisiblecopySessionVerificationFailed =>
      'Session verification failed';

  @override
  String get coreAppErrorMessageVisiblecopyNotificationsUnavailable =>
      'Notifications unavailable';

  @override
  String get coreAppErrorMessageVisiblecopyUpdateCheckUnavailable =>
      'Update check unavailable';

  @override
  String get coreAppErrorMessageVisiblecopySignInProblem => 'Sign in problem';

  @override
  String get coreAppErrorMessageVisiblecopyDashboardUnavailable =>
      'Dashboard unavailable';

  @override
  String get coreAppErrorMessageVisiblecopyExploreUnavailable =>
      'Explore unavailable';

  @override
  String get coreAppErrorMessageVisiblecopyProfileUnavailable =>
      'Profile unavailable';

  @override
  String get coreAppErrorMessageVisiblecopyEventUnavailable =>
      'Event unavailable';

  @override
  String get coreAppErrorMessageVisiblecopyClubUnavailable =>
      'Organizer unavailable';

  @override
  String get coreAppErrorMessageVisiblecopyMessagesUnavailable =>
      'Messages unavailable';

  @override
  String get coreAppErrorMessageVisiblecopyCatchesUnavailable =>
      'Catches unavailable';

  @override
  String get coreAppErrorMessageVisiblecopyPaymentsUnavailable =>
      'Payments unavailable';

  @override
  String get coreAppErrorMessageVisiblecopySomethingWentWrong =>
      'Something went wrong';

  @override
  String get coreAppErrorMessageVisiblecopySignIn => 'Sign in';

  @override
  String get coreAppErrorMessageVisiblecopyTryUploadAgain => 'Try upload again';

  @override
  String get coreAppErrorMessageVisiblecopyTryPaymentAgain =>
      'Try payment again';

  @override
  String get coreAppErrorMessageVisiblecopyReloadMessages => 'Reload messages';

  @override
  String get coreAppErrorMessageVisiblecopyReloadExplore => 'Reload Explore';

  @override
  String get coreAppErrorMessageVisiblecopyReloadProfile => 'Reload profile';

  @override
  String get coreAppErrorMessageVisiblecopyReloadEvent => 'Reload event';

  @override
  String get coreAppErrorMessageVisiblecopyReloadClub => 'Reload organizer';

  @override
  String get coreAppErrorMessageVisiblecopyReloadCatches => 'Reload catches';

  @override
  String get coreAppErrorMessageVisiblecopyReloadPayments => 'Reload payments';

  @override
  String get coreAppErrorMessageVisiblecopyTryAgain => 'Try again';

  @override
  String get coreAppErrorMessageVisiblecopyProfileNotFound =>
      'Profile not found';

  @override
  String get coreAppErrorMessageVisiblecopyExploreItemNotFound =>
      'Explore item not found';

  @override
  String get coreAppErrorMessageVisiblecopyEventNotFound => 'Event not found';

  @override
  String get coreAppErrorMessageVisiblecopyClubNotFound =>
      'Organizer not found';

  @override
  String get coreAppErrorMessageVisiblecopyChatNotFound => 'Chat not found';

  @override
  String get coreAppErrorMessageVisiblecopyCatchesNotFound =>
      'Catches not found';

  @override
  String get coreAppErrorMessageVisiblecopyPaymentNotFound =>
      'Payment not found';

  @override
  String get coreAppErrorMessageVisiblecopyNotFound => 'Not found';

  @override
  String get hostsHostOperationsScreenStateTitleClubs => 'Organizers';

  @override
  String get imageUploadsProfilePhotoEditorScreenLabelNoPrompt => 'No prompt';

  @override
  String get publicProfilePublicProfileScreenStateTitleProfile => 'Profile';

  @override
  String get hostsDraftPickerSheetVisiblecopyDeleteDraft => 'Delete draft?';

  @override
  String get hostsDraftPickerSheetLabelCancel => 'Cancel';

  @override
  String get hostsDraftPickerSheetLabelDelete => 'Delete';

  @override
  String hostsDraftPickerSheetVisiblecopyThisWillPermanentlyDelete({
    required Object summary,
  }) {
    return 'This will permanently delete \"$summary\".';
  }

  @override
  String swipesProfileCardContentTextHeightCm({required Object height}) {
    return '$height cm';
  }

  @override
  String swipesProfileCardContentTextOccupationAtCompany({
    required Object occupation,
    required Object company,
  }) {
    return '$occupation at $company';
  }

  @override
  String get onboardingPhotosPageStateVisiblecopyFinishUploadingYourPhotos =>
      'Finish uploading your photos to continue.';

  @override
  String get onboardingPhotosPageStateLabel1MorePhoto => '1 more photo';

  @override
  String onboardingPhotosPageStateLabelRemainingphotosMorePhotos({
    required Object remainingPhotos,
  }) {
    return '$remainingPhotos more photos';
  }

  @override
  String onboardingPhotosPageStateVisiblecopyAddLabelToContinue({
    required Object label,
  }) {
    return 'Add $label to continue.';
  }

  @override
  String get onboardingPhotosPageStateVisiblecopyThisOnlyGatesCatches =>
      'This only gates Catches. Event booking stays available.';

  @override
  String get onboardingPhotosPageStateVisiblecopyRunningPhotosBoostCatches =>
      'Running photos boost catches by 2.3x.';

  @override
  String
  hostsHostEventManageScreenStateVisiblecopyPriceinpaiseGrossEstimateCheckedincount({
    required Object priceInPaise,
    required Object checkedInCount,
    required Object noShowCount,
    required Object waitlistCount,
  }) {
    return '$priceInPaise gross estimate · $checkedInCount attended · $noShowCount no-shows · $waitlistCount waitlisted.';
  }

  @override
  String get coreAppErrorMessageVisiblecopySomethingWentWrongPlease =>
      'Something went wrong. Please try again.';

  @override
  String get coreAppErrorMessageVisiblecopyUnableToCheckThe =>
      'Unable to check the latest app configuration right now.';

  @override
  String get coreAppErrorMessageVisiblecopyUnableToVerifyThis =>
      'Unable to verify this app session. Please try again.';

  @override
  String get coreAppErrorMessageVisiblecopyUnableToUpdateNotification =>
      'Unable to update notification settings right now.';

  @override
  String get coreAppErrorMessageVisiblecopyPleaseSignInTo =>
      'Please sign in to continue.';

  @override
  String get coreAppErrorMessageVisiblecopyPaymentWasCancelled =>
      'Payment was cancelled.';

  @override
  String get coreAppErrorMessageVisiblecopyPaymentFailedPleaseTry =>
      'Payment failed. Please try again.';

  @override
  String get coreAppErrorMessageVisiblecopyPaymentCouldNotBe =>
      'Payment could not be verified. Please contact support.';

  @override
  String get coreAppErrorMessageVisiblecopyPaidBookingsAreOnly =>
      'Paid bookings are only available on Android and iOS.';

  @override
  String get coreAppErrorMessageVisiblecopyWeCouldNotFind =>
      'We could not find what you requested.';

  @override
  String get coreAppErrorMessageVisiblecopyThatImageIsToo =>
      'That image is too large. Please choose a smaller image.';

  @override
  String get coreAppErrorMessageVisiblecopyPleaseChooseAnImage =>
      'Please choose an image file.';

  @override
  String get coreAppErrorMessageVisiblecopyThatImageCouldNot =>
      'That image could not be uploaded. Please choose another image.';

  @override
  String get coreAppErrorMessageVisiblecopyPleaseEnterAValid =>
      'Please enter a valid phone number.';

  @override
  String get coreAppErrorMessageVisiblecopyThatCodeIsInvalid =>
      'That code is invalid. Please try again.';

  @override
  String get coreAppErrorMessageVisiblecopyThatCodeExpiredPlease =>
      'That code expired. Please request a new one.';

  @override
  String get coreAppErrorMessageVisiblecopyWeAreHavingTrouble =>
      'We are having trouble connecting. Please check your internet and try again.';

  @override
  String get coreAppErrorMessageVisiblecopyTheRequestTimedOut =>
      'The request timed out. Please try again.';

  @override
  String get coreAppErrorMessageVisiblecopyTooManyAttemptsPlease =>
      'Too many attempts. Please wait a bit and try again.';

  @override
  String get coreAppErrorMessageVisiblecopyYouDoNotHave =>
      'You do not have permission to do that.';

  @override
  String get coreAppErrorMessageVisiblecopyThisAlreadyExists =>
      'This already exists.';

  @override
  String get coreAppErrorMessageVisiblecopyTheOperationCouldNot =>
      'The operation could not be completed. Please try again.';

  @override
  String get coreAppErrorMessageVisiblecopyThisDataIsStill =>
      'This data is still getting set up. Please try again in a moment.';

  @override
  String get coreAppErrorMessageVisiblecopyThisSignInMethod =>
      'This sign-in method is not enabled.';

  @override
  String get coreAppErrorMessageVisiblecopyThisAccountHasBeen =>
      'This account has been disabled.';

  @override
  String get coreAppErrorMessageVisiblecopyUnableToFinishSign =>
      'Unable to finish sign-in on this device. Please restart the app and request a new code.';

  @override
  String get coreAppErrorMessageVisiblecopyVerificationWasCancelledPlease =>
      'Verification was cancelled. Please try again when ready.';

  @override
  String get coreAppErrorMessageVisiblecopyUnableToCompleteThe =>
      'Unable to complete the verification check. Please close the verification window and try again.';

  @override
  String get coreAppErrorMessageVisiblecopyPleaseCompleteYourBasic =>
      'Please complete your basic profile details before continuing.';

  @override
  String get coreAppErrorMessageVisiblecopyPleaseChooseYourDating =>
      'Please choose your dating preferences before continuing.';

  @override
  String get coreAppErrorMessageVisiblecopyPleaseChooseWhoYou =>
      'Please choose who you want to see before continuing.';

  @override
  String get coreAppErrorMessageVisiblecopyPleaseAddAValid =>
      'Please add a valid phone number before continuing.';

  @override
  String get coreAppErrorMessageVisiblecopyPleaseVerifyYourPhone =>
      'Please verify your phone number before continuing.';

  @override
  String get coreAppErrorMessageVisiblecopyPleaseCompleteYourAccess =>
      'Please complete your access application.';

  @override
  String get coreAppErrorMessageVisiblecopyThisAccessApplicationIs =>
      'This access application is already locked for review.';

  @override
  String get coreAppErrorMessageVisiblecopyOnlyAClubHost =>
      'Only an organizer manager can edit this organizer.';

  @override
  String get coreAppErrorMessageVisiblecopyOnlyTheClubOwner =>
      'Only the organizer owner can edit organizer details.';

  @override
  String get coreAppErrorMessageVisiblecopyChooseAClubBefore =>
      'Choose an organizer before creating the event.';

  @override
  String get coreAppErrorMessageVisiblecopyAddAMeetingLocation =>
      'Add a meeting location before creating the event.';

  @override
  String get coreAppErrorMessageVisiblecopyProfilesAreTakingToo =>
      'Profiles are taking too long to load. Please check your connection and try again.';

  @override
  String get coreAppErrorMessageVisiblecopyProfileChangedWhileSaving =>
      'Profile changed while saving. Please try again.';

  @override
  String get coreAppErrorMessageVisiblecopyCheckTheHighlightedDetails =>
      'Check the highlighted details and try again.';

  @override
  String coreCatchFieldVisiblecopySelectTolowercase({
    required Object toLowerCase,
  }) {
    return 'Select $toLowerCase';
  }

  @override
  String coreCatchFieldVisiblecopyAddFieldLabel({required Object fieldLabel}) {
    return 'Add $fieldLabel';
  }

  @override
  String exploreExploreMapScreenLabelWithinDistance({required int distanceKm}) {
    return 'Within $distanceKm km';
  }

  @override
  String get exploreExploreMapScreenLabelDistance => 'Distance';

  @override
  String get exploreExploreMapScreenValueAnyDistance => 'Any';

  @override
  String exploreExploreMapScreenValueDistanceKm({required int distanceKm}) {
    return '$distanceKm km';
  }

  @override
  String get exploreExploreMapScreenActionUseMyLocation => 'Use my location';

  @override
  String get exploreExploreMapScreenActionLocating => 'Locating';

  @override
  String get exploreExploreMapScreenSemanticsLocating =>
      'Finding your location';

  @override
  String exploreExploreMapScreenSemanticsDistanceValue({
    required Object distance,
  }) {
    return 'Distance, $distance. Tap to change';
  }

  @override
  String get exploreExploreMapScreenSemanticsUseMyLocation =>
      'Use my location to set a distance';

  @override
  String get exploreExploreMapScreenHintChangeDistance =>
      'Changes the distance filter';

  @override
  String get exploreExploreMapScreenMessageLocationUnavailable =>
      'Location is unavailable. You can still browse the map.';

  @override
  String get exploreExploreMapScreenMessageLocationServicesDisabled =>
      'Location Services are off. Turn them on in Settings to use a distance ring.';

  @override
  String get exploreExploreMapScreenMessageLocationPermissionDeniedForever =>
      'Location access is off for Catch. You can enable it in Settings.';

  @override
  String get exploreExploreMapScreenActionOpenSettings => 'Open settings';

  @override
  String eventsEventPinsMapSemanticsEventCluster({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count events',
      one: '1 event',
    );
    return '$_temp0';
  }

  @override
  String get eventsEventPinsMapTooltipShowAllEventsAndDistance =>
      'Show all events and distance';

  @override
  String exploreExploreMapScreenTitleNoEventsWithinDistance({
    required int distanceKm,
  }) {
    return 'No events within $distanceKm km';
  }

  @override
  String exploreExploreMapScreenMessageTryWiderOrShowCity({
    required String cityLabel,
  }) {
    return 'Try a wider distance, or show every event in $cityLabel.';
  }

  @override
  String exploreExploreMapScreenActionExpandToDistance({
    required int distanceKm,
  }) {
    return 'Expand to $distanceKm km';
  }

  @override
  String get exploreExploreMapScreenActionShowAll => 'Show all';

  @override
  String get exploreExploreMapScreenTitleNoEventsMatchMap =>
      'No events match this map';

  @override
  String get exploreExploreMapScreenMessageChangeFiltersToBringEventsBack =>
      'Change your filters to bring events back into view.';

  @override
  String get eventsEventLocationMapBodyScreenTitleLocationUnavailable =>
      'Location unavailable';

  @override
  String get eventsEventLocationMapBodyScreenMessageThisEventDoesNot =>
      'This event does not have an exact pinned starting point yet.';

  @override
  String get userAnalyticsUserAnalyticsCopyVisiblecopyAvailable => 'Available';

  @override
  String get userAnalyticsUserAnalyticsCopyDataqualityParticipantSignals =>
      'Participant signals';

  @override
  String get userAnalyticsUserAnalyticsCopyDataqualityProfileExposure =>
      'Profile exposure';

  @override
  String get userAnalyticsUserAnalyticsCopyDataqualityAppEngagement =>
      'App engagement';

  @override
  String get userAnalyticsUserAnalyticsCopyDataqualityAnalyticsSource =>
      'Analytics source';

  @override
  String get sharedSearchLabel => 'Search';

  @override
  String get sharedActionDelete => 'Delete';

  @override
  String get sharedValidationRequired => 'Required';

  @override
  String get sharedValidationInvalid => 'Invalid';

  @override
  String get sharedValidationMinimumOne => 'Min 1';

  @override
  String get sharedValidationInviteCodeMinimum => 'Min 4 chars';

  @override
  String get sharedValidationInviteCodeMaximum => 'Max 64 chars';

  @override
  String get sharedValidationAgeRange => '18-99';

  @override
  String get sharedValidationMinimumAtMostMaximum => '<= max';

  @override
  String get sharedValidationMaximumAtLeastMinimum => '>= min';

  @override
  String get chatsEmptyStateNoCatchesTitle => 'No catches yet';

  @override
  String get chatsEmptyStateNoCatchesMessage =>
      'When someone catches you back after a shared event, the conversation opens here with that event as context.';

  @override
  String get chatsEmptyStateHostInboxTitle => 'No attendee queries yet';

  @override
  String get chatsEmptyStateHostInboxMessage =>
      'Guest and attendee questions will appear here once people reach out about an event.';

  @override
  String get chatsEmptyStateNoSearchResultsTitle =>
      'No chats match your search';

  @override
  String get chatsEmptyStateNoSearchResultsMessage =>
      'Try another name or clear the search field.';

  @override
  String get chatsEmptyStateNoHostSearchResultsTitle =>
      'No attendee queries match your search';

  @override
  String get chatsEmptyStateNoHostSearchResultsMessage =>
      'Try another attendee name or clear the search field.';

  @override
  String get chatsEmptyStateNoUnreadQueriesTitle => 'No unread queries';

  @override
  String get chatsEmptyStateNoUnreadQueriesMessage =>
      'New attendee questions will move here until you open their thread.';

  @override
  String get clubsClubShareCardFootnote =>
      'Shares a visual organizer card with the organizer link.';

  @override
  String clubsClubShareCardHostedBy({required String hostName}) {
    return 'Hosted by $hostName';
  }

  @override
  String clubsClubShareTextIntro({required String clubName}) {
    return 'Check out $clubName on Catch.';
  }

  @override
  String get clubsClubHostRoleOwner => 'OWNER';

  @override
  String get clubsClubHostRoleHost => 'HOST';

  @override
  String clubsClubHostEstablishedMeta({
    required String role,
    required String established,
  }) {
    return '$role · EST. $established';
  }

  @override
  String get clubsClubScheduleHostedBadge => 'HOSTED';

  @override
  String get clubsClubScheduleViewBadge => 'VIEW';

  @override
  String get eventsInviteShareButton => 'Share invite';

  @override
  String get eventsInviteShareFootnote =>
      'Shares a visual invite with the event link.';

  @override
  String eventsInviteShareSubject({required String eventTitle}) {
    return 'Join me at $eventTitle';
  }

  @override
  String get eventsInviteShareEventDetailIntro =>
      'This feels like your kind of plan.';

  @override
  String get eventsInviteShareBookingIntro =>
      'I just booked this. Come with me?';

  @override
  String get eventsInviteShareReferralIntro =>
      'I am going to this on Catch and thought of you.';

  @override
  String eventsInviteShareHostPrivateIntro({
    required String eventTitle,
    required String clubName,
  }) {
    return 'You are invited to $eventTitle from $clubName.';
  }

  @override
  String get eventsInviteShareHostPrivatePrompt =>
      'Use this private Catch invite to book your spot:';

  @override
  String get eventsInviteShareBookingPrompt => 'Book it on Catch:';

  @override
  String get eventsInviteShareFree => 'Free';

  @override
  String get eventsInviteShareFooter => 'Curated singles event';

  @override
  String eventsInviteShareSpotsLeft({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count spots left',
      one: '1 spot left',
    );
    return '$_temp0';
  }

  @override
  String get eventsInviteShareWaitlistOpen => 'Waitlist open';

  @override
  String get eventsTileStatusOpen => 'Open';

  @override
  String get eventsTileStatusJoined => 'You\'re in';

  @override
  String get eventsTileStatusSaved => 'Saved';

  @override
  String get eventsTileStatusRecommended => 'Recommended';

  @override
  String get eventsTileStatusHosted => 'Hosted';

  @override
  String get eventsTileStatusWaitlisted => 'Waitlisted';

  @override
  String get eventsTileStatusAttended => 'Attended';

  @override
  String get eventsTileStatusPast => 'Past';

  @override
  String get eventsTileStatusFull => 'Full';

  @override
  String get eventsTileStatusIneligible => 'Not eligible';

  @override
  String get eventsTileStatusCancelled => 'Cancelled';

  @override
  String get exploreRecommendationsTitleForYou => 'For you';

  @override
  String get eventsLocationPickerSelectedPlace => 'selected place';

  @override
  String get eventsLocationPickerSearchFailure =>
      'Could not search places. Try again.';

  @override
  String get eventsLocationPickerDetailsFailure =>
      'Could not load that place. Try another result.';

  @override
  String get eventSuccessSocialMissionTitle => 'Social mission';

  @override
  String get hostsAdmissionOpenCapacityDescription =>
      'Anyone eligible can book until the event reaches capacity.';

  @override
  String get hostsAdmissionInviteOnlyDescription =>
      'New invite-only events ask for an event-specific code.';

  @override
  String get hostsAdmissionBalancedSinglesDescription =>
      'Straight men and women are kept within one spot of each other.';

  @override
  String get hostsAdmissionFixedCohortCapsLabel => 'Fixed cohort caps';

  @override
  String get hostsAdmissionFixedCohortCapsDescription =>
      'Open booking with optional straight men and straight women caps.';

  @override
  String get hostsValidationEnterValidEmail => 'Enter a valid email.';

  @override
  String get hostsValidationEnterDisplayName => 'Enter a display name.';

  @override
  String get hostsProfileStatusActive => 'Active professional profile';

  @override
  String get hostsProfileStatusPending => 'Profile pending review';

  @override
  String get hostsProfileStatusSuspended => 'Profile suspended';

  @override
  String get hostsEventActionCancelling => 'Cancelling...';

  @override
  String get hostsEventActionCancelDetail => 'Keeps records · notifies guests';

  @override
  String get hostsEventActionDeleting => 'Deleting...';

  @override
  String get hostsEventActionDeleteDetail => 'Permanent removal';

  @override
  String get hostsEventEditSaveChanges => 'Save changes';

  @override
  String get hostsEventEditUpdated => 'Event updated.';

  @override
  String get hostsEventEditMissingStartingPoint =>
      'Pin a starting point before saving.';

  @override
  String get hostsEventEditInvalidSchedule =>
      'Event start must be in the future.';

  @override
  String get launchAccessValidationChooseCity => 'Please choose your city';

  @override
  String get launchAccessValidationChooseEventType =>
      'Choose at least one event type';

  @override
  String get launchAccessValidationChooseTime => 'Choose at least one time';

  @override
  String get launchAccessValidationTellUsMore => 'Tell us a little more.';

  @override
  String matchesCelebrationLikedBack({required String name}) {
    return '$name liked you back.';
  }

  @override
  String get onboardingRunningPrefsContinueBooking => 'Continue booking';

  @override
  String get onboardingRunningPrefsSave => 'Save run preferences';

  @override
  String get onboardingRunningPrefsBookingReasonLabel => 'Why do you run?';

  @override
  String get onboardingRunningPrefsReasonLabel => 'WHY DO YOU RUN?';

  @override
  String get onboardingRunningPrefsRunTimesLabel => 'FAVOURITE RUN TIMES';

  @override
  String get onboardingRunningPrefsEventTimesLabel => 'FAVOURITE EVENT TIMES';

  @override
  String get onboardingGenderValidationSelectGender =>
      'Please select your gender';

  @override
  String get onboardingGenderValidationSelectInterest =>
      'Please select who you want to see';

  @override
  String get paymentsHistorySupportMessage =>
      'Contact Catch support and include the payment and order IDs shown on this receipt.';

  @override
  String get safetyAccountUnblockedMessage => 'Account unblocked.';

  @override
  String get eventsEventPriceCopyFree => 'Free';

  @override
  String eventsEventPriceCopyFromPrice({required Object price}) {
    return 'From $price';
  }

  @override
  String get eventsEventPriceCopyPriceOnSource => 'Price on source';

  @override
  String coreCatchCountCopyEvents({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count events',
      one: '1 event',
      zero: 'No events',
    );
    return '$_temp0';
  }

  @override
  String coreCatchDistanceFormatterMetersAway({required int meters}) {
    return '$meters m away';
  }

  @override
  String coreCatchDistanceFormatterKilometersAway({required String distance}) {
    return '$distance km away';
  }

  @override
  String get exploreExploreScreenStateAvailabilityOpen => 'Open';

  @override
  String get exploreExploreScreenStateAvailabilityApprovedToJoin =>
      'Approved to join';

  @override
  String get exploreExploreScreenStateAvailabilityRequestRequired =>
      'Request required';

  @override
  String get exploreExploreScreenStateAvailabilityWaitlistOpen =>
      'Waitlist open';

  @override
  String get exploreExploreScreenStateAvailabilityFull => 'Full';

  @override
  String get exploreExploreScreenStateAvailabilityFullForYou =>
      'Your group is full';

  @override
  String get exploreExploreScreenStateAvailabilityInviteRequired =>
      'Invite required';

  @override
  String get exploreExploreScreenStateAvailabilityMembersOnly => 'Members only';

  @override
  String get exploreExploreScreenStateAvailabilitySetPreferences =>
      'Set preferences';

  @override
  String get exploreExploreScreenStateAvailabilityEnded => 'Ended';

  @override
  String get exploreExploreScreenStateAvailabilityCancelled => 'Cancelled';

  @override
  String get exploreExploreScreenStateAvailabilityAgeRestricted =>
      'Age restricted';

  @override
  String exploreExploreScreenStateAvailabilityMinimumAge({
    required int minAge,
  }) {
    return 'Must be $minAge+';
  }

  @override
  String exploreExploreScreenStateAvailabilityMaximumAge({
    required int maxAge,
  }) {
    return 'Max age $maxAge';
  }

  @override
  String exploreExploreScreenStateAvailabilitySpotsLeft({required int spots}) {
    String _temp0 = intl.Intl.pluralLogic(
      spots,
      locale: localeName,
      other: '$spots spots left',
      one: '1 spot left',
    );
    return '$_temp0';
  }

  @override
  String exploreExploreScreenStateGoingCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count going',
      one: '1 going',
    );
    return '$_temp0';
  }

  @override
  String exploreExploreScreenStateGoingAvailability({
    required Object goingLabel,
    required Object availabilityLabel,
  }) {
    return '$goingLabel · $availabilityLabel';
  }

  @override
  String exploreExploreScreenStateClubRatingReviews({
    required Object rating,
    required int reviewCount,
  }) {
    String _temp0 = intl.Intl.pluralLogic(
      reviewCount,
      locale: localeName,
      other: '$reviewCount REVIEWS',
      one: '1 REVIEW',
      zero: 'NO REVIEWS',
    );
    return '$rating · $_temp0';
  }

  @override
  String exploreExploreScreenStateClubCardSemantics({
    required Object title,
    required Object caption,
    required Object supportingLabel,
    required Object memberCountLabel,
    required Object ratingReviewLabel,
  }) {
    return '$title, $caption, $supportingLabel, $memberCountLabel, $ratingReviewLabel';
  }

  @override
  String exploreExploreScreenStateExternalEventSemantics({
    required Object title,
    required Object sourceLabel,
    required Object statusLabel,
    required Object supportingLabel,
    required Object timePriceLabel,
    required Object readOnlySupplyLabel,
  }) {
    return '$title, $sourceLabel, $statusLabel, $supportingLabel, $timePriceLabel, $readOnlySupplyLabel';
  }

  @override
  String get crossPathsPairInventoryActionAskTogether => 'Ask to go together';

  @override
  String get crossPathsPairInventoryStatusHeldNotBooked =>
      'Your pair spot is held — you are not booked yet';

  @override
  String get crossPathsPairInventoryStatusNoLongerHeld =>
      'This pair spot is no longer held';

  @override
  String crossPathsPairInventoryHoldCountdown({required int minutes}) {
    return 'Complete your booking within $minutes minutes or this spot returns to the event.';
  }

  @override
  String get crossPathsPairInventoryHoldEndedBody =>
      'You can return to the event to see the latest availability.';

  @override
  String crossPathsPairInventoryBookingStates({
    required Object requesterStatus,
    required Object attendeeStatus,
  }) {
    return 'Your booking: $requesterStatus · Their booking: $attendeeStatus';
  }

  @override
  String get crossPathsPairInventoryBookingStatusHeld => 'Held, not booked';

  @override
  String get crossPathsPairInventoryBookingStatusConfirmed => 'Confirmed';

  @override
  String get crossPathsPairInventoryBookingStatusNotBooked => 'Not booked';

  @override
  String get crossPathsPairInventoryActionCompleteBooking => 'Complete booking';

  @override
  String get crossPathsPairInventoryWaitingForRequester =>
      'Their place is confirmed. We are waiting for the person who sent the invitation to finish booking.';

  @override
  String get crossPathsPairInventoryBookingStarted =>
      'Booking started. This plan will open when your place is confirmed.';

  @override
  String get hostsEventPolicyStepTitleCrossPathsPairs =>
      'Reserved Cross Paths spots';

  @override
  String get hostsEventPolicyStepBodyCrossPathsPairs =>
      'Keep a small part of capacity for people who agree to attend together through Cross Paths.';

  @override
  String get hostsEventPolicyStepTitleCrossPathsPairCapacity =>
      'Reserved companion spots';

  @override
  String get hostsOperationalRosterTitle => 'Guest roster';

  @override
  String get hostsOperationalRosterSubtitle =>
      'Review arrivals, guest details, source, and status in one operational list.';

  @override
  String get hostsOperationalRosterInsightsLoading =>
      'Loading customer labels…';

  @override
  String get hostsOperationalRosterInsightsUnavailable =>
      'Customer labels are unavailable. Check-in still works.';

  @override
  String get hostsOperationalRosterInsightsPreparing =>
      'Some customer labels are still being prepared. The roster remains complete.';

  @override
  String get hostsOperationalRosterInsightsRetry => 'Retry labels';

  @override
  String get hostsOperationalRosterInsightsCaption =>
      'Customer labels use history from before this event began, so they do not change as you check people in.';

  @override
  String get hostsOperationalRosterInsightsSpendFootnote =>
      'Spend labels count only completed, non-refunded Catch payments known before this event. External ticket spend is not guessed.';

  @override
  String get hostsOperationalRosterInsightsFilterAll => 'All';

  @override
  String hostsOperationalRosterInsightsFilterCount({
    required String label,
    required int count,
  }) {
    return '$label $count';
  }

  @override
  String get hostsOperationalRosterInsightsFilterEmptyTitle =>
      'No guests match this label';

  @override
  String get hostsOperationalRosterInsightsFilterEmptyMessage =>
      'Choose another label or All to return to the full roster.';

  @override
  String get hostsOperationalRosterInsightFirstTime => 'First event';

  @override
  String get hostsOperationalRosterInsightReturning => 'Returning';

  @override
  String get hostsOperationalRosterInsightRegular => 'Regular';

  @override
  String get hostsOperationalRosterInsightReEngaging => 'Re-engaging';

  @override
  String get hostsOperationalRosterInsightReliable => 'Reliable';

  @override
  String get hostsOperationalRosterInsightNeedsConfirmation =>
      'Needs confirmation';

  @override
  String get hostsOperationalRosterInsightAdvocate => 'Advocate';

  @override
  String get hostsOperationalRosterInsightHighImpactAdvocate => 'Top advocate';

  @override
  String get hostsOperationalRosterInsightCatchSpender => 'Catch spender';

  @override
  String get hostsOperationalRosterInsightTopCatchSpender =>
      'Top Catch spender';

  @override
  String get hostsOperationalRosterGuestIntakeTitle => 'Imported guest list';

  @override
  String get hostsOperationalRosterGuestIntakeBody =>
      'Import a spreadsheet, add guests manually, or connect this event\'s booking source.';

  @override
  String get hostsOperationalRosterImport => 'Import spreadsheet';

  @override
  String get hostsOperationalRosterAddGuest => 'Add guest';

  @override
  String get hostsOperationalRosterAddWalkIn => 'Add walk-in';

  @override
  String get hostsOperationalRosterForwardCsv => 'Forward CSV';

  @override
  String get hostsOperationalRosterForwardTitle => 'Forward this guest list';

  @override
  String get hostsOperationalRosterForwardSubtitle =>
      'Forward one CSV from the email address or phone number on your Catch Host account. The private address and code expire after 30 days.';

  @override
  String get hostsOperationalRosterForwardEmail => 'Forward by email';

  @override
  String get hostsOperationalRosterForwardWhatsapp => 'Forward on WhatsApp';

  @override
  String hostsOperationalRosterForwardWhatsappBody({
    required String whatsappNumber,
    required String whatsappMessage,
  }) {
    return 'Send the CSV to $whatsappNumber with the message: $whatsappMessage';
  }

  @override
  String get hostsOperationalRosterForwardNotAvailable =>
      'Provider setup required';

  @override
  String get hostsOperationalRosterForwardProviderSetup =>
      'Forwarding is implemented but this environment still needs an inbound email or WhatsApp provider. Use Import spreadsheet until an administrator finishes provider setup.';

  @override
  String get hostsOperationalRosterForwardCopy => 'Copy';

  @override
  String get hostsOperationalRosterForwardDone => 'Done';

  @override
  String get hostsOperationalRosterEmptyTitle =>
      'Your outside roster starts here';

  @override
  String get hostsOperationalRosterEmptyMessage =>
      'Upload a CSV or XLSX from your ticketing tool, or add guests one at a time.';

  @override
  String get hostsOperationalRosterProviderTitle => 'Booking source';

  @override
  String hostsOperationalRosterProviderBody({required String provider}) {
    return 'Bring your $provider guest list into this roster.';
  }

  @override
  String get hostsOperationalRosterProviderOpenToLoad =>
      'Open this section to check available import and sync options.';

  @override
  String get hostsOperationalRosterProviderUnavailable =>
      'Catch could not identify a safe import option for this booking source.';

  @override
  String get hostsOperationalRosterProviderAccount => 'Connected calendar';

  @override
  String get hostsOperationalRosterProviderCoverage => 'What syncs';

  @override
  String get hostsOperationalRosterProviderLastSync => 'Last successful sync';

  @override
  String get hostsOperationalRosterProviderNeverSynced => 'Not synced yet';

  @override
  String get hostsOperationalRosterProviderLimits =>
      'Not supplied by this connection';

  @override
  String get hostsOperationalRosterProviderLumaLimits =>
      'Payments, refunds, referral codes and automatic background updates. Catch check-ins are never undone when Luma omits a check-in.';

  @override
  String get hostsOperationalRosterProviderCapabilityGuests =>
      'Guest names and contact details';

  @override
  String get hostsOperationalRosterProviderCapabilityStatus =>
      'Registration status';

  @override
  String get hostsOperationalRosterProviderCapabilityCheckIn =>
      'Provider check-ins';

  @override
  String get hostsOperationalRosterProviderSyncNow => 'Sync now';

  @override
  String get hostsOperationalRosterProviderDisconnect => 'Disconnect';

  @override
  String get hostsOperationalRosterProviderDisconnectTitle =>
      'Disconnect booking source?';

  @override
  String get hostsOperationalRosterProviderDisconnectBody =>
      'Guests already in Catch stay on this roster. Future provider changes will not appear until you reconnect.';

  @override
  String get hostsOperationalRosterProviderConnect => 'Connect Luma';

  @override
  String get hostsOperationalRosterProviderReconnect => 'Reconnect Luma';

  @override
  String get hostsOperationalRosterProviderImport => 'Import spreadsheet';

  @override
  String get hostsOperationalRosterProviderConnected =>
      'Luma connected. Sync when you want to refresh the roster.';

  @override
  String hostsOperationalRosterProviderSyncSuccess({
    required int created,
    required int updated,
    required int skipped,
  }) {
    return 'Roster synced: $created added, $updated refreshed, $skipped skipped.';
  }

  @override
  String get hostsOperationalRosterProviderConnectTitle =>
      'Connect your Luma calendar';

  @override
  String get hostsOperationalRosterProviderConnectBody =>
      'Catch checks the calendar key without saving it, then lets you choose an event. The key is stored only after you confirm the event.';

  @override
  String get hostsOperationalRosterProviderApiKey => 'Luma calendar API key';

  @override
  String get hostsOperationalRosterProviderApiKeyHelp =>
      'Requires Luma Plus. Catch encrypts the key in Google Secret Manager after you choose an event.';

  @override
  String get hostsOperationalRosterProviderFieldRequired =>
      'Check this value and try again.';

  @override
  String get hostsOperationalRosterProviderChooseEvent =>
      'Check key and choose event';

  @override
  String get hostsOperationalRosterProviderChooseEventTitle =>
      'Choose the Luma event';

  @override
  String hostsOperationalRosterProviderChooseEventBody({
    required String calendar,
  }) {
    return 'Events managed by $calendar. Choose the one that matches this Catch event.';
  }

  @override
  String get hostsOperationalRosterProviderNoEventsTitle =>
      'No manageable events found';

  @override
  String get hostsOperationalRosterProviderNoEventsBody =>
      'This key did not return an event the calendar can manage.';

  @override
  String get hostsOperationalRosterProviderEventsTruncated =>
      'Showing the 50 most recent manageable events. Use spreadsheet import if the event you need is older.';

  @override
  String get hostsOperationalRosterProviderAvailable => 'Direct sync available';

  @override
  String get hostsOperationalRosterProviderExportOnly => 'Spreadsheet import';

  @override
  String get hostsOperationalRosterProviderConfigurationRequired =>
      'Catch setup pending';

  @override
  String get hostsOperationalRosterProviderPartnerRequired =>
      'Provider approval required';

  @override
  String get hostsOperationalRosterProviderSampleRequired =>
      'Export sample needed';

  @override
  String get hostsOperationalRosterProviderManualOnly => 'Manual import';

  @override
  String get hostsOperationalRosterProviderStatusActive => 'Connected';

  @override
  String get hostsOperationalRosterProviderStatusDegraded =>
      'Connection needs attention';

  @override
  String get hostsOperationalRosterProviderStatusReconnect =>
      'Reconnect required';

  @override
  String get hostsOperationalRosterProviderStatusDisconnected => 'Disconnected';

  @override
  String get hostsOperationalRosterSourceCatchBooking => 'Catch booking';

  @override
  String get hostsOperationalRosterSourceHostImport => 'Spreadsheet';

  @override
  String get hostsOperationalRosterSourceHostManual => 'Added by host';

  @override
  String get hostsOperationalRosterSourceWebOtp => 'Web registration';

  @override
  String get hostsOperationalRosterSourceProviderSync => 'Booking provider';

  @override
  String get hostsOperationalRosterStatusInvited => 'Invited';

  @override
  String get hostsOperationalRosterStatusRegistered => 'Registered';

  @override
  String get hostsOperationalRosterStatusWaitlisted => 'Waitlisted';

  @override
  String get hostsOperationalRosterStatusCheckedIn => 'Checked in';

  @override
  String get hostsOperationalRosterCheckIn => 'Check in';

  @override
  String get hostsOperationalRosterUndoCheckIn => 'Undo';

  @override
  String get hostsOperationalRosterIdentityLinked => 'OTP linked';

  @override
  String hostsOperationalRosterClaimsPending({required int count}) {
    return '$count runtime approvals';
  }

  @override
  String hostsOperationalRosterClaimPhone({required String phoneLastFour}) {
    return 'Phone ending $phoneLastFour';
  }

  @override
  String get hostsOperationalRosterClaimContext =>
      'Opened the attendee link and needs access';

  @override
  String get hostsOperationalRosterClaimApprove => 'Approve';

  @override
  String get hostsOperationalRosterClaimChooseGuest => 'Choose guest';

  @override
  String get hostsOperationalRosterClaimReject => 'Reject';

  @override
  String get hostsOperationalRosterClaimApproved =>
      'Guest approved for this event';

  @override
  String get hostsOperationalRosterClaimRejected => 'Access request rejected';

  @override
  String get hostsOperationalRosterImportTitle => 'Map your guest list';

  @override
  String get hostsOperationalRosterImportSubtitle =>
      'Check the detected columns before anything is uploaded.';

  @override
  String get hostsOperationalRosterAdapterSampleRequired =>
      'We do not have a verified export sample for this platform yet. Review every detected column before importing.';

  @override
  String get hostsOperationalRosterFieldName => 'Guest name';

  @override
  String get hostsOperationalRosterFieldPhone => 'Phone';

  @override
  String get hostsOperationalRosterFieldEmail => 'Email';

  @override
  String get hostsOperationalRosterFieldReference => 'Booking reference';

  @override
  String get hostsOperationalRosterFieldArrivalGroup => 'Arrival group';

  @override
  String get hostsOperationalRosterFieldTicket => 'Ticket type';

  @override
  String get hostsOperationalRosterFieldRevenue => 'Order or ticket revenue';

  @override
  String get hostsOperationalRosterFieldCurrency => 'Revenue currency';

  @override
  String get hostsOperationalRosterRevenueFallbackAmount =>
      'Revenue per guest when missing';

  @override
  String get hostsOperationalRosterRevenueFallbackHelp =>
      'Optional. This is recorded as your estimate, not a verified payment.';

  @override
  String hostsOperationalRosterRevenueFallbackEventPrice({
    required String amount,
  }) {
    return 'Optional. The event price is $amount; enter it here only if it is a reasonable per-guest estimate.';
  }

  @override
  String get hostsOperationalRosterRevenueFallbackInvalid =>
      'Enter a non-negative amount and a three-letter currency code.';

  @override
  String get hostsOperationalRosterFieldStatus => 'Registration status';

  @override
  String get hostsOperationalRosterDoNotImport => 'Do not import';

  @override
  String hostsOperationalRosterPreviewCount({required int count}) {
    return '$count guests ready';
  }

  @override
  String hostsOperationalRosterNeedsReviewCount({required int count}) {
    return '$count need review';
  }

  @override
  String hostsOperationalRosterExcludedCount({required int count}) {
    return '$count excluded';
  }

  @override
  String get hostsOperationalRosterProviderMismatch =>
      'The selected booking source does not match this spreadsheet. Catch used the columns in the file; review the mapping before importing.';

  @override
  String get hostsOperationalRosterLegacyEncoding =>
      'This CSV is not UTF-8. Catch read it using a legacy encoding; check names and symbols carefully.';

  @override
  String hostsOperationalRosterMultipleWorksheets({required int count}) {
    return 'This workbook has $count worksheets. Catch selected the best-matching guest worksheet; verify the columns before importing.';
  }

  @override
  String hostsOperationalRosterImportAction({required int count}) {
    return 'Review $count ready guests';
  }

  @override
  String get hostsCreateEventRosterTitle => 'Guest list';

  @override
  String hostsCreateEventRosterAttached({
    required String fileName,
    required int ready,
    required int review,
    required int excluded,
  }) {
    return '$fileName · $ready ready · $review need review · $excluded excluded';
  }

  @override
  String hostsCreateEventRosterReattach({required String fileName}) {
    return 'Reattach $fileName before publishing. Drafts remember the file fingerprint, not guest data.';
  }

  @override
  String get hostsCreateEventRosterChoose => 'Choose file';

  @override
  String get hostsCreateEventRosterReplace => 'Replace file';

  @override
  String hostsCreateEventRosterImportSuccess({
    required int created,
    required int updated,
    required int skipped,
  }) {
    return 'Guest list imported: $created added, $updated refreshed, $skipped skipped.';
  }

  @override
  String hostsCreateEventRosterImportPartial({required int count}) {
    return 'The event is live, but $count guest rows need attention. Open Manage event to review the roster and retry the file.';
  }

  @override
  String get hostsCreateEventRosterImportFailed =>
      'The event is live, but the guest list was not imported. Open Manage event and retry the same file.';

  @override
  String get hostsCreateEventExternalSuccessNote =>
      'Catch tracks the operational roster, check-in, walk-ins, and event safety. Bookings and payments stay with the external provider.';

  @override
  String get hostsCreateEventRosterDetailLabel => 'Guest list';

  @override
  String hostsCreateEventCapacityBelowRoster({required int count}) {
    return 'Capacity must be at least $count to include every ready guest.';
  }

  @override
  String hostsOperationalRosterLimit({required int count}) {
    return 'This import uses the first 250 guests. Put the remaining $count guests in another file.';
  }

  @override
  String get hostsOperationalRosterIssueUnsupported =>
      'Choose a CSV or XLSX spreadsheet.';

  @override
  String get hostsOperationalRosterIssueFileTooLarge =>
      'Choose a spreadsheet smaller than 5 MB.';

  @override
  String get hostsOperationalRosterIssueExpandedFileTooLarge =>
      'This workbook expands beyond the 25 MB safety limit. Export only the guest worksheet and try again.';

  @override
  String get hostsOperationalRosterIssueMissingRows =>
      'The spreadsheet needs a header row and at least one guest.';

  @override
  String get hostsOperationalRosterIssueTooManyColumns =>
      'Keep only the guest fields you need and use no more than 40 columns.';

  @override
  String get hostsOperationalRosterIssueMalformedCsv =>
      'The CSV has an unfinished quoted value.';

  @override
  String get hostsOperationalRosterIssueUnreadableXlsx =>
      'The XLSX spreadsheet could not be read. Export it again and retry.';

  @override
  String get hostsOperationalRosterIssueMissingNameColumn =>
      'Choose the column that contains each guest name.';

  @override
  String hostsOperationalRosterIssueMissingName({required int row}) {
    return 'Row $row: guest name is empty.';
  }

  @override
  String get hostsOperationalRosterIssueDuplicateMappedColumn =>
      'Map each spreadsheet column to only one guest field.';

  @override
  String hostsOperationalRosterIssueMissingStableIdentity({required int row}) {
    return 'Row $row: add a phone, email, or booking reference so retries cannot create a duplicate guest.';
  }

  @override
  String hostsOperationalRosterIssueInvalidPhone({required int row}) {
    return 'Row $row: phone number is not valid.';
  }

  @override
  String hostsOperationalRosterIssueInvalidEmail({required int row}) {
    return 'Row $row: email address is not valid.';
  }

  @override
  String hostsOperationalRosterIssueInvalidRevenue({required int row}) {
    return 'Row $row: revenue is not a valid non-negative amount.';
  }

  @override
  String hostsOperationalRosterIssueMissingRevenueCurrency({required int row}) {
    return 'Row $row: choose a three-letter currency for this revenue amount.';
  }

  @override
  String hostsOperationalRosterIssueDuplicateIdentity({required int row}) {
    return 'Row $row: this guest has the same identity as an earlier row.';
  }

  @override
  String hostsOperationalRosterIssueUnknownStatus({
    required int row,
    required String status,
  }) {
    return 'Row $row: status $status needs review and will not be imported.';
  }

  @override
  String hostsOperationalRosterIssueExcludedStatus({
    required int row,
    required String status,
  }) {
    return 'Row $row: status $status is excluded from the active guest list.';
  }

  @override
  String hostsOperationalRosterImportSuccess({
    required int created,
    required int updated,
    required int skipped,
  }) {
    return 'Roster updated: $created added, $updated refreshed, $skipped skipped.';
  }

  @override
  String get hostsOperationalRosterImportPartialTitle =>
      'Some guest rows need attention';

  @override
  String hostsOperationalRosterImportPartialBody({
    required int created,
    required int updated,
    required int count,
  }) {
    return '$created added, $updated refreshed, and $count rows were not imported. Fix those rows in the spreadsheet and import the same file again; Catch will update existing guests instead of duplicating them.';
  }

  @override
  String hostsOperationalRosterImportRowError({required String row}) {
    return 'Row $row';
  }

  @override
  String get hostsOperationalRosterImportResultDone => 'Done';

  @override
  String get hostsOperationalRosterManualTitle => 'Add a guest';

  @override
  String get hostsOperationalRosterManualSubtitle =>
      'A phone or email is optional for day-of check-in. Add contact details only when you are allowed to use them.';

  @override
  String get hostsOperationalRosterManualSave => 'Add to roster';

  @override
  String get hostsOperationalRosterManualNameRequired =>
      'Enter the guest\'s name.';

  @override
  String get hostsHostAnalyticsLabelRosterGuests => 'Guests on roster';

  @override
  String get hostsHostAnalyticsLabelRosterAttendanceRate => 'Roster attendance';

  @override
  String hostsHostAnalyticsTextRosterAttendedExternal({
    required int roster,
    required int attended,
    required int external,
  }) {
    return '$roster guests · $attended checked in · $external outside Catch';
  }

  @override
  String get hostsHostEventReviewsTitlePublicReviews => 'Public reviews';

  @override
  String get hostsHostEventReviewsSubtitlePublicResponse =>
      'Reply from Catch for Hosts. Your response appears with the review on the public organizer page.';

  @override
  String get hostsHostEventReviewsMessageEmpty =>
      'Reviews for this event will appear here, including reviews submitted on your public Catch page.';

  @override
  String get hostsHostClubPublicationTitle => 'Public visibility';

  @override
  String get hostsHostClubPublicationChannelCatch => 'Catch app';

  @override
  String get hostsHostClubPublicationChannelWebsite => 'Public website';

  @override
  String get hostsHostClubPublicationStatusVisible => 'Visible';

  @override
  String get hostsHostClubPublicationStatusHidden => 'Hidden';

  @override
  String get hostsHostClubPublicationStatusEnabled => 'Enabled';

  @override
  String get hostsHostClubPublicationStatusNotEnabled => 'Not enabled';

  @override
  String get hostsHostClubPublicationBodyPrivate =>
      'Only your Host team can access this organizer. You can still run events, import guests, and check people in.';

  @override
  String get hostsHostClubPublicationBodyCatchOnly =>
      'People can find this organizer in Catch. Enable its website page to share it outside the app and support web registration. It will appear after the next website release.';

  @override
  String get hostsHostClubPublicationBodyWebsiteOnly =>
      'The website page is enabled, but this organizer is hidden in Catch. Restore Catch visibility to keep both public settings in sync.';

  @override
  String get hostsHostClubPublicationBodyEverywhere =>
      'This organizer is enabled for Catch and the public website. Website changes appear after the next website release.';

  @override
  String get hostsHostClubPublicationActionMakePublic =>
      'Make organizer public';

  @override
  String get hostsHostClubPublicationActionEnableWebsite =>
      'Enable website page';

  @override
  String get hostsHostClubPublicationActionRestoreCatch =>
      'Restore Catch visibility';

  @override
  String get hostsHostClubPublicationActionMakePrivate =>
      'Make organizer private';

  @override
  String get hostsHostPublicRegistrationTitle => 'Catch registration';

  @override
  String get hostsHostPublicRegistrationSubtitleEnabled =>
      'Guests can register on Catch';

  @override
  String get hostsHostPublicRegistrationSubtitleDisabled =>
      'Catch registration is closed';

  @override
  String get hostsHostPublicRegistrationStatusOpen => 'Open';

  @override
  String get hostsHostPublicRegistrationStatusOff => 'Off';

  @override
  String get hostsHostPublicRegistrationBodyPublished =>
      'Guests register on the event page using their name and verified phone number, and join this event’s guest list. The original event source and bookings on other platforms stay unchanged.';

  @override
  String get hostsHostPublicRegistrationBodyNeedsPage =>
      'Publish the organizer page first. You can still import guests and run this event privately in the meantime.';

  @override
  String get hostsHostPublicRegistrationBodyUnsupported =>
      'Website registration supports open events with one fixed price. Invitation, approval, membership, balanced capacity, and variable pricing require their own eligibility checks.';

  @override
  String get hostsHostPublicRegistrationActionEnable =>
      'Enable free registration';

  @override
  String get hostsHostPublicRegistrationActionEnablePaid =>
      'Enable paid registration';

  @override
  String get hostsHostPublicRegistrationBodyPaid =>
      'Guests verify their phone, review the price and refund policy, then pay on Catch. Checkout holds a seat for 15 minutes; verified payment confirms admission. Your payment account must be ready before registration can open.';

  @override
  String get hostsHostPublicRegistrationActionDisable => 'Close registration';

  @override
  String get hostsHostAudienceAttended => 'Attended';

  @override
  String get hostsHostAudienceSearch => 'Search by name';

  @override
  String get hostsHostAudienceAll => 'All';

  @override
  String get hostsHostAudienceCoveragePartial =>
      'Some customer history is unavailable';

  @override
  String get hostsHostAudienceCoveragePartialBody =>
      'Some older attendance may be missing. Counts marked + are minimums, and audience campaigns stay off until history is complete.';

  @override
  String get hostsHostAudienceWhatsappSender => 'WhatsApp Business sender';

  @override
  String get hostsHostAudienceWhatsappOwnedSender =>
      'Connect your own Meta WhatsApp Business account. Catch never sends from a shared number, and only people with explicit organizer-specific opt-in are eligible.';

  @override
  String get hostsHostAudienceConnectWhatsapp => 'Connect WhatsApp Business';

  @override
  String get hostsHostAudienceTemplates => 'Message templates';

  @override
  String hostsHostAudienceApprovedTemplates({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count approved templates',
      one: '1 approved template',
      zero: 'No approved templates',
    );
    return '$_temp0';
  }

  @override
  String get hostsHostAudienceSyncTemplates => 'Sync templates';

  @override
  String get hostsHostAudienceDisconnect => 'Disconnect';

  @override
  String get hostsHostAudienceTestPhone => 'Test recipient phone';

  @override
  String get hostsHostAudienceTestPhoneHelp =>
      'Use an opted-in number you control, including the country code.';

  @override
  String get hostsHostAudienceSendTest => 'Send verification message';

  @override
  String get hostsHostAudienceTestPending =>
      'Meta accepted the test. The sender becomes active after the delivered webhook arrives.';

  @override
  String get hostsHostAudienceCampaign => 'Message past attendees';

  @override
  String get hostsHostAudienceCampaignNeedsActiveSender =>
      'Finish sender verification before creating a campaign. A delivered test proves that webhooks and the selected number work end to end.';

  @override
  String get hostsHostAudienceCampaignNeedsTemplate =>
      'Sync an approved Meta template before creating a campaign.';

  @override
  String get hostsHostAudienceCampaignName => 'Internal campaign name';

  @override
  String get hostsHostAudienceCampaignNameExample =>
      'September regulars invitation';

  @override
  String get hostsHostAudienceMessageType => 'Message type';

  @override
  String get hostsHostAudienceRecipients => 'Recipient categories';

  @override
  String get hostsHostAudienceTemplate => 'Approved template';

  @override
  String get hostsHostAudiencePreviewCampaign => 'Save and preview recipients';

  @override
  String get hostsHostAudienceCompleteCampaign =>
      'Add a campaign name and complete every template field before previewing.';

  @override
  String hostsHostAudienceCampaignStatus({required String status}) {
    return 'Campaign status: $status';
  }

  @override
  String hostsHostAudienceCampaignCounts({
    required int total,
    required int reachable,
    required int optedOut,
    required int unknown,
  }) {
    return '$reachable of $total are reachable · $optedOut opted out · $unknown have unknown permission or identity';
  }

  @override
  String hostsHostAudienceDeliveryCounts({
    required int sent,
    required int delivered,
    required int read,
    required int failed,
  }) {
    return '$sent sent · $delivered delivered · $read read · $failed failed';
  }

  @override
  String get hostsHostAudienceApprove => 'Approve exact audience';

  @override
  String get hostsHostAudienceSendNow => 'Send now';

  @override
  String get hostsHostAudienceRefresh => 'Refresh results';

  @override
  String get hostsHostAudienceCancel => 'Cancel campaign';

  @override
  String get hostsHostAudienceNewCampaign => 'New campaign';

  @override
  String get eventsAttendeeShareLinkLabel => 'Attendee share';

  @override
  String get hostsHostAudienceExport => 'Export this audience';

  @override
  String get hostsHostAudienceExportSubject => 'Catch audience export';

  @override
  String get hostsHostAudienceExportTruncated =>
      'This export reached the 2,500-contact safety limit.';

  @override
  String hostsHostAudienceExportCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count organizer contacts.',
      one: '1 organizer contact.',
    );
    return '$_temp0';
  }

  @override
  String get hostsHostAudienceRemoveTitle => 'Remove customer?';

  @override
  String get hostsHostAudienceRemoveBody =>
      'This hides the person from CRM and future campaigns. Event attendance and audit history stay intact.';

  @override
  String get hostsHostAudienceRemoveConfirm => 'Remove';

  @override
  String get hostsHostAudienceRemoveAction => 'Remove customer';

  @override
  String get hostsHostAudienceContactNameHelp =>
      'This does not alter the guest’s Catch profile or verified contact details.';

  @override
  String get hostsHostAudienceContactVerifiedPhone => 'Verified phone';

  @override
  String get hostsHostAudienceContactEmail => 'Email';

  @override
  String get hostsHostAudienceContactConsentPaused =>
      'Your team has paused WhatsApp campaigns to this person. Their own opt-out remains authoritative.';

  @override
  String get hostsHostAudienceSegmentNew => 'New to your audience';

  @override
  String get hostsHostAudienceSegmentFirstTime => 'First-time attendees';

  @override
  String get hostsHostAudienceSegmentRepeat => 'Repeat attendees';

  @override
  String get hostsHostAudienceSegmentRegular => 'Regulars';

  @override
  String get hostsHostAudienceSegmentReliable => 'Reliable attendees';

  @override
  String get hostsHostAudienceSegmentNeedsConfirmation => 'Needs confirmation';

  @override
  String get hostsHostAudienceSegmentAdvocate => 'Advocates';

  @override
  String get hostsHostAudienceSegmentHighImpact => 'High-impact advocates';

  @override
  String get hostsHostAudienceSegmentWhatsapp => 'WhatsApp reachable';

  @override
  String get hostsHostAudienceSegmentSms => 'SMS reachable';

  @override
  String get hostsHostAudienceMessageFollowUp => 'Post-event follow-up';

  @override
  String get hostsHostAudienceMessageUpdate => 'Organizer update';

  @override
  String get hostsHostAudienceMessagePromotion =>
      'Event invitation or promotion';

  @override
  String get hostsHostAudienceSenderActive => 'Active';

  @override
  String get hostsHostAudienceSenderTesting => 'Verification pending';

  @override
  String get hostsHostAudienceSenderDegraded => 'Degraded';

  @override
  String get hostsHostAudienceSenderNeedsAttention => 'Reconnect required';

  @override
  String hostCustomersCompactEventCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count events attended',
      one: '1 event attended',
      zero: 'No events attended',
    );
    return '$_temp0';
  }

  @override
  String hostsHostAudienceLastSeen({required String date}) {
    return 'Last seen $date';
  }

  @override
  String get hostsHostAudienceBlockerProvider =>
      'WhatsApp provider setup is incomplete';

  @override
  String get hostsHostAudienceBlockerSender =>
      'Sender verification is incomplete';

  @override
  String get hostsHostAudienceBlockerTemplate =>
      'The template is missing or no longer approved';

  @override
  String get hostsHostAudienceBlockerNoRecipients =>
      'None of these customers are both verified and opted in';

  @override
  String get hostsHostAudienceBlockerCoverage =>
      'Customer history is incomplete';

  @override
  String get hostsHostAudienceBlockerTooLarge =>
      'This first release supports up to 100 evaluated contacts per campaign';

  @override
  String get hostsHostAudienceBlockerEvent =>
      'The linked event or destination is unavailable';

  @override
  String get hostsHostAudienceBlockerSchedule =>
      'The scheduled time has passed';

  @override
  String get hostsHostAudienceLinkedEvent => 'Event invitation';

  @override
  String get hostsHostAudienceChooseEvent => 'Choose an event';

  @override
  String get hostsHostAudienceLinkedEventHelp =>
      'Catch creates a different private link for each eligible recipient so opens, registrations, referrals, and check-ins can be attributed safely.';

  @override
  String get hostsHostAudienceInviteDestination => 'Where the invitation opens';

  @override
  String get hostsHostAudienceDestinationCatchPage => 'Catch event page';

  @override
  String get hostsHostAudienceDestinationRuntime => 'No-download event runtime';

  @override
  String get hostsHostAudienceDestinationExternal =>
      'External booking site via Catch event page';

  @override
  String get hostsHostAudienceExternalAttributionExplanation =>
      'Catch records the private-link open, then sends the guest to the external booking page. Registration is confirmed only when a supported provider returns the referral code or the guest later makes a phone-verified runtime claim tied to the roster. An ordinary re-import or manual check-in cannot prove which link caused the booking.';

  @override
  String get hostsHostAudienceCatchAttributionExplanation =>
      'Catch can attribute private-link opens and phone-verified web registration. If guests share their own Catch-generated link, their referred registrations and check-ins are counted separately.';

  @override
  String get hostsEventStaffTitle => 'Event staff access';

  @override
  String get hostsEventStaffSubtitle =>
      'Give a trusted operator temporary access to the guest names, check-ins, and runtime identity claims for this event. They cannot edit the event, import guests, see your audience, send messages, connect providers, or view analytics.';

  @override
  String get hostsEventStaffAdd => 'Add event staff';

  @override
  String get hostsEventStaffCopyLink => 'Copy staff link';

  @override
  String get hostsEventStaffEmptyTitle => 'No temporary staff access';

  @override
  String get hostsEventStaffEmptyMessage =>
      'Add someone by the phone number they use to sign in to Catch Host. Access expires automatically.';

  @override
  String hostsEventStaffPhoneEnding({required String digits}) {
    return 'Phone ending $digits';
  }

  @override
  String hostsEventStaffExpires({required String date}) {
    return 'Access expires $date';
  }

  @override
  String get hostsEventStaffRevoke => 'Revoke';

  @override
  String get hostsEventStaffRevokeTitle => 'Revoke event access?';

  @override
  String hostsEventStaffRevokeMessage({required String name}) {
    return '$name will immediately lose access to the roster and runtime claims for this event.';
  }

  @override
  String get hostsEventStaffLinkCopied => 'Staff workspace link copied';

  @override
  String get hostsEventStaffGrantTitle => 'Add event staff';

  @override
  String get hostsEventStaffGrantSubtitle =>
      'They must first sign in to Catch Host with this phone number. Access applies only to this event and expires automatically.';

  @override
  String get hostsEventStaffGrantAction => 'Grant access';

  @override
  String get hostsEventStaffPhone => 'Operator phone number';

  @override
  String get hostsEventStaffPhoneRequired =>
      'Enter the phone number used for Catch Host';

  @override
  String get hostsEventStaffAccessDuration => 'Access duration';

  @override
  String get hostsEventStaffDurationFourHours => '4 hours';

  @override
  String get hostsEventStaffDurationTwelveHours => '12 hours';

  @override
  String get hostsEventStaffDurationOneDay => '1 day';

  @override
  String get hostsEventStaffDurationSevenDays => '7 days';

  @override
  String get hostsEventStaffStatusActive => 'Active';

  @override
  String get hostsEventStaffStatusRevoked => 'Revoked';

  @override
  String get hostsEventStaffStatusExpired => 'Expired';

  @override
  String get hostsEventOperatorTitle => 'Event operations';

  @override
  String get hostsEventOperatorCancelledTitle => 'This event was cancelled';

  @override
  String get hostsEventOperatorCancelledMessage =>
      'Its roster can no longer be changed from the staff workspace.';

  @override
  String get hostsEventOperatorAccessTitle => 'Restricted event access';

  @override
  String get hostsEventOperatorAccessSubtitle =>
      'This workspace contains only the guest roster, check-in controls, and identity claims for this event.';

  @override
  String get hostsEventOperatorRoleManager => 'Organizer manager';

  @override
  String get hostsEventOperatorRoleStaff => 'Event staff';

  @override
  String hostsEventOperatorExpires({required String date}) {
    return 'Expires $date';
  }

  @override
  String get hostsOperationalRosterOutboxPendingTitle =>
      'Check-ins waiting to sync';

  @override
  String hostsOperationalRosterOutboxPendingBody({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count attendance changes are saved on this device and will retry with their original operation IDs.',
      one:
          '1 attendance change is saved on this device and will retry with the same operation ID.',
    );
    return '$_temp0';
  }

  @override
  String get hostsOperationalRosterOutboxReviewTitle =>
      'Some check-ins need review';

  @override
  String hostsOperationalRosterOutboxReviewBody({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count saved changes could not be applied because the roster changed. Reload the roster, verify the guests, then discard the stale changes.',
      one:
          '1 saved change could not be applied because the roster changed. Reload the roster, verify the guest, then discard the stale change.',
    );
    return '$_temp0';
  }

  @override
  String get hostsOperationalRosterOutboxRetry => 'Retry sync';

  @override
  String get hostsOperationalRosterOutboxDiscard => 'Discard stale changes';

  @override
  String get eventSuccessLiveControlCancelCountdownLabel => 'Cancel countdown';

  @override
  String get eventSuccessLiveControlPublishRevealTitle =>
      'Publish this reveal?';

  @override
  String eventSuccessLiveControlPublishRevealMessage({
    required int roundNumber,
  }) {
    return 'Round $roundNumber will become visible to everyone and cannot be hidden again.';
  }

  @override
  String get eventSuccessLiveControlPublishRevealConfirmLabel =>
      'Publish reveal';

  @override
  String get eventSuccessLiveControlStartCountdownTitle =>
      'Start the final countdown?';

  @override
  String eventSuccessLiveControlStartCountdownMessage({
    required int roundNumber,
    required int countdownSeconds,
  }) {
    return 'Round $roundNumber will publish after $countdownSeconds seconds and cannot be hidden again.';
  }

  @override
  String get eventSuccessLiveControlStartCountdownConfirmLabel =>
      'Start countdown';

  @override
  String eventSuccessLiveControlPublishRotationRoundLabel({
    required int roundNumber,
  }) {
    return 'Publish round $roundNumber';
  }

  @override
  String get eventSuccessLiveControlPublishRotationTitle =>
      'Publish this rotation?';

  @override
  String eventSuccessLiveControlPublishRotationMessage({
    required int roundNumber,
  }) {
    return 'Round $roundNumber will become visible to attendees and cannot be withdrawn.';
  }

  @override
  String get eventSuccessLiveControlPublishRotationConfirmLabel =>
      'Publish rotation';

  @override
  String get eventSuccessLiveControlStandingsRevealLabel => 'Standings reveal';

  @override
  String eventSuccessLiveControlPointsValue({required num points}) {
    return '$points pts';
  }

  @override
  String eventSuccessLiveControlRankValue({required int rank}) {
    return 'Rank $rank';
  }

  @override
  String eventSuccessLiveControlRecordRoundTitle({required int roundNumber}) {
    return 'Record round $roundNumber';
  }

  @override
  String get eventSuccessLiveControlRankEntryInstructions =>
      'Enter one unique rank for every unit. The table stays hidden until the existing reveal.';

  @override
  String get eventSuccessLiveControlScoreEntryInstructions =>
      'Enter this round’s score for every unit. Totals stay hidden until the existing reveal.';

  @override
  String get eventSuccessLiveControlEmptyUnitsMessage =>
      'Generate the live units before recording outcomes.';

  @override
  String get eventSuccessLiveControlEmptyScoreTeamsMessage =>
      'Check in guests and give each team an arrival group before recording points.';

  @override
  String get eventSuccessLiveControlSaveRoundLabel => 'Save round for reveal';

  @override
  String get hostsEventSuccessStepRoomLayoutTitle => 'Room layout';

  @override
  String get hostsEventSuccessStepRoomLayoutSubtitle =>
      'Choose a reusable coarse layout for live placement. This is not a to-scale floor plan.';

  @override
  String hostsEventSuccessStepRoomLayoutUnitCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count units',
      one: '1 unit',
    );
    return '$_temp0';
  }

  @override
  String get hostsEventSuccessStepRoomLayoutSelected => 'Selected';

  @override
  String get hostsEventSuccessStepRoomLayoutCreate => 'Create reusable layout';

  @override
  String get hostsEventSuccessStepRoomLayoutWholeGroupTitle =>
      'No room map for whole-group mode';

  @override
  String get hostsEventSuccessStepRoomLayoutWholeGroupBody =>
      'Switch to pods, pairs, teams, or tables if this event needs mapped placement.';

  @override
  String get hostsEventSuccessStepRoomLayoutAuthorTitle =>
      'Build a room layout';

  @override
  String get hostsEventSuccessStepRoomLayoutAuthorSubtitle =>
      'Set the topology once, then reuse it across events.';

  @override
  String get hostsEventSuccessStepRoomLayoutName => 'Layout name';

  @override
  String get hostsEventSuccessStepRoomLayoutNameRequired =>
      'Enter a layout name.';

  @override
  String get hostsEventSuccessStepRoomLayoutShape => 'Unit shape';

  @override
  String get hostsEventSuccessStepRoomLayoutShapeRound => 'Round tables';

  @override
  String get hostsEventSuccessStepRoomLayoutShapeRectangle =>
      'Rectangular tables';

  @override
  String get hostsEventSuccessStepRoomLayoutShapeRow => 'Rows';

  @override
  String get hostsEventSuccessStepRoomLayoutShapeCourt => 'Courts';

  @override
  String get hostsEventSuccessStepRoomLayoutShapeZone => 'Zones';

  @override
  String get hostsEventSuccessStepRoomLayoutUnits => 'Number of units';

  @override
  String get hostsEventSuccessStepRoomLayoutCapacity => 'People per unit';

  @override
  String get hostsEventSuccessStepRoomLayoutColumns => 'Units per row';

  @override
  String get hostsEventSuccessStepRoomLayoutDecreaseUnits =>
      'Decrease number of units';

  @override
  String get hostsEventSuccessStepRoomLayoutIncreaseUnits =>
      'Increase number of units';

  @override
  String get hostsEventSuccessStepRoomLayoutDecreaseCapacity =>
      'Decrease unit capacity';

  @override
  String get hostsEventSuccessStepRoomLayoutIncreaseCapacity =>
      'Increase unit capacity';

  @override
  String get hostsEventSuccessStepRoomLayoutDecreaseColumns =>
      'Decrease units per row';

  @override
  String get hostsEventSuccessStepRoomLayoutIncreaseColumns =>
      'Increase units per row';

  @override
  String get hostsEventSuccessStepRoomLayoutSave => 'Save and select layout';

  @override
  String get eventSuccessRoomMapTitle => 'Room map';

  @override
  String get eventSuccessRoomMapSubtitle =>
      'Outlined means assigned. Filled means the Host confirmed the attendee is there.';

  @override
  String get eventSuccessRoomMapAssigned => 'Assigned';

  @override
  String get eventSuccessRoomMapConfirmed => 'Host confirmed';

  @override
  String get eventSuccessRoomMapConfirmedShort => 'Confirmed';

  @override
  String get eventSuccessRoomMapOpen => 'Open';

  @override
  String get eventSuccessRoomMapUnavailable => 'Unavailable';

  @override
  String get eventSuccessRoomMapNeedsAttention => 'Needs attention';

  @override
  String get eventSuccessRoomMapAvailable => 'Available destination';

  @override
  String get eventSuccessRoomMapSelectedDestination => 'Selected destination';

  @override
  String eventSuccessRoomMapUnitSemantics({
    required String unitLabel,
    required int occupied,
    required int capacity,
    required String status,
  }) {
    return '$unitLabel, $occupied of $capacity occupied, $status';
  }

  @override
  String get eventSuccessRoomMapNotPlaced => 'Not placed';

  @override
  String eventSuccessRoomMapCurrentPosition({required String unitLabel}) {
    return 'At $unitLabel';
  }

  @override
  String get eventSuccessRoomMapChooseDestinationShort => 'Choose destination';

  @override
  String eventSuccessRoomMapMoveToUnit({required String unitLabel}) {
    return 'Move to $unitLabel';
  }

  @override
  String get eventSuccessRoomMapSelectAttendee =>
      'Select an attendee, then choose a destination.';

  @override
  String get eventSuccessRoomMapScopeThisRoundShort => 'This round';

  @override
  String get eventSuccessRoomMapScopePinnedShort => 'Pinned';

  @override
  String get eventSuccessRoomMapReasonCapacity => 'This unit is at capacity.';

  @override
  String get eventSuccessRoomMapReasonSafety =>
      'A safety separation keeps this destination unavailable.';

  @override
  String get eventSuccessRoomMapReasonConstraint =>
      'A declared placement constraint keeps this destination unavailable.';

  @override
  String get eventSuccessRoomMapConfirmPosition => 'Confirm position';

  @override
  String get eventSuccessRoomMapReleasePinned => 'Release pinned placement';

  @override
  String get eventSuccessRoomMapDragHint =>
      'On larger screens, drag is also available. Tap controls always work.';

  @override
  String get hostCustomersIntro =>
      'Everyone who has attended, registered, been imported, or been added by your team.';

  @override
  String get hostMessagingWorkspaceInbox => 'Inbox';

  @override
  String get hostMessagingWorkspaceSends => 'Sends';

  @override
  String get hostSendsSubtitle => 'Outbound delivery and history.';

  @override
  String get hostSendsChooseIntent => 'Choose what to send';

  @override
  String get hostSendsIntentTitle => 'What do you want to do?';

  @override
  String get hostSendsConversationIntent => 'Continue a conversation';

  @override
  String get hostSendsConversationIntentBody =>
      'Open Inbox to reply in an existing one-to-one conversation.';

  @override
  String get hostSendsSavedAudienceIntent => 'Message a saved audience';

  @override
  String get hostSendsSavedAudienceIntentBody =>
      'Choose a reusable customer audience and compose one managed campaign.';

  @override
  String get hostSendsSavedAudienceSetupBody =>
      'This intent is not ready. Open Messaging settings to see what is required.';

  @override
  String get hostSendsEventAnnouncementIntent => 'Send an event announcement';

  @override
  String get hostSendsEventAnnouncementChecking => 'Checking active events…';

  @override
  String get hostSendsEventAnnouncementCheckingAudience =>
      'Checking the event audience…';

  @override
  String get hostSendsEventAnnouncementUnavailable =>
      'Event announcement availability could not be loaded.';

  @override
  String get hostSendsEventAnnouncementEmpty =>
      'There is no active or upcoming event to announce to.';

  @override
  String hostSendsEventAnnouncementIntentBody({
    required String eventTitle,
    required int bookedCount,
    required int prospectiveCount,
  }) {
    String _temp0 = intl.Intl.pluralLogic(
      bookedCount,
      locale: localeName,
      other: '$bookedCount booked people',
      one: '1 booked person',
    );
    String _temp1 = intl.Intl.pluralLogic(
      prospectiveCount,
      locale: localeName,
      other: '$prospectiveCount prospective people',
      one: '1 prospective person',
    );
    return '$eventTitle · $_temp0 · $_temp1';
  }

  @override
  String hostSendsEventAudienceSelected({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count selected',
      one: '1 selected',
    );
    return '$_temp0';
  }

  @override
  String get hostSendsEventAnnouncementUnavailableShort => 'Unavailable now';

  @override
  String get hostSendsEventAnnouncementNoAudience => 'No audience yet';

  @override
  String get hostSendsFollowerUpdateIntent => 'Post a follower update';

  @override
  String get hostSendsSettings => 'WhatsApp Business settings';

  @override
  String get hostSendsCatchAnnouncementChannel =>
      'Catch announcement · Organizer';

  @override
  String get hostSendsWhatsappBusinessChannel =>
      'WhatsApp Business · Organizer number';

  @override
  String get hostSendsFollowerUpdateChannel => 'Follower update · Organizer';

  @override
  String get hostSendsFollowerUpdateDescription =>
      'Followers in Catch · Home and Activity · preference-gated push';

  @override
  String get hostSendsFollowerUpdateQuotaUsed =>
      'This organizer has used its three follower updates for the rolling seven-day window.';

  @override
  String get hostSendsWeeklyLimit => 'Weekly limit reached';

  @override
  String get hostSendsFollowersAudience => 'Followers in Catch';

  @override
  String get hostSendsLinkedEventUpdate => 'Linked event';

  @override
  String get hostSendsChannelChecking => 'Checking availability…';

  @override
  String get hostSendsChannelUnavailable =>
      'Availability could not be loaded. Open settings to retry.';

  @override
  String get hostSendsSetupRequired => 'Setup required';

  @override
  String get hostSendsLoadMore => 'Load more';

  @override
  String get hostManualSendQueueTitle => 'Needs your send';

  @override
  String get hostManualSendQueueDisclosure =>
      'Catch keeps the editable draft with this task for up to 30 days and can open it in WhatsApp, but only you can press Send. Opening WhatsApp is not a delivery receipt.';

  @override
  String get hostManualSendQueueLoading => 'Checking manual sends';

  @override
  String get hostManualSendQueueReplan => 'Check options';

  @override
  String hostManualSendTaskTitle({required String name}) {
    return 'Send to $name';
  }

  @override
  String get hostManualSendTaskSubtitle =>
      'Finish this handoff in WhatsApp, then tell Catch what you chose.';

  @override
  String get hostManualSendTaskDisclosure =>
      'Catch keeps this editable draft for up to 30 days and records that WhatsApp opened plus any status you explicitly choose here. It cannot verify that the message was sent, delivered, or read.';

  @override
  String get hostManualSendTaskOpenWhatsapp => 'Open WhatsApp';

  @override
  String get hostManualSendTaskMarkSent => 'I sent this';

  @override
  String get hostManualSendTaskSkip => 'Skip this send';

  @override
  String get hostManualSendTaskSkipBody =>
      'Closes this task without recording a sent assertion.';

  @override
  String get hostManualSendTaskQueued => 'Waiting';

  @override
  String get hostManualSendTaskQueuedBody =>
      'WhatsApp has not been opened for this task yet.';

  @override
  String get hostManualSendTaskOpened => 'WhatsApp opened';

  @override
  String get hostManualSendTaskOpenedBody =>
      'Not confirmed sent. Catch cannot observe the final action in WhatsApp.';

  @override
  String get hostManualSendTaskHostMarkedSent => 'Host marked sent';

  @override
  String get hostManualSendTaskSkipped => 'Skipped';

  @override
  String get hostManualSendTaskCancelled => 'Cancelled';

  @override
  String get hostManualSendTaskSuperseded => 'Superseded';

  @override
  String get hostManualSendTaskExpired => 'Expired';

  @override
  String get hostManualSendReplanTitle => 'Current delivery options';

  @override
  String get hostManualSendReplanSubtitle =>
      'This check does not send, complete, or remove any task.';

  @override
  String get hostManualSendReplanManagedAvailable =>
      'Catch chat is now available. This manual task remains open until you finish or skip it.';

  @override
  String get hostManualSendReplanKeepByHand =>
      'This still needs your final send in WhatsApp.';

  @override
  String get hostManualSendReplanUnavailable =>
      'The route is currently unavailable. The task remains open so you can resolve or skip it.';

  @override
  String get hostManualSendReplanEndpointChanged =>
      'This customer’s phone number changed. Skip this task and start a fresh handoff from Customers.';

  @override
  String get hostManualSendReplanInactive => 'This task is no longer active.';

  @override
  String get hostSendsEmpty => 'No messages sent yet.';

  @override
  String get hostSendsEmptyHelp =>
      'Campaigns, event announcements, and follower updates will appear here after you send them.';

  @override
  String get hostSendsCampaignType => 'Campaign';

  @override
  String get hostSendsAnnouncementType => 'Announcement';

  @override
  String hostSendsRecipients({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count people',
      one: '1 person',
    );
    return '$_temp0';
  }

  @override
  String get hostSendsPartial => 'Some deliveries need attention';

  @override
  String hostSendsFollowerDeliveryStatus({required String status}) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'pending': 'Delivering in Catch',
      'completed': 'Available in Catch',
      'partial': 'Some deliveries need attention',
      'unknown': 'Delivery was not tracked',
      'other': 'Delivery status unavailable',
    });
    return '$_temp0';
  }

  @override
  String get hostInboxWhatsappChannel => 'WhatsApp Business · Organizer number';

  @override
  String get hostInboxAnnouncementDisclosure =>
      'Recipients see a durable Activity update and may receive a push notification. This does not create a chat thread.';

  @override
  String get hostInboxWhatsappReply => 'Reply';

  @override
  String get hostInboxWhatsappReplyHint => 'Write a WhatsApp reply';

  @override
  String hostInboxWhatsappWindowOpen({required String time}) {
    return 'Replies available until $time';
  }

  @override
  String get hostInboxWhatsappWindowClosed =>
      'The 24-hour reply window is closed. Start a new message with an approved template.';

  @override
  String get hostInboxWhatsappHistoryTruncated =>
      'Only the 200 most recent retained messages are shown.';

  @override
  String get hostSendsDeliveryTime => 'Delivery';

  @override
  String get hostSendsSendNow => 'Send after approval';

  @override
  String get hostSendsSchedule => 'Schedule';

  @override
  String get hostSendsClearSchedule => 'Send after approval';

  @override
  String get hostCustomersContactDetails => 'Details';

  @override
  String get hostCustomersEditDetails => 'Edit details';

  @override
  String get hostCustomersNotSaved => 'Not saved';

  @override
  String get hostCustomersAdd => 'Add person';

  @override
  String get hostCustomersAddTitle => 'Add person';

  @override
  String get hostCustomersName => 'Name shown to your team';

  @override
  String get hostCustomersNameRequired => 'Enter the customer’s name.';

  @override
  String get hostCustomersContactMethodRequired =>
      'Add or keep at least one mobile number or email address.';

  @override
  String get hostCustomersPhone => 'Mobile number';

  @override
  String get hostCustomersPhoneHelp =>
      'Include the country code, for example +919876543210.';

  @override
  String get hostCustomersPhoneInvalid =>
      'Enter a valid number with country code.';

  @override
  String get hostCustomersEmail => 'Email';

  @override
  String get hostCustomersEmailInvalid => 'Enter a valid email address.';

  @override
  String get hostCustomersInitialNote => 'Private note';

  @override
  String get hostCustomersInitialNoteHelp =>
      'Private notes are visible only to this organizer’s management team.';

  @override
  String get hostCustomersVerifiedDetailsManagedByCatch =>
      'Phone and email come from the source record and can’t be edited here.';

  @override
  String get hostCustomersUnverifiedContactDetails =>
      'Added by your team · not verified by Catch';

  @override
  String get hostCustomersUnavailable => 'Customers unavailable';

  @override
  String get hostCustomersReload => 'Reload customers';

  @override
  String get hostCustomersDetailUnavailable => 'Customer details unavailable';

  @override
  String get hostCustomersDetailNotFound => 'Customer not found';

  @override
  String get hostCustomersReloadDetail => 'Reload customer';

  @override
  String hostCustomersFilterSummary({
    required String label,
    required String countLabel,
  }) {
    return '$label · $countLabel';
  }

  @override
  String get hostCustomersFilters => 'Filters';

  @override
  String get hostCustomersClearFilter => 'Clear';

  @override
  String get hostCustomersViewPeople => 'People';

  @override
  String get hostCustomersViewAudiences => 'Groups';

  @override
  String get hostSavedAudienceSaveTitle => 'Save this group';

  @override
  String get hostSavedAudienceSaveBody =>
      'Name this reusable customer group. Inbox will use this saved definition and recheck eligibility before sending.';

  @override
  String get hostSavedAudienceName => 'Group name';

  @override
  String get hostSavedAudienceSaveAndMessage => 'Save and continue to message';

  @override
  String get hostSavedAudiencesEmptyTitle => 'No groups yet';

  @override
  String get hostSavedAudiencesEmptyBody =>
      'Create a group to keep the right people together. Use it in Inbox when you are ready to send.';

  @override
  String get hostSavedAudienceFieldLabel => 'Saved group';

  @override
  String hostSavedAudienceOption({required String name, required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$name · $count people at last preview',
      one: '$name · 1 person at last preview',
    );
    return '$_temp0';
  }

  @override
  String get hostSavedAudiencesManage => 'Groups';

  @override
  String get hostSavedAudiencesSearch => 'Search groups';

  @override
  String get hostSavedAudiencesSearchEmptyTitle =>
      'No groups match this search';

  @override
  String get hostSavedAudiencesSearchEmptyBody => 'Try a different group name.';

  @override
  String get hostSavedAudienceNew => 'New group';

  @override
  String get hostSavedAudienceDetails => 'Group details';

  @override
  String get hostSavedAudienceNameRequired => 'Add an group name.';

  @override
  String get hostSavedAudienceMatch => 'Match rules';

  @override
  String get hostSavedAudienceMatchAll => 'Match every rule';

  @override
  String get hostSavedAudienceMatchAny => 'Match any rule';

  @override
  String hostSavedAudienceCondition({required int number}) {
    return 'Condition $number';
  }

  @override
  String get hostSavedAudienceRemoveRule => 'Remove';

  @override
  String get hostSavedAudienceAddRule => 'Add condition';

  @override
  String get hostSavedAudienceRuleType => 'Condition type';

  @override
  String get hostSavedAudienceRuleSegment => 'Customer segment';

  @override
  String get hostSavedAudienceRuleTag => 'Your tag';

  @override
  String get hostSavedAudienceRuleAttendance => 'Attendance count';

  @override
  String get hostSavedAudienceRuleLastSeen => 'Last seen';

  @override
  String get hostSavedAudienceRuleManagedReach =>
      'Managed WhatsApp eligibility';

  @override
  String get hostSavedAudienceSegment => 'Segment';

  @override
  String get hostSavedAudienceTag => 'Tag';

  @override
  String get hostSavedAudienceChooseTag => 'Choose a tag';

  @override
  String get hostSavedAudienceAttendanceComparison => 'Comparison';

  @override
  String get hostSavedAudienceAtLeast => 'At least';

  @override
  String get hostSavedAudienceAtMost => 'At most';

  @override
  String get hostSavedAudienceEventsAttended => 'Events attended';

  @override
  String get hostSavedAudienceEventsUnit => 'events';

  @override
  String get hostSavedAudienceLastSeenWithin => 'Last seen within';

  @override
  String get hostSavedAudienceDaysUnit => 'days';

  @override
  String get hostSavedAudienceDecreaseCount => 'Decrease event count';

  @override
  String get hostSavedAudienceIncreaseCount => 'Increase event count';

  @override
  String get hostSavedAudienceDecreaseDays => 'Decrease day count';

  @override
  String get hostSavedAudienceIncreaseDays => 'Increase day count';

  @override
  String get hostSavedAudienceManagedReach => 'Eligibility';

  @override
  String get hostSavedAudienceManagedReachBody =>
      'Includes only customers currently eligible for an organizer-managed WhatsApp campaign. Inbox rechecks this at send time.';

  @override
  String get hostSavedAudienceCompleteRules =>
      'Complete every group condition before saving.';

  @override
  String get hostSavedAudienceCurrentPreview => 'Saved preview';

  @override
  String get hostSavedAudiencePeople => 'People and reach';

  @override
  String get hostSavedAudienceArchiveTitle => 'Archive this group?';

  @override
  String get hostSavedAudienceArchiveBody =>
      'It will disappear from new sends. Historical sends keep the group snapshot they used.';

  @override
  String get hostSavedAudienceNotFound => 'This saved group is unavailable.';

  @override
  String get hostSavedAudiencePreview => 'Refresh';

  @override
  String get hostSavedAudienceArchive => 'Archive';

  @override
  String get hostSavedAudienceNeverPreviewed => 'Not checked yet';

  @override
  String hostSavedAudiencePeopleCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count people',
      one: '1 person',
    );
    return '$_temp0';
  }

  @override
  String hostAudienceReachCountInCatch({required int count}) {
    return '$count in Catch';
  }

  @override
  String hostAudienceReachCountAutomatic({required int count}) {
    return '$count automatic';
  }

  @override
  String hostAudienceReachCountByHand({required int count}) {
    return '$count by hand';
  }

  @override
  String hostAudienceReachCountUnavailable({required int count}) {
    return '$count unavailable';
  }

  @override
  String get hostCustomersCoverageRefresh => 'Check again';

  @override
  String hostCustomersMessageThese({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Message these $count people',
      one: 'Message this person',
    );
    return '$_temp0';
  }

  @override
  String hostCustomersMessageTheseAtLeast({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Message at least $count people',
      one: 'Message at least 1 person',
    );
    return '$_temp0';
  }

  @override
  String get hostCustomersSetUpWhatsappBusiness => 'Set up WhatsApp Business';

  @override
  String get hostCustomersFilterSheetTitle => 'Filter people';

  @override
  String get hostFiltersResetAll => 'Reset all';

  @override
  String get hostCustomersFilterGroupAttendance => 'Attendance';

  @override
  String get hostCustomersFilterGroupReliability => 'Reliability';

  @override
  String get hostCustomersFilterGroupAdvocacy => 'Advocacy';

  @override
  String get hostCustomersFilterGroupReachable => 'Reachable';

  @override
  String hostCustomersPeopleCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count people',
      one: '1 person',
    );
    return '$_temp0';
  }

  @override
  String hostCustomersPeopleCountAtLeast({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'At least $count people',
      one: 'At least 1 person',
    );
    return '$_temp0';
  }

  @override
  String get hostCustomersFilterAtRisk => 'At risk';

  @override
  String get hostCustomersNeedsReview => 'Needs review';

  @override
  String get hostCustomersReviewDuplicates => 'Review possible duplicates';

  @override
  String get hostCustomersMergeReviewTitle => 'Possible duplicate customers';

  @override
  String get hostCustomersMergeReviewHelp =>
      'Nothing is merged automatically. Compare the evidence, then choose which customer record to keep.';

  @override
  String get hostCustomersMergeReviewEmpty =>
      'No possible duplicates need review.';

  @override
  String get hostCustomersMergeEvidenceVerifiedUid =>
      'Same verified Catch account';

  @override
  String get hostCustomersMergeEvidenceVerifiedPhone => 'Same verified phone';

  @override
  String get hostCustomersMergeEvidenceImportedPhone => 'Same imported phone';

  @override
  String get hostCustomersMergeEvidenceEmail => 'Same email';

  @override
  String hostCustomersMergeSharedEvents({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count shared events',
      one: '1 shared event',
      zero: 'No shared events',
    );
    return '$_temp0';
  }

  @override
  String hostCustomersMergeKeep({required String name}) {
    return 'Keep $name';
  }

  @override
  String get hostCustomersMergeAction => 'Merge customers';

  @override
  String get hostCustomersDifferentPeople => 'Different people';

  @override
  String get hostCustomersMergeConfirmTitle => 'Merge these customer records?';

  @override
  String hostCustomersMergeConfirmBody({required String survivor}) {
    return '$survivor will be kept. Attendance and identity facts will move into that record. This also confirms any conflicting phone, email, or linked-account details shown here. You can undo the merge from the surviving customer’s details.';
  }

  @override
  String get hostCustomersDismissedDuplicates => 'Marked as different people';

  @override
  String get hostCustomersReopenDuplicate => 'Review again';

  @override
  String get hostCustomersReopenOwnerOnly =>
      'Only the manager who marked this pair can reopen it.';

  @override
  String get hostCustomersMergedHistory => 'Merged records';

  @override
  String hostCustomersMergedHistoryRow({
    required String name,
    required int count,
  }) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count facts moved',
      one: '1 fact moved',
    );
    return '$name · $_temp0';
  }

  @override
  String get hostCustomersUndoMerge => 'Undo merge';

  @override
  String get hostCustomersUndoMergeTitle => 'Undo this merge?';

  @override
  String get hostCustomersUndoMergeBody =>
      'The original customer record and its moved facts will be restored.';

  @override
  String get hostCustomersEmpty => 'No customers yet';

  @override
  String get hostCustomersNoResults => 'No customers match these filters.';

  @override
  String get hostCustomersLoadMore => 'Load more';

  @override
  String get hostCustomersDetailAttendance => 'Attendance';

  @override
  String get hostCustomersExpected => 'Expected';

  @override
  String get hostCustomersAttendanceRate => 'Attendance rate';

  @override
  String get hostCustomersDetailRevenue => 'Recorded spend';

  @override
  String get hostCustomersDetailNoRevenue => 'No spend recorded.';

  @override
  String get hostCustomersDetailRevenueUnavailable =>
      'Revenue facts are unavailable right now.';

  @override
  String get hostCustomersDetailRevenuePartial =>
      'Some event and payment history may be missing.';

  @override
  String hostCustomersDetailRevenueFacts({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count spend records',
      one: '1 spend record',
    );
    return '$_temp0';
  }

  @override
  String get hostCustomersRevenueSourceCatch => 'Catch confirmed';

  @override
  String get hostCustomersRevenueSourceProvider => 'Provider confirmed';

  @override
  String get hostCustomersRevenueSourceImport => 'Imported by your team';

  @override
  String get hostCustomersRevenueSourceEstimate => 'Estimated by your team';

  @override
  String get hostCustomersRevenueSourceAttested => 'Confirmed by your team';

  @override
  String get hostCustomersMessageOptionsLoading =>
      'Checking messaging options…';

  @override
  String get hostCustomersMessageOptionsUnavailable =>
      'Messaging options unavailable';

  @override
  String get hostCustomersMessageOptionsRetry => 'Try checking again.';

  @override
  String get hostCustomersMessagePermissionRequired =>
      'This person has not granted permission for this kind of message.';

  @override
  String get hostCustomersMessageSenderUnavailable =>
      'Sending setup is not available for this route yet.';

  @override
  String get hostCustomersWhatsappAppChannel => 'Personal WhatsApp';

  @override
  String get hostCustomersWhatsappHandoffDisclosure =>
      'Opens WhatsApp on this device with editable text. You review it and press Send; Catch cannot track delivery or replies.';

  @override
  String get hostCustomersWhatsappMissingPhone =>
      'Add a valid phone number to use a personal WhatsApp handoff.';

  @override
  String get hostCustomersWhatsappOrganizerSuppressed =>
      'WhatsApp handoff is paused for this customer by your team.';

  @override
  String get hostCustomersWhatsappContactOptedOut =>
      'This customer has opted out of WhatsApp messages.';

  @override
  String get hostCustomersWhatsappHandoffTitle => 'WhatsApp app';

  @override
  String hostCustomersWhatsappHandoffSubtitle({
    required String name,
    required String phone,
  }) {
    return '$name · $phone';
  }

  @override
  String hostCustomersWhatsappDefaultMessage({required String name}) {
    return 'Hi $name,';
  }

  @override
  String get hostCustomersWhatsappMessage => 'Message';

  @override
  String get hostCustomersOpenWhatsapp => 'Open WhatsApp';

  @override
  String get hostCustomersWhatsappOpenFailed =>
      'Could not open WhatsApp on this device.';

  @override
  String get hostCustomersWhatsappRecordFailed =>
      'WhatsApp opened, but Catch couldn’t record it. The task is still waiting in Sends.';

  @override
  String get hostCustomersConversationUnlinked =>
      'A conversation becomes available after this customer is unambiguously linked to a Catch account.';

  @override
  String get hostCustomersConversationAmbiguous =>
      'Resolve this customer’s identity before starting a conversation.';

  @override
  String hostCustomersMessagePerson({required String name}) {
    return 'Message $name';
  }

  @override
  String get hostCustomersMessagePersonCatch => 'Opens the Catch conversation.';

  @override
  String get hostCustomersMessagePersonHandoff =>
      'Review your message, then send it in WhatsApp.';

  @override
  String get hostCustomersWhatsappPermission => 'WhatsApp permission';

  @override
  String get hostCustomersWhatsappPermissionUnknown =>
      'No participant permission is recorded.';

  @override
  String get hostCustomersWhatsappPermissionGrantedUndated =>
      'Participant granted permission.';

  @override
  String get hostCustomersWhatsappPermissionRevokedUndated =>
      'Participant withdrew permission.';

  @override
  String hostCustomersWhatsappPermissionGrantedByForm({
    required String formTitle,
    required String date,
  }) {
    return 'Granted on $formTitle · $date';
  }

  @override
  String hostCustomersWhatsappPermissionGranted({required String date}) {
    return 'Participant granted permission · $date';
  }

  @override
  String hostCustomersWhatsappPermissionRevoked({required String date}) {
    return 'Participant withdrew permission · $date';
  }

  @override
  String get hostCustomersWhatsappPermissionIncomplete =>
      'The current state is known, but its legacy evidence is incomplete.';

  @override
  String get hostCustomersWhatsappPermissionUnavailable =>
      'Permission evidence is unavailable right now.';

  @override
  String get hostCustomersCustomerProvenance => 'Customer sources';

  @override
  String get hostCustomersCustomerProvenanceUnavailable =>
      'Source information is unavailable.';

  @override
  String hostCustomersCustomerProvenanceItem({
    required String source,
    required String date,
  }) {
    return '$source · $date';
  }

  @override
  String get hostCustomersOriginCatchBooking => 'Catch booking';

  @override
  String get hostCustomersOriginHostImport => 'Imported by your team';

  @override
  String get hostCustomersOriginHostManual => 'Added by your team';

  @override
  String get hostCustomersOriginWebOtp => 'Verified web registration';

  @override
  String get hostCustomersOriginProviderSync => 'Synced from an event provider';

  @override
  String hostCustomersOriginHostForm({required String formTitle}) {
    return '$formTitle';
  }

  @override
  String get hostCustomersPauseWhatsappHandoffs => 'Pause personal WhatsApp';

  @override
  String get hostCustomersPauseWhatsappHandoffsBody =>
      'Stops your team’s personal WhatsApp handoffs. This does not change the person’s permission.';

  @override
  String get hostCustomersTimeline => 'History';

  @override
  String get hostCustomersTimelineEmpty => 'No activity recorded in this view.';

  @override
  String get hostCustomersTimelinePartialBody =>
      'Some history may be missing. Available activity is shown newest first.';

  @override
  String get hostCustomersTimelineReplyBoundary =>
      'Personal WhatsApp conversations stay in WhatsApp. Only Catch and managed WhatsApp messages appear here.';

  @override
  String get hostCustomersTimelineFormFallback => 'Form response';

  @override
  String hostCustomersTimelineFormSubmitted({required int answerCount}) {
    String _temp0 = intl.Intl.pluralLogic(
      answerCount,
      locale: localeName,
      other: '$answerCount answers',
      one: '1 answer',
      zero: 'no recorded answers',
    );
    return 'Submitted · $_temp0';
  }

  @override
  String hostCustomersTimelineFormWithdrawn({required String date}) {
    return 'Response withdrawn · $date';
  }

  @override
  String hostCustomersTimelineEventStatus({required String status}) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'invited': 'Invited',
      'registered': 'Registered',
      'waitlisted': 'Waitlisted',
      'checkedIn': 'Checked in',
      'attended': 'Attended',
      'noShow': 'Did not attend',
      'cancelled': 'Cancelled',
      'other': 'Event activity',
    });
    return '$_temp0';
  }

  @override
  String get hostCustomersTimelineManualHandoff => 'Personal WhatsApp handoff';

  @override
  String hostCustomersTimelineSendStatus({required String status}) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'available': 'Activity available',
      'pending': 'Pending',
      'sending': 'Sending',
      'suppressed': 'Suppressed',
      'accepted': 'Accepted by provider',
      'sent': 'Sent',
      'delivered': 'Delivered',
      'read': 'Read',
      'failed': 'Failed',
      'replied': 'Replied',
      'optedOut': 'Opted out',
      'queued': 'Waiting in Sends',
      'handoffOpened': 'You opened WhatsApp',
      'hostMarkedSent': 'You marked this sent',
      'skipped': 'Skipped',
      'cancelled': 'Cancelled',
      'superseded': 'Superseded',
      'expired': 'Expired',
      'other': 'Status unavailable',
    });
    return '$_temp0';
  }

  @override
  String get hostCustomersTimelineCatchMessage => 'Catch message';

  @override
  String get hostCustomersTimelineManagedWhatsapp => 'Managed WhatsApp message';

  @override
  String hostCustomersTimelineDirection({required String direction}) {
    String _temp0 = intl.Intl.selectLogic(direction, {
      'inbound': 'Message received',
      'outbound': 'Message sent',
      'other': 'Message',
    });
    return '$_temp0';
  }

  @override
  String get hostCustomersFilterGroupYourTags => 'Your tags';

  @override
  String get hostCustomersMemory => 'Notes & tags';

  @override
  String get hostCustomersOverview => 'Overview';

  @override
  String get hostCustomersRecentEvents => 'Event activity';

  @override
  String get hostCustomersMemoryHelp =>
      'Notes and tags are private to your host team.';

  @override
  String get hostCustomersManualTags => 'Your tags';

  @override
  String get hostCustomersEditTags => 'Edit tags';

  @override
  String get hostCustomersNoManualTags => 'No organizer tags yet.';

  @override
  String get hostCustomersTagSheetTitle => 'Customer tags';

  @override
  String get hostCustomersTagSheetSubtitle =>
      'Choose up to 5 of your organizer’s tags, or create a new one.';

  @override
  String get hostCustomersNewTag => 'New tag';

  @override
  String get hostCustomersAddTag => 'Add tag';

  @override
  String get hostCustomersSaveTags => 'Save tags';

  @override
  String get hostCustomersTagContactLimit =>
      'A customer can have up to 5 tags.';

  @override
  String get hostCustomersTagVocabularyLimit =>
      'Your organizer already has 20 tags. Choose an existing tag.';

  @override
  String get hostCustomersNotes => 'Notes';

  @override
  String get hostCustomersAddNote => 'Add note';

  @override
  String get hostCustomersEditNote => 'Edit note';

  @override
  String get hostCustomersNoteBody => 'Note';

  @override
  String get hostCustomersSaveNote => 'Save note';

  @override
  String get hostCustomersNoNotes => 'No notes yet.';

  @override
  String hostCustomersNoteByYou({required String date}) {
    return 'You · $date';
  }

  @override
  String hostCustomersNoteByTeam({required String date}) {
    return 'Team member · $date';
  }

  @override
  String get hostCustomersNoteEdited => 'edited';

  @override
  String get hostCustomersNotesTruncated =>
      'Only the 100 newest notes are shown.';

  @override
  String get hostCustomersNotesUnavailableBody =>
      'Notes are temporarily unavailable. Other customer details are still available.';

  @override
  String get hostCustomersOutreach => 'Outreach';

  @override
  String get hostCustomersLogOutreach => 'Log outreach';

  @override
  String get hostCustomersLogOutreachBody =>
      'Record a call, message or conversation you had with this person. It appears on their history.';

  @override
  String get hostCustomersOutreachChannelField => 'Channel';

  @override
  String get hostCustomersOutreachOutcomeField => 'Outcome';

  @override
  String hostCustomersOutreachChannel({required String channel}) {
    String _temp0 = intl.Intl.selectLogic(channel, {
      'phoneCall': 'Phone call',
      'whatsapp': 'WhatsApp',
      'email': 'Email',
      'sms': 'Text message',
      'inPerson': 'In person',
      'other': 'Outreach',
    });
    return '$_temp0';
  }

  @override
  String hostCustomersOutreachOutcome({required String outcome}) {
    String _temp0 = intl.Intl.selectLogic(outcome, {
      'reached': 'Reached',
      'noAnswer': 'No answer',
      'leftMessage': 'Left a message',
      'wrongContact': 'Wrong contact',
      'attempted': 'Attempted',
      'other': 'Outcome recorded',
    });
    return '$_temp0';
  }

  @override
  String get hostCustomersOutreachNote => 'Note';

  @override
  String get hostCustomersEmailAppChannel => 'Personal email';

  @override
  String get hostCustomersMessagePersonEmail =>
      'Review your email, then send it from your mail app.';

  @override
  String get hostCustomersEmailMissingEmail =>
      'Add an email address to use an email handoff.';

  @override
  String get hostCustomersEmailHandoffTitle => 'Email app';

  @override
  String hostCustomersEmailHandoffSubtitle({
    required String name,
    required String email,
  }) {
    return '$name · $email';
  }

  @override
  String get hostCustomersEmailHandoffDisclosure =>
      'Opens your email app on this device with editable text. You review it and press Send; Catch cannot track delivery or replies.';

  @override
  String get hostCustomersEmailMessage => 'Message';

  @override
  String hostCustomersEmailDefaultMessage({required String name}) {
    return 'Hi $name,';
  }

  @override
  String get hostCustomersOpenEmail => 'Open email';

  @override
  String get hostCustomersEmailOpenFailed =>
      'Could not open an email app on this device.';

  @override
  String get hostCustomersEmailRecordFailed =>
      'Your email app opened, but Catch couldn’t record the attempt.';

  @override
  String get hostSheetClose => 'Close';

  @override
  String get hostCustomersSort => 'Sort';

  @override
  String hostCustomersSortControl({required String label}) {
    return 'Sort: $label';
  }

  @override
  String get hostCustomersSortLastSeen => 'Last seen';

  @override
  String get hostCustomersSortMostAttended => 'Most attended';

  @override
  String get hostCustomersSortName => 'Name';

  @override
  String get hostCustomersMoreActions => 'More audience actions';

  @override
  String get eventSuccessAccountabilityTitle => 'Return sweep';

  @override
  String get eventSuccessAccountabilitySubtitle =>
      'Mark each checked-in guest as returned or departed. People may leave quietly; this is a safety aid, not a checkout requirement.';

  @override
  String eventSuccessAccountabilityProgress({
    required int resolved,
    required int total,
  }) {
    return '$resolved of $total marked';
  }

  @override
  String get eventSuccessAccountabilityEmpty =>
      'No checked-in guests to review.';

  @override
  String get eventSuccessAccountabilityUnresolved => 'Not marked';

  @override
  String get eventSuccessAccountabilityReturned => 'Returned';

  @override
  String get eventSuccessAccountabilityDeparted => 'Departed';

  @override
  String get eventSuccessAccountabilityWarningTitle =>
      'Some guests aren’t marked yet';

  @override
  String eventSuccessAccountabilityWarningMessage({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count checked-in guests aren’t marked returned or departed.',
      one: '1 checked-in guest isn’t marked returned or departed.',
    );
    return '$_temp0 People sometimes leave without checking out. Review the list if useful, or finish anyway.';
  }

  @override
  String get eventSuccessAccountabilityReviewAction => 'Review sweep';

  @override
  String get eventSuccessAccountabilityFinishAnywayAction => 'Finish anyway';

  @override
  String eventSuccessHostResourceUnavailableTitle({required String resource}) {
    return '$resource unavailable';
  }

  @override
  String get eventSuccessHostResourceLiveGuide => 'Live guide';

  @override
  String get eventSuccessHostResourceGuestRoster => 'Guest roster';

  @override
  String get eventSuccessHostResourceMicroPodAssignments =>
      'Micro-pod assignments';

  @override
  String get eventSuccessHostResourcePublishedRotations =>
      'Published rotations';

  @override
  String get eventSuccessHostResourceRotationDrafts => 'Rotation drafts';

  @override
  String get eventSuccessHostResourceMicroPodProfiles =>
      'Micro-pod attendee profiles';

  @override
  String get eventSuccessHostResourceRotationProfiles =>
      'Rotation attendee profiles';

  @override
  String get eventSuccessHostResourceAttendeePreferences =>
      'Attendee preferences';

  @override
  String get eventSuccessHostResourceHostHelpRequests => 'Host-help requests';

  @override
  String get eventSuccessHostResourceHostHelpProfiles =>
      'Host-help attendee profiles';

  @override
  String get eventSuccessHostResourceEventReport => 'Event report';

  @override
  String get hostsHostEventManageWorkspacePreparation => 'Event preparation';

  @override
  String get hostsHostEventManagePreparationEventDetails => 'EVENT DETAILS';

  @override
  String get hostsHostEventManagePreparationGuestSources => 'GUEST SOURCES';

  @override
  String get hostsHostEventManagePreparationTeamAccess => 'TEAM & ACCESS';

  @override
  String get hostsHostEventManageWorkspaceRuntime => 'Live operations';

  @override
  String get hostsHostEventManageWorkspaceRecap => 'Event recap';

  @override
  String get hostsHostEventManageWorkspaceCancelled => 'Cancelled event';

  @override
  String get hostsHostEventManageReviewSetupTitle => 'Review event setup';

  @override
  String get hostsHostEventManageReviewSetupBody =>
      'Event details, Host actions, and Event Success configuration remain available for audit.';

  @override
  String get hostsHostEventRosterDrawerTitle => 'Guest roster';

  @override
  String hostsHostEventRosterDrawerCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count booked guests',
      one: '1 booked guest',
      zero: 'No booked guests',
    );
    return '$_temp0';
  }

  @override
  String hostsHostEventRosterDrawerOpen({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Open guest roster, $count booked guests',
      one: 'Open guest roster, 1 booked guest',
      zero: 'Open guest roster',
    );
    return '$_temp0';
  }

  @override
  String get hostsHostEventRosterDrawerClose => 'Close guest roster';

  @override
  String get hostsHostEventRosterDrawerMessageGuests => 'Message guests';

  @override
  String get hostApplicationsTitle => 'Applications';

  @override
  String get hostApplicationsUnavailable => 'Applications unavailable';

  @override
  String get hostApplicationsReload => 'Reload applications';

  @override
  String get hostApplicationNotFound => 'Application not found';

  @override
  String get hostApplicationsImport => 'Import responses';

  @override
  String get hostApplicationsImportTitle => 'Import responses';

  @override
  String get hostApplicationsImportSubtitle =>
      'Every column is preserved. Imported responses start in Submitted for review. Recognized profile fields can support future prefill; unique questions stay organizer-only.';

  @override
  String get hostApplicationsImportReusableField => 'Reusable profile field';

  @override
  String get hostApplicationsImportOrganizerField => 'Organizer-only question';

  @override
  String hostApplicationsImportAction({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count responses',
      one: '1 response',
    );
    return 'Import $_temp0';
  }

  @override
  String hostApplicationsImportLimit({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count additional rows will need a second import.',
      one: '1 additional row will need a second import.',
    );
    return '$_temp0';
  }

  @override
  String get hostApplicationsImportMissingName =>
      'Map a Name, Full name, or First name column before importing.';

  @override
  String get hostApplicationsImportNoRows =>
      'The spreadsheet does not contain any application rows.';

  @override
  String hostApplicationsImportComplete({
    required int created,
    required int skipped,
  }) {
    String _temp0 = intl.Intl.pluralLogic(
      created,
      locale: localeName,
      other: 'Imported $created responses',
      one: 'Imported 1 response',
    );
    String _temp1 = intl.Intl.pluralLogic(
      skipped,
      locale: localeName,
      other: 'skipped $skipped',
      one: 'skipped 1',
    );
    return '$_temp0 · $_temp1.';
  }

  @override
  String get hostApplicationsConsentCopy =>
      'I agree to share these submitted answers with this organizer for application review.';

  @override
  String get hostApplicationsRetentionCopy =>
      'The organizer may retain submitted answers for application review and customer history according to its stated policy.';

  @override
  String get hostApplicationsSortNewest => 'Newest first';

  @override
  String get hostApplicationsSortOldest => 'Oldest first';

  @override
  String get hostApplicationsReviewStatusFilter => 'Filter by review status';

  @override
  String get hostApplicationsStatusSubmitted => 'Submitted';

  @override
  String get hostApplicationsStatusInReview => 'In review';

  @override
  String get hostApplicationsStatusApproved => 'Approved';

  @override
  String get hostApplicationsStatusWaitlisted => 'Waitlisted';

  @override
  String get hostApplicationsStatusDeclined => 'Declined';

  @override
  String get hostApplicationsStatusWithdrawn => 'Withdrawn';

  @override
  String get hostApplicationsSourceNative => 'Catch form';

  @override
  String get hostApplicationsSourceImport => 'Spreadsheet import';

  @override
  String get hostApplicationsSourceConnector => 'Connected form';

  @override
  String get hostApplicationsLoadMore => 'Load more applications';

  @override
  String get hostApplicationNotAnswered => 'Not answered';

  @override
  String get hostApplicationAnswerYes => 'Yes';

  @override
  String get hostApplicationAnswerNo => 'No';

  @override
  String hostApplicationAnswerFiles({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count files',
      one: '1 file',
    );
    return '$_temp0';
  }

  @override
  String get hostApplicationCall => 'Call';

  @override
  String get hostApplicationEmail => 'Email';

  @override
  String get hostApplicationInstagram => 'Instagram';

  @override
  String get hostApplicationLinkedin => 'LinkedIn';

  @override
  String get hostApplicationReviewNote => 'Private review note';

  @override
  String get hostApplicationReviewNoteHint => 'Add context for your team';

  @override
  String get hostApplicationApprove => 'Accept and add to People';

  @override
  String get hostApplicationReviewUpdated => 'Application review updated';

  @override
  String get hostFormsCreate => 'Create form';

  @override
  String get hostFormsUnavailableTitle => 'Forms unavailable';

  @override
  String get hostFormsUnavailableBody =>
      'Forms is not available right now. Please try again in a moment.';

  @override
  String get hostFormsReload => 'Reload forms';

  @override
  String get hostFormsNotFound => 'Form not found';

  @override
  String get hostFormResponsesUnavailableTitle => 'Responses unavailable';

  @override
  String get hostFormResponsesUnavailableBody =>
      'Form responses are not available right now. Please try again in a moment.';

  @override
  String get hostFormResponsesReload => 'Reload responses';

  @override
  String get hostFormResponseNotFound => 'Response not found';

  @override
  String get hostFormsSearch => 'Search forms';

  @override
  String get hostFormsFilterAll => 'All';

  @override
  String get hostFormsEmptyTitle => 'No forms yet';

  @override
  String get hostFormsEmptyBody =>
      'Start with a template, then tailor the questions and identity requirements.';

  @override
  String get hostFormsNoMatchesTitle => 'No forms match';

  @override
  String get hostFormsNoMatchesBody =>
      'Try another search or lifecycle filter.';

  @override
  String get hostFormsActions => 'Form actions';

  @override
  String get hostFormConsequencesUnavailable =>
      'Identity and automation consequences need review';

  @override
  String get hostFormAutomationConsequencesUnavailable =>
      'Automation consequences need review';

  @override
  String get hostFormConsequenceIdentityAnonymous =>
      'Anonymous responses · no durable customer identity';

  @override
  String get hostFormConsequenceIdentityEmail => 'Verifies email';

  @override
  String get hostFormConsequenceIdentityPhone => 'Verifies phone';

  @override
  String get hostFormConsequenceIdentityEmailOrPhone =>
      'Verifies email or phone';

  @override
  String get hostFormConsequenceIdentityCatchAccount =>
      'Requires a Catch account';

  @override
  String get hostFormConsequenceIdentityUnknown =>
      'Identity policy needs review';

  @override
  String get hostFormConsequenceCreatesCustomer => 'Adds a record to Customers';

  @override
  String get hostFormConsequenceApplicationReview =>
      'Sends a record to application review';

  @override
  String get hostFormConsequenceProposesAttendee =>
      'Proposes an event attendee';

  @override
  String get hostFormConsequenceAppliesTags => 'Applies customer tags';

  @override
  String get hostFormConsequenceNotifiesTeam => 'Notifies your team';

  @override
  String get hostFormConsequenceCallsWebhook => 'Calls a signed webhook';

  @override
  String get hostFormConsequencePreparesSend => 'Prepares a send for review';

  @override
  String get hostFormConsequenceFormsOnly => 'Responses stay in Forms';

  @override
  String get hostFormConsequenceNoMessagingPermission =>
      'Identity checks and contact creation do not grant messaging permission.';

  @override
  String get hostFormConsequencesTitle => 'What publishing does';

  @override
  String get hostFormMessagingPermissionTitle => 'Messaging permission';

  @override
  String get hostFormIdentityConsequenceTitle => 'Identity consequence';

  @override
  String get hostFormsLoadMore => 'Load more forms';

  @override
  String get hostFormsDuplicate => 'Duplicate form';

  @override
  String get hostFormsPause => 'Pause responses';

  @override
  String get hostFormsResume => 'Resume responses';

  @override
  String get hostFormsArchive => 'Archive form';

  @override
  String get hostFormsDeleteDraft => 'Delete draft';

  @override
  String get hostFormsArchiveConfirmTitle => 'Archive this form?';

  @override
  String get hostFormsArchiveConfirmBody =>
      'Its public link will stop accepting responses. Existing responses stay available.';

  @override
  String get hostFormsDeleteConfirmTitle => 'Delete this draft?';

  @override
  String get hostFormsDeleteConfirmBody =>
      'This draft has never been published and will be permanently removed.';

  @override
  String get hostFormsNoOrganizerTitle => 'Create an organizer first';

  @override
  String get hostFormsNoOrganizerBody =>
      'Forms belong to an organizer so your team, brand, and response data remain scoped correctly.';

  @override
  String get hostFormsCreateOrganizer => 'Create organizer';

  @override
  String get hostFormsStatusDraft => 'Draft';

  @override
  String get hostFormsStatusPublished => 'Published';

  @override
  String get hostFormsStatusPaused => 'Paused';

  @override
  String get hostFormsStatusArchived => 'Archived';

  @override
  String get hostFormsPurposeApplication => 'Application';

  @override
  String get hostFormsPurposeRegistration => 'Registration';

  @override
  String get hostFormsPurposeIntake => 'Intake';

  @override
  String get hostFormsPurposeWaiver => 'Waiver';

  @override
  String get hostFormsPurposeFeedback => 'Feedback';

  @override
  String get hostFormsPurposeSurvey => 'Survey';

  @override
  String get hostFormTemplatesTitle => 'New form';

  @override
  String get hostFormTemplatesSubtitle =>
      'Choose a starting point. You can edit every question before publishing.';

  @override
  String hostFormTemplateSummary({
    required String purpose,
    required int count,
  }) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count questions',
      one: '1 question',
    );
    return '$purpose · $_temp0';
  }

  @override
  String get hostFormQuestionsTitle => 'Questions';

  @override
  String get hostFormPublishPrompt => 'Ready to publish?';

  @override
  String get hostFormReorderQuestion => 'Drag to reorder question';

  @override
  String get hostFormAdvancedQuestionSettings => 'Advanced settings';

  @override
  String get hostFormAdvancedQuestionSettingsHelp =>
      'Privacy, prefill, response display, and validation';

  @override
  String get hostFormMoveToSection => 'Move to section';

  @override
  String get hostFormSectionActions => 'Section actions';

  @override
  String get hostFormEditSection => 'Edit section';

  @override
  String hostFormQuestionSummary({
    required String type,
    required String requirement,
  }) {
    return '$type · $requirement';
  }

  @override
  String get hostFormRequiredShort => 'Required';

  @override
  String get hostFormOptionalShort => 'Optional';

  @override
  String get hostFormAvailabilityAlwaysOpen =>
      'Accepting responses until you close it';

  @override
  String hostFormAvailabilityOpens({required String date}) {
    return 'Opens $date';
  }

  @override
  String hostFormAvailabilityCloses({required String date}) {
    return 'Closes $date';
  }

  @override
  String get hostFormReviewPublish => 'Review & publish';

  @override
  String get hostFormReviewPublishChanges => 'Review & publish changes';

  @override
  String get hostFormReviewPublishTitle => 'Review before publishing';

  @override
  String get hostFormReviewChangesTitle => 'Review your changes';

  @override
  String get hostFormReviewPublishSubtitle =>
      'Check the respondent experience and the essentials that control who can respond.';

  @override
  String get hostFormChooseQuestionTypeHelp =>
      'Start with the answer shape you need. You can adjust the details next.';

  @override
  String get hostFormRecommendedQuestionTypes => 'Recommended';

  @override
  String get hostFormMoreQuestionTypes => 'More answer types';

  @override
  String get hostFormPreview => 'Preview';

  @override
  String get hostFormPreviewSubtitle =>
      'Preview the questions and their order. Sign-in, uploads, signatures and confirmation are not included.';

  @override
  String get hostFormPreviewSubmitDisabled => 'Preview only';

  @override
  String get hostFormSubmit => 'Submit response';

  @override
  String get hostFormPreviewNoResponses =>
      'Preview mode · nothing entered here is saved';

  @override
  String get hostFormPreviewUploadPlaceholder => 'File upload appears here';

  @override
  String get hostFormPreviewSignaturePlaceholder => 'Signature appears here';

  @override
  String get hostFormPublish => 'Publish form';

  @override
  String get hostFormPublishChanges => 'Publish changes';

  @override
  String get hostFormPublished => 'Form published';

  @override
  String get hostFormShare => 'Share form';

  @override
  String get hostFormCanonicalLink => 'Public link';

  @override
  String get hostFormCanonicalLinkHelp =>
      'Respondents open this in any browser. They do not need the Catch app.';

  @override
  String get hostFormCopyLink => 'Copy link';

  @override
  String get hostFormLinkCopied => 'Form link copied';

  @override
  String get hostFormShareLink => 'Share link';

  @override
  String get hostFormCreateTrackedLink => 'Create tracked link';

  @override
  String get hostFormTrackedLinkTitle => 'New tracked link';

  @override
  String get hostFormTrackedLinkLabel => 'Internal label';

  @override
  String get hostFormTrackedLinkLabelHint => 'August Instagram story';

  @override
  String get hostFormTrackedLinkSource => 'Source tag (optional)';

  @override
  String get hostFormTrackedLinkSourceHint => 'instagram_story';

  @override
  String get hostFormTrackedLinkReady => 'Tracked link ready';

  @override
  String get hostFormEmbed => 'Embed on your website';

  @override
  String get hostFormEmbedHelp =>
      'Paste this iframe into your website builder. The embedded route keeps the same validation and submission controls.';

  @override
  String get hostFormCopyEmbed => 'Copy embed code';

  @override
  String get hostFormEmbedCopied => 'Embed code copied';

  @override
  String get hostFormCreate => 'Create';

  @override
  String get hostFormSettings => 'Form settings';

  @override
  String get hostFormTitleLabel => 'Form title';

  @override
  String get hostFormDescriptionLabel => 'Description';

  @override
  String get hostFormPurposeLabel => 'Purpose';

  @override
  String get hostFormIdentityLabel => 'Who can respond';

  @override
  String get hostFormIdentityAnonymous => 'Anyone · anonymous allowed';

  @override
  String get hostFormIdentityEmail => 'Verified email required';

  @override
  String get hostFormIdentityPhone => 'Verified phone required';

  @override
  String get hostFormIdentityEmailOrPhone => 'Verified email or phone';

  @override
  String get hostFormIdentityCatchAccount => 'Catch account required';

  @override
  String get hostFormCompletionTitleLabel => 'Confirmation title';

  @override
  String get hostFormAddSection => 'Add section';

  @override
  String hostFormSectionNumber({required int number}) {
    return 'Section $number';
  }

  @override
  String get hostFormSectionTitleLabel => 'Section title';

  @override
  String get hostFormAddQuestion => 'Add question';

  @override
  String get hostFormMoveSectionUp => 'Move section up';

  @override
  String get hostFormMoveSectionDown => 'Move section down';

  @override
  String get hostFormRemoveSection => 'Remove section';

  @override
  String get hostFormQuestionLabel => 'Question';

  @override
  String get hostFormQuestionType => 'Answer type';

  @override
  String get hostFormQuestionRequired => 'Response required';

  @override
  String hostFormOptionNumber({required int number}) {
    return 'Option $number';
  }

  @override
  String get hostFormAddOption => 'Add option';

  @override
  String get hostFormMoveUp => 'Move up';

  @override
  String get hostFormMoveDown => 'Move down';

  @override
  String get hostFormRemoveQuestion => 'Remove question';

  @override
  String get hostFormChooseQuestionType => 'Choose an answer type';

  @override
  String get hostFormOutline => 'Outline';

  @override
  String hostFormQuestionCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count questions',
      one: '1 question',
      zero: 'No questions',
    );
    return '$_temp0';
  }

  @override
  String get hostFormSaved => 'Saved';

  @override
  String get hostFormUnsaved => 'Unsaved changes';

  @override
  String get hostFormSaving => 'Saving…';

  @override
  String get hostFormSaveConflict => 'Newer version available';

  @override
  String get hostFormSaveFailed => 'Form could not be saved';

  @override
  String get hostFormConflictTitle => 'This form changed elsewhere';

  @override
  String get hostFormConflictBody =>
      'Reload the newest revision before making more changes.';

  @override
  String get hostFormReload => 'Reload form';

  @override
  String get hostFormRetrySave => 'Retry save';

  @override
  String hostFormValidationTitle({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Fix $count form issues',
      one: 'Fix 1 form issue',
    );
    return '$_temp0';
  }

  @override
  String get hostFormTypeShortText => 'Short text';

  @override
  String get hostFormTypeLongText => 'Long text';

  @override
  String get hostFormTypeSingleChoice => 'Single choice';

  @override
  String get hostFormTypeMultiChoice => 'Multiple choice';

  @override
  String get hostFormTypeDate => 'Date';

  @override
  String get hostFormTypePhone => 'Phone number';

  @override
  String get hostFormTypeEmail => 'Email address';

  @override
  String get hostFormTypeUrl => 'Website link';

  @override
  String get hostFormTypeNumber => 'Number';

  @override
  String get hostFormTypeBoolean => 'Yes or no';

  @override
  String get hostFormTypeFile => 'File upload';

  @override
  String get hostFormTypeAcknowledgement => 'Acknowledgement';

  @override
  String get hostFormTypeSignature => 'Signature';

  @override
  String get hostFormQuestionHelpLabel => 'Help text';

  @override
  String get hostFormPrivacyLabel => 'Data classification';

  @override
  String get hostFormPrivacyContact => 'Contact information';

  @override
  String get hostFormPrivacyProfile => 'Profile information';

  @override
  String get hostFormPrivacySensitive => 'Sensitive information';

  @override
  String get hostFormPrivacyCustom => 'Organizer-specific answer';

  @override
  String get hostFormPrefillLabel => 'Prefill behavior';

  @override
  String get hostFormPrefillNever => 'Never prefill';

  @override
  String get hostFormPrefillReview => 'Prefill, then require review';

  @override
  String get hostFormPresentationLabel => 'Host response view';

  @override
  String get hostFormPresentationDetail => 'Response detail only';

  @override
  String get hostFormPresentationFilter => 'Filterable column';

  @override
  String get hostFormPresentationSort => 'Sortable column';

  @override
  String get hostFormMinimumLength => 'Minimum characters';

  @override
  String get hostFormMaximumLength => 'Maximum characters';

  @override
  String get hostFormMinimumNumber => 'Minimum value';

  @override
  String get hostFormMaximumNumber => 'Maximum value';

  @override
  String get hostFormEarliestDate => 'Earliest date (YYYY-MM-DD)';

  @override
  String get hostFormLatestDate => 'Latest date (YYYY-MM-DD)';

  @override
  String get hostFormMinimumSelections => 'Minimum choices';

  @override
  String get hostFormMaximumSelections => 'Maximum choices';

  @override
  String get hostFormMaximumFiles => 'Maximum files';

  @override
  String get hostFormMaximumFileMegabytes => 'Maximum size per file (MB)';

  @override
  String get hostFormAllowedFileTypes => 'Allowed types (comma separated)';

  @override
  String get hostFormPatternLabel => 'Text format';

  @override
  String get hostFormPatternNone => 'Any text';

  @override
  String get hostFormPatternLetters => 'Letters and spaces';

  @override
  String get hostFormPatternAlphanumeric => 'Letters and numbers';

  @override
  String get hostFormPatternPostal => 'Postal code';

  @override
  String get hostFormPatternHandle => 'Social handle';

  @override
  String get hostFormCustomError => 'Custom validation message';

  @override
  String get hostFormAppearance => 'Appearance';

  @override
  String get hostFormAppearancePreset => 'Layout style';

  @override
  String get hostFormAppearanceEditorial => 'Editorial';

  @override
  String get hostFormAppearanceMinimal => 'Minimal';

  @override
  String get hostFormAppearanceActivity => 'Activity-led';

  @override
  String get hostFormActivityKind => 'Activity label';

  @override
  String get hostFormAvailability => 'Availability';

  @override
  String get hostFormOpensAt => 'Opens on';

  @override
  String get hostFormClosesAt => 'Closes on';

  @override
  String get hostFormDateNotSet => 'No date set';

  @override
  String get hostFormClearDate => 'Clear date';

  @override
  String get hostFormResponseLimit => 'Response limit';

  @override
  String get hostFormClosedMessage => 'Closed-form message';

  @override
  String get hostFormConsent => 'Consent and retention';

  @override
  String get hostFormConsentCopy => 'Consent statement';

  @override
  String get hostFormConsentVersion => 'Consent version';

  @override
  String get hostFormRetentionCopy => 'Retention statement';

  @override
  String get hostFormCompletionMessageLabel => 'Confirmation message';

  @override
  String get hostFormCompletionActionLabel => 'Next action';

  @override
  String get hostFormCompletionActionNone => 'No action';

  @override
  String get hostFormCompletionActionExternal => 'Open a link';

  @override
  String get hostFormCompletionActionEvent => 'Open linked event';

  @override
  String get hostFormCompletionActionRuntime => 'Open event runtime';

  @override
  String get hostFormCompletionButtonLabel => 'Button label';

  @override
  String get hostFormCompletionUrl => 'Destination URL';

  @override
  String get hostFormLogic => 'Conditional logic';

  @override
  String get hostFormLogicHelp =>
      'Show, hide, skip, or finish based on an earlier answer. Routes must move forward.';

  @override
  String get hostFormAddRule => 'Add rule';

  @override
  String get hostFormRemoveRule => 'Remove rule';

  @override
  String get hostFormRuleQuestion => 'When this answer';

  @override
  String get hostFormRuleOperator => 'Condition';

  @override
  String get hostFormRuleValue => 'Comparison value';

  @override
  String get hostFormRuleTrue => 'Yes';

  @override
  String get hostFormRuleFalse => 'No';

  @override
  String get hostFormRuleAction => 'Then';

  @override
  String get hostFormRuleTargetQuestion => 'Target question';

  @override
  String get hostFormRuleTargetSection => 'Target section';

  @override
  String get hostFormRuleSave => 'Save rule';

  @override
  String get hostFormOperatorEquals => 'equals';

  @override
  String get hostFormOperatorNotEquals => 'does not equal';

  @override
  String get hostFormOperatorContains => 'contains';

  @override
  String get hostFormOperatorNotContains => 'does not contain';

  @override
  String get hostFormOperatorGreater => 'is greater than';

  @override
  String get hostFormOperatorLess => 'is less than';

  @override
  String get hostFormOperatorAnswered => 'is answered';

  @override
  String get hostFormOperatorNotAnswered => 'is not answered';

  @override
  String get hostFormActionShowQuestion => 'Show a question';

  @override
  String get hostFormActionHideQuestion => 'Hide a question';

  @override
  String get hostFormActionShowSection => 'Show a section';

  @override
  String get hostFormActionHideSection => 'Hide a section';

  @override
  String get hostFormActionRouteSection => 'Skip to a section';

  @override
  String get hostFormActionFinish => 'Finish the form';

  @override
  String get hostFormsViewForms => 'Forms';

  @override
  String get hostFormsViewResponses => 'Responses';

  @override
  String get hostFormResponsesSearch => 'Search responses';

  @override
  String get hostFormResponsesSubmitted => 'Submitted';

  @override
  String get hostFormResponsesWithdrawn => 'Withdrawn';

  @override
  String get hostFormResponsesAnonymous => 'Anonymous respondent';

  @override
  String get hostFormResponsesEmptyTitle => 'No responses yet';

  @override
  String get hostFormResponsesEmptyBody =>
      'Share a published form. New submissions will appear here.';

  @override
  String get hostFormResponsesNoMatchesTitle => 'No responses match';

  @override
  String get hostFormResponsesNoMatchesBody =>
      'Try another search or status filter.';

  @override
  String get hostFormResponsesLoadMore => 'Load more responses';

  @override
  String get hostFormResponseDirectSource => 'Direct link';

  @override
  String get hostFormsViewResponsesAction => 'View responses';

  @override
  String get hostFormsAnalyticsAction => 'Results';

  @override
  String get hostFormsAutomationsAction => 'Manage automations';

  @override
  String get hostFormResponseIdentitySection => 'Respondent';

  @override
  String get hostFormResponseAnswersSection => 'Answers';

  @override
  String get hostFormResponseEmail => 'Email';

  @override
  String get hostFormResponsePhone => 'Phone';

  @override
  String get hostFormResponseSource => 'Source';

  @override
  String get hostFormResponseSubmittedAt => 'Submitted';

  @override
  String get hostFormResponseConsent => 'Consent version';

  @override
  String get hostFormResponseCompletionTime => 'Completion time';

  @override
  String get hostFormResponseNotProvided => 'Not provided';

  @override
  String get hostFormResponseNoAnswer => 'No answer';

  @override
  String hostFormResponseDownloadFile({required String fileName}) {
    return 'Open $fileName';
  }

  @override
  String get hostFormConvertCrm => 'Add to People';

  @override
  String get hostFormConversionReviewTitle => 'Review this action';

  @override
  String get hostFormConversionReviewBody =>
      'Catch will create only the fields shown in this preview. Existing records and conflicts remain protected.';

  @override
  String get hostFormConversionConfirm => 'Confirm action';

  @override
  String get hostFormConversionUnavailable =>
      'This action needs verified identity or additional setup.';

  @override
  String get hostFormConversionComplete => 'Action completed';

  @override
  String get hostFormAnalyticsTitle => 'Results';

  @override
  String get hostFormAnalyticsOpens => 'Opens';

  @override
  String get hostFormAnalyticsStarts => 'Starts';

  @override
  String get hostFormAnalyticsSubmissions => 'Submissions';

  @override
  String get hostFormAnalyticsCompletionRate => 'Completion rate';

  @override
  String get hostFormAnalyticsSources => 'Sources';

  @override
  String get hostFormAnalyticsPrivacyNotice =>
      'Question results appear only when the privacy threshold is met. Sensitive and free-text answers are never charted.';

  @override
  String get hostFormExportCsv => 'Export CSV';

  @override
  String get hostFormExportXlsx => 'Export Excel';

  @override
  String get hostFormExportReady => 'Export ready';

  @override
  String get hostFormAutomationsTitle => 'Automations';

  @override
  String get hostFormAutomationsRules => 'Rules';

  @override
  String get hostFormAutomationsRuns => 'Recent runs';

  @override
  String get hostFormAutomationsEmptyTitle => 'No automations yet';

  @override
  String get hostFormAutomationsEmptyBody =>
      'Create a rule for future activity. Review its actions, enable it when ready, and follow each run here.';

  @override
  String get hostFormAutomationNotifyPreset => 'Notify my team';

  @override
  String get hostFormAutomationCrmPreset => 'Add to People';

  @override
  String get hostFormAutomationSubmittedTrigger =>
      'When a response is submitted';

  @override
  String get hostFormAutomationWithdrawnTrigger =>
      'When a response is withdrawn';

  @override
  String get hostFormAutomationAnswerTrigger => 'When an answer matches';

  @override
  String hostFormAutomationRunSummary({
    required String trigger,
    required int attempt,
  }) {
    return '$trigger · Attempt $attempt';
  }

  @override
  String get hostFormAutomationsLoadMore => 'Load more runs';

  @override
  String get hostFormResponseOriginAnonymous => 'Anonymous';

  @override
  String get hostFormResponseOriginGranted => 'Shared by respondent';

  @override
  String get hostFormResponseOriginAcquired => 'Organizer record';

  @override
  String get hostFormResponseOriginRevoked => 'Access revoked';

  @override
  String get hostFormConversionExisting =>
      'An existing record already matches this response.';

  @override
  String hostFormAnalyticsSourceSummary({
    required int opens,
    required int starts,
    required int submissions,
  }) {
    String _temp0 = intl.Intl.pluralLogic(
      opens,
      locale: localeName,
      other: '$opens opens',
      one: '1 open',
    );
    String _temp1 = intl.Intl.pluralLogic(
      starts,
      locale: localeName,
      other: '$starts starts',
      one: '1 start',
    );
    String _temp2 = intl.Intl.pluralLogic(
      submissions,
      locale: localeName,
      other: '$submissions submissions',
      one: '1 submission',
    );
    return '$_temp0 · $_temp1 · $_temp2';
  }

  @override
  String hostFormAnalyticsQuestionSummary({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count answers',
      one: '1 answer',
    );
    return '$_temp0';
  }

  @override
  String get hostFormExportFailed =>
      'The export could not be prepared. Try again.';

  @override
  String get hostFormExportStillPreparing =>
      'The export is still preparing. You can retry without creating a duplicate.';

  @override
  String get hostFormAutomationPending => 'Pending';

  @override
  String get hostFormAutomationRunning => 'Running';

  @override
  String get hostFormAutomationSucceeded => 'Succeeded';

  @override
  String get hostFormAutomationPartiallyFailed => 'Needs attention';

  @override
  String get hostFormAutomationFailed => 'Failed';

  @override
  String get hostFormAutomationSkipped => 'Skipped';

  @override
  String get hostFormUndo => 'Undo last edit';

  @override
  String get hostFormRedo => 'Redo edit';

  @override
  String get hostsWizardPrevious => 'Previous';

  @override
  String get hostsWizardStatusComplete => 'Complete';

  @override
  String get hostsWizardStatusNeedsInformation => 'Needs information';

  @override
  String get hostsWizardStatusOptional => 'Optional';

  @override
  String get hostsWizardOverviewSubtitle =>
      'Open any section and finish the required details in any order.';

  @override
  String get hostsCreateEventOverviewTitle => 'Event setup';

  @override
  String get hostsCreateEventReviewActivity => 'Event';

  @override
  String get hostsCreateEventReviewBooking => 'Bookings';

  @override
  String get hostsCreateEventReviewCatchBookings => 'Catch bookings';

  @override
  String hostsCreateEventReviewExternalBookings({required String provider}) {
    return 'External provider: $provider';
  }

  @override
  String get hostsCreateEventReviewLocation => 'Meeting location';

  @override
  String get hostsCreateEventReviewSchedule => 'Schedule';

  @override
  String get hostsCreateEventReviewCapacity => 'Capacity';

  @override
  String hostsCreateEventReviewCapacityValue({required int count}) {
    return '$count attendees';
  }

  @override
  String get hostsCreateEventReviewPrice => 'Price';

  @override
  String get hostsCreateEventReviewExternalPrice =>
      'Managed by the external provider';

  @override
  String get hostsCreateEventReviewFree => 'Free';

  @override
  String get hostsCreateEventReviewAdmission => 'Admission';

  @override
  String get hostsCreateClubOverviewTitle => 'Organizer setup';

  @override
  String get hostsWizardReviewBody =>
      'Review every section before publishing. Select a row to make changes.';

  @override
  String get hostsCreateEventReviewTitle => 'Review event';

  @override
  String get hostsCreateClubReviewTitle => 'Review organizer';

  @override
  String get hostsCreateClubCreateAction => 'Create organizer';

  @override
  String get hostsDraftExitTitle => 'Save your work?';

  @override
  String get hostsDraftExitMessage => 'Save this as a draft before you exit?';

  @override
  String get hostsDraftExitKeepEditing => 'Keep editing';

  @override
  String get hostsDraftExitDiscardAndExit => 'Discard & exit';

  @override
  String get hostsDraftExitSaveAndExit => 'Save draft & exit';

  @override
  String hostsWizardStepOverviewSemantics({
    required int step,
    required int total,
  }) {
    return 'Step $step of $total. Open section overview.';
  }

  @override
  String get hostEventRehearsalEntryTitle => 'Run a dress rehearsal';

  @override
  String get hostEventRehearsalEntryBody =>
      'Practice the Host and guest experience with synthetic people. Nothing touches a real event.';

  @override
  String get hostEventRehearsalTitle => 'Dress rehearsal';

  @override
  String get hostEventRehearsalManageSubtitle => 'Host · Manage';

  @override
  String get hostEventRehearsalBadge => 'Rehearsal';

  @override
  String get hostEventRehearsalSyntheticGuests => 'Practice guests';

  @override
  String get hostEventRehearsalPracticeGuest => 'Practice guest';

  @override
  String get hostEventRehearsalLatePracticeGuest =>
      'Late arrival · Practice guest';

  @override
  String hostEventRehearsalClockPill({required String time}) {
    return 'Virtual $time';
  }

  @override
  String get hostEventRehearsalPracticeTools => 'Practice tools';

  @override
  String get hostEventRehearsalPracticeToolsBody =>
      'Control synthetic guests, the companion phone, faults, time, and deterministic replays.';

  @override
  String get hostEventRehearsalRunSheetBody =>
      'Change only the simulated clock and rehearsal lifecycle.';

  @override
  String hostEventRehearsalCoachProgress({
    required int current,
    required int total,
  }) {
    return 'Task $current of $total';
  }

  @override
  String get hostEventRehearsalCoachWhy => 'Why?';

  @override
  String get hostEventRehearsalCoachGotIt => 'Got it';

  @override
  String get hostEventRehearsalCoachCollapsed =>
      'Coach is ready when you need the next practice task.';

  @override
  String get hostEventRehearsalCoachShow => 'Show Coach';

  @override
  String hostEventRehearsalCoachResolveLate({required String name}) {
    return 'Resolve $name\'s late arrival';
  }

  @override
  String hostEventRehearsalCoachPlaceGuest({required String name}) {
    return 'Place $name in the current round';
  }

  @override
  String get hostEventRehearsalCoachPlaceGuestBody =>
      'Use the same Room control you will use on event day.';

  @override
  String hostEventRehearsalCoachResolveHelp({required String name}) {
    return 'Resolve $name\'s help request';
  }

  @override
  String get hostEventRehearsalCoachSameControl =>
      'Use the same control you will use on event day.';

  @override
  String get hostEventRehearsalCoachStart => 'Start the virtual event';

  @override
  String get hostEventRehearsalCoachStartBody =>
      'Open the virtual clock to start, then operate the real Host runtime.';

  @override
  String get hostEventRehearsalCoachResume => 'Resume the virtual event';

  @override
  String get hostEventRehearsalCoachAdvance => 'Run the current Host step';

  @override
  String get hostEventRehearsalCoachComplete => 'Review your rehearsal';

  @override
  String get hostEventRehearsalCoachCompleteBody =>
      'Open Practice tools to replay, fork, or export the deterministic run.';

  @override
  String get hostEventRehearsalCoachWhyTitle => 'Why this task?';

  @override
  String get hostEventRehearsalCoachWhyBody =>
      'The Coach highlights a real Host control, but synthetic state proves the outcome. Dismissing guidance never completes a task.';

  @override
  String get hostEventRehearsalLeaveTitle => 'Leave rehearsal?';

  @override
  String get hostEventRehearsalLeaveBody =>
      'Your practice session stays available until it expires.';

  @override
  String get hostEventRehearsalLeaveAction => 'Leave rehearsal';

  @override
  String get hostEventRehearsalScenario => 'Practice scenario';

  @override
  String hostEventRehearsalActorCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count synthetic guests',
      one: '1 synthetic guest',
    );
    return '$_temp0';
  }

  @override
  String get hostEventRehearsalScenarioSmoothRun => 'Normal flow';

  @override
  String get hostEventRehearsalScenarioSmoothRunBody => 'No added disruptions.';

  @override
  String get hostEventRehearsalScenarioLateAndNoShow =>
      'Late arrivals and no-shows';

  @override
  String get hostEventRehearsalScenarioLateAndNoShowBody =>
      'Recover when expected guests are missing or arrive after groups begin.';

  @override
  String get hostEventRehearsalScenarioEarlyExitAndReturn =>
      'Someone leaves and returns';

  @override
  String get hostEventRehearsalScenarioEarlyExitAndReturnBody =>
      'Rebalance when a guest leaves early and another returns later.';

  @override
  String get hostEventRehearsalScenarioRosterAndCapacity => 'An uneven room';

  @override
  String get hostEventRehearsalScenarioRosterAndCapacityBody =>
      'Expose odd-sized groups, tight capacity, and unassigned guests.';

  @override
  String get hostEventRehearsalScenarioWalkInAndAmbiguousClaim =>
      'Walk-ins and identity checks';

  @override
  String get hostEventRehearsalScenarioWalkInAndAmbiguousClaimBody =>
      'Admit a walk-in and resolve two similar roster identities.';

  @override
  String get hostEventRehearsalScenarioPrivacyAndKeepApart =>
      'Privacy and seating boundaries';

  @override
  String get hostEventRehearsalScenarioPrivacyAndKeepApartBody =>
      'Respect an opt-out and a safety keep-apart constraint while preserving flow.';

  @override
  String get hostEventRehearsalScenarioLowConnectivity =>
      'A guest loses connection';

  @override
  String get hostEventRehearsalScenarioLowConnectivityBody =>
      'Continue through disconnects, delayed updates, and reconnection.';

  @override
  String get hostEventRehearsalScenarioConcurrentHosts =>
      'Two hosts working together';

  @override
  String get hostEventRehearsalScenarioConcurrentHostsBody =>
      'See how stale Host actions are rejected and recovered safely.';

  @override
  String get hostEventRehearsalScenarioRevealInterrupted =>
      'A reveal is interrupted';

  @override
  String get hostEventRehearsalScenarioRevealInterruptedBody =>
      'Pause and recover around a reveal or round transition.';

  @override
  String get hostEventRehearsalScenarioExternalProfiles =>
      'An incomplete guest profile';

  @override
  String get hostEventRehearsalScenarioExternalProfilesBody =>
      'Exercise no-download guests and deliberately sparse participant data.';

  @override
  String get hostEventRehearsalScenarioAccountabilitySweep =>
      'Account for everyone';

  @override
  String get hostEventRehearsalScenarioAccountabilitySweepBody =>
      'Finish with unresolved checked-in, departed, and disconnected guests.';

  @override
  String get hostEventRehearsalGuestLinkTitle => 'Live guest phone';

  @override
  String get hostEventRehearsalGuestLinkBody =>
      'Open this link on another phone. It gets an anonymous synthetic guest and follows the virtual event live.';

  @override
  String get hostEventRehearsalCopyLink => 'Copy link';

  @override
  String get hostEventRehearsalShareLink => 'Share link';

  @override
  String get hostEventRehearsalRotateLink => 'Replace link';

  @override
  String get hostEventRehearsalSetupTitle => 'Practice setup';

  @override
  String get hostEventRehearsalSetupFrozen =>
      'Setup is frozen after Start. Reset or fork to change it.';

  @override
  String get hostEventRehearsalFieldTitle => 'Practice event name';

  @override
  String get hostEventRehearsalFieldLocation => 'Practice location';

  @override
  String get hostEventRehearsalFieldGoal => 'Host goal';

  @override
  String get hostEventRehearsalFieldPrompt => 'Guest prompt';

  @override
  String get hostEventRehearsalRunTitle => 'Virtual event';

  @override
  String get hostEventRehearsalStart => 'Start';

  @override
  String get hostEventRehearsalPause => 'Pause';

  @override
  String get hostEventRehearsalResume => 'Resume';

  @override
  String get hostEventRehearsalPrevious => 'Previous';

  @override
  String get hostEventRehearsalNext => 'Next moment';

  @override
  String get hostEventRehearsalAdvanceFive => '+5 min';

  @override
  String get hostEventRehearsalAdvanceFifteen => '+15 min';

  @override
  String get hostEventRehearsalComplete => 'Complete run';

  @override
  String get hostEventRehearsalSimulationTitle => 'Issue simulator';

  @override
  String get hostEventRehearsalSimulationBody =>
      'Choose a synthetic guest, then inject a realistic behavior. Automatic scenario cues also fire when the virtual clock crosses them.';

  @override
  String get hostEventRehearsalSimulationUnavailable =>
      'Start the virtual event to inject guest behavior. Completed runs can be reset or forked.';

  @override
  String get hostEventRehearsalChooseGuest => 'Synthetic guest';

  @override
  String get hostEventRehearsalChooseIssue => 'Inject issue';

  @override
  String get hostEventRehearsalRosterTitle => 'Synthetic room';

  @override
  String hostEventRehearsalRoomSummary({
    required int present,
    required int total,
    required int unresolved,
  }) {
    return '$present present · $total expected · $unresolved unresolved';
  }

  @override
  String get hostEventRehearsalQaFaultsTitle => 'Internal QA faults';

  @override
  String get hostEventRehearsalQaFaultsBody =>
      'Inject transport, revision, duplicate-delivery, legacy, motion, and bandwidth failures without touching production entities.';

  @override
  String get hostEventRehearsalRecapTitle => 'Practice recap';

  @override
  String hostEventRehearsalRecapBody({
    required int actions,
    required int seed,
    required int revision,
  }) {
    return '$actions actions recorded · seed $seed · revision $revision';
  }

  @override
  String get hostEventRehearsalReset => 'Reset run';

  @override
  String get hostEventRehearsalFork => 'Fork setup';

  @override
  String get hostEventRehearsalExport => 'Copy reproduction';

  @override
  String get hostEventRehearsalRecentActions => 'Recent simulated actions';

  @override
  String get hostEventRehearsalBehaviorArrive => 'Arrives now';

  @override
  String get hostEventRehearsalBehaviorArriveLate => 'Arrives late';

  @override
  String get hostEventRehearsalBehaviorNoShow => 'Becomes a no-show';

  @override
  String get hostEventRehearsalBehaviorLeaves => 'Leaves early';

  @override
  String get hostEventRehearsalBehaviorReturns => 'Returns';

  @override
  String get hostEventRehearsalBehaviorWalkIn => 'Walks in';

  @override
  String get hostEventRehearsalBehaviorAmbiguous => 'Claims an ambiguous name';

  @override
  String get hostEventRehearsalBehaviorResolve => 'Resolve claim';

  @override
  String get hostEventRehearsalBehaviorOptOut => 'Opts out';

  @override
  String get hostEventRehearsalBehaviorOptIn => 'Opts back in';

  @override
  String get hostEventRehearsalBehaviorKeepApart => 'Adds keep-apart';

  @override
  String get hostEventRehearsalBehaviorDisconnect => 'Loses connection';

  @override
  String get hostEventRehearsalBehaviorReconnect => 'Reconnects';

  @override
  String get hostEventRehearsalFaultNone => 'No injected fault';

  @override
  String get hostEventRehearsalFaultLatency => 'Artificial latency';

  @override
  String get hostEventRehearsalFaultOneShot => 'One-shot failure';

  @override
  String get hostEventRehearsalFaultDisconnect => 'Listener disconnect';

  @override
  String get hostEventRehearsalFaultStaleRevision => 'Stale revision';

  @override
  String get hostEventRehearsalFaultDuplicate => 'Duplicate delivery';

  @override
  String get hostEventRehearsalFaultLegacy => 'Legacy fixture';

  @override
  String get hostEventRehearsalFaultReducedMotion => 'Reduced motion';

  @override
  String get hostEventRehearsalFaultLowBandwidth => 'Low bandwidth';

  @override
  String get hostEventRehearsalStatusExpected => 'Expected';

  @override
  String get hostEventRehearsalStatusPresent => 'Present';

  @override
  String get hostEventRehearsalStatusLate => 'Late';

  @override
  String get hostEventRehearsalStatusNoShow => 'No-show';

  @override
  String get hostEventRehearsalStatusDeparted => 'Departed';

  @override
  String get hostEventRehearsalStatusReturned => 'Returned';

  @override
  String get hostEventRehearsalStatusDisconnected => 'Disconnected';

  @override
  String get hostEventRehearsalStatusWalkIn => 'Walk-in';

  @override
  String get hostEventRehearsalStatusAmbiguous => 'Claim needs review';

  @override
  String get hostEventRehearsalSignalHelp => 'Help requested';

  @override
  String get hostEventRehearsalSignalPromptComplete => 'Prompt complete';

  @override
  String get hostEventRehearsalModules => 'Event Success playbook';

  @override
  String get hostEventRehearsalModuleArrival => 'Arrival';

  @override
  String get hostEventRehearsalModuleFirstHello => 'First Hello';

  @override
  String get hostEventRehearsalModulePods => 'Pods';

  @override
  String get hostEventRehearsalModuleRotations => 'Rotations';

  @override
  String get hostEventRehearsalModuleCues => 'Conversation cues';

  @override
  String get hostEventRehearsalModuleReveal => 'Reveal';

  @override
  String get hostEventRehearsalModuleAfterglow => 'Afterglow';

  @override
  String get hostEventRehearsalModuleAccountability => 'Accountability';

  @override
  String get hostEventRehearsalDuration => 'Practice duration';

  @override
  String hostEventRehearsalMoment({required int current, required int total}) {
    return 'Moment $current of $total';
  }

  @override
  String hostEventRehearsalClock({required String time}) {
    return 'Virtual time · $time';
  }

  @override
  String get hostEventRehearsalApplyIssue => 'Apply issue';

  @override
  String get hostEventRehearsalChooseFault => 'Injected fault';

  @override
  String get hostEventRehearsalLinkCopied => 'Practice guest link copied';

  @override
  String get hostEventRehearsalRotateLinkBody =>
      'The current link and every connected practice phone will stop working.';

  @override
  String get hostEventRehearsalResetBody =>
      'This clears the simulated room and action history, then rebuilds the same deterministic roster.';

  @override
  String get hostEventRehearsalReproductionCopied =>
      'Deterministic reproduction copied';

  @override
  String get hostEventRehearsalActionMarkReady => 'Marks room ready';

  @override
  String get hostEventRehearsalActionAdvance => 'Advances moment';

  @override
  String get hostEventRehearsalActionPrevious => 'Returns to previous moment';

  @override
  String get hostEventRehearsalActionAdvanceClock => 'Advances virtual time';

  @override
  String get hostEventRehearsalActionCheckIn => 'Checks in';

  @override
  String get hostEventRehearsalActionConfirmArrival => 'Confirms arrival';

  @override
  String get hostEventRehearsalActionAskForHelp => 'Requests Host help';

  @override
  String get hostEventRehearsalActionCompletePrompt => 'Completes prompt';

  @override
  String get hostEventRehearsalActionUnknown => 'Simulated action';

  @override
  String get hostEventRehearsalActionKindControl => 'Host control';

  @override
  String get hostEventRehearsalActionKindBehavior => 'Simulated issue';

  @override
  String get hostEventRehearsalActionKindGuest => 'Guest phone';

  @override
  String get hostEventRehearsalActionKindSetup => 'Practice setup';

  @override
  String get hostEventRehearsalActionKindSystem => 'Practice system';

  @override
  String hostEventRehearsalActionRevision({
    required String kind,
    required int revision,
  }) {
    return '$kind · revision $revision';
  }

  @override
  String get hostsRoutePathBuilderTitle => 'Build route';

  @override
  String hostsRoutePathBuilderPoint({required int index}) {
    return 'Route point $index';
  }

  @override
  String get hostsRoutePathBuilderEmpty =>
      'Tap the map to add the first route point.';

  @override
  String hostsRoutePathBuilderCount({required int count}) {
    return '$count route points · tap the map to keep drawing';
  }

  @override
  String get hostsRoutePathBuilderUndo => 'Undo point';

  @override
  String get hostsRoutePathBuilderClear => 'Clear';

  @override
  String get hostsRoutePathBuilderSave => 'Use this route';

  @override
  String get hostsRouteEventPlanPathTitle => 'Route path';

  @override
  String get hostsRouteEventPlanPathEmpty =>
      'Draw the attendee-facing path on the map.';

  @override
  String hostsRouteEventPlanPathCount({required int count}) {
    return '$count mapped points';
  }

  @override
  String get hostsRouteEventPlanPathAction => 'Edit map';

  @override
  String get hostsRouteEventPlanPaceGroupsTitle => 'Pace groups';

  @override
  String get hostsRouteEventPlanPaceGroupsBody =>
      'Select every group the Host will lead and account for.';

  @override
  String get hostsRouteEventPlanPaceSocial => 'Social · 7:30/km';

  @override
  String get hostsRouteEventPlanPaceSteady => 'Steady · 6:00/km';

  @override
  String get hostsRouteEventPlanPaceFast => 'Fast · 5:00/km';

  @override
  String get hostsRouteEventPlanTrackingTitle => 'Live Host position';

  @override
  String get hostsRouteEventPlanTrackingBody =>
      'Foreground-only sharing during the event helps late arrivals find the moving group.';

  @override
  String get hostsRouteEventPlanTrackingDisabled => 'Off';

  @override
  String get hostsRouteEventPlanTrackingHostOnly => 'Host only';

  @override
  String get hostsRouteEventPlanTrackingOperators =>
      'Host and authorized operators';

  @override
  String get hostsEventItineraryTitle => 'Run of show';

  @override
  String hostsEventItineraryOffset({required int minutes}) {
    return 'Starts $minutes minutes after the event begins';
  }

  @override
  String get hostsEventItineraryEdit => 'Edit';

  @override
  String get hostsEventItineraryAdd => 'Add itinerary step';

  @override
  String get hostsEventItineraryAddBody =>
      'Publish real timing, stops, transitions, and locations for attendees.';

  @override
  String get hostsEventItineraryAddAction => 'Add step';

  @override
  String get hostsEventItineraryDialogAdd => 'Add run-of-show step';

  @override
  String get hostsEventItineraryDialogEdit => 'Edit run-of-show step';

  @override
  String get hostsEventItineraryDelete => 'Delete';

  @override
  String get hostsEventItinerarySave => 'Save step';

  @override
  String get hostsEventItineraryFieldTitle => 'Step title';

  @override
  String get hostsEventItineraryFieldTitleHint =>
      'Gather, activity, stop, or finish';

  @override
  String get hostsEventItineraryFieldOffset => 'Minutes after start';

  @override
  String get hostsEventItineraryFieldDuration => 'Duration in minutes';

  @override
  String get hostsEventItineraryFieldDescription => 'Attendee guidance';

  @override
  String get hostsEventItineraryFieldKind => 'Step type';

  @override
  String get hostsEventItineraryUseMeetingPoint =>
      'Use the event meeting point';

  @override
  String get hostsEventItineraryLocationTitle => 'Stop location';

  @override
  String get hostsEventItineraryLocationEmpty => 'No exact location';

  @override
  String get hostsEventItineraryLocationChoose => 'Choose';

  @override
  String get hostsEventItineraryLocationChange => 'Change';

  @override
  String get hostsEventItineraryLocationRemove => 'Remove stop location';

  @override
  String get hostsEventItineraryKindGather => 'Gather';

  @override
  String get hostsEventItineraryKindActivity => 'Activity';

  @override
  String get hostsEventItineraryKindStop => 'Stop';

  @override
  String get hostsEventItineraryKindBreak => 'Break';

  @override
  String get hostsEventItineraryKindTransition => 'Transition';

  @override
  String get hostsEventItineraryKindFinish => 'Finish';

  @override
  String get hostEventLiveLocationTitle => 'Share the moving group';

  @override
  String get hostEventLiveLocationBody =>
      'Use this phone\'s location so late arrivals can find the route lead.';

  @override
  String get hostEventLiveLocationPrivacy =>
      'Off by default. Sharing runs only while Catch is in the foreground.';

  @override
  String get hostEventLiveLocationActive =>
      'Live now. Leaving the app or switching this off removes your position.';

  @override
  String get hostEventLiveLocationPermissionDenied =>
      'Location permission is required to share the moving group.';

  @override
  String get hostEventLiveLocationServicesDisabled =>
      'Turn on device location services, then try again.';

  @override
  String get hostEventLiveLocationFailed =>
      'Live location could not be updated. Switch it off and try again.';

  @override
  String get hostEventRehearsalMovementTitle => 'Movement simulation';

  @override
  String hostEventRehearsalMovementSummary({
    required int itineraryCount,
    required int routePointCount,
    required int positionCount,
  }) {
    return '$itineraryCount itinerary steps · $routePointCount route points · $positionCount synthetic live positions';
  }

  @override
  String get hostCustomersSelectCustomerTitle => 'Select a customer';

  @override
  String get hostCustomersSelectCustomerBody =>
      'Choose someone from the directory to keep their details beside the list.';

  @override
  String get hostInboxSelectConversationTitle => 'Select a conversation';

  @override
  String get hostInboxSelectConversationBody =>
      'Choose a thread to keep the conversation beside your inbox.';

  @override
  String get eventSuccessRoomSetupLoadingTitle => 'Loading room layouts';

  @override
  String get eventSuccessRoomSetupLoadingBody =>
      'Your reusable layouts will appear here.';

  @override
  String get eventSuccessLiveWorkspaceNow => 'Now';

  @override
  String get eventSuccessLiveWorkspaceGuests => 'Guests';

  @override
  String get eventSuccessLiveWorkspaceRoom => 'Room';

  @override
  String get eventSuccessHostResourceRoomLayout => 'room layout';

  @override
  String get eventSuccessRoomWorkspaceWholeGroupTitle => 'One shared room';

  @override
  String get eventSuccessRoomWorkspaceWholeGroupBody =>
      'This format runs as one group, so it does not need assigned tables or zones.';

  @override
  String get eventSuccessRoomWorkspaceUnconfiguredTitle =>
      'Room layout not configured';

  @override
  String get eventSuccessRoomWorkspaceUnconfiguredBody =>
      'Choose or create a room layout in Preparation before the event starts. Live controls remain available in Now.';

  @override
  String get eventSuccessRoomWorkspaceLoadingTitle => 'Opening the room map';

  @override
  String get eventSuccessRoomWorkspaceLoadingBody =>
      'Loading placements and room geometry.';

  @override
  String get eventSuccessRoomWorkspaceWaitingTitle => 'Waiting for placements';

  @override
  String get eventSuccessRoomWorkspaceWaitingBody =>
      'The saved room is ready. Placements appear here after the event guide generates groups or rotations.';

  @override
  String eventSuccessRoomWorkspaceCapacitySummary({
    required String units,
    required int seats,
  }) {
    return '$units · $seats seats';
  }

  @override
  String eventSuccessRoomWorkspaceTableCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count tables',
      one: '1 table',
    );
    return '$_temp0';
  }

  @override
  String eventSuccessRoomWorkspaceRowCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count rows',
      one: '1 row',
    );
    return '$_temp0';
  }

  @override
  String eventSuccessRoomWorkspaceCourtCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count courts',
      one: '1 court',
    );
    return '$_temp0';
  }

  @override
  String eventSuccessRoomWorkspaceZoneCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count zones',
      one: '1 zone',
    );
    return '$_temp0';
  }

  @override
  String eventSuccessRoomWorkspaceAreaCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count areas',
      one: '1 area',
    );
    return '$_temp0';
  }

  @override
  String get eventSuccessRoomWorkspacePlaced => 'Placed';

  @override
  String get eventSuccessRoomWorkspaceUnconfirmed => 'Unconfirmed';

  @override
  String get eventSuccessRoomWorkspaceNeedsAttention => 'Needs attention';

  @override
  String get hostCustomersDetails => 'Details';

  @override
  String get hostCustomersContactMethods => 'Contact methods';

  @override
  String get hostCustomersSubmittedInformation => 'Form responses';

  @override
  String get hostCustomersNoSubmittedInformation =>
      'No form responses recorded.';

  @override
  String hostCustomersViewAnswers({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count answers',
      one: '1 answer',
    );
    return 'View $_temp0';
  }

  @override
  String get hostCustomersNoApplications =>
      'No applications are linked to this customer.';

  @override
  String get hostCustomersLatestSubmittedDetails => 'Latest submitted details';

  @override
  String hostCustomersSubmittedOn({required String date}) {
    return 'From the application submitted $date. Open the application for all answers and their context.';
  }

  @override
  String get hostCustomersAllActivity => 'All activity';

  @override
  String get hostCustomersMessageHistory => 'Messages';

  @override
  String get hostCustomersViewBreakdown => 'View breakdown';

  @override
  String get hostCustomersSpendByEvent => 'By event';

  @override
  String get hostCustomersSharedOrder => 'Shared order';

  @override
  String get hostCustomersSpendBreakdownUnavailable =>
      'No event breakdown is available for these recorded totals.';

  @override
  String get hostCustomersOpenApplication => 'Open application';

  @override
  String get hostCustomersSubmittedAnswersUnavailable =>
      'Submitted answers are unavailable. Open the application to review its status.';

  @override
  String get hostCustomersMessaging => 'Messaging';

  @override
  String get hostCustomersCheckMessaging => 'Check again';

  @override
  String get hostCustomersSourcesTruncated =>
      'More source records exist. Only the loaded records are shown.';

  @override
  String get hostApplicationOpenPerson => 'Open person';

  @override
  String get hostMomentsTitle => 'Moments';

  @override
  String get hostMomentsNew => 'New moment';

  @override
  String get hostMomentsEmptyTitle => 'No moments yet';

  @override
  String get hostMomentsEmptyBody =>
      'Create a moment to schedule messages and alerts for this scope.';

  @override
  String get hostMomentsManageEntryTitle => 'Moments';

  @override
  String get hostMomentsManageEntryBody => 'Schedule messages and alerts.';

  @override
  String get hostMomentActions => 'Moment actions';

  @override
  String get hostMomentArm => 'Arm';

  @override
  String get hostMomentPause => 'Pause';

  @override
  String get hostMomentResume => 'Resume';

  @override
  String get hostMomentRun => 'Run now';

  @override
  String get hostMomentEdit => 'Edit moment';

  @override
  String get hostMomentStatusDraft => 'Draft';

  @override
  String get hostMomentStatusArmed => 'Armed';

  @override
  String get hostMomentStatusPaused => 'Paused';

  @override
  String get hostMomentStatusDone => 'Done';

  @override
  String get hostMomentOriginDefault => 'Default';

  @override
  String get hostMomentKindManual => 'Manual';

  @override
  String get hostMomentKindScheduled => 'Scheduled';

  @override
  String get hostMomentKindAnchored => 'Anchored';

  @override
  String get hostMomentKindTriggered => 'Triggered';

  @override
  String get hostMomentInitiationManual => 'Runs manually';

  @override
  String hostMomentInitiationScheduled({required String time}) {
    return 'Scheduled $time';
  }

  @override
  String hostMomentInitiationTriggered({required String trigger}) {
    return 'On $trigger';
  }

  @override
  String hostMomentOffsetBefore({required int minutes}) {
    return '$minutes min before';
  }

  @override
  String hostMomentOffsetAfter({required int minutes}) {
    return '$minutes min after';
  }

  @override
  String get hostMomentOffsetAt => 'At';

  @override
  String get hostMomentAnchorScopeStart => 'event start';

  @override
  String get hostMomentAnchorScopeEnd => 'event end';

  @override
  String get hostMomentAnchorFunctionStart => 'function start';

  @override
  String get hostMomentAnchorFunctionEnd => 'function end';

  @override
  String get hostMomentAnchorRsvpDeadline => 'RSVP deadline';

  @override
  String get hostMomentAnchorTravelLeg => 'travel leg';

  @override
  String get hostMomentTriggerLateArrival => 'late hotel arrival';

  @override
  String get hostMomentTriggerFlightDisrupted => 'flight disruption';

  @override
  String get hostMomentSenseIndividual => 'Individual';

  @override
  String get hostMomentSenseAudience => 'Audience';

  @override
  String get hostMomentAudienceSubject => 'Subject';

  @override
  String get hostMomentAudienceParticipants => 'Participants';

  @override
  String get hostMomentAudienceFunctionGuests => 'Function guests';

  @override
  String get hostMomentAudienceHouseholds => 'Households';

  @override
  String get hostMomentAudienceStaffDuty => 'Staff';

  @override
  String get hostMomentActionTemplate => 'Message template';

  @override
  String get hostMomentActionPush => 'Push notification';

  @override
  String get hostMomentActionStaffAlert => 'Staff alert';

  @override
  String get hostMomentName => 'Name';

  @override
  String get hostMomentNameRequired => 'Name the moment.';

  @override
  String get hostMomentWhen => 'When it fires';

  @override
  String get hostMomentInitiation => 'Fire mode';

  @override
  String get hostMomentFireTime => 'Fire time';

  @override
  String get hostMomentFireTimeEmpty => 'Pick a date and time';

  @override
  String get hostMomentFireTimeRequired => 'Pick the fire time.';

  @override
  String get hostMomentAnchor => 'Anchor';

  @override
  String get hostMomentAnchorId => 'Anchor ID';

  @override
  String get hostMomentOffset => 'Offset (minutes)';

  @override
  String get hostMomentOffsetInvalid => 'Enter a minute offset.';

  @override
  String get hostMomentTrigger => 'Trigger';

  @override
  String get hostMomentFunctionId => 'Function ID';

  @override
  String get hostMomentFunctionIdRequired => 'Pick the function.';

  @override
  String get hostMomentSense => 'Send sense';

  @override
  String get hostMomentAudience => 'Audience';

  @override
  String get hostMomentAudienceSection => 'Who it reaches';

  @override
  String get hostMomentSignedUpOnly => 'Signed up only';

  @override
  String get hostMomentRsvp => 'RSVP states';

  @override
  String get hostMomentRsvpAttending => 'Attending';

  @override
  String get hostMomentRsvpMaybe => 'Maybe';

  @override
  String get hostMomentHouseholdDedupe => 'One message per household';

  @override
  String get hostMomentRsvpPendingOnly => 'Pending replies only';

  @override
  String get hostMomentDuty => 'Duty';

  @override
  String get hostMomentDutyRequired => 'Pick the duty.';

  @override
  String get hostMomentScopeIds => 'Scope IDs';

  @override
  String get hostMomentActionSection => 'What it does';

  @override
  String get hostMomentAction => 'Action';

  @override
  String get hostMomentConnectionId => 'Connection ID';

  @override
  String get hostMomentTemplateId => 'Template ID';

  @override
  String get hostMomentTemplateRequired => 'Pick the connection and template.';

  @override
  String get hostMomentVariables => 'Variables';

  @override
  String get hostMomentNotificationType => 'Notification type';

  @override
  String get hostMomentPreferenceKey => 'Preference key';

  @override
  String get hostMomentSeverity => 'Severity';

  @override
  String get hostMomentSeverityInfo => 'Info';

  @override
  String get hostMomentSeverityWarning => 'Warning';

  @override
  String get hostMomentSeverityUrgent => 'Urgent';

  @override
  String get hostMomentTitleTemplate => 'Title template';

  @override
  String get hostMomentTravelTimeLead => 'Shift send time by hotel distance';

  @override
  String get hostMomentSave => 'Save moment';

  @override
  String get hostSavedAudienceEditRules => 'Edit rules';

  @override
  String get hostSavedAudienceMembers => 'People';

  @override
  String get hostSavedAudienceNoMembers => 'No people in this group';

  @override
  String get hostAudienceRuleApplication => 'Application status';

  @override
  String get hostAudienceRuleFormAnswer => 'Form answer';

  @override
  String get hostAudienceRuleNamedEvent => 'Attended event';

  @override
  String get hostAudienceChooseForm => 'Choose a form';

  @override
  String get hostAudienceChooseEvent => 'Choose an event';

  @override
  String get hostAudienceChooseQuestion => 'Choose a published question';

  @override
  String get hostAudienceChooseAnswer => 'Answer contains or equals';

  @override
  String get hostAudienceSourceUnavailable => 'Source unavailable';

  @override
  String get hostAudienceFilterableQuestionsHelp =>
      'Only choice and yes/no questions marked filterable appear here. Each rule uses the selected published version.';

  @override
  String hostAudienceSelectedCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count selected people',
      one: '1 selected person',
    );
    return '$_temp0';
  }

  @override
  String get hostAudienceStaticHelp =>
      'Choose up to 2,500 people. Membership stays as selected until you edit it. Messaging permission is checked separately.';

  @override
  String get hostAudienceUnavailablePerson => 'Unavailable person';

  @override
  String get hostAudienceRemoveSelected => 'Remove from this audience';

  @override
  String get hostAudiencePreviousPeople => 'Previous people';

  @override
  String get hostAudienceNextPeople => 'Next people';

  @override
  String get hostAudienceChoosePeople => 'Choose people';

  @override
  String get hostAudienceSearchPeople => 'Search by name';

  @override
  String get hostAudienceAvailablePeople => 'People you can select';

  @override
  String get hostAudienceNoPeopleFound => 'No people found';

  @override
  String get hostAudienceNoSelectedPeople => 'No people selected yet';

  @override
  String get hostAudienceSelectionLimit =>
      'You have selected the maximum of 2,500 people.';

  @override
  String get hostAudienceMembershipMode => 'Membership';

  @override
  String get hostAudienceRuleMembership => 'Match conditions automatically';

  @override
  String get hostAudienceStaticMembership => 'Choose people manually';

  @override
  String get hostAudienceSpend => 'Catch spend';

  @override
  String get hostAudienceSpendHelp =>
      'Uses completed Catch payments for your events, excluding refunds. Only uniquely verified Catch accounts are included. Currencies are counted separately; changing currency resets the amount.';

  @override
  String get hostAudienceSpendCurrency => 'Currency';

  @override
  String get hostAudienceSpendAmount => 'Amount';

  @override
  String get hostAudienceSpendAmountInvalid =>
      'Enter a valid amount within 10 billion minor currency units.';

  @override
  String get hostAudienceSpendDays => 'Past number of days';

  @override
  String get hostAudienceSpendDaysHelp =>
      'Leave blank to include all recorded Catch payments.';

  @override
  String get hostAudienceSpendDaysInvalid =>
      'Enter a whole number from 1 to 3,650, or leave blank.';

  @override
  String get hostAudienceSpendLifetime => 'All recorded payments';

  @override
  String hostAudienceSpendWindow({required int days}) {
    return 'Past $days days';
  }

  @override
  String get hostAutomationNew => 'New automation';

  @override
  String get hostAutomationEdit => 'Edit automation';

  @override
  String get hostAutomationName => 'Automation name';

  @override
  String get hostAutomationTrigger => 'When';

  @override
  String get hostAutomationAccepted => 'When an application is accepted';

  @override
  String get hostAutomationAttended => 'After a person attends an event';

  @override
  String get hostAutomationAnyForm => 'Any application form';

  @override
  String get hostAutomationAnyEvent => 'Any event';

  @override
  String get hostAutomationForm => 'Form';

  @override
  String get hostAutomationEvent => 'Event';

  @override
  String get hostAutomationDelay => 'Delay in minutes';

  @override
  String get hostAutomationDelayHelp =>
      '0 runs as soon as eligible. Attendance follow-ups wait until the event ends, then apply this delay. Maximum: 10,080 minutes (7 days).';

  @override
  String get hostAutomationDelayInvalid =>
      'Enter a whole number from 0 to 10,080.';

  @override
  String get hostAutomationAnswer => 'Answer includes';

  @override
  String get hostAutomationQuestion => 'Published question';

  @override
  String get hostAutomationQuestionHelp =>
      'Choose a filterable choice or yes/no question from the current published form. Publishing a new version requires reviewing the condition again.';

  @override
  String get hostAutomationAction => 'Action';

  @override
  String get hostAutomationAddAction => 'Add action';

  @override
  String get hostAutomationRemoveAction => 'Remove action';

  @override
  String get hostAutomationTag => 'Add organizer tag';

  @override
  String get hostAutomationQueue => 'Add to application review';

  @override
  String get hostAutomationAttendee => 'Propose event attendee';

  @override
  String get hostAutomationWebhook => 'Send signed webhook';

  @override
  String get hostAutomationMessage => 'Send WhatsApp message';

  @override
  String get hostAutomationWebhookUrl => 'Webhook URL';

  @override
  String get hostAutomationWebhookSecret => 'Signing secret';

  @override
  String get hostAutomationWebhookHelp =>
      'Send event identifiers to your HTTPS endpoint. Verify the HMAC SHA-256 signature and deduplicate X-Catch-Delivery-Id. Answers and contact details are excluded.';

  @override
  String get hostAutomationSecretHelp =>
      'Use 32–256 characters. An existing secret stays unchanged when left blank and the URL stays the same.';

  @override
  String get hostAutomationSecretInvalid =>
      'Enter a signing secret of 32–256 characters.';

  @override
  String get hostAutomationUrlInvalid =>
      'Enter a public HTTPS URL using port 443.';

  @override
  String get hostAutomationDraft => 'Message draft';

  @override
  String get hostAutomationDraftHelp =>
      'Create an unscheduled WhatsApp draft in Messaging, with a saved audience. Only the triggering person is targeted, if they match that audience and can receive the message. Select the draft again after editing it.';

  @override
  String get hostAutomationDraftsMore => 'Load more message drafts';

  @override
  String get hostAutomationDraftsEmpty =>
      'No message drafts on this page. Create a draft in Messaging or load more.';

  @override
  String get hostAutomationEnabled => 'Enabled';

  @override
  String get hostAutomationEnableHelp =>
      'Enabling approves these actions for future matching events. Pausing stops queued actions at their next check; completed actions remain in history.';

  @override
  String get hostAutomationSave => 'Save automation';

  @override
  String get hostAutomationRequired =>
      'Complete the trigger, condition and action settings.';

  @override
  String get hostAutomationRunHelp =>
      'A successful message action means the send was queued. Check its delivery in Messaging. Temporary failures retry up to five times; successful actions are retained.';

  @override
  String get hostAutomationDue => 'Next check';

  @override
  String get hostAutomationCurrentDraft => 'Selected draft';

  @override
  String get hostAutomationNoForm =>
      'No published form is available for this trigger.';

  @override
  String get hostAutomationConfigured => 'Configured';

  @override
  String get hostAudienceFormStatusFilter => 'Form status';

  @override
  String hostAudienceFormEdited({required String time}) {
    return 'Edited $time';
  }

  @override
  String hostAudienceFormLastResponse({required String time}) {
    return 'Last response $time';
  }

  @override
  String hostAudienceFormRecordStatus({
    required String status,
    required int count,
  }) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count responses',
      one: '1 response',
      zero: 'No responses',
    );
    return '$status · $_temp0';
  }

  @override
  String get hostAudienceAllForms => 'All forms';

  @override
  String get hostAudienceSelectedForm => 'Selected form';

  @override
  String get hostAudienceFormWorkspaceTitle => 'Form';

  @override
  String get hostAudienceFormOverview => 'Overview';

  @override
  String hostAudienceFormVersionContext({
    required String purpose,
    required int version,
  }) {
    return '$purpose · Version $version';
  }

  @override
  String get hostAudienceEditQuestions => 'Edit questions';

  @override
  String get hostAudienceLatestResponse => 'Latest response';

  @override
  String get hostAudienceQuestionPreview => 'Question preview';

  @override
  String get hostAudienceFormDetails => 'Form details';

  @override
  String get hostAudienceFormAccess => 'Access';

  @override
  String get hostAudienceAfterSubmission => 'After submission';

  @override
  String get hostAudienceCreatingForm => 'Creating form…';

  @override
  String get hostAudienceShowQr => 'Show QR code';

  @override
  String get hostAudienceCreatingLink => 'Creating tracked link…';

  @override
  String hostAudienceResultsVersion({required int version}) {
    return 'Published version $version';
  }

  @override
  String hostAudienceCompletionDenominator({
    required int submissions,
    required int starts,
  }) {
    return '$submissions submitted from $starts starts.';
  }

  @override
  String hostAudienceMedianCompletion({required String duration}) {
    return 'Median completion time: $duration';
  }

  @override
  String get hostAudienceMultipleChoiceResults =>
      'People can select more than one option.';

  @override
  String hostAudienceChoiceDenominator({
    required int count,
    required int total,
  }) {
    return '$count of $total answers';
  }

  @override
  String hostAudienceNumericResult({
    required String average,
    required int count,
  }) {
    return 'Average $average from $count answers';
  }

  @override
  String get hostAudienceViewAllResponses => 'View all responses';

  @override
  String get hostAudienceResponsesAllVersions =>
      'Includes all versions of this form.';

  @override
  String get hostAudienceSourceTotalsScope =>
      'Tracked link totals include all versions.';

  @override
  String get hostAudiencePreparingExport => 'Preparing export…';

  @override
  String get hostAudienceResponseTitle => 'Response';

  @override
  String get hostAudienceSubmissionDetails => 'Submission details';

  @override
  String get hostAudienceApplicationAccepted =>
      'Accepted into People. Event admission is handled separately.';

  @override
  String get hostAudienceApplicationAdmission =>
      'Accepting adds this person to People. Event admission is handled separately.';

  @override
  String get hostAudienceApplicationEvent => 'Event application';

  @override
  String get hostAudienceApplicationOrganizer => 'Organizer application';

  @override
  String get hostAudienceManualGroup => 'Selected people';

  @override
  String get hostAudienceAutomaticGroup => 'Automatic membership';

  @override
  String hostAudienceGroupChecked({required String date}) {
    return 'Checked $date';
  }

  @override
  String get hostAudienceGroupTitle => 'Group';

  @override
  String get hostAudienceEditGroup => 'Edit group';

  @override
  String get hostAudienceOpenInbox => 'Open in Inbox';

  @override
  String get hostAudienceGroupReach => 'Reach';

  @override
  String get hostAudienceGroupInboxHelp =>
      'Inbox checks available contact routes before sending.';

  @override
  String get hostAudienceGroupReachUnknown =>
      'Refresh membership to check contact options.';

  @override
  String get hostAudienceSaveCheckMembership => 'Save and check membership';

  @override
  String get hostAudienceCreateCheckMembership => 'Create group';

  @override
  String get hostAudienceSavedGroupPreviewHelp =>
      'This is the saved group. Saving changes checks membership again.';

  @override
  String get hostAudienceSavedPreviewFailed =>
      'Group saved. Membership could not be checked.';

  @override
  String get hostAudienceAllAutomations => 'Audience automations';

  @override
  String get hostAudienceThisForm => 'Selected form';

  @override
  String get hostAudienceAutomationScopeAll =>
      'Rules across forms and audience activity.';

  @override
  String get hostAudienceAutomationScopeForm => 'Rules that run for this form.';

  @override
  String get hostAudienceAutomationActive => 'Active';

  @override
  String get hostAudienceAutomationPaused => 'Paused';

  @override
  String get hostAudienceAutomationShortcuts => 'Quick setup';

  @override
  String hostAudienceAutomationDelay({required int minutes}) {
    return 'After $minutes minutes';
  }

  @override
  String get hostAudienceAutomationWhen => 'When';

  @override
  String get hostAudienceAutomationThen => 'Then';

  @override
  String get hostAudienceApplicationApprovedUnlinked =>
      'Application approved. Event admission is handled separately.';

  @override
  String get hostAudienceContactMethod => 'Contact method';

  @override
  String get hostAudienceAddedContactPermission =>
      'These details were added by you. Adding a person does not grant permission to send messages.';

  @override
  String get hostAudienceRecentlyChecked => 'Recently checked';

  @override
  String get hostAudienceAllGroups => 'All groups';

  @override
  String hostAudienceAutomationConsequence({
    required String trigger,
    required String actions,
  }) {
    return '$trigger, then $actions';
  }

  @override
  String get hostAudienceContactRequirement =>
      'Add at least one contact method.';

  @override
  String get hostAudienceRetrySourceNames =>
      'Form and event names unavailable · Retry';

  @override
  String get hostAudienceWhoWillBelong => 'Who will belong';

  @override
  String get hostAudienceMembershipCheckOnSave =>
      'Membership is checked when you save. Incomplete conditions must be finished first.';

  @override
  String get hostsCreateEventBasicsTitle => 'Event basics';

  @override
  String get hostsCreateEventWhenWhereTitle => 'When & where';

  @override
  String get hostsCreateEventGuestsGuideTitle => 'Guests & live guide';

  @override
  String get hostsCreateEventBookingGuideTitle => 'Booking & live guide';

  @override
  String get hostsCreateEventPresentationTitle =>
      'Description & photos · Optional';

  @override
  String get hostsCreateEventItineraryTitle => 'Route & itinerary · Optional';

  @override
  String get hostsCreateEventExternalDetailsTitle =>
      'Booking source · Optional details';

  @override
  String get hostsCreateEventShowDetails => 'Edit';

  @override
  String get hostsCreateEventHideDetails => 'Hide';

  @override
  String hostsCreateEventGuideReady({required String format}) {
    return '$format guide is ready. You can adjust it before the event.';
  }

  @override
  String get hostsCreateEventGuideOptional =>
      'Optional host tools for running the event.';

  @override
  String get hostsCreateEventCustomizeGuide => 'Customize guide';

  @override
  String get hostsCreateEventHideGuide => 'Hide guide settings';

  @override
  String get hostsCreateEventRosterLater => 'Import now or later';

  @override
  String get hostsCreateEventCreateAction => 'Create event';

  @override
  String get hostFormPersonField => 'Person field';

  @override
  String get hostFormPersonFieldHelp =>
      'Classify this answer for your CRM. This label alone does not save or share a Catch profile field.';

  @override
  String hostFormPersonFieldName({required String field}) {
    String _temp0 = intl.Intl.selectLogic(field, {
      'givenName': 'First name',
      'familyName': 'Last name',
      'displayName': 'Full name',
      'dateOfBirth': 'Date of birth',
      'age': 'Age',
      'gender': 'Gender',
      'phoneNumber': 'Phone number',
      'email': 'Email',
      'instagramHandle': 'Instagram',
      'linkedinUrl': 'LinkedIn',
      'profilePhoto': 'Profile photo',
      'city': 'City',
      'heightCm': 'Height in centimetres',
      'occupation': 'Occupation',
      'company': 'Company',
      'education': 'Education',
      'languages': 'Languages',
      'relationshipGoal': 'Relationship goal',
      'interestedInGenders': 'Gender preference',
      'drinking': 'Drinking',
      'smoking': 'Smoking',
      'religion': 'Religion',
      'workout': 'Exercise',
      'diet': 'Diet',
      'children': 'Children',
      'other': 'Response only',
    });
    return '$_temp0';
  }

  @override
  String get hostEventRehearsalStaffTitle => 'Practice team';

  @override
  String get hostEventRehearsalStaffBody =>
      'Try running the event with a lead, pacer or sweep. These are fictional staff, with access only to their assigned groups.';

  @override
  String get hostEventRehearsalStaffAdd => 'Add practice staff';

  @override
  String hostEventRehearsalStaffDefaultName({required int number}) {
    return 'Practice staff $number';
  }

  @override
  String get hostEventRehearsalStaffName => 'Name';

  @override
  String get hostEventRehearsalStaffGroup => 'Group';

  @override
  String get hostEventRehearsalStaffDuty => 'Duty';

  @override
  String get hostEventRehearsalStaffExpiry => 'Access ends';

  @override
  String hostEventRehearsalStaffUntil({required String time}) {
    return 'Until $time on the practice clock';
  }

  @override
  String get hostEventRehearsalStaffNoDuty => 'No group duties';

  @override
  String get hostEventRehearsalStaffFormerGroup => 'Former group';

  @override
  String get hostEventRehearsalStaffEdit => 'Edit duty';

  @override
  String get hostEventRehearsalStaffRemove => 'Remove duty';

  @override
  String get hostEventRehearsalStaffSave => 'Save practice staff';

  @override
  String get hostEventRehearsalStaffSaved => 'Practice team updated';

  @override
  String get hostEventRehearsalStaffRetry => 'Check this save again';

  @override
  String get hostEventRehearsalStaffPending =>
      'The result is not confirmed yet. Check the same save before making another change.';

  @override
  String get hostEventRehearsalStaffRefresh => 'Reload practice team';

  @override
  String get hostEventRehearsalStaffReviewChanged =>
      'This run has changed. Reload the team before editing.';

  @override
  String get hostEventRehearsalStaffExpired => 'Access ended';

  @override
  String get hostEventRehearsalStaffReadOnly =>
      'Staff can be added or reassigned while this rehearsal is active. Saved duties can still be removed.';

  @override
  String get hostEventRehearsalStaffEndOfEvent => 'End of event';

  @override
  String hostEventRehearsalStaffMinutes({required int minutes}) {
    return 'In $minutes minutes';
  }

  @override
  String get eventAssistanceDutyLead => 'Group lead';

  @override
  String get eventAssistanceDutyPacer => 'Pacer';

  @override
  String get eventAssistanceDutySweep => 'Sweep';

  @override
  String get eventAssistanceDutyLeadBody =>
      'Lead departures, hand guests over to another group, record checkpoints and account for guests.';

  @override
  String get eventAssistanceDutyPacerBody =>
      'Lead this pace group, hand guests over to another group, record checkpoints and account for guests.';

  @override
  String get eventAssistanceDutySweepBody =>
      'Record checkpoints and account for guests in this group.';

  @override
  String get eventAssistanceVisitBody =>
      'Has this guest returned or left the event? Leave them unmarked if you haven’t confirmed.';

  @override
  String get eventAssistanceVisitCurrent => 'Recorded status';

  @override
  String get eventAssistanceVisitMarkReturned => 'Mark returned';

  @override
  String get eventAssistanceVisitMarkDeparted => 'Mark left the event';

  @override
  String get eventAssistanceVisitMarkUnresolved => 'Leave unmarked';

  @override
  String get eventAssistanceVisitSaving => 'Saving this observation…';

  @override
  String get eventAssistanceVisitUnconfirmed =>
      'The save is not confirmed. Retry the same observation before making another change.';

  @override
  String get eventAssistanceVisitReviewAgain =>
      'The visit or your access has changed. Reload and review the current status.';

  @override
  String get eventAssistanceVisitSaved =>
      'Save confirmed. The current recorded status is shown above.';

  @override
  String get eventAssistanceVisitReadOnly =>
      'Your current role cannot update this guest’s visit.';

  @override
  String eventAssistanceVisitPendingChoice({required String status}) {
    return 'Awaiting confirmation: $status';
  }

  @override
  String get eventAssistanceVisitRetry => 'Retry this observation';

  @override
  String get eventAssistanceVisitReload => 'Reload visit';

  @override
  String get eventAssistanceVisitDone => 'Done';

  @override
  String get eventAssistanceVisitReview => 'Review visit';

  @override
  String get eventAssistanceVisitNotApplicable =>
      'This event does not use a return sweep.';

  @override
  String get eventAssistanceVisitNotCheckedIn =>
      'This guest is not currently checked in.';

  @override
  String get eventAssistanceVisitNoDeparture =>
      'Record the group’s departure before reviewing this checkpoint.';

  @override
  String get eventAssistanceVisitNotOnDeparture =>
      'This guest was not in the recorded departure group.';

  @override
  String get eventAssistanceVisitChanged =>
      'This visit has changed. Close this review and open the guest again.';

  @override
  String get eventAssistanceVisitSetupChanged =>
      'The event setup has changed since this departure.';

  @override
  String get eventAssistanceVisitDifferentCheckpoint =>
      'This review is for a different checkpoint.';

  @override
  String get eventAssistanceVisitNoDestination =>
      'This departure has no recorded destination.';

  @override
  String get eventAssistanceVisitNotCheckpoint =>
      'The recorded destination is not a checkpoint.';

  @override
  String get eventAssistanceVisitNoVisit =>
      'This practice guest has no recorded visit yet.';

  @override
  String get hostEventRehearsalAssistanceRole => 'Assistance role';

  @override
  String get hostEventRehearsalAssistanceRoleBody =>
      'Practise guest and group help with this person’s permissions. You still control the rehearsal as Host.';

  @override
  String get hostEventRehearsalHostRole => 'Host';

  @override
  String get hostEventRehearsalUnavailableRole => 'Unavailable staff role';

  @override
  String hostEventRehearsalAssistanceAs({required String name}) {
    return 'Synthetic guests · Assistance as $name';
  }

  @override
  String get eventAssistanceVisitCheckpointContext =>
      'This records the event visit. Use the checkpoint report to confirm arrival there.';

  @override
  String get eventAssistanceGroupReview => 'Review group';

  @override
  String get eventAssistanceGroupBody =>
      'Manage who is responsible for this guest in a pace group.';

  @override
  String get eventAssistanceGroupCurrent => 'Current group';

  @override
  String get eventAssistanceGroupNone => 'No accepted group';

  @override
  String get eventAssistanceGroupPrevious =>
      'The previous group assignment needs review.';

  @override
  String get eventAssistanceGroupPlace => 'Assign to a group';

  @override
  String get eventAssistanceGroupPropose => 'Hand over to another group';

  @override
  String get eventAssistanceGroupAccept => 'Accept into this group';

  @override
  String get eventAssistanceGroupReject => 'Decline handover';

  @override
  String get eventAssistanceGroupCancel => 'Cancel handover';

  @override
  String get eventAssistanceGroupLeave => 'Remove from group';

  @override
  String get eventAssistanceGroupChoose => 'Group';

  @override
  String get eventAssistanceGroupReceiver => 'Receiving host';

  @override
  String get eventAssistanceGroupDeadline => 'Accept by';

  @override
  String get eventAssistanceGroupProposeBody =>
      'The receiving host must accept before the guest’s group changes. This does not send a message.';

  @override
  String get eventAssistanceGroupPlaceBody =>
      'You will take responsibility for this guest in the selected group.';

  @override
  String get eventAssistanceGroupAcceptBody =>
      'You will take responsibility for this guest in the requested group.';

  @override
  String get eventAssistanceGroupRejectBody =>
      'Decline this request without accepting responsibility for the guest.';

  @override
  String get eventAssistanceGroupCancelBody => 'Cancel this handover request.';

  @override
  String get eventAssistanceGroupLeaveBody =>
      'This removes group responsibility. Their event attendance stays unchanged.';

  @override
  String eventAssistanceGroupPending({required String group}) {
    return 'Waiting for acceptance into $group.';
  }

  @override
  String get eventAssistanceGroupExpired =>
      'The handover request expired. The group assignment is unchanged.';

  @override
  String get eventAssistanceGroupChanged =>
      'Refresh the group details before continuing.';

  @override
  String get eventAssistanceGroupClosedAccepted =>
      'The receiving host accepted the handover.';

  @override
  String get eventAssistanceGroupClosedRejected =>
      'The receiving host declined the handover.';

  @override
  String get eventAssistanceGroupClosedCancelled =>
      'The handover was cancelled.';

  @override
  String get eventAssistanceGroupNoActions =>
      'No group actions are available for this guest under your current access.';

  @override
  String get eventAssistanceGroupNoReceivers =>
      'Receiving hosts are unavailable in this review. Refresh the group details to try again.';

  @override
  String get eventAssistanceGroupSaving => 'Saving this group action…';

  @override
  String get eventAssistanceGroupUnconfirmed =>
      'This action has not been confirmed. Retry the same action before making another change.';

  @override
  String get eventAssistanceGroupSaved => 'Group action confirmed.';

  @override
  String get eventAssistanceGroupRetry => 'Retry this group action';

  @override
  String get eventAssistanceGroupRefresh => 'Refresh group details';

  @override
  String get eventAssistanceGroupConfirm => 'Confirm group action';

  @override
  String get eventAssistanceGroupChooseAgain => 'Choose another action';

  @override
  String get eventAssistanceGroupYou => 'You';

  @override
  String get eventAssistanceGroupUnnamedHost => 'Organizer host';

  @override
  String get eventAssistanceGroupUnknown => 'Previous group';

  @override
  String eventAssistanceGroupSelected({required String action}) {
    return 'Selected action: $action';
  }

  @override
  String get eventAssistanceGroupNotApplicable =>
      'Group handovers apply to events with configured pace groups.';

  @override
  String get eventAssistanceGroupRosterTitle => 'Pace groups';

  @override
  String get eventAssistanceGroupRosterBody =>
      'Review a guest’s group or hand over responsibility to another host.';

  @override
  String get eventAssistanceGroupNoGuests =>
      'No guests are available to review.';

  @override
  String get eventAssistanceGroupGuest => 'Guest';

  @override
  String eventAssistanceGroupReceiverValue({required String name}) {
    return 'Receiving host: $name';
  }

  @override
  String get eventAssistanceGroupMissingName =>
      'Some hosts have no name on file and can’t be selected.';

  @override
  String get eventAssistanceDepartureTitle => 'Record departure';

  @override
  String get eventAssistanceDepartureBody =>
      'Confirm after your group starts moving. This updates your confirmed destination; sending guest directions is a separate action.';

  @override
  String get eventAssistanceDepartureCurrent => 'Last confirmed destination';

  @override
  String get eventAssistanceDepartureUnrecorded => 'No departure recorded yet';

  @override
  String get eventAssistanceDepartureSourceChanged =>
      'The event setup changed. Review the destination again.';

  @override
  String get eventAssistanceDepartureDestination => 'Where are you heading?';

  @override
  String get eventAssistanceDepartureRecordRoster => 'Record who is leaving';

  @override
  String get eventAssistanceDepartureRosterBody =>
      'Select only people you saw leave with this group. Their current check-in and group are checked before saving.';

  @override
  String eventAssistanceDepartureSelected({required int count}) {
    return '$count people selected';
  }

  @override
  String get eventAssistanceDepartureSearch => 'Find a guest';

  @override
  String get eventAssistanceDepartureNoGuests => 'No matching guests';

  @override
  String get eventAssistanceDeparturePreviousPeople => 'Previous people';

  @override
  String get eventAssistanceDepartureNextPeople => 'Next people';

  @override
  String get eventAssistanceDepartureNobody =>
      'An empty selection records that nobody left with you.';

  @override
  String get eventAssistanceDepartureRequestCheckpoint =>
      'Request a checkpoint report';

  @override
  String get eventAssistanceDepartureReportMyself =>
      'I will check this roster at the next stop.';

  @override
  String get eventAssistanceDepartureDeadline => 'Report by';

  @override
  String get eventAssistanceDepartureConfirm => 'Confirm departure';

  @override
  String get eventAssistanceDepartureUnavailable =>
      'Departure is unavailable. Check that the event is live, a destination is configured, and you have a current group duty.';

  @override
  String get eventAssistanceDepartureReviewing =>
      'Checking the selected roster…';

  @override
  String get eventAssistanceDepartureSaving => 'Recording departure…';

  @override
  String get eventAssistanceDepartureUnknown =>
      'The result is unconfirmed. Retry to check this same departure.';

  @override
  String get eventAssistanceDepartureChanged =>
      'The review changed. Reload before making a new departure decision.';

  @override
  String get eventAssistanceDepartureSaved => 'Departure recorded';

  @override
  String get eventAssistanceDepartureRosterSkipped =>
      'Departure roster was not recorded';

  @override
  String eventAssistanceDepartureReportAt({required String time}) {
    return 'You will report by $time';
  }

  @override
  String get eventAssistanceDepartureRetry => 'Retry this departure';

  @override
  String get eventAssistanceDepartureReload => 'Reload departure details';

  @override
  String get eventAssistanceDepartureOtherPending =>
      'Resolve the original group action before recording another departure.';

  @override
  String get eventAssistanceMovementTitle => 'Group movement';

  @override
  String get eventAssistanceMovementBody =>
      'Record where your group is heading and who is travelling with you.';

  @override
  String get eventAssistanceMovementGroup => 'Group';

  @override
  String get eventAssistanceMovementEveryone => 'Everyone';

  @override
  String get eventAssistanceCheckpointTitle => 'Checkpoint arrivals';

  @override
  String eventAssistanceCheckpointDeparture({required int number}) {
    return 'From departure $number';
  }

  @override
  String get eventAssistanceCheckpointBody =>
      'Select guests you have seen at this checkpoint. Other guests stay unconfirmed. Event check-in is unchanged.';

  @override
  String eventAssistanceCheckpointSelected({
    required int count,
    required int total,
  }) {
    return '$count of $total guests observed';
  }

  @override
  String get eventAssistanceCheckpointUnknownGuest =>
      'Guest record unavailable';

  @override
  String get eventAssistanceCheckpointUnknownGuestBody =>
      'Kept in this departure roster. Reload before changing this observation.';

  @override
  String get eventAssistanceCheckpointVisitChanged =>
      'The guest’s event visit changed. Earlier observations remain in this report.';

  @override
  String get eventAssistanceCheckpointEarlierObservation =>
      'Observed in an earlier report';

  @override
  String get eventAssistanceCheckpointNotObserved =>
      'Arrival not yet confirmed';

  @override
  String get eventAssistanceCheckpointEmptyRoster =>
      'This departure explicitly recorded an empty roster. You can save an empty checkpoint report.';

  @override
  String get eventAssistanceCheckpointCorrection => 'Reason for correction';

  @override
  String get eventAssistanceCheckpointCorrectionBody =>
      'Explain why you are removing an earlier arrival observation.';

  @override
  String get eventAssistanceCheckpointNoRoster =>
      'No guest roster was recorded for this departure.';

  @override
  String get eventAssistanceCheckpointNoDestination =>
      'No checkpoint destination was recorded for this departure.';

  @override
  String get eventAssistanceCheckpointNotApplicable =>
      'This destination does not have a checkpoint report.';

  @override
  String get eventAssistanceCheckpointSetupChanged =>
      'The event setup changed. This original departure can no longer accept new arrival observations.';

  @override
  String get eventAssistanceCheckpointSaving => 'Saving the checkpoint report…';

  @override
  String get eventAssistanceCheckpointUnconfirmed =>
      'The save is unconfirmed. Retry this same report to check the result.';

  @override
  String get eventAssistanceCheckpointChanged =>
      'The report or your access changed. Reload before making a new observation.';

  @override
  String get eventAssistanceCheckpointSaved =>
      'Checkpoint report saved. The latest recorded observations are shown above.';

  @override
  String get eventAssistanceCheckpointReadOnly =>
      'This review does not allow arrival reporting.';

  @override
  String get eventAssistanceCheckpointSave => 'Save checkpoint report';

  @override
  String get eventAssistanceCheckpointRetry => 'Retry this report';

  @override
  String get eventAssistanceCheckpointReload => 'Reload checkpoint';

  @override
  String eventAssistanceCheckpointDue({required String deadline}) {
    return 'Report requested by $deadline';
  }

  @override
  String eventAssistanceCheckpointOverdue({required String deadline}) {
    return 'Report overdue · requested by $deadline';
  }

  @override
  String get eventAssistanceCheckpointDiscrepancy =>
      'The saved report still has unconfirmed guests.';

  @override
  String get eventAssistanceCheckpointComplete =>
      'Every guest on this departure roster has an arrival observation.';

  @override
  String get eventAssistanceCheckpointClosedOut =>
      'This reporting request was closed. Closure does not add arrival observations.';

  @override
  String get eventAssistanceHistoryTitle => 'Departure rosters & checkpoints';

  @override
  String get eventAssistanceHistoryBody =>
      'Open a recorded departure to review arrivals at its checkpoint. Reports describe that departure, even after the group moves again.';

  @override
  String get eventAssistanceHistoryEmpty =>
      'No recorded departure rosters on this page.';

  @override
  String get eventAssistanceHistoryEarlierSetup =>
      'Destination from an earlier setup';

  @override
  String eventAssistanceHistoryDepartureAt({
    required int number,
    required String date,
    required String time,
  }) {
    return 'Departure $number · $date, $time';
  }

  @override
  String eventAssistanceHistoryRosterSize({required int count}) {
    return '$count guests recorded as leaving';
  }

  @override
  String get eventAssistanceHistoryNoReport =>
      'Checkpoint report not yet recorded';

  @override
  String eventAssistanceHistoryObserved({
    required int count,
    required int total,
  }) {
    return 'Last report: $count of $total guests observed';
  }

  @override
  String get eventAssistanceHistoryNoCheckpoint =>
      'No checkpoint report for this destination';

  @override
  String get eventAssistanceHistoryEarlier => 'Earlier departures';

  @override
  String get eventAssistanceHistoryNewer => 'Newer departures';

  @override
  String get eventAssistanceHistoryReload => 'Reload history';

  @override
  String get eventAssistanceCheckpointSelectedObservation =>
      'Selected for this report';

  @override
  String get eventAssistanceCheckpointRemovingObservation =>
      'Removing an earlier observation';

  @override
  String get eventAssistanceCheckpointRequestTitle => 'Checkpoint request';

  @override
  String get eventAssistanceCheckpointRequestManage =>
      'Review checkpoint request';

  @override
  String get eventAssistanceCheckpointRequestBody =>
      'Close this request after every unconfirmed guest has a recorded outcome. Arrival observations stay unchanged.';

  @override
  String get eventAssistanceCheckpointRequestMissing =>
      'No checkpoint report was requested for this departure.';

  @override
  String get eventAssistanceCheckpointRequestUnknown =>
      'Reload to check whether this request can be closed.';

  @override
  String get eventAssistanceCheckpointRequestReady =>
      'All unconfirmed guests have been recorded as returned or departed.';

  @override
  String get eventAssistanceCheckpointRequestReportFirst =>
      'Save an arrival report before reviewing closeout.';

  @override
  String get eventAssistanceCheckpointRequestResolveFirst =>
      'Some unconfirmed guests still need an outcome. Review their visit status before closing this request.';

  @override
  String get eventAssistanceCheckpointRequestReason =>
      'Reason for this decision';

  @override
  String get eventAssistanceCheckpointRequestClose =>
      'Close checkpoint request';

  @override
  String get eventAssistanceCheckpointRequestReopen =>
      'Reopen checkpoint request';

  @override
  String get eventAssistanceCheckpointRequestAuthority =>
      'Only an organizer or the responsible reporter with current group access can close or reopen this request.';

  @override
  String get eventAssistanceCheckpointRequestSaving =>
      'Saving your checkpoint decision…';

  @override
  String get eventAssistanceCheckpointRequestUnconfirmed =>
      'The outcome is not confirmed. Retry this same decision to check its result.';

  @override
  String get eventAssistanceCheckpointRequestSaved =>
      'Your decision was saved. The latest request status is shown above.';

  @override
  String get eventAssistanceCheckpointRequestReassign =>
      'Change responsible reporter';

  @override
  String get eventAssistanceCheckpointRequestRetry =>
      'Retry checkpoint decision';

  @override
  String get eventAssistanceCheckpointVisitsTitle =>
      'Arrival still unconfirmed';

  @override
  String get eventAssistanceCheckpointVisitsBody =>
      'Review a guest to record whether they returned or left the event.';

  @override
  String get eventAssistanceCheckpointVisitUnknown =>
      'Visit outcome is unavailable. Reload to review.';

  @override
  String get eventAssistanceCheckpointVisitBeforeDeparture =>
      'The recorded outcome predates this departure. Review their status again.';

  @override
  String get eventAssistanceCheckpointVisitReview => 'Review guest status';

  @override
  String get eventAssistanceCheckpointReporterBody =>
      'Choose someone with access to this group through the original reporting deadline. The deadline stays the same.';

  @override
  String get eventAssistanceCheckpointReporterLabel => 'Reporter';

  @override
  String get eventAssistanceCheckpointReporterEmpty =>
      'No other eligible reporter is available. Review group duties before changing this request.';

  @override
  String get eventAssistanceCheckpointReporterUnnamed =>
      'Some eligible hosts have no display name. Add their name before selecting them.';

  @override
  String get eventAssistanceCheckpointReporterUnknown =>
      'Reporter details unavailable';

  @override
  String eventAssistanceCheckpointReporterCurrent({required String name}) {
    return 'Responsible reporter: $name';
  }

  @override
  String get eventAssistanceCheckpointReporterCancel =>
      'Cancel reporter change';

  @override
  String get eventAssistanceCheckpointReporterSave => 'Save reporter change';

  @override
  String get eventAssistanceHelpTitle => 'Guest help';

  @override
  String get eventAssistanceHelpBody =>
      'Review practical requests and decide who will follow up.';

  @override
  String get eventAssistanceHelpOpen => 'Open';

  @override
  String get eventAssistanceHelpHandled => 'Handled';

  @override
  String get eventAssistanceHelpEmptyOpen => 'No open requests on this page.';

  @override
  String get eventAssistanceHelpEmptyHandled =>
      'No handled requests on this page.';

  @override
  String get eventAssistanceHelpReview => 'Review requests';

  @override
  String get eventAssistanceHelpPageBody =>
      'This is one page of requests. Reload to check for updates.';

  @override
  String get eventAssistanceHelpPrevious => 'Previous page';

  @override
  String get eventAssistanceHelpNext => 'Next page';

  @override
  String get eventAssistanceHelpReload => 'Reload requests';

  @override
  String get eventAssistanceHelpUnknownGuest => 'Guest details unavailable';

  @override
  String get eventAssistanceHelpLogistics => 'Event logistics';

  @override
  String get eventAssistanceHelpAccessibility => 'Accessibility help';

  @override
  String get eventAssistanceHelpOther => 'Other practical help';

  @override
  String get eventAssistanceHelpUnassigned => 'No host assigned';

  @override
  String get eventAssistanceHelpUnknownHost =>
      'Assigned host details unavailable';

  @override
  String get eventAssistanceHelpOwnerRemoved => 'Needs a new host';

  @override
  String get eventAssistanceHelpResolved => 'Resolved';

  @override
  String get eventAssistanceHelpDeclined => 'Declined';

  @override
  String get eventAssistanceHelpSourceChanged =>
      'The guest record has changed. This request is read-only.';

  @override
  String get eventAssistanceHelpLegacy =>
      'This older request needs a source review before it can be handled.';

  @override
  String get eventAssistanceHelpTake => 'I’ll handle this';

  @override
  String get eventAssistanceHelpTransfer => 'Assign to a host';

  @override
  String get eventAssistanceHelpResolve => 'Mark resolved';

  @override
  String get eventAssistanceHelpDecline => 'Decline request';

  @override
  String get eventAssistanceHelpTakeBody =>
      'Record yourself as responsible for following up with this guest.';

  @override
  String get eventAssistanceHelpTransferBody =>
      'Choose an existing host to follow up with this guest.';

  @override
  String get eventAssistanceHelpResolveBody =>
      'Confirm that this guest’s request has been handled.';

  @override
  String get eventAssistanceHelpDeclineBody =>
      'Record that this request cannot be fulfilled.';

  @override
  String get eventAssistanceHelpHost => 'Responsible host';

  @override
  String get eventAssistanceHelpNoHosts => 'Reload to review available hosts.';

  @override
  String get eventAssistanceHelpUnnamedHosts =>
      'Hosts need a distinct display name to appear here.';

  @override
  String get eventAssistanceHelpConfirm => 'Save decision';

  @override
  String get eventAssistanceHelpChooseAgain => 'Choose another action';

  @override
  String get eventAssistanceHelpSaving => 'Saving this decision…';

  @override
  String get eventAssistanceHelpUnconfirmed =>
      'The save has not been confirmed. Retry the same decision to find out whether it was saved.';

  @override
  String get eventAssistanceHelpChanged =>
      'The request or your access changed. Reload before making a new decision.';

  @override
  String get eventAssistanceHelpSaved => 'Decision saved.';

  @override
  String get eventAssistanceHelpPending => 'Confirmation needed';

  @override
  String get eventAssistanceHelpPendingBody =>
      'Review this earlier decision to confirm its outcome.';

  @override
  String get eventAssistanceHelpMissing =>
      'This request is no longer on the current page. Reload the queue to review its latest state.';

  @override
  String get eventAssistanceHelpPracticeUnknown =>
      'Some older practice help flags do not have a reviewable request.';

  @override
  String get eventAssistanceHelpPracticeHost =>
      'Switch to the host role to handle practical help requests.';

  @override
  String eventAssistanceHelpAssigned({required String name}) {
    return 'Responsible: $name';
  }

  @override
  String eventAssistanceHelpReceived({
    required String date,
    required String time,
  }) {
    return 'Requested $date at $time';
  }

  @override
  String eventAssistanceHelpSelected({required String action}) {
    return 'Decision: $action';
  }

  @override
  String get eventAssistanceHelpReadOnly => 'Review only';

  @override
  String get eventAssistanceHelpRetry => 'Retry this decision';

  @override
  String eventAssistanceHelpTransferValue({required String name}) {
    return 'Assign to $name';
  }

  @override
  String get eventAssistanceDeliveryStatusNotSubmitted => 'Not yet sent';

  @override
  String get eventAssistanceDeliveryStatusReserved => 'Preparing to send';

  @override
  String get eventAssistanceDeliveryStatusUnknown => 'Delivery unconfirmed';

  @override
  String get eventAssistanceDeliveryStatusAccepted => 'Accepted by provider';

  @override
  String get eventAssistanceDeliveryStatusDelivered => 'Delivered';

  @override
  String get eventAssistanceDeliveryStatusRead => 'Read';

  @override
  String get eventAssistanceDeliveryStatusFailed => 'Delivery failed';

  @override
  String get eventAssistanceDeliveryStatusNotDispatched => 'Not sent';

  @override
  String get eventAssistanceDeliveryStatusRevoked => 'Message revoked';

  @override
  String get eventAssistanceDeliveryStatusConflictingEvidence =>
      'Delivery reports disagree';

  @override
  String get eventAssistanceDeliveryPurposeJoiningUpdate => 'Joining update';

  @override
  String get eventAssistanceDeliveryPurposeJoiningInstructions =>
      'Joining instructions';

  @override
  String get eventAssistanceDeliveryPurposePlanChanged => 'Plan changed';

  @override
  String get eventAssistanceDeliveryPurposeGuestRequirement =>
      'Guest requirement';

  @override
  String get eventAssistanceDeliveryPurposeAssignmentChanged =>
      'Assignment changed';

  @override
  String get eventAssistanceDeliveryPurposeParticipationCheck =>
      'Participation check';

  @override
  String get eventAssistanceDeliveryPurposeEventCancelled => 'Event cancelled';

  @override
  String get eventAssistanceDeliveryPurposeEventFinished => 'Event finished';

  @override
  String get eventAssistanceDeliveryPurposeFollowUp => 'Follow-up';

  @override
  String get eventAssistanceDeliveryReviewReasonNoEligibleRoute =>
      'No messaging channel is available for this guest.';

  @override
  String get eventAssistanceDeliveryReviewReasonAttemptLimit =>
      'The automatic attempt limit was reached.';

  @override
  String get eventAssistanceDeliveryReviewReasonPolicyRejected =>
      'The messaging policy needs review.';

  @override
  String get eventAssistanceDeliveryReviewReasonRecipientNeedsReview =>
      'The recipient details need review.';

  @override
  String get eventAssistanceDeliveryReviewReasonProviderOwnsFallback =>
      'The provider is managing fallback. Delivery is still unconfirmed.';

  @override
  String get eventAssistanceDeliveryReviewReasonConflictingDeliveryEvidence =>
      'The provider reports disagree. Check with the guest before following up.';

  @override
  String get eventAssistanceDeliveryReviewReasonProviderPending =>
      'Waiting for the provider to confirm delivery.';

  @override
  String get eventAssistanceDeliveryReviewReasonWorkerUnavailable =>
      'The sending service is unavailable.';

  @override
  String get eventAssistanceDeliveryReviewReasonRecoveryLimit =>
      'Automatic recovery reached its limit.';

  @override
  String get eventAssistanceDeliveryReviewReasonEventFactsStale =>
      'The event details need a fresh review.';

  @override
  String get eventAssistanceDeliveryReviewReasonRouteFactsStale =>
      'The messaging channel needs a fresh review.';

  @override
  String get eventAssistanceDeliveryRetryReasonRetryBackoff =>
      'Another automatic attempt is scheduled.';

  @override
  String get eventAssistanceDeliveryRetryReasonEventFactsStale =>
      'The event details need a fresh review.';

  @override
  String get eventAssistanceDeliveryRetryReasonRouteFactsStale =>
      'The messaging channel needs a fresh review.';

  @override
  String get eventAssistanceDeliveryRetryReasonWorkerUnavailable =>
      'The sending service is unavailable.';

  @override
  String get eventAssistanceDeliveryStopReasonDelivered =>
      'Delivery confirmed.';

  @override
  String get eventAssistanceDeliveryStopReasonResponded =>
      'The guest responded.';

  @override
  String get eventAssistanceDeliveryStopReasonCancelled =>
      'This message was cancelled.';

  @override
  String get eventAssistanceDeliveryStopReasonSuperseded =>
      'A newer message replaced this one.';

  @override
  String get eventAssistanceDeliveryStopReasonExpired =>
      'The response window ended.';

  @override
  String get eventAssistanceDeliveryStopReasonEventClosed =>
      'The event is closed.';

  @override
  String get eventAssistanceDeliveryStopReasonPermissionRevoked =>
      'Messaging permission was withdrawn.';

  @override
  String get eventAssistanceDeliveryStopReasonGuestPresent =>
      'The guest has checked in.';

  @override
  String get eventAssistanceDeliveryStopReasonGuestDeclined =>
      'The guest is not coming.';

  @override
  String get eventAssistanceDeliveryStopReasonNotAdmitted =>
      'The guest is not admitted to this event.';

  @override
  String get eventAssistanceDeliveryStopReasonHostStopped =>
      'A host stopped automatic follow-up.';

  @override
  String get eventAssistanceDeliveryStopReasonParticipationInactive =>
      'The guest is no longer participating.';

  @override
  String get eventAssistanceDeliveryTitle => 'Message delivery';

  @override
  String get eventAssistanceDeliveryBody =>
      'Review recorded messages and take over follow-up when a guest needs a host.';

  @override
  String get eventAssistanceDeliveryReview => 'Review messages';

  @override
  String get eventAssistanceDeliveryPending => 'Handoff needs confirmation';

  @override
  String get eventAssistanceDeliveryPendingBody =>
      'A handoff may have been saved. Confirm it before making another decision.';

  @override
  String get eventAssistanceDeliveryUnknownGuest => 'Guest details unavailable';

  @override
  String get eventAssistanceDeliveryPageBody =>
      'These are the messages on this page. Other pages may contain more.';

  @override
  String get eventAssistanceDeliveryPracticeBody =>
      'Current messages for practice guests. Earlier messages may have been replaced.';

  @override
  String get eventAssistanceDeliveryEmpty => 'No messages on this page.';

  @override
  String get eventAssistanceDeliveryMissing =>
      'This message is not on the current page. Reload the list to review its latest details.';

  @override
  String get eventAssistanceDeliveryReload => 'Reload messages';

  @override
  String get eventAssistanceDeliveryPrevious => 'Previous page';

  @override
  String get eventAssistanceDeliveryNext => 'Next page';

  @override
  String get eventAssistanceDeliveryTakeOver => 'I’ll handle follow-up';

  @override
  String get eventAssistanceDeliveryTakeOverBody =>
      'You’ll take responsibility for following up with this guest. Future automatic attempts for this message will stop. A send already in progress may still arrive.';

  @override
  String get eventAssistanceDeliveryRetry => 'Confirm this handoff';

  @override
  String get eventAssistanceDeliveryRetryBody =>
      'Confirmation was interrupted. Checking the same handoff will not send another message.';

  @override
  String get eventAssistanceDeliverySaved => 'Handoff confirmed';

  @override
  String get eventAssistanceDeliverySavedBody =>
      'Your handoff was recorded. Delivery reports, guest replies and host responsibility can still change.';

  @override
  String get eventAssistanceDeliveryRefresh =>
      'Review the latest message before taking over.';

  @override
  String get eventAssistanceDeliverySourceChanged =>
      'The original guest record changed. Guest details and actions are unavailable.';

  @override
  String get eventAssistanceDeliveryAutomatic => 'No host has taken over';

  @override
  String get eventAssistanceDeliveryMine => 'You’re handling follow-up';

  @override
  String get eventAssistanceDeliveryAnotherHost =>
      'Another host is handling follow-up';

  @override
  String get eventAssistanceDeliveryRevokedOwner =>
      'The previous host no longer has access';

  @override
  String get eventAssistanceDeliveryEvidence => 'Delivery status';

  @override
  String get eventAssistanceDeliveryCoordination => 'Automatic follow-up';

  @override
  String get eventAssistanceDeliveryHandling => 'Host responsibility';

  @override
  String get eventAssistanceDeliveryAttempts => 'Channel history';

  @override
  String get eventAssistanceDeliveryUntracked =>
      'No automatic follow-up schedule is recorded.';

  @override
  String get eventAssistanceDeliveryQueued => 'A follow-up check is queued.';

  @override
  String get eventAssistanceDeliveryAwaitingReceipt =>
      'Waiting for delivery confirmation.';

  @override
  String get eventAssistanceDeliveryAcceptedBody =>
      'The provider accepted this message. Delivery has not been confirmed.';

  @override
  String get eventAssistanceDeliveryUnknownBody =>
      'The message may have arrived. Delivery has not been confirmed.';

  @override
  String get eventAssistanceDeliveryRevokedBody =>
      'The provider revoked this message. That does not prove the guest never received it.';

  @override
  String get eventAssistanceDeliveryDone => 'Done';

  @override
  String get eventAssistanceDeliveryPracticeHost =>
      'Switch to Host to take responsibility for follow-up.';

  @override
  String get eventAssistanceDeliveryManualStopped =>
      'Automatic attempts are stopped for this message.';

  @override
  String get eventAssistanceDeliveryPracticeSending =>
      'Message sending is simulated in this rehearsal.';

  @override
  String get eventAssistanceLateJoinTitle => 'Late arrival help';

  @override
  String get eventAssistanceLateJoinBody =>
      'Choose how guests can catch up when they miss the start or the group moves on.';

  @override
  String get eventAssistanceLateJoinMode => 'How should Catch help?';

  @override
  String get eventAssistanceLateJoinInherit => 'Use event rules';

  @override
  String get eventAssistanceLateJoinOff => 'Off';

  @override
  String get eventAssistanceLateJoinObserve => 'Monitor only';

  @override
  String get eventAssistanceLateJoinPrepare => 'Prepare for review';

  @override
  String get eventAssistanceLateJoinAutomatic => 'Send automatically';

  @override
  String get eventAssistanceLateJoinInheritBody =>
      'Follow the event’s rules. Saving removes this group’s override.';

  @override
  String get eventAssistanceLateJoinOffBody =>
      'Turn off future late arrival help. Customized rules are kept for later.';

  @override
  String get eventAssistanceLateJoinObserveBody =>
      'Allow Catch to identify joining needs without preparing or sending messages.';

  @override
  String get eventAssistanceLateJoinPrepareBody =>
      'Allow Catch to prepare guidance for a host to review.';

  @override
  String get eventAssistanceLateJoinAutomaticBody =>
      'Allow Catch to send joining updates within the rules below.';

  @override
  String get eventAssistanceLateJoinDeliveryRequired =>
      'Saving rules does not turn on messaging. Sender setup and guest permission are also required.';

  @override
  String get eventAssistanceLateJoinUnconfigured => 'Not configured';

  @override
  String get eventAssistanceLateJoinConfigured => 'Rules saved';

  @override
  String get eventAssistanceLateJoinDisabled => 'Turned off';

  @override
  String get eventAssistanceLateJoinSourceChanged =>
      'Event setup changed. Review these rules.';

  @override
  String get eventAssistanceLateJoinEventOrigin => 'Applies to the whole event';

  @override
  String get eventAssistanceLateJoinInheritedOrigin => 'Uses the event’s rules';

  @override
  String get eventAssistanceLateJoinGroupOrigin =>
      'Overrides event rules for this group';

  @override
  String get eventAssistanceLateJoinCustomize => 'Customize rules';

  @override
  String get eventAssistanceLateJoinRestore => 'Restore suggested rules';

  @override
  String get eventAssistanceLateJoinWhere => 'Where can guests join?';

  @override
  String get eventAssistanceLateJoinConfirmed =>
      'Follow confirmed group progress';

  @override
  String get eventAssistanceLateJoinConfirmedBody =>
      'Use the group’s latest confirmed destination. A scheduled stop alone does not move the group.';

  @override
  String get eventAssistanceLateJoinItinerary => 'Itinerary stops';

  @override
  String get eventAssistanceLateJoinCheckpoints => 'Route checkpoints';

  @override
  String get eventAssistanceLateJoinPoints => 'Allowed joining points';

  @override
  String get eventAssistanceLateJoinEntry => 'Late entry at this place';

  @override
  String get eventAssistanceLateJoinEntryAllowed => 'Allowed';

  @override
  String get eventAssistanceLateJoinEntryHost => 'Host decides';

  @override
  String get eventAssistanceLateJoinEntryClosed => 'Closed';

  @override
  String get eventAssistanceLateJoinWindow => 'Joining window';

  @override
  String get eventAssistanceLateJoinEventEnd => 'Until the event ends';

  @override
  String get eventAssistanceLateJoinCustomTime => 'Choose a cutoff';

  @override
  String get eventAssistanceLateJoinCutoff => 'Joining cutoff';

  @override
  String get eventAssistanceLateJoinMaximum => 'Updates per guest';

  @override
  String get eventAssistanceLateJoinMaximumBody =>
      'The maximum while a guest is trying to join. Zero keeps guidance available without sending updates.';

  @override
  String get eventAssistanceLateJoinGap => 'Minimum minutes between updates';

  @override
  String get eventAssistanceLateJoinGapBody =>
      'Send another update only when joining guidance changes, after this minimum gap.';

  @override
  String get eventAssistanceLateJoinUnanswered => 'If a guest doesn’t reply';

  @override
  String get eventAssistanceLateJoinKeepUnknown => 'Keep arrival unknown';

  @override
  String get eventAssistanceLateJoinHostReview => 'Ask a host to review';

  @override
  String get eventAssistanceLateJoinUnansweredBody =>
      'No response never marks someone absent. Host review also needs a response deadline in messaging setup.';

  @override
  String get eventAssistanceLateJoinSetupUnknown =>
      'Reload to get current joining options. You can still turn help off.';

  @override
  String get eventAssistanceLateJoinMissingRules =>
      'No suggested rules are available. Reload to try again.';

  @override
  String get eventAssistanceLateJoinDestinationChanged =>
      'Some joining points are no longer in this event. Choose from the updated list.';

  @override
  String get eventAssistanceLateJoinInvalidCutoff =>
      'Choose a time after now and no later than the event ends.';

  @override
  String get eventAssistanceLateJoinSave => 'Save rules';

  @override
  String get eventAssistanceLateJoinDone => 'Done';

  @override
  String get eventAssistanceLateJoinReload => 'Reload rules';

  @override
  String get eventAssistanceLateJoinRetry => 'Check save result';

  @override
  String get eventAssistanceLateJoinRetryBody =>
      'The save result is unknown. Check the original save before making another change.';

  @override
  String get eventAssistanceLateJoinRefreshBody =>
      'These rules need a fresh review before another save.';

  @override
  String get eventAssistanceLateJoinSavedBody =>
      'Your current saved rules are shown below.';

  @override
  String get eventAssistanceLateJoinDecrease => 'Decrease limit';

  @override
  String get eventAssistanceLateJoinIncrease => 'Increase limit';

  @override
  String get eventAssistanceLateJoinChooseScope => 'Rules for';

  @override
  String get eventAssistanceLateJoinEveryone => 'Whole event';

  @override
  String get eventAssistanceLateJoinPending => 'A save needs confirmation';

  @override
  String get eventAssistanceLateJoinEntryBody =>
      'Set joining guidance, message limits and group overrides.';

  @override
  String get eventAssistanceLateJoinSettings => 'Assistance settings';

  @override
  String get eventAssistanceLateJoinGroupOverrides => 'Group overrides';

  @override
  String get eventAssistanceLateJoinPreviousGroup => 'Previous group';

  @override
  String get eventAssistanceLateJoinHideRules => 'Hide customization';

  @override
  String eventAssistanceLateJoinDestinationSummary({required String places}) {
    return 'Joining points: $places';
  }

  @override
  String eventAssistanceLateJoinCutoffSummary({required String time}) {
    return 'Joining until $time';
  }

  @override
  String eventAssistanceLateJoinLimitSummary({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Up to $count updates per guest',
      one: 'Up to 1 update per guest',
      zero: 'No message updates',
    );
    return '$_temp0';
  }

  @override
  String eventAssistanceLateJoinGapSummary({required int minutes}) {
    String _temp0 = intl.Intl.pluralLogic(
      minutes,
      locale: localeName,
      other: 'At least $minutes minutes between updates',
      one: 'At least 1 minute between updates',
      zero: 'No minimum gap',
    );
    return '$_temp0';
  }

  @override
  String get eventAssistanceRuntimeTitle => 'Automatic guest updates';

  @override
  String get eventAssistanceRuntimeEntryBody =>
      'Choose messaging channels, fallback order and when updates stop.';

  @override
  String get eventAssistanceRuntimeBody =>
      'Use these channels for late-arrival help. Each guest still needs permission for that channel, and delivery depends on sender setup and available budget.';

  @override
  String get eventAssistanceRuntimeUnconfigured => 'Not configured';

  @override
  String get eventAssistanceRuntimePaused => 'Paused';

  @override
  String get eventAssistanceRuntimeChanged => 'Event changed — review settings';

  @override
  String get eventAssistanceRuntimeExpired => 'Update window ended';

  @override
  String get eventAssistanceRuntimeClosed => 'Event closed';

  @override
  String get eventAssistanceRuntimeConfigured => 'Configured for this event';

  @override
  String get eventAssistanceRuntimeSaved =>
      'Settings saved. This does not confirm enrollment or message delivery. Check guest help and delivery status during the event.';

  @override
  String get eventAssistanceRuntimePauseSaved =>
      'Automation paused. Messages already accepted by a messaging provider may still arrive.';

  @override
  String get eventAssistanceRuntimePending => 'Confirm your previous update';

  @override
  String get eventAssistanceRuntimeRetryBody =>
      'We did not receive a confirmed result. Retry the same update before making another change.';

  @override
  String get eventAssistanceRuntimeReloadBody =>
      'Reload the current event and sender setup before changing these settings.';

  @override
  String get eventAssistanceRuntimeChannels => 'Messaging order';

  @override
  String get eventAssistanceRuntimeChannelBody =>
      'Try the first eligible channel. Fallback uses a later channel only when the delivery rules permit another attempt.';

  @override
  String get eventAssistanceRuntimeFirst => 'First choice';

  @override
  String get eventAssistanceRuntimeSecond => 'First fallback';

  @override
  String get eventAssistanceRuntimeThird => 'Second fallback';

  @override
  String get eventAssistanceRuntimeNone => 'No channel';

  @override
  String get eventAssistanceRuntimeSms => 'SMS';

  @override
  String get eventAssistanceRuntimeRcs => 'RCS';

  @override
  String get eventAssistanceRuntimeWhatsapp => 'WhatsApp';

  @override
  String get eventAssistanceRuntimeSenderMissing =>
      'The saved sender is unavailable. Choose a reviewed sender to save a new configuration.';

  @override
  String get eventAssistanceRuntimeNoSenders =>
      'No eligible sender is available in these choices. Load more if available, or finish sender setup before configuring updates.';

  @override
  String get eventAssistanceRuntimeNeedsSetup => 'Sender setup required';

  @override
  String get eventAssistanceRuntimeApprovalExpired => 'Sender approval expired';

  @override
  String get eventAssistanceRuntimeTemplateMissing =>
      'Joining message approval required';

  @override
  String get eventAssistanceRuntimeMoreSms => 'More SMS senders';

  @override
  String get eventAssistanceRuntimeMoreRcs => 'More RCS senders';

  @override
  String get eventAssistanceRuntimeMoreWhatsapp => 'More WhatsApp senders';

  @override
  String get eventAssistanceRuntimeCustomize => 'Customize timing and retries';

  @override
  String get eventAssistanceRuntimeHide => 'Hide timing and retries';

  @override
  String get eventAssistanceRuntimeUntil => 'Stop updates at';

  @override
  String get eventAssistanceRuntimeUseEventEnd => 'Use event end';

  @override
  String get eventAssistanceRuntimeDeadline => 'Review unanswered guests at';

  @override
  String get eventAssistanceRuntimeNoDeadline => 'No response deadline';

  @override
  String get eventAssistanceRuntimeSetDeadline => 'Set a response deadline';

  @override
  String get eventAssistanceRuntimeDeadlineBody =>
      'A deadline can surface unanswered guests for host review when your late-arrival rules call for it. It never marks them absent.';

  @override
  String get eventAssistanceRuntimeAttempts => 'Attempts per update';

  @override
  String get eventAssistanceRuntimeAttemptsBody =>
      'Maximum attempts across all selected channels for one guest update.';

  @override
  String get eventAssistanceRuntimePerChannel => 'Attempts per channel';

  @override
  String get eventAssistanceRuntimeGap => 'Seconds between retries';

  @override
  String get eventAssistanceRuntimeGapBody =>
      'Wait this long before another permitted delivery attempt.';

  @override
  String get eventAssistanceRuntimePause => 'Pause automatic updates';

  @override
  String get eventAssistanceRuntimeSave => 'Save update settings';

  @override
  String get eventAssistanceRuntimeIssueChannels =>
      'Choose at least one messaging channel.';

  @override
  String get eventAssistanceRuntimeIssueExpiry =>
      'Choose a future stop time within this event.';

  @override
  String get eventAssistanceRuntimeIssueDeadline =>
      'Choose a future response deadline at or before the stop time.';

  @override
  String get eventAssistanceRuntimeRetainedChoices =>
      'Existing later-joining choices are preserved when you change these settings.';

  @override
  String get eventAssistanceRuntimeSaving => 'Saving settings';

  @override
  String get hostEventRehearsalUpdatesBody =>
      'Choose how to deliver practice updates. After saving, choose a late-arrival rule for everyone or a group.';

  @override
  String get hostEventRehearsalUpdatesEntry =>
      'Choose simulated channels, fallback and delivery outcomes.';

  @override
  String get hostEventRehearsalUpdatesChannels =>
      'Channels are simulated; no real messages are sent. Fallback follows the same delivery rules as a live event.';

  @override
  String get hostEventRehearsalUpdatesScript => 'Practice delivery outcomes';

  @override
  String get hostEventRehearsalUpdatesScriptBody =>
      'Each guest uses this sequence for their delivery attempts. An uncertain attempt waits for reconciliation; it does not trigger fallback. After the sequence ends, further attempts wait for review.';

  @override
  String hostEventRehearsalUpdatesAttempt({required int number}) {
    return 'Attempt $number';
  }

  @override
  String get hostEventRehearsalUpdatesUsed => 'Already used in this run';

  @override
  String get hostEventRehearsalUpdatesAddOutcome => 'Add an outcome';

  @override
  String get hostEventRehearsalUpdatesRemoveOutcome => 'Remove last outcome';

  @override
  String get hostEventRehearsalUpdatesIssue =>
      'Review the channels, response deadline and practice outcomes before saving. Outcomes already used and saved joining choices must still match this run.';

  @override
  String get hostEventRehearsalUpdatesSaved =>
      'Saved. The settings shown below are the current settings for this rehearsal.';

  @override
  String get hostEventRehearsalUpdatesDelivered => 'Delivered';

  @override
  String get hostEventRehearsalUpdatesRead => 'Read by guest';

  @override
  String get hostEventRehearsalUpdatesAccepted => 'Accepted, delivery pending';

  @override
  String get hostEventRehearsalUpdatesRevoked => 'Message revoked';

  @override
  String get hostEventRehearsalUpdatesTechnical => 'Technical failure';

  @override
  String get hostEventRehearsalUpdatesPolicy => 'Blocked by channel policy';

  @override
  String get hostEventRehearsalUpdatesSuppressed => 'Guest opted out';

  @override
  String get hostEventRehearsalUpdatesInvalidRecipient => 'Invalid recipient';

  @override
  String get hostEventRehearsalUpdatesTimeout => 'Unknown: request timed out';

  @override
  String get hostEventRehearsalUpdatesConnectionLost =>
      'Unknown: connection lost';

  @override
  String get hostEventRehearsalUpdatesInterrupted =>
      'Unknown: delivery interrupted';

  @override
  String get eventMessagesTitle => 'Event messages';

  @override
  String get eventMessagesEntryBody =>
      'Choose SMS, WhatsApp and RCS updates for this event.';

  @override
  String get eventMessagesIntro =>
      'Choose the updates you want for this event. Each channel is optional and has its own permission.';

  @override
  String get eventMessagesSms => 'SMS';

  @override
  String get eventMessagesWhatsapp => 'WhatsApp';

  @override
  String get eventMessagesRcs => 'RCS';

  @override
  String get eventMessagesNotSet => 'Permission not given';

  @override
  String get eventMessagesEnabled => 'Messages are on';

  @override
  String get eventMessagesDisabled => 'Messages are off';

  @override
  String get eventMessagesExpired => 'Permission has expired';

  @override
  String eventMessagesPhoneEnding({required String digits}) {
    return 'Phone ending in $digits';
  }

  @override
  String eventMessagesUntil({required String date, required String time}) {
    return 'Permission expires $date at $time';
  }

  @override
  String get eventMessagesEarlierSender =>
      'This sender is no longer selected for this event. You can turn off an existing permission.';

  @override
  String get eventMessagesVerifyPhone =>
      'A matching verified phone is required to allow messages. You can still turn off an existing permission.';

  @override
  String get eventMessagesNotAdmitted =>
      'You need a confirmed place at this event to allow messages.';

  @override
  String get eventMessagesEventClosed =>
      'This event is closed for new message permissions.';

  @override
  String get eventMessagesSenderUnavailable =>
      'This sender is not available for new permissions right now.';

  @override
  String get eventMessagesSubscriptionUnavailable =>
      'This RCS sender cannot accept a new permission right now.';

  @override
  String get eventMessagesSaving => 'Saving your choice…';

  @override
  String get eventMessagesUncertain =>
      'We could not confirm your choice. Retry to check the same request.';

  @override
  String get eventMessagesReviewChanged =>
      'Reload the current permission before making another change.';

  @override
  String get eventMessagesSaved => 'Your choice is saved.';

  @override
  String get eventMessagesChanged =>
      'Your permission changed elsewhere. The current choice is shown.';

  @override
  String eventMessagesAllow({required String channel}) {
    return 'Allow $channel updates';
  }

  @override
  String eventMessagesTurnOff({required String channel}) {
    return 'Turn off $channel updates';
  }

  @override
  String get eventMessagesRetry => 'Check my previous choice';

  @override
  String get eventMessagesRefresh => 'Reload';

  @override
  String get eventMessagesLoading => 'Checking availability…';

  @override
  String get eventMessagesUnavailable =>
      'No message option is available for this event.';

  @override
  String get eventMessagesLoadFailed => 'Could not load your permission';

  @override
  String get eventMessagesPending => 'Confirm your previous choice';

  @override
  String get eventMessagesCurrentSender => 'View current event sender';

  @override
  String get eventMessagesOtherSenders => 'Review other senders';

  @override
  String get eventMessagesPreviousPermission => 'Previous permission';

  @override
  String get eventMessagesNextPermission => 'Next permission';

  @override
  String get eventMessagesMorePermissions => 'Find more permissions';

  @override
  String get eventMessagesUnlinked =>
      'Your account is not linked to a guest record for this event yet. Ask the host for help, then reload.';

  @override
  String get eventMessagesAmbiguous =>
      'More than one guest record is linked to your account. Ask the host to resolve the duplicate, then reload.';

  @override
  String hostTodayTaskCountPartial({required int count}) {
    return '$count+';
  }

  @override
  String get hostTodayTaskCoverageIncomplete => 'Some tasks may be missing';

  @override
  String get hostTodayTonight => 'Tonight';

  @override
  String get hostTodayLiveNow => 'Live now';

  @override
  String hostTodayStartsInMinutes({required int minutes}) {
    return 'Starts in $minutes min';
  }

  @override
  String hostTodayStartsInHours({required int hours, required int minutes}) {
    return 'Starts in ${hours}h ${minutes}m';
  }

  @override
  String hostTodayStartsOn({required String date, required String time}) {
    return 'Starts $date · $time';
  }

  @override
  String hostTodayCheckedIn({required int count}) {
    return '$count checked in';
  }

  @override
  String get hostInboxNewMessage => 'New message';

  @override
  String get hostInboxFindPerson => 'Find a person';

  @override
  String get hostInboxChoosePerson =>
      'Choose someone from People or add a new person.';

  @override
  String get hostInboxAddPerson => 'Add person';

  @override
  String get hostInboxReplyVia => 'Reply via';

  @override
  String get hostInboxCatchChannel => 'Catch';

  @override
  String get hostInboxPartialSources =>
      'Some conversations are still loading or unavailable. Available messages are shown.';

  @override
  String get hostInboxMoreConversations => 'Load more conversations';

  @override
  String get hostInboxMoreProgramGuests => 'Load more program guests';

  @override
  String get hostInboxProgramContactsUnlinked =>
      'Some program guests have no verified messaging contact link. They cannot appear in this inbox; guest-to-contact linking is not available here yet.';

  @override
  String get hostInboxUnclassified =>
      'Booking status is unavailable for some people. Their conversations are included below.';

  @override
  String get hostInboxUnknownBooking => 'Booking status unavailable';

  @override
  String hostInboxPartialUnread({required int count}) {
    return 'At least $count unread messages. Some source read counts are unavailable.';
  }

  @override
  String get hostInboxHistoryCoverage =>
      'This conversation shows available retained history. Some older messages may be missing.';

  @override
  String get hostInboxSharedThreadHistory =>
      'This source conversation also covers other events. Its messages are shown together because individual messages do not carry event labels.';

  @override
  String get hostInboxSelectionUnavailable =>
      'This conversation is no longer available in the selected organizer and scope.';

  @override
  String get hostInboxRouteUnavailable =>
      'This reply route is unavailable. Choose an available route or review the person’s details.';

  @override
  String get hostInboxChooseReplyRoute =>
      'Choose a reply route before writing a message.';

  @override
  String get hostInboxAvailableRoutes => 'Available ways to message';

  @override
  String get hostInboxOpenPerson => 'Open person details';

  @override
  String get hostInboxNewMessageUnavailable =>
      'No in-app reply route is currently available. Review contact details and messaging permissions on the person’s record.';

  @override
  String hostInboxMessageVia({required String channel}) {
    return 'Message via $channel';
  }

  @override
  String get hostInboxBookedStatus => 'Booked';

  @override
  String get hostInboxProspectiveStatus => 'Prospective';

  @override
  String get hostInboxOlderMessages => 'Load older Catch messages';

  @override
  String get hostInboxWhatsappReplyChannel => 'WhatsApp';

  @override
  String get hostTodayAddCustomerAction => 'Add a contact';

  @override
  String get hostTodayAddCustomerTitle => 'Start with someone you know';

  @override
  String get hostTodayAudienceAction => 'Open People';

  @override
  String get hostTodayAudienceBody =>
      'Keep your community in one place. Add contacts, review their history, and build an audience for your next event.';

  @override
  String get hostTodayAudienceTitle => 'Get to know your audience';

  @override
  String get hostTodayChangeFocus => 'Change';

  @override
  String get hostTodayExploreFocus => 'Explore at your own pace';

  @override
  String get hostTodayFocusAudienceBody =>
      'Organize contacts and learn who comes back.';

  @override
  String get hostTodayFocusAudienceTitle => 'Grow and understand my audience';

  @override
  String get hostTodayFocusBackToToday => 'Back to Today';

  @override
  String get hostTodayFocusContinue => 'Continue';

  @override
  String get hostTodayFocusHeading => 'What would you like to work on?';

  @override
  String get hostTodayFocusIntroduction =>
      'Choose a focus for Today. You can change it whenever you like.';

  @override
  String get hostTodayFocusPresenceBody =>
      'Shape your public page and prepare to welcome guests.';

  @override
  String get hostTodayFocusPresenceTitle => 'Build my organizer presence';

  @override
  String get hostTodayFocusRehearsalBody =>
      'Practice with a rehearsal before your next live event.';

  @override
  String get hostTodayFocusRehearsalTitle => 'Get confident running events';

  @override
  String get hostTodayFocusSafety =>
      'Live events and anything needing attention always come first.';

  @override
  String get hostTodayFocusScreenTitle => 'Your focus';

  @override
  String get hostTodayFocusSkip => 'Explore for now';

  @override
  String get hostTodayFocusUnavailable => 'Organizer unavailable';

  @override
  String get hostTodayFocusUnavailableBody =>
      'Return to Today and choose an organizer you can manage.';

  @override
  String get hostTodayMilestoneAudience => 'Audience established';

  @override
  String get hostTodayMilestoneAvailable => 'Ready to explore';

  @override
  String get hostTodayMilestoneComplete => 'Completed';

  @override
  String get hostTodayMilestoneOwnerOnly => 'Organizer owner only';

  @override
  String get hostTodayMilestonePage => 'Public organizer page';

  @override
  String get hostTodayMilestonePayouts => 'Payouts ready';

  @override
  String get hostTodayMilestoneRehearsal => 'Rehearsal completed';

  @override
  String get hostTodayMilestoneUnknown => 'Not yet verified';

  @override
  String get hostTodayPayoutsAction => 'Manage payouts';

  @override
  String get hostTodayPayoutsBody =>
      'Set up payouts when you are ready to take payments. This is optional for organizers running free events.';

  @override
  String get hostTodayPracticeAction => 'Run a dress rehearsal';

  @override
  String get hostTodayPracticeBody =>
      'Try the event controls with practice guests. Build confidence without changing a live event.';

  @override
  String get hostTodayPracticeTitle => 'Practice before event day';

  @override
  String get hostTodayPresenceAction => 'Open organizer page';

  @override
  String get hostTodayPresenceBody =>
      'Help guests understand your community and find your events. Review your public page and choose when to publish it.';

  @override
  String get hostTodayPresenceTitle => 'Make your organizer page yours';

  @override
  String get hostTodayRoadmapIntroduction =>
      'Explore what is useful for your community. Progress reflects verified activity; every feature is optional.';

  @override
  String get hostTodayRoadmapTitle => 'Your roadmap';

  @override
  String get hostTodayYourFocus => 'Your focus';

  @override
  String get hostTodayRehearseThisEvent => 'Rehearse this event';

  @override
  String get hostWorkShellTitle => 'Work';

  @override
  String get hostWorkShellSubtitle => 'Your staff assignments';

  @override
  String get hostWorkShellEmptyTitle => 'No assignments yet';

  @override
  String get hostWorkShellEmptyMessage =>
      'When an organizer grants you duties for an event or program, they show up here.';

  @override
  String get hostWorkAssignmentKindEvent => 'Event';

  @override
  String get hostWorkAssignmentKindProgram => 'Program';

  @override
  String hostWorkAssignmentExpires({required Object date}) {
    return 'Ends $date';
  }

  @override
  String get hostWorkDutyProgramCoordinator => 'Coordinator';

  @override
  String get hostWorkDutyGuestRelations => 'Guest relations';

  @override
  String get hostWorkDutyCommunications => 'Communications';

  @override
  String get hostWorkDutyFunctionCheckIn => 'Check-in';

  @override
  String get hostWorkDutyFunctionLead => 'Function lead';

  @override
  String get hostWorkDutyAirportGreeter => 'Airport greeter';

  @override
  String get hostWorkDutyHotelDesk => 'Hotel desk';

  @override
  String get hostWorkDutyTransportDispatcher => 'Dispatcher';

  @override
  String get hostWorkDutyReconciliationViewer => 'Reconciliation';

  @override
  String get hostWorkDutyStakeholderViewer => 'Viewer';

  @override
  String get hostWorkDutyEventLead => 'Event lead';

  @override
  String get hostRehearsalEntryUpcoming => 'Rehearse your next event';

  @override
  String get hostRehearsalStartTitle => 'Start dress rehearsal';

  @override
  String get hostRehearsalStartSubtitle => 'Choose a starting point';

  @override
  String hostRehearsalStartUpcoming({required String title}) {
    return 'Rehearse $title';
  }

  @override
  String hostRehearsalStartUpcomingDescription({required int count}) {
    return 'Uses its format and $count-person guest list. You can adjust the rehearsal copy.';
  }

  @override
  String get hostRehearsalStartCustom => 'Create a custom rehearsal';

  @override
  String get hostRehearsalStartCustomDescription =>
      'Start with organiser defaults, then choose the format, guests and scenario.';

  @override
  String get hostRehearsalEntrySample => 'Practise hosting';

  @override
  String get hostRehearsalEntryExplanation =>
      'Practise with a coach in the event screen.';

  @override
  String get hostRehearsalUpcomingLabel => 'Your next event';

  @override
  String get hostRehearsalSampleLabel => 'Organiser default';

  @override
  String hostRehearsalSampleTitle({required String activity}) {
    return 'Sample $activity';
  }

  @override
  String get hostRehearsalSampleDescription =>
      'Your usual setup, with simulated guests.';

  @override
  String get hostRehearsalCopiedDescription =>
      'Same setup and attendee list, copied for practice.';

  @override
  String get hostRehearsalCustomDescription =>
      'Practice copy with custom settings.';

  @override
  String get hostRehearsalScenarioLabel => 'Scenario';

  @override
  String get hostRehearsalCustomise => 'Customise rehearsal';

  @override
  String get hostRehearsalCustomiseSummary =>
      'Guests, event details and playbook';

  @override
  String get hostRehearsalCustomisedSummary =>
      'Custom settings · Edit or reset';

  @override
  String get hostRehearsalSafety =>
      'Your real event and attendees stay unchanged.';

  @override
  String get hostRehearsalStart => 'Start rehearsal';

  @override
  String get hostRehearsalChangesLocal =>
      'Changes apply only to this rehearsal.';

  @override
  String get hostRehearsalEventType => 'Event type';

  @override
  String get hostRehearsalEventTypeDescription =>
      'Format for this practice copy';

  @override
  String get hostRehearsalGuests => 'Guests';

  @override
  String hostRehearsalCopiedGuests({required int count}) {
    return '$count attendees from this event';
  }

  @override
  String get hostRehearsalSimulatedGuests => 'Use simulated guests';

  @override
  String get hostRehearsalGuestCount => 'Number of simulated guests';

  @override
  String get hostRehearsalGuestCountRange => 'Choose between 2 and 50 guests.';

  @override
  String get hostRehearsalDurationLimit =>
      'Rehearsals run for 30 minutes to 6 hours. Open Customise rehearsal to adjust the duration of this practice copy.';

  @override
  String hostRehearsalRosterLimit({required int count}) {
    return 'This event has $count attendees. Rehearsals support 2–50 guests. Choose simulated guests to practise this event.';
  }

  @override
  String get hostRehearsalEventDetails => 'Event details';

  @override
  String get hostRehearsalEventDetailsDescription =>
      'Title, venue, duration and host notes';

  @override
  String get hostRehearsalEventTitle => 'Event title';

  @override
  String get hostRehearsalVenue => 'Venue';

  @override
  String get hostRehearsalDuration => 'Event length (minutes)';

  @override
  String get hostRehearsalDurationRange => 'Choose between 30 and 360 minutes.';

  @override
  String get hostRehearsalHostGoal => 'Host goal';

  @override
  String get hostRehearsalGuestPrompt => 'Guest prompt';

  @override
  String get hostRehearsalPlaybook => 'Playbook';

  @override
  String get hostRehearsalPlaybookDescription =>
      'Choose which parts of the event to include';

  @override
  String get hostRehearsalReset => 'Reset to default settings';

  @override
  String get hostRehearsalChooseSource => 'Choose what to rehearse';

  @override
  String get hostRehearsalSampleVenue => 'Practice venue';

  @override
  String get hostRehearsalSamplePrompt =>
      'Say hello and share something you enjoy doing.';

  @override
  String hostRehearsalSourceDetails({
    required String date,
    required String time,
    required String venue,
    required int count,
  }) {
    return '$date · $time\n$venue · $count attendees';
  }

  @override
  String get hostRehearsalSelectModule =>
      'Include at least one part of the event.';

  @override
  String get hostRehearsalModuleArrival => 'Arrivals';

  @override
  String get hostRehearsalModuleFirstHello => 'First introductions';

  @override
  String get hostRehearsalModulePods => 'Small groups';

  @override
  String get hostRehearsalModuleRotations => 'Rotations';

  @override
  String get hostRehearsalModuleCues => 'Conversation prompts';

  @override
  String get hostRehearsalModuleReveal => 'Reveal';

  @override
  String get hostRehearsalModuleAfterglow => 'After-event follow-up';

  @override
  String get hostRehearsalModuleAccountability => 'Guest accountability';

  @override
  String hostRehearsalSourceWhenWhere({
    required String date,
    required String time,
    required String venue,
  }) {
    return '$date · $time\n$venue';
  }

  @override
  String get hostRehearsalRequiredModule => 'Included in this event type';

  @override
  String get hostCustomersTimelineUnavailable =>
      'No activity is available in this view. History may be incomplete.';

  @override
  String get hostCustomersNoContactMethods => 'No phone number or email saved.';

  @override
  String get hostCustomersSubmissionsUnavailable =>
      'Form responses are unavailable or incomplete.';

  @override
  String get hostCustomersAttendancePartial =>
      'Attendance covers the records available to your team. Some activity may be missing.';

  @override
  String hostCustomersAttendanceSummary({
    required int cancelled,
    required int noShows,
    required int imported,
  }) {
    return '$cancelled cancelled · $noShows no-shows · $imported imported';
  }

  @override
  String get hostCustomersAccountLink => 'Catch account';

  @override
  String get hostCustomersAccountNeedsReview => 'Possible matches need review';

  @override
  String get hostCustomersAccountVerified => 'Verified account linked';

  @override
  String get hostCustomersAccountNotVerified => 'No verified account linked';

  @override
  String get hostAudienceRecentlyUpdated => 'Recently updated';

  @override
  String get hostAudienceSelectedPerson => 'Selected person';

  @override
  String get hostFormPaymentTitle => 'Form payment';

  @override
  String get hostFormPaymentFree => 'No payment required';

  @override
  String get hostFormPaymentHelp =>
      'Collect a fee before a response is submitted. Payment does not accept an application or book an event.';

  @override
  String get hostFormPaymentUnavailable =>
      'Form payments are not available yet. Catch must finish its Razorpay connection setup. You can continue using free forms.';

  @override
  String get hostFormPaymentConnect => 'Connect Razorpay';

  @override
  String get hostFormPaymentConnectHelp =>
      'Authorize your existing Razorpay account in your browser, then return and check the connection.';

  @override
  String get hostFormPaymentRefresh => 'Check connection';

  @override
  String get hostFormPaymentReady => 'Ready for payments';

  @override
  String get hostFormPaymentConnecting => 'Finish connecting in your browser';

  @override
  String get hostFormPaymentAttention =>
      'Reconnect Razorpay to restore payments';

  @override
  String get hostFormPaymentDisconnected => 'Disconnected';

  @override
  String get hostFormPaymentTest => 'Test mode — no real money';

  @override
  String get hostFormPaymentLive => 'Live payments';

  @override
  String get hostFormPaymentConfigure => 'Set a submission fee';

  @override
  String get hostFormPaymentEdit => 'Edit submission fee';

  @override
  String get hostFormPaymentRemove => 'Remove fee from draft';

  @override
  String get hostFormPaymentPhoneRequired =>
      'Choose verified phone in Access before adding a fee. This lets applicants recover their payment and response securely.';

  @override
  String get hostFormPaymentConnectionRequired =>
      'Connect a ready Razorpay account before setting a fee.';

  @override
  String get hostFormPaymentAmount => 'Amount (INR)';

  @override
  String get hostFormPaymentAmountHelp =>
      'Enter ₹1 to ₹100,000, with up to two decimal places. For example, 100 or 200.';

  @override
  String get hostFormPaymentDescription => 'What is the fee for?';

  @override
  String get hostFormPaymentDescriptionDefault => 'Application fee';

  @override
  String get hostFormPaymentRefundPolicy => 'Refund policy';

  @override
  String get hostFormPaymentRefundHelp =>
      'Explain when you will refund the fee, including if an application is declined. Applicants see this before paying.';

  @override
  String get hostFormPaymentSave => 'Save fee';

  @override
  String get hostFormPaymentDisconnect => 'Disconnect account';

  @override
  String get hostFormPaymentDisconnectHelp =>
      'This stops new checkouts on every form using this account. Existing payments and refunds will still be reconciled.';

  @override
  String get hostFormPaymentPublishHelp =>
      'This fee applies to new submissions after publishing. Previously started checkouts keep their original fee.';

  @override
  String get hostFormPaymentAccount => 'Razorpay account';

  @override
  String get hostFormPaymentsTitle => 'Payments';

  @override
  String get hostFormPaymentsHelp =>
      'Newest first. Payment confirmation and form submission are tracked separately. Test payments do not move real money.';

  @override
  String get hostFormPaymentsRefresh => 'Refresh payments';

  @override
  String get hostFormPaymentsPending => 'Pending';

  @override
  String get hostFormPaymentsRefunds => 'Refunds';

  @override
  String get hostFormPaymentsAttention => 'Needs attention';

  @override
  String get hostFormPaymentsEmpty => 'No payment records';

  @override
  String get hostFormPaymentsEmptyBody =>
      'Checkout attempts will appear here when someone starts paying for a submission.';

  @override
  String get hostFormPaymentsNoMatches => 'No payments in this stage';

  @override
  String get hostFormPaymentsNoMatchesBody =>
      'Choose All to see other payment stages.';

  @override
  String get hostFormPaymentsCreatingOrder => 'Starting checkout';

  @override
  String get hostFormPaymentsOrderUnknown => 'Confirming checkout';

  @override
  String get hostFormPaymentsCheckoutReady => 'Awaiting payment';

  @override
  String get hostFormPaymentsVerifying => 'Verifying payment';

  @override
  String get hostFormPaymentsCaptured => 'Paid · submission pending';

  @override
  String get hostFormPaymentsSubmitted => 'Paid · submitted';

  @override
  String get hostFormPaymentsFailed => 'Payment attempt failed';

  @override
  String get hostFormPaymentsExpired => 'Checkout expired';

  @override
  String get hostFormPaymentsRefundPending => 'Refund pending';

  @override
  String get hostFormPaymentsRefunded => 'Refunded';

  @override
  String get hostFormPaymentsReviewRequired => 'Payment needs review';

  @override
  String get hostFormPaymentsCapturedHelp =>
      'Payment is confirmed. Catch is still completing the submission. Refresh to check its progress.';

  @override
  String get hostFormPaymentsSubmittedHelp =>
      'Payment is confirmed and the form response has been submitted. Acceptance and event admission are separate.';

  @override
  String get hostFormPaymentsPendingHelp =>
      'This checkout is not confirmed as a completed payment. No form response has been submitted yet.';

  @override
  String get hostFormPaymentsFailedHelp =>
      'This payment attempt failed. The applicant can retry while checkout is available.';

  @override
  String get hostFormPaymentsExpiredHelp =>
      'This checkout has expired. If a payment arrives late and cannot be submitted, Catch will attempt a refund.';

  @override
  String get hostFormPaymentsRefundHelp =>
      'Check the refund in the connected Razorpay account using the references below. Withdrawing a response or declining an application does not automatically refund a fee.';

  @override
  String get hostFormPaymentsReviewHelp =>
      'Automatic recovery needs attention. Check the connected Razorpay account using these references before taking further action.';

  @override
  String get hostFormPaymentsAmount => 'Submission fee';

  @override
  String get hostFormPaymentsRefundAmount => 'Confirmed refunds';

  @override
  String get hostFormPaymentsStarted => 'Checkout started';

  @override
  String get hostFormPaymentsUpdated => 'Last checked';

  @override
  String get hostFormPaymentsCapturedAt => 'Payment captured';

  @override
  String get hostFormPaymentsSubmittedAt => 'Response submitted';

  @override
  String get hostFormPaymentsReferences => 'Payment references';

  @override
  String get hostFormPaymentsReceipt => 'Receipt reference';

  @override
  String get hostFormPaymentsOrderReference => 'Razorpay order';

  @override
  String get hostFormPaymentsPaymentReference => 'Razorpay payment';

  @override
  String get hostFormPaymentsRefundReference => 'Razorpay refund';

  @override
  String get hostFormPaymentsTestHelp =>
      'Test payment. No real money was collected.';

  @override
  String get hostFormPaymentsOpenResponse => 'Open submitted response';

  @override
  String get hostFormMessagingTitle => 'Optional WhatsApp choices';

  @override
  String get hostFormMessagingOrganizer => 'Offer updates from this organizer';

  @override
  String get hostFormMessagingCatch => 'Offer updates from Catch';

  @override
  String get hostFormMessagingHelp =>
      'These settings add separate, unchecked choices to the form. Applicants can choose either, both, or neither. Payment and submission never grant messaging permission. Publish to update the form.';

  @override
  String get hostFormMessagingPhoneRequired =>
      'Choose verified phone in Access to offer WhatsApp updates.';

  @override
  String get hostFormMessagingOperations =>
      'Offer application and event WhatsApp updates';

  @override
  String get hostFormMessagingFuture =>
      'Offer future event and offer WhatsApp messages';

  @override
  String get hostFormMessagingCatchFuture =>
      'Offer Catch experience and offer WhatsApp messages';

  @override
  String get hostFormMessagingPurposeHelp =>
      'Each choice is optional and unchecked for applicants. They can submit without subscribing. A selected choice stays pending until they verify the same phone number.';

  @override
  String get hostFormAnswerDestinationLabel => 'Profile use';

  @override
  String get hostFormAnswerOrganizerOnly => 'Organizer only';

  @override
  String get hostFormAnswerCatchProfile => 'Catch profile';

  @override
  String get hostFormAnswerOrganizerCard => 'Organizer card';

  @override
  String get hostFormAnswerOrganizerOnlyHelp =>
      'Stays in your form response. A person-field label does not add it to a Catch profile. Choose a supported person field above to offer a Catch profile building block.';

  @override
  String get hostFormAnswerCatchProfileHelp =>
      'Requires verified phone access. Prepares this answer privately for the applicant. They must claim their profile and choose what to share before other participants can see it.';

  @override
  String get hostFormAnswerOrganizerCardHelp =>
      'Requires verified phone access. The applicant can see this answer in their private card for your organizer. Other organizers cannot see it. Event sharing needs their permission.';

  @override
  String get messagingPermissionsTitle => 'WhatsApp permissions';

  @override
  String get messagingPermissionsDescription =>
      'Choose who can send you WhatsApp updates. Catch and each organizer have separate permissions. Stopping updates does not change your form submission, booking, or event-service messages.';

  @override
  String get messagingPermissionsCatch => 'Catch';

  @override
  String get messagingPermissionsOn => 'Updates allowed';

  @override
  String get messagingPermissionsOff => 'Updates stopped';

  @override
  String get messagingPermissionsUnknown => 'No confirmed permission';

  @override
  String get messagingPermissionsCatchHelp =>
      'Event recommendations and Catch updates.';

  @override
  String get messagingPermissionsOrganizerHelp =>
      'Event announcements and updates from this organizer only.';

  @override
  String get messagingPermissionsStop => 'Stop updates';

  @override
  String get messagingPermissionsOperations => 'Application and event updates';

  @override
  String get messagingPermissionsOrganizerMarketing =>
      'Future events and offers';

  @override
  String get messagingPermissionsCatchMarketing =>
      'Catch experiences and offers';

  @override
  String get messagingPermissionsStopPurpose => 'Stop these messages';

  @override
  String get hostCustomersWhatsappOperations => 'Application and event updates';

  @override
  String get hostCustomersWhatsappMarketing => 'Future events and offers';

  @override
  String get messagingPermissionsRefresh => 'Refresh permissions';

  @override
  String get messagingPermissionsSettingsHelp =>
      'Manage Catch and organizer WhatsApp updates separately.';

  @override
  String get eventProfilePersonalize => 'Personalize your event profile';

  @override
  String get eventProfileFirstName => 'First name for this event';

  @override
  String get eventProfileIntroduction => 'Introduction for this event';

  @override
  String get eventProfileQuestionAudience =>
      'Share this answer with event members';

  @override
  String get eventProfilePreview => 'Preview what event members can see';

  @override
  String get formProfilesTabLabel => 'Forms & cards';

  @override
  String get formProfilesTitle => 'Forms & private cards';

  @override
  String get formProfilesDescription =>
      'Your form details, grouped by organizer. Review unclaimed submissions and manage the answers saved to each private card. Other organizers cannot see these cards.';

  @override
  String get formProfilesEmptyTitle => 'No form profiles yet';

  @override
  String get formProfilesEmptyBody =>
      'Forms with Catch profile fields or private card fields appear here after you submit with your verified phone number.';

  @override
  String get formProfilesLoadMore => 'Load more';

  @override
  String get formProfilesOrganizerFallback => 'Organizer';

  @override
  String get formProfileReviewTitle => 'Review your profile';

  @override
  String get formProfileReviewDescription =>
      'Choose which form details to use. Saving does not change your original submission, admit you to an event, or turn on dating discovery.';

  @override
  String get formProfileCoreTitle => 'Catch profile details';

  @override
  String get formProfileCardTitle => 'Your private organizer card';

  @override
  String get formProfileCardDescription =>
      'This card is private to you. Other organizers cannot see it. You can separately choose answers to share in an eligible event chat. The original organizer still has your form response; removing an answer here only removes it from your card.';

  @override
  String get formProfileKeepAnswer => 'Keep on my private card';

  @override
  String get formProfileUseAnswer => 'Use for my Catch profile';

  @override
  String get formProfileBasicsTitle => 'Review your identity';

  @override
  String get formProfileBasicsDescription =>
      'Your verified sign-in phone identifies your account. Review your name, date of birth and gender before saving.';

  @override
  String get formProfileDisplayName => 'Display name';

  @override
  String get formProfileBirthDate => 'Date of birth';

  @override
  String get formProfileGender => 'Gender';

  @override
  String get formProfileDateHint => 'YYYY-MM-DD · You must be 18 or older.';

  @override
  String get formProfileConfirmation => 'I have reviewed these details';

  @override
  String get formProfileConfirmationBody =>
      'Catch can store the profile details I choose. They remain subject to my sharing settings. My private organizer card stays private until I choose to share it.';

  @override
  String get formProfileSave => 'Save reviewed details';

  @override
  String get formProfileSaved => 'Your reviewed details have been saved.';

  @override
  String get formProfileYes => 'Yes';

  @override
  String get formProfileNo => 'No';

  @override
  String get formProfileEmptyAnswer => 'No answer';

  @override
  String get formProfileAttachment => 'Submitted attachment';

  @override
  String get formProfileReload => 'Reload latest details';

  @override
  String get formProfilePhoneAuthority =>
      'Your sign-in phone is verified separately. This form answer cannot change it.';

  @override
  String get formProfileUnsupported =>
      'This answer can stay in your private form submission. It cannot be copied into a Catch profile field here.';

  @override
  String get formProfileInvalid =>
      'Check the highlighted fields before saving.';

  @override
  String get formProfileRequired => 'Enter a valid value.';

  @override
  String get formProfileUsePhoto => 'Use this photo for my Catch profile';

  @override
  String get formProfilePhotoRetry => 'Retry photo preview';

  @override
  String get eventChatTitle => 'Event chat';

  @override
  String get eventChatEntryBody => 'Meet the people attending this event.';

  @override
  String get eventChatOpen => 'Open event chat';

  @override
  String get eventChatClose => 'Close event chat';

  @override
  String get eventChatSchedule => 'Schedule room hours';

  @override
  String get eventChatPause => 'Pause posting';

  @override
  String get eventChatAnnouncementsOnly => 'Announcements only';

  @override
  String get eventChatResume => 'Resume posting';

  @override
  String get eventChatArchive => 'Archive room';

  @override
  String get eventChatArchiveDisclosure =>
      'Archiving permanently closes this room. Members will no longer read or post messages, and you cannot reopen it.';

  @override
  String get eventChatMute => 'Mute room notifications';

  @override
  String get eventChatUnmute => 'Unmute room notifications';

  @override
  String get eventChatAnnouncement => 'Announcement';

  @override
  String get eventChatInvalidSchedule =>
      'Choose a future opening and a later closing time.';

  @override
  String get eventChatReadOnly =>
      'Posting is paused. You can still read messages.';

  @override
  String get eventChatAnnouncementsReadOnly =>
      'Only hosts can post announcements right now. You can still read messages.';

  @override
  String get eventChatRemoved => 'Message removed.';

  @override
  String get eventChatRemoveMember => 'Remove from room';

  @override
  String get eventChatBanMember => 'Ban from room';

  @override
  String get eventChatReinstateMember => 'Allow rejoin';

  @override
  String get eventChatMemberRemoved => 'Removed from room';

  @override
  String get eventChatMemberBanned => 'Banned from room';

  @override
  String get eventChatMemberActions => 'Member actions';

  @override
  String get eventChatRemoveMemberDisclosure =>
      'They will lose access to this room until a host allows them to rejoin. Their event booking is unchanged.';

  @override
  String get eventChatBanMemberDisclosure =>
      'They cannot access or rejoin this room until a host allows them to rejoin. Their event booking is unchanged.';

  @override
  String get eventChatReinstateMemberDisclosure =>
      'They can choose to join again if they still have event admission. This does not join them automatically.';

  @override
  String get eventChatLeave => 'Leave chat';

  @override
  String get eventChatJoin => 'Join event chat';

  @override
  String get eventChatNotOpen => 'The chat is not open yet';

  @override
  String get eventChatHostSetup =>
      'Open a shared conversation for people admitted to this event. Each person chooses whether to join.';

  @override
  String get eventChatGuestWaiting =>
      'Your host can open a shared conversation for people attending this event.';

  @override
  String get eventChatJoinTitle => 'Meet your fellow attendees';

  @override
  String get eventChatJoinDisclosure =>
      'Joining shares your name and messages with the people in this event chat. Your form answers and private organizer cards stay private unless you choose to share them. Joining does not turn on dating discovery.';

  @override
  String get eventChatProfileRequired =>
      'Review your Catch profile before joining';

  @override
  String get eventChatProfileHelp =>
      'Choose the name you want other attendees to see. Your submitted form details stay private until you review them.';

  @override
  String get eventChatReviewProfile => 'Review my profile';

  @override
  String get eventChatProfileHostHelp =>
      'Review your Catch profile in the consumer app, then return here to join. You can open or close this room as a host.';

  @override
  String get eventChatEmptyTitle => 'Start the conversation';

  @override
  String get eventChatEmptyBody =>
      'Say hello, ask a question or make a plan for the event.';

  @override
  String get eventChatEarlier => 'Earlier messages';

  @override
  String get eventChatMessageActions => 'Message actions';

  @override
  String get eventChatReply => 'Reply';

  @override
  String get eventChatReact => 'React';

  @override
  String get eventChatClearReply => 'Cancel reply';

  @override
  String get eventChatUnavailable => 'Message unavailable';

  @override
  String get eventChatReactionLike => 'Like';

  @override
  String get eventChatReactionLove => 'Love';

  @override
  String get eventChatReactionLaugh => 'Laugh';

  @override
  String get eventChatReactionWow => 'Surprised';

  @override
  String get eventChatReactionSad => 'Sad';

  @override
  String get eventChatReactionThanks => 'Thanks';

  @override
  String get eventChatReactionsTitle => 'Choose a reaction';

  @override
  String get eventChatCloseReactions => 'Close reactions';

  @override
  String get eventChatYou => 'You';

  @override
  String get eventChatRefresh => 'Refresh chat';

  @override
  String eventChatReplyingTo({required String name}) {
    return 'Replying to $name';
  }

  @override
  String eventChatTyping({required String names}) {
    return '$names typing…';
  }

  @override
  String get eventChatsTab => 'Events';

  @override
  String get directMessagesTab => 'Direct messages';

  @override
  String get eventChatsEmptyTitle => 'Your event conversations';

  @override
  String get eventChatsEmptyBody =>
      'Event chats appear here when you are on the attendee list. You can review your profile and choose to join once the host opens the chat.';

  @override
  String get eventChatsWaiting => 'Waiting for the host to open the chat';

  @override
  String get eventChatsReviewProfile => 'Review your profile to join';

  @override
  String get eventChatsJoined => 'You joined this conversation';

  @override
  String get eventChatsReady => 'Ready to join';

  @override
  String get eventChatsLoadMore => 'Check more events';

  @override
  String get hostResponseSaveReviewNote => 'Save review note';

  @override
  String get hostResponseStartReview => 'Start application review';

  @override
  String get eventProfileTitle => 'Event profile';

  @override
  String get eventProfileMine => 'My event profile';

  @override
  String get eventProfileDisclosure =>
      'Your name is visible when you join. Choose any extra details to share with people in this event chat, including its hosts. These choices apply only to this event.';

  @override
  String get eventProfileCardDisclosure =>
      'Choose answers you kept in this organizer’s private card. Your other organizer cards and private host notes are never included.';

  @override
  String get eventProfileCore => 'Catch profile details';

  @override
  String get eventProfileCard => 'Organizer card';

  @override
  String get eventProfilePhoto => 'Profile photo';

  @override
  String get eventProfileNoPhoto => 'No photo shared';

  @override
  String get eventProfileNoCard => 'No card selected';

  @override
  String get eventProfileChooseCard => 'Choose a private card';

  @override
  String get eventProfileNoCards =>
      'No claimed cards from this organizer are available. You can review your submitted forms from your account.';

  @override
  String get eventProfileMoreCards => 'Load more cards';

  @override
  String get eventProfileSave => 'Save sharing choices';

  @override
  String get eventProfileStop => 'Stop sharing extra details';

  @override
  String get eventProfileSaved => 'Event profile updated';

  @override
  String get eventProfileCannotShare =>
      'To share extra details, you need to review and claim your profile, be admitted to this event, and join its chat. You can still remove an earlier sharing choice.';

  @override
  String get eventProfileEmpty => 'Only their name is shared';

  @override
  String get eventProfileEmptyBody =>
      'This person has not shared extra profile details with this event chat.';

  @override
  String get eventProfileSharedHere => 'Shared with this event chat';

  @override
  String get eventProfileSelectedAnswers => 'Selected organizer answers';

  @override
  String get eventProfileReviewAgain =>
      'Changed profile details or answers need to be selected again before sharing.';

  @override
  String get eventProfileView => 'View event profile';

  @override
  String get eventProfileEditAgain =>
      'After saving, review your choices here whenever you want to change or stop sharing.';

  @override
  String eventProfilePhotoLabel({required int number}) {
    return 'Photo $number';
  }

  @override
  String get eventProfileChoosePhoto => 'Share this photo';

  @override
  String get eventProfilePhotoUnavailable =>
      'Photo preview unavailable. Reload before selecting it.';

  @override
  String get formProfilesUnclaimed =>
      'Not claimed · Review before using in Catch';

  @override
  String get formProfilesNoCardAnswers =>
      'Reviewed · No answers saved to a private card';

  @override
  String formProfilesSavedAnswers({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count answers saved to your private card',
      one: '1 answer saved to your private card',
    );
    return '$_temp0';
  }

  @override
  String get profileActivityPreferencesTitle => 'Activity preferences';

  @override
  String get profileActivityPreferencesBody =>
      'Optional pace, distances and run preferences.';

  @override
  String get profileCoreDetailsTitle => 'Your Catch profile';

  @override
  String get profileCoreDetailsBody =>
      'Manage your photos and core details here. Form answers stay with their organizer unless you explicitly use a Catch profile field. Choose what to share in each event chat.';

  @override
  String get eventChatParticipantsTitle => 'Participants';

  @override
  String get eventChatParticipantsDescription =>
      'People who have joined this event chat. Open a profile to see the details they chose to share here.';

  @override
  String get eventChatParticipantsEmpty =>
      'No participants are available to show.';

  @override
  String get eventChatParticipantsContinue =>
      'No visible participants in this part of the list. Continue to check the remaining participants.';

  @override
  String get eventChatParticipantsMore => 'Show more participants';

  @override
  String get eventChatParticipantHost => 'Host';

  @override
  String get eventChatParticipantAttendee => 'Attendee';

  @override
  String get eventChatReport => 'Report message';

  @override
  String get eventChatBlock => 'Block sender';

  @override
  String get eventChatRemove => 'Remove message';

  @override
  String get eventChatReportDisclosure =>
      'Choose a reason to send this message to Catch for review. The sender will not see your report.';

  @override
  String get eventChatReportHarassment => 'Harassment or abuse';

  @override
  String get eventChatReportSpam => 'Spam or scam';

  @override
  String get eventChatReportInappropriate => 'Inappropriate content';

  @override
  String get eventChatReportOther => 'Something else';

  @override
  String get eventChatBlockDisclosure =>
      'You and this person will stop seeing each other’s messages and event profiles. They stay in the event, and other participants can still see them. You can unblock them in Settings.';

  @override
  String get eventChatRemoveDisclosure =>
      'This message and its reply previews will be hidden from everyone in the room. You cannot undo this. Catch may retain a private record for safety review.';

  @override
  String get eventChatReported => 'Report sent to Catch.';

  @override
  String get eventChatBlocked => 'Sender blocked.';

  @override
  String get eventChatMembershipRemoved =>
      'Your room membership is unavailable. Contact the host if you need help.';

  @override
  String get programsWorkShellTitle => 'Program operations';

  @override
  String get programsWorkShellAccessTitle => 'Restricted program access';

  @override
  String get programsWorkShellAccessSubtitle =>
      'This workspace shows only the duties and scopes granted for this program.';

  @override
  String get programsWorkShellRoleManager => 'Organizer manager';

  @override
  String get programsWorkShellRoleStaff => 'Program staff';

  @override
  String get programsWorkArrivalsTitle => 'Airport arrivals';

  @override
  String get programsWorkArrivalsSubtitle =>
      'Live guest roster for each pickup station in your scope.';

  @override
  String get programsWorkDispatchTitle => 'Dispatch desk';

  @override
  String get programsWorkDispatchSubtitle =>
      'Vehicle suggestions and plate capture per station.';

  @override
  String get programsWorkHotelTitle => 'Hotel desk';

  @override
  String get programsWorkHotelSubtitle =>
      'Inbound vehicles and expected guests for your hotel.';

  @override
  String get programsWorkDoorTitle => 'Door check-in';

  @override
  String get programsWorkDoorSubtitle =>
      'Venue check-in lists for your functions.';

  @override
  String get programsWorkLedgerTitle => 'Trip ledger';

  @override
  String get programsWorkLedgerSubtitle =>
      'Every dispatch as a reconciliation record.';

  @override
  String get programsWorkLedgerOpen => 'Open trip ledger';

  @override
  String get programsWorkCountsTitle => 'Program counts';

  @override
  String get programsWorkCountsSubtitle =>
      'Headcounts, responses and occupancy at a glance.';

  @override
  String get programsWorkCountsOpen => 'Open counts overview';

  @override
  String get programsWorkAttendanceTitle => 'Attendance report';

  @override
  String get programsWorkAttendanceSubtitle =>
      'RSVP truth vs door truth per function, with exception queues.';

  @override
  String get programsWorkAttendanceOpen => 'Open attendance report';

  @override
  String get programsWorkCommsTitle => 'Communications';

  @override
  String get programsWorkCommsSubtitle =>
      'Program announcements and guest conversations.';

  @override
  String get programsWorkCommsMomentsRow => 'Moments';

  @override
  String get programsWorkCommsInboxRow => 'Guest inbox';

  @override
  String get programsWorkGuestsTitle => 'Guest desk';

  @override
  String get programsWorkGuestsSubtitle =>
      'Households, function RSVPs and manifest imports.';

  @override
  String get programsWorkLeadTitle => 'Function lead';

  @override
  String get programsWorkLeadSubtitle =>
      'Timeline and alerts for your functions.';

  @override
  String get programsWorkLeadNowNextRow => 'Now & next';

  @override
  String get programsWorkLeadAttentionRow => 'Attention';

  @override
  String get programsNowNextTitle => 'Now & next';

  @override
  String get programsNowNextSubtitle => 'Your functions across the day.';

  @override
  String get programsNowNextNowTitle => 'In progress';

  @override
  String get programsNowNextNowSubtitle => 'Functions on the clock right now.';

  @override
  String get programsNowNextUpcomingTitle => 'Up next';

  @override
  String get programsNowNextUpcomingSubtitle =>
      'Scheduled later, earliest first.';

  @override
  String get programsNowNextEarlierTitle => 'Earlier';

  @override
  String get programsNowNextEarlierSubtitle => 'Functions already wrapped.';

  @override
  String get programsNowNextBucketEmpty => 'Nothing in this window.';

  @override
  String get programsNowNextEmptyTitle => 'No functions yet';

  @override
  String get programsNowNextEmptyMessage =>
      'The planner has not scheduled any functions you can see.';

  @override
  String get programsAttentionTitle => 'Attention';

  @override
  String get programsAttentionSubtitle => 'Alerts raised for your duties.';

  @override
  String get programsAttentionFeedTitle => 'Program alerts';

  @override
  String get programsAttentionFeedSubtitle => 'Newest alerts first.';

  @override
  String get programsAttentionFeedSubtitleTruncated =>
      'Newest alerts first — older alerts may be cut off.';

  @override
  String get programsAttentionEmpty =>
      'Nothing needs your attention right now.';

  @override
  String get programsGuestDeskAccessTitle => 'Guest desk access required';

  @override
  String get programsGuestDeskAccessMessage =>
      'Ask the organizer to assign you guest relations or program coordinator duty for this program.';

  @override
  String get programsGuestNotInvited => 'Not invited';

  @override
  String programsGuestFunctionStatus({
    required String functionName,
    required String status,
  }) {
    return '$functionName: $status';
  }

  @override
  String get programsWorkShellEmptyTitle => 'No duties assigned';

  @override
  String get programsWorkShellEmptyMessage =>
      'Ask the organizer to grant you an airport, hotel or dispatch duty for this program.';

  @override
  String get programsArrivalsTitle => 'Arrivals roster';

  @override
  String get programsArrivalsAttentionTitle => 'Needs attention';

  @override
  String get programsArrivalsAttentionSubtitle =>
      'Cancelled, diverted or disrupted arrivals that need a human decision.';

  @override
  String get programsArrivalsReadyTitle => 'Ready at the curb';

  @override
  String get programsArrivalsReadySubtitle =>
      'Guests observed at the pickup point and waiting.';

  @override
  String get programsArrivalsReadyEmpty =>
      'Nobody is waiting at the curb right now.';

  @override
  String get programsArrivalsExpectedTitle => 'Expected';

  @override
  String get programsArrivalsExpectedSubtitle =>
      'Inbound or landed guests, sorted by estimated curb time.';

  @override
  String get programsArrivalsExpectedEmpty =>
      'No more guests expected at this station.';

  @override
  String get programsOperationsReviewBadge => 'Needs review';

  @override
  String get programsOperationsReviewTitle => 'Review saved changes';

  @override
  String get programsOperationsReviewBody =>
      'Check the current arrivals and trip records before dismissing a change. Dismissal stops this saved change from syncing; it does not undo work already recorded. Record any correction from the current journey.';

  @override
  String get programsOperationsReviewEmpty =>
      'No changes need review for this account.';

  @override
  String get programsOperationsGuestUnavailable =>
      'Guest details unavailable at this station';

  @override
  String get programsOperationsDismiss => 'Dismiss this saved change';

  @override
  String programsOperationsDeparture({required String plate}) {
    return 'Departure · $plate';
  }

  @override
  String get programsOperationsClaim => 'Claim guest';

  @override
  String get programsOperationsUnclaim => 'Release guest claim';

  @override
  String get programsOperationsReady => 'Guest ready at curb';

  @override
  String get programsOperationsDisrupted => 'Guest journey disrupted';

  @override
  String get programsOperationsNeedsReview =>
      'This saved change needs review. Check the current journey and trip records before recording more work.';

  @override
  String get programsOperationsReloadManifest =>
      'Reload the complete arrivals roster before dispatching this vehicle.';

  @override
  String get coreSavedOperationsQuarantined =>
      'Some saved operations need recovery. Keep the app’s saved data and contact support.';

  @override
  String get coreSavedOperationsUnavailable =>
      'Saved operations could not be read or saved. Free device space and try again. Keep the app’s saved data if you need support.';

  @override
  String get programsRecoveryAction => 'Recover saved work';

  @override
  String get programsRecoveryTitle => 'Saved work recovery';

  @override
  String get programsRecoveryBody =>
      'Export a recovery copy for review with support. It includes this account’s saved operations across all programs on this device and may contain private guest or trip details. Choose a trusted place to save it. Exporting does not repair, send, or delete any saved operation. Keep the original app data until recovery is complete.';

  @override
  String get programsRecoveryExport => 'Export recovery file';

  @override
  String get programsOperationsPassengersNotReady =>
      'Every passenger must be marked ready at the curb before this vehicle departs.';

  @override
  String get programsArrivalsOutboxTitle => 'Offline queue';

  @override
  String get programsArrivalsOutboxSync => 'Sync now';

  @override
  String get programsArrivalsOutboxClear => 'Review changes';

  @override
  String get programsArrivalsClaimedByMe => 'Claimed by you';

  @override
  String get programsArrivalsQueued => 'Queued offline';

  @override
  String get programsArrivalsCurbSourceReady => 'ready';

  @override
  String get programsArrivalsCurbSourceManual => 'manual';

  @override
  String get programsArrivalsCurbSourceLanded => 'landed';

  @override
  String get programsArrivalsCurbSourceEstimated => 'est.';

  @override
  String get programsArrivalsCurbSourceScheduled => 'sched.';

  @override
  String get programsArrivalsCancelled => 'Flight cancelled';

  @override
  String get programsArrivalsDiverted => 'Flight diverted';

  @override
  String get programsArrivalsNoEstimate => 'No curb estimate';

  @override
  String get programsArrivalsReadyBadge => 'Ready';

  @override
  String get programsArrivalsExpectedBadge => 'Expected';

  @override
  String get programsArrivalsDisruptedBadge => 'Disrupted';

  @override
  String get programsArrivalsDispatchedBadge => 'Dispatched';

  @override
  String get programsArrivalsNoShowBadge => 'No-show';

  @override
  String get programsArrivalsArrivedBadge => 'Arrived';

  @override
  String get programsArrivalsRowActions => 'Arrival actions';

  @override
  String get programsArrivalsClaimAction => 'Claim this party';

  @override
  String get programsArrivalsUnclaimAction => 'Release my claim';

  @override
  String get programsArrivalsReadyAction => 'Mark ready at curb';

  @override
  String get programsArrivalsDisruptedAction => 'Flag disruption';

  @override
  String get programsDispatchTitle => 'Dispatch desk';

  @override
  String get programsDispatchGroupsTitle => 'Suggested vehicles';

  @override
  String get programsDispatchGroupsSubtitle =>
      'Parties batched by curb window and destination. Suggestions only — you decide.';

  @override
  String get programsDispatchGroupsEmpty =>
      'No parties are waiting or expected in this window.';

  @override
  String get programsDispatchUnassignedTitle => 'Unassigned';

  @override
  String get programsDispatchUnassignedSubtitle =>
      'Legs the planner could not batch.';

  @override
  String get programsDispatchReasonMissingTime =>
      'A guest has no usable arrival estimate.';

  @override
  String get programsDispatchReasonNoVehicle =>
      'No vehicle class fits this party — needs review.';

  @override
  String get programsDispatchReasonMissingScope =>
      'A leg is missing a pickup or destination assignment.';

  @override
  String get programsDispatchAction => 'Dispatch vehicle';

  @override
  String get programsDispatchSheetTitle => 'Dispatch vehicle';

  @override
  String get programsDispatchPlateHint => 'Plate, e.g. DL-1T-4471';

  @override
  String get programsDispatchNoVendors =>
      'No vendors are bound to this program yet.';

  @override
  String get programsDispatchVendorsUnavailable =>
      'Vendor list could not be loaded — you can still dispatch without a vendor.';

  @override
  String get programsDispatchConfirm => 'Dispatch now';

  @override
  String get programsDoorTitle => 'Door check-in';

  @override
  String programsDoorCountsCheckedIn({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count in',
      one: '1 in',
    );
    return '$_temp0';
  }

  @override
  String programsDoorCountsExpected({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count expected',
      one: '1 expected',
    );
    return '$_temp0';
  }

  @override
  String programsDoorCountsNoShow({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count no-shows',
      one: '1 no-show',
    );
    return '$_temp0';
  }

  @override
  String programsDoorCountsWalkIns({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count walk-ins',
      one: '1 walk-in',
    );
    return '$_temp0';
  }

  @override
  String get programsDoorClosedBanner =>
      'Check-in is not open for this function.';

  @override
  String get programsDoorCancelledBanner =>
      'This function was cancelled — no check-in.';

  @override
  String get programsDoorRosterTitle => 'Guest list';

  @override
  String programsDoorRosterSubtitle({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count listed guests',
      one: '1 listed guest',
    );
    return '$_temp0';
  }

  @override
  String get programsDoorRosterEmpty =>
      'No guests are listed for this function.';

  @override
  String get programsDoorQueued => 'Queued';

  @override
  String get programsDoorWalkInBadge => 'Walk-in';

  @override
  String get programsDoorWalkInTitle => 'Walk-in';

  @override
  String get programsDoorWalkInSubtitle =>
      'Register a guest who arrived without an invitation. They are checked in immediately.';

  @override
  String get programsDoorWalkInNameLabel => 'Guest name';

  @override
  String get programsDoorWalkInPartyLabel => 'Party size';

  @override
  String get programsDoorWalkInSubmit => 'Register and check in';

  @override
  String get programsDoorJournalTitle => 'Recent door activity';

  @override
  String get programsDoorJournalSubtitle =>
      'Latest recorded actions at this door.';

  @override
  String get programsDoorJournalGuest => 'A guest';

  @override
  String get programsDoorJournalCheckIn => 'checked in';

  @override
  String get programsDoorJournalUndoCheckIn => 'check-in undone';

  @override
  String get programsDoorJournalNoShow => 'marked no-show';

  @override
  String get programsDoorJournalWalkIn => 'walked in';

  @override
  String get programsDoorJournalPartySize => 'party size updated';

  @override
  String get programsDoorRowActions => 'Guest actions';

  @override
  String get programsDoorCheckInAction => 'Check in';

  @override
  String get programsDoorUndoAction => 'Undo check-in';

  @override
  String get programsDoorNoShowAction => 'Mark no-show';

  @override
  String get programsDoorPartySizeAction => 'Party size…';

  @override
  String get programsDoorPartySizeField => 'Party size';

  @override
  String get programsDoorPartySizeSave => 'Update party size';

  @override
  String programsDoorPartyCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count guests',
      one: '1 guest',
    );
    return '$_temp0';
  }

  @override
  String get programsDoorRsvpAttending => 'Attending';

  @override
  String get programsDoorRsvpDeclined => 'Declined';

  @override
  String get programsDoorRsvpMaybe => 'Maybe';

  @override
  String get programsDoorRsvpPending => 'No RSVP';

  @override
  String get programsDoorAttendanceExpected => 'Expected';

  @override
  String get programsDoorAttendanceCheckedIn => 'Checked in';

  @override
  String get programsDoorAttendanceNoShow => 'No-show';

  @override
  String get programsHotelPreviousTrip => 'Previous vehicles';

  @override
  String get programsHotelFirstTrip => 'First vehicles';

  @override
  String get programsHotelMoreTrip => 'More vehicles';

  @override
  String get programsHotelPreviousExpected => 'Previous guests';

  @override
  String get programsHotelFirstExpected => 'First guests';

  @override
  String get programsHotelMoreExpected => 'More guests';

  @override
  String get programsHotelRefresh => 'Refresh hotel';

  @override
  String get programsHotelTitle => 'Hotel desk';

  @override
  String get programsHotelSubtitle => 'Inbound arrivals';

  @override
  String get programsHotelEnRouteTitle => 'On the way';

  @override
  String get programsHotelEnRouteSubtitle =>
      'Vehicles that departed the airport for this hotel.';

  @override
  String get programsHotelEnRouteEmpty =>
      'No vehicles are on the way right now.';

  @override
  String get programsHotelExpectedTitle => 'Still expected';

  @override
  String get programsHotelExpectedSubtitle =>
      'Parties assigned to this hotel that have not departed yet.';

  @override
  String get programsHotelExpectedEmpty =>
      'No more guests expected at this hotel.';

  @override
  String get programsHotelExpectedNoEstimate => 'No curb estimate yet.';

  @override
  String get programsHotelEtaUnknown => 'ETA unknown';

  @override
  String get programsHotelMarkArrived => 'Mark arrived';

  @override
  String get programsHotelStatusEnRoute => 'En route';

  @override
  String get programsHotelStatusArrived => 'Arrived';

  @override
  String get programsHotelStatusCancelled => 'Cancelled';

  @override
  String get programsHotelStatusVoided => 'Voided';

  @override
  String get programsHotelRoomsOpen => 'Rooms & stays';

  @override
  String get programsRoomsTitle => 'Room board';

  @override
  String get programsRoomsSubtitle => 'Stays & blocks';

  @override
  String get programsRoomsRefresh => 'Refresh rooms';

  @override
  String get programsRoomsUnplacedTitle => 'Needs a room';

  @override
  String get programsRoomsUnplacedSubtitle =>
      'Guests routed to this hotel with no live stay.';

  @override
  String get programsRoomsUnplacedEmpty =>
      'Everyone routed here already has a stay.';

  @override
  String get programsRoomsStaysTitle => 'Stays';

  @override
  String get programsRoomsStaysSubtitle =>
      'Room assignments and stay status at this hotel.';

  @override
  String get programsRoomsStaysEmpty => 'No stays recorded at this hotel yet.';

  @override
  String get programsRoomsBlocksTitle => 'Room blocks';

  @override
  String get programsRoomsBlocksSubtitle =>
      'Reserved inventory with live capacity.';

  @override
  String get programsRoomsBlocksEmpty =>
      'No blocks reserved — stays assign ad-hoc.';

  @override
  String programsRoomsSuggestedBlock({required String label}) {
    return 'Suggested block: $label';
  }

  @override
  String get programsRoomsNoSuggestion =>
      'No block suggestion — assign ad-hoc.';

  @override
  String programsRoomsStayRoom({required String room, required String block}) {
    return 'Room $room · $block';
  }

  @override
  String get programsRoomsAdHocBlock => 'Ad-hoc — outside any block';

  @override
  String programsRoomsMarkedReady({required String time}) {
    return 'Room ready $time';
  }

  @override
  String programsRoomsMarkedArrived({required String time}) {
    return 'Arrived $time';
  }

  @override
  String programsRoomsBlockWindow({
    required String checkIn,
    required String checkOut,
  }) {
    return '$checkIn → $checkOut';
  }

  @override
  String programsRoomsBlockHeld({required int count}) {
    return 'Held for $count groups';
  }

  @override
  String programsRoomsBlockCapacity({
    required int remaining,
    required int total,
  }) {
    return '$remaining of $total left';
  }

  @override
  String get programsRoomsAssignTitle => 'Assign a room';

  @override
  String get programsRoomsManageTitle => 'Manage stay';

  @override
  String get programsRoomsAssignConfirm => 'Assign room';

  @override
  String get programsRoomsManageConfirm => 'Save stay';

  @override
  String get programsRoomsBlockLabel => 'Room block';

  @override
  String get programsRoomsRoomLabel => 'Room label';

  @override
  String get programsRoomsStatusLabel => 'Status';

  @override
  String get programsRoomsMarkReady => 'Mark room ready';

  @override
  String get programsRoomsMarkArrived => 'Mark guest arrived';

  @override
  String get programsRoomsStatusHeld => 'Held';

  @override
  String get programsRoomsStatusConfirmed => 'Confirmed';

  @override
  String get programsRoomsStatusCheckedIn => 'Checked in';

  @override
  String get programsRoomsStatusCheckedOut => 'Checked out';

  @override
  String get programsRoomsStatusCancelled => 'Cancelled';

  @override
  String get programsTripsNewer => 'Newer trips';

  @override
  String get programsTripsOlder => 'Older trips';

  @override
  String get programsTripsLatest => 'Latest trips';

  @override
  String get programsTripCurrentNames =>
      'Guest names reflect current records; no dispatch snapshot was saved.';

  @override
  String get programsAttendanceTitle => 'Attendance report';

  @override
  String get programsAttendanceSubtitle => 'RSVP vs door per function';

  @override
  String get programsAttendanceRefresh => 'Refresh report';

  @override
  String get programsAttendanceExport => 'Export CSV';

  @override
  String get programsAttendanceExporting => 'Exporting…';

  @override
  String get programsAttendanceProgramTitle => 'Program totals';

  @override
  String programsAttendanceProgramSubtitle({required String time}) {
    return 'As of $time';
  }

  @override
  String get programsAttendanceFunctionsTitle => 'Per function';

  @override
  String get programsAttendanceFunctionsSubtitle =>
      'Invited vs attended vs checked in, with exception queues.';

  @override
  String get programsAttendanceEmpty => 'No functions on this program yet.';

  @override
  String programsAttendanceInvited({required int count}) {
    return '$count invited';
  }

  @override
  String programsAttendanceAttending({required int count}) {
    return '$count attending';
  }

  @override
  String programsAttendanceCheckedIn({required int count}) {
    return '$count checked in';
  }

  @override
  String programsAttendanceNoShow({required int count}) {
    return '$count no-show';
  }

  @override
  String programsAttendanceRowCounts({
    required int invited,
    required int attending,
    required int checkedIn,
  }) {
    return '$invited invited · $attending attending · $checkedIn checked in';
  }

  @override
  String programsAttendanceWalkIns({required int count}) {
    return '$count walk-in not on the invite list';
  }

  @override
  String programsAttendanceNoResponseException({required int count}) {
    return '$count invited, no response';
  }

  @override
  String programsAttendanceDeclinedCheckedIn({required int count}) {
    return '$count declined but arrived';
  }

  @override
  String programsAttendanceWalkInException({required int count}) {
    return '$count walk-in to reconcile';
  }

  @override
  String programsAttendanceShareSubject({required String title}) {
    return '$title attendance report';
  }

  @override
  String get programsStakeholderTitle => 'Program counts';

  @override
  String get programsStakeholderSubtitle =>
      'Headcounts and occupancy — no guest details';

  @override
  String get programsStakeholderProgramTitle => 'Program';

  @override
  String get programsStakeholderProgramSubtitle =>
      'Everyone attached to this program.';

  @override
  String programsStakeholderGuests({required int count}) {
    return '$count guests';
  }

  @override
  String programsStakeholderHouseholds({required int count}) {
    return '$count households';
  }

  @override
  String get programsStakeholderFunctionsTitle => 'Functions';

  @override
  String get programsStakeholderFunctionsSubtitle =>
      'Responses and door counts per function.';

  @override
  String get programsStakeholderFunctionsEmpty =>
      'No functions on this program yet.';

  @override
  String programsStakeholderFunctionRsvp({
    required int attending,
    required int declined,
    required int maybe,
    required int pending,
    required int invited,
  }) {
    return '$attending attending · $declined declined · $maybe maybe · $pending pending of $invited invited';
  }

  @override
  String programsStakeholderFunctionDoor({
    required int expected,
    required int checkedIn,
    required int noShows,
  }) {
    return '$expected expected · $checkedIn checked in · $noShows no-shows';
  }

  @override
  String get programsStakeholderStatusScheduled => 'Scheduled';

  @override
  String get programsStakeholderStatusCompleted => 'Completed';

  @override
  String get programsStakeholderStatusCancelled => 'Cancelled';

  @override
  String get programsStakeholderHotelsTitle => 'Hotels';

  @override
  String get programsStakeholderHotelsSubtitle =>
      'Occupancy from routed travel legs.';

  @override
  String get programsStakeholderHotelsEmpty => 'No hotel-routed travel yet.';

  @override
  String programsStakeholderHotelRow({
    required int arrived,
    required int routed,
    required int legs,
  }) {
    return '$arrived of $routed guests arrived · $legs legs';
  }

  @override
  String get programsTripsTitle => 'Trip ledger';

  @override
  String get programsTripsSubtitle => 'Dispatch reconciliation';

  @override
  String get programsTripsLedgerTitle => 'Dispatched vehicles';

  @override
  String get programsTripsLedgerSubtitle =>
      'One record per departure, newest first. Voided trips stay listed.';

  @override
  String get programsTripsEmpty => 'No vehicles dispatched yet.';

  @override
  String get programsTripsVoidAction => 'Void this trip';

  @override
  String get programsTripsVoidSheetTitle => 'Void trip';

  @override
  String get programsTripsVoidSheetSubtitle =>
      'A void releases the guests back to the ready pool. The record stays in the ledger.';

  @override
  String get programsTripsVoidReasonHint => 'Reason, e.g. wrong vehicle sent';

  @override
  String get programsTripsVoidConfirm => 'Void trip';

  @override
  String get programsTripsStatusEnRoute => 'En route';

  @override
  String get programsTripsStatusArrived => 'Arrived';

  @override
  String get programsTripsStatusCancelled => 'Cancelled';

  @override
  String get programsTripsStatusVoided => 'Voided';

  @override
  String get programsTripsExport => 'Export CSV';

  @override
  String get programsTripsExporting => 'Exporting…';

  @override
  String programsTripsExportSubject({required String title}) {
    return '$title trip ledger';
  }

  @override
  String get programsTripsReviewTitle => 'Needs review';

  @override
  String get programsTripsReviewSubtitle =>
      'Open, cancelled and voided trips to reconcile before the vendor invoice clears';

  @override
  String get programsTripsReviewOnly => 'Review only';

  @override
  String get programsTripsShowAll => 'Show all';

  @override
  String get programsTripsReviewEmpty => 'Nothing left to review on this page.';

  @override
  String programsWorkShellExpires({required Object date}) {
    return 'Access expires $date';
  }

  @override
  String programsArrivalsOutboxPending({required int count}) {
    return '$count change(s) queued while offline. They will sync when connectivity returns.';
  }

  @override
  String programsArrivalsOutboxReview({
    required int pending,
    required int review,
  }) {
    return '$pending pending, $review need review before they can sync.';
  }

  @override
  String programsArrivalsPassengerCount({required int count}) {
    return '$count pax';
  }

  @override
  String programsArrivalsBagCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count bags',
      one: '1 bag',
    );
    return '$_temp0';
  }

  @override
  String programsArrivalsOrigin({required String airport}) {
    return 'from $airport';
  }

  @override
  String programsArrivalsTerminal({required String terminal}) {
    return 'T$terminal';
  }

  @override
  String programsArrivalsClaimedBy({required Object name}) {
    return 'Claimed by $name';
  }

  @override
  String programsDispatchGroupMeta({
    required int passengers,
    required int luggage,
    required int legs,
  }) {
    return '$passengers pax · $luggage bags · $legs leg(s)';
  }

  @override
  String programsDispatchWaitOverdue({required Object time}) {
    return 'Ready wait overdue — should have left by $time';
  }

  @override
  String programsDispatchDispatchBy({required Object time}) {
    return 'Dispatch by $time to keep the ready wait';
  }

  @override
  String programsDispatchSheetSubtitle({required Object destination}) {
    return 'To $destination';
  }

  @override
  String programsHotelExpectedMeta({
    required int passengers,
    required Object time,
  }) {
    return '$passengers pax · at curb ~$time';
  }

  @override
  String programsHotelTripMeta({
    required int passengers,
    required Object names,
  }) {
    return '$passengers pax · $names';
  }

  @override
  String programsHotelTripTiming({
    required Object departed,
    required Object eta,
  }) {
    return 'Departed $departed · ETA $eta';
  }

  @override
  String programsTripsRowMeta({
    required int passengers,
    required Object names,
  }) {
    return '$passengers pax · $names';
  }

  @override
  String programsTripsRowTimingArrived({
    required Object departed,
    required Object arrived,
  }) {
    return 'Departed $departed · arrived $arrived';
  }

  @override
  String programsTripsRowTimingDeparted({required Object departed}) {
    return 'Departed $departed · still en route';
  }

  @override
  String get programsDispatchHoldTitle => 'Hold for expected arrivals';

  @override
  String programsDispatchHoldSubtitle({required Object destination}) {
    return 'Still inbound to $destination — adding them makes this vehicle wait.';
  }

  @override
  String programsDispatchHoldOption({
    required Object time,
    required int passengers,
  }) {
    return '$time · $passengers pax';
  }

  @override
  String get programsSnapshotTitle => 'Saved view';

  @override
  String programsSnapshotBanner({required Object time}) {
    return 'Last synced at $time — your changes queue until you are back online.';
  }

  @override
  String hostDraftSavedAt({required String time}) {
    return 'Saved $time';
  }

  @override
  String hostResponseFilterSelectionLimit({required int count}) {
    return 'Choose up to $count options per question.';
  }

  @override
  String get eventMatchingTitle => 'Use form answers for event matching';

  @override
  String get eventMatchingDisclosure =>
      'Choose whether Catch may use each reviewed answer as a soft matching preference for this event. This does not change admission or safety rules.';

  @override
  String get eventMatchingAnswerLabel => 'Answer to use';

  @override
  String get eventMatchingAllow => 'Allow for this event';

  @override
  String get eventMatchingWithdraw => 'Stop using this answer';

  @override
  String get eventMatchingUnavailable =>
      'This answer is no longer available for event matching.';

  @override
  String get eventMatchingNoChoices =>
      'The Host has not chosen any form questions for this event.';

  @override
  String get eventMatchingSaved => 'Your choice is saved for this event.';

  @override
  String get eventMatchingCoverageNote =>
      'Only answers you allow for this event can be used. You can withdraw permission later.';

  @override
  String get eventMatchingHostTitle => 'Form answer matching';

  @override
  String get eventMatchingHostDescription =>
      'Choose published custom questions as soft preferences. Guest permission is separate, and safety and admission rules always apply.';

  @override
  String get eventMatchingHostUnsupported =>
      'Structured answer matching is not available for sequence layouts.';

  @override
  String get eventMatchingHostSelectForm => 'Choose a published form';

  @override
  String get eventMatchingHostNoForms =>
      'No published forms are available for this organizer.';

  @override
  String get eventMatchingHostNoQuestions =>
      'This published version has no custom choice or number questions.';

  @override
  String get eventMatchingHostLoadMore => 'Load more forms';

  @override
  String get eventMatchingHostAddQuestion => 'Add matching question';

  @override
  String get eventMatchingHostSavedRules => 'Matching preferences';

  @override
  String get eventMatchingHostCategory => 'Choice category';

  @override
  String get eventMatchingHostSet => 'Choice set';

  @override
  String get eventMatchingHostNumber => 'Number';

  @override
  String get eventMatchingHostOrdinal => 'Ordered choices';

  @override
  String get eventMatchingHostSimilar => 'Prefer similar answers';

  @override
  String get eventMatchingHostDifferent => 'Prefer different answers';

  @override
  String get eventMatchingHostBalance => 'Balance answers across groups';

  @override
  String get eventMatchingHostWeight => 'Preference strength';

  @override
  String get eventMatchingHostMinimum => 'Minimum answer';

  @override
  String get eventMatchingHostMaximum => 'Maximum answer';

  @override
  String get eventMatchingHostMissingBounds =>
      'This form did not publish a number range. Set a finite minimum and maximum before using this question.';

  @override
  String get eventMatchingHostPreview => 'Preview roster coverage';

  @override
  String eventMatchingHostCoverage({required int usable, required int roster}) {
    return '$usable of $roster current roster members have usable permitted answers';
  }

  @override
  String get eventMatchingHostCoverageNote =>
      'Coverage uses the current event roster; live assignment eligibility may differ.';

  @override
  String get eventMatchingHostSave => 'Save matching preferences';

  @override
  String get eventMatchingHostRemove => 'Remove question';

  @override
  String get eventMatchingHostRefresh => 'Refresh matching setup';

  @override
  String get eventMatchingHostConflict =>
      'Matching setup changed elsewhere. Review the latest version before saving again.';

  @override
  String get eventMatchingHostValidation =>
      'Review the question mapping before previewing or saving.';

  @override
  String get eventMatchingHostActiveVersion => 'Active published version';

  @override
  String get eventMatchingHostLimit =>
      'Choose up to eight matching questions for this event.';

  @override
  String get eventMatchingHostTransform => 'Answer type';

  @override
  String get eventMatchingHostPreference => 'Matching preference';

  @override
  String get eventMatchingHostMoveEarlier => 'Move this choice earlier';

  @override
  String get eventMatchingHostDecreaseWeight => 'Decrease preference strength';

  @override
  String get eventMatchingHostIncreaseWeight => 'Increase preference strength';

  @override
  String get hostsOperationalRosterFieldCity => 'City';

  @override
  String hostsOperationalRosterIssueInvalidCity({required int row}) {
    return 'Row $row: choose a supported city or leave it blank.';
  }

  @override
  String get hostsPrivateEventEntryBody =>
      'Save the basics, then add guests, registration and payments as needed.';

  @override
  String get hostsPrivateEventBasicsHeading => 'Start with the basics';

  @override
  String get hostsPrivateEventCity => 'City';

  @override
  String get hostsPrivateEventChooseCity => 'Choose a city';

  @override
  String get hostsPrivateEventTimezone => 'Timezone';

  @override
  String get hostsPrivateEventTimezoneHint => 'Asia/Kolkata';

  @override
  String get hostsPrivateEventTimezoneSuggestion =>
      'Suggested by city. Review before saving.';

  @override
  String get hostsPrivateEventFromOrganizer => 'From organizer';

  @override
  String get hostsPrivateEventUseOrganizerCity => 'Use organizer city';

  @override
  String get hostsPrivateEventUseOrganizerTimezone => 'Use organizer timezone';

  @override
  String get hostsPrivateEventMoreBasics => 'More basics';

  @override
  String get hostsPrivateEventMoreBasicsBody =>
      'Venue and end time can be added later';

  @override
  String get hostsPrivateEventAfterSave => 'After saving';

  @override
  String get hostsPrivateEventAfterSaveBody =>
      'Add a venue and end time when you are ready to set up registration or a public listing.';

  @override
  String get hostsPrivateEventSaveHint =>
      'The event is saved privately. You can link a form after saving.';

  @override
  String get hostResponseQueryLoading => 'Loading responses…';

  @override
  String get hostResponseQueryEmpty => 'No responses match this query.';

  @override
  String get hostResponseQueryStale =>
      'The response result changed. Refresh and review your selection.';

  @override
  String get hostResponseQueryBudgetExceeded =>
      'This form exceeds the size or time limit for interactive filtering.';

  @override
  String get hostResponseQueryPermissionLost =>
      'You no longer have access to these responses.';

  @override
  String get hostResponseQueryFailed => 'Could not load responses. Try again.';

  @override
  String get hostResponseQueryReviewSelection => 'Review selected responses';

  @override
  String get hostResponseQuerySelect => 'Select response';

  @override
  String get hostResponseQueryDeselect => 'Deselect response';

  @override
  String get hostResponseQueryEditorTitle => 'Filter responses';

  @override
  String get hostResponseQueryMatchAll => 'Match all conditions';

  @override
  String get hostResponseQueryMatchAny => 'Match any condition';

  @override
  String get hostResponseQueryField => 'Question';

  @override
  String get hostResponseQueryValue => 'Value';

  @override
  String get hostResponseQueryMinimum => 'Minimum';

  @override
  String get hostResponseQueryMaximum => 'Maximum';

  @override
  String get hostResponseQueryAddCondition => 'Add condition';

  @override
  String get hostResponseQueryAddGroup => 'Add group';

  @override
  String get hostResponseQueryRemove => 'Remove';

  @override
  String get hostResponseQueryApply => 'Apply filters';

  @override
  String get hostResponseQueryInvalidCondition => 'Review this condition.';

  @override
  String get hostResponseQueryOperatorPresent => 'is answered';

  @override
  String get hostResponseQueryOperatorMissing => 'is not answered';

  @override
  String get hostResponseQueryOperatorChoiceAny => 'includes any of';

  @override
  String get hostResponseQueryOperatorChoiceAll => 'includes all of';

  @override
  String get hostResponseQueryOperatorChoiceNone => 'includes none of';

  @override
  String get hostResponseQueryOperatorTextEquals => 'equals';

  @override
  String get hostResponseQueryOperatorTextContains => 'contains';

  @override
  String get hostResponseQueryOperatorTextStartsWith => 'starts with';

  @override
  String get hostResponseQueryOperatorNumberEq => 'equals';

  @override
  String get hostResponseQueryOperatorNumberGt => 'is greater than';

  @override
  String get hostResponseQueryOperatorNumberGte => 'is at least';

  @override
  String get hostResponseQueryOperatorNumberLt => 'is less than';

  @override
  String get hostResponseQueryOperatorNumberLte => 'is at most';

  @override
  String get hostResponseQueryOperatorNumberBetween => 'is between';

  @override
  String get hostResponseQueryOperatorDateOn => 'is on';

  @override
  String get hostResponseQueryOperatorDateBefore => 'is before';

  @override
  String get hostResponseQueryOperatorDateAfter => 'is after';

  @override
  String get hostResponseQueryOperatorDateBetween => 'is between';

  @override
  String get hostResponseQueryOperatorBooleanIs => 'is';

  @override
  String get hostResponseQueryClearSelection => 'Clear selection';

  @override
  String hostResponseQuerySelected({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count selected responses',
      one: '1 selected response',
    );
    return '$_temp0';
  }

  @override
  String get hostsPrivateEventSaveReturnResponses => 'Save & return to review';

  @override
  String get hostsPrivateEventSaveContinue => 'Save & continue';

  @override
  String get hostsPrivateEventDefaultsChanged =>
      'Organizer defaults changed. Review the city and timezone before saving.';

  @override
  String get hostsPrivateEventReviewDefaults => 'Review current defaults';

  @override
  String get hostsPrivateEventSavedTitle => 'Saved event';

  @override
  String get hostsPrivateEventPrivateTitle => 'Private';

  @override
  String get hostsPrivateEventPrivateBody =>
      'Ready to link to forms. Registration and public listing are off.';

  @override
  String get hostsPrivateEventSetupHeading => 'Continue setup when you need it';

  @override
  String get hostsPrivateEventReturnResponses => 'Return to selected responses';

  @override
  String get hostsPrivateEventReturnResponsesBody =>
      'Your selection stays in Responses.';

  @override
  String get hostsPrivateEventLinkForm => 'Link a registration form';

  @override
  String get hostsPrivateEventLinkFormBody =>
      'Collect responses and offer places for this event.';

  @override
  String get hostsPrivateEventLinkFormUnavailable =>
      'Event-bound form setup is not available yet.';

  @override
  String get hostsPrivateEventDetails => 'Event details';

  @override
  String get hostsPrivateEventEditBasics => 'Edit event basics';

  @override
  String get hostsPrivateEventEditBasicsBody =>
      'Change the name, city, date, start time or timezone.';

  @override
  String get hostsPrivateEventEditBasicsUnavailable =>
      'Cancelled events cannot be edited.';

  @override
  String get hostsPrivateEventDetailsBody =>
      'Add a venue and end time when needed.';

  @override
  String get hostsPrivateEventDetailsUnavailable =>
      'Venue and end-time editing is not available yet.';

  @override
  String get hostsPrivateEventImportGuests => 'Import a guest list';

  @override
  String get hostsPrivateEventImportGuestsBody =>
      'Add existing registrations to the roster.';

  @override
  String get hostsPrivateEventImportGuestsUnavailable =>
      'Private-event roster import is not available yet.';

  @override
  String get hostsPrivateEventCatchRegistration =>
      'Accept registrations with Catch';

  @override
  String get hostsPrivateEventCatchRegistrationBody =>
      'Choose the admission policy and check payment readiness.';

  @override
  String get hostsPrivateEventCatchRegistrationUnavailable =>
      'Registration requires an admission policy and booking setup.';

  @override
  String get hostsPrivateEventPayments => 'Payments';

  @override
  String get hostsPrivateEventPaymentsBody =>
      'Add external collection instructions.';

  @override
  String get hostsPrivateEventPaymentsUnavailable =>
      'Event payment settings are not available yet.';

  @override
  String get hostsPrivateEventPublicListing => 'Public listing';

  @override
  String get hostsPrivateEventPublicListingBody => 'Not published.';

  @override
  String get hostsPrivateEventPublicListingUnavailable =>
      'Not published. Add public details before listing.';

  @override
  String get hostsPrivateEventGuide => 'Live event guide';

  @override
  String get hostsPrivateEventGuideBody => 'Optional.';

  @override
  String get hostsPrivateEventGuideUnavailable =>
      'Optional guide setup is not available yet.';

  @override
  String get hostsPrivateEventRosterNote =>
      'Guests from imports and Catch registration can share one roster. Offers do not confirm attendance.';

  @override
  String get hostsEventDefaultsBasics => 'Basics';

  @override
  String get hostsEventDefaultsTimezoneHint =>
      'Suggested for new events. Existing events keep their saved timezone.';

  @override
  String get hostsEventDefaultsChooseEachEvent => 'Choose on each event';

  @override
  String get hostsPrivateEventPendingRequest =>
      'This save may already have reached Catch. Retry the same request before changing details so it cannot create another event.';

  @override
  String get hostsPrivateEventPendingUpdate =>
      'This edit may already have reached Catch. Retry the same save before changing the basics.';

  @override
  String get hostsPrivateEventRetrySave => 'Retry the same save';

  @override
  String get hostsPrivateEventPendingRoster => 'Guest list ready to import';

  @override
  String hostsPrivateEventPendingRosterBody({required String fileName}) {
    return '$fileName can be imported after event roster setup is available.';
  }

  @override
  String get hostsEventDefaultsUsualDuration => 'Usual duration';

  @override
  String hostsEventDefaultsMinutes({required int minutes}) {
    return '$minutes min';
  }

  @override
  String get hostsEventDefaultsClearDuration => 'Choose duration on each event';

  @override
  String get hostsEventDefaultsPreferredVenue => 'Preferred venue';

  @override
  String get hostsEventDefaultsVenueUnavailable =>
      'Venue suggestions need an organizer venue picker.';

  @override
  String get hostsEventDefaultsVenueSaved =>
      'Saved venue suggestion. Review access before using it for an event.';

  @override
  String get hostsEventDefaultsClearVenue => 'Clear preferred venue';

  @override
  String get hostsEventDefaultsOffersHeading => 'Offers';

  @override
  String get hostsEventDefaultsOfferValidity => 'Usual offer validity';

  @override
  String get hostsEventDefaultsClearValidity =>
      'Choose offer validity on each event';

  @override
  String get hostsEventDefaultsMessageTemplate => 'Offer message template';

  @override
  String get hostsEventDefaultsMessageTemplateHint =>
      'Suggested text for an individual handoff';

  @override
  String get hostsEventDefaultsPaymentHeading => 'Payment suggestions';

  @override
  String get hostsEventDefaultsCollectionPreference =>
      'Preferred collection method';

  @override
  String get hostsEventDefaultsManualInstructions => 'Manual instructions';

  @override
  String get hostsEventDefaultsReusablePage => 'Reusable payment page';

  @override
  String get hostsEventDefaultsPersonalRequest => 'Personal payment request';

  @override
  String get hostsEventDefaultsCatchCheckout => 'Catch checkout';

  @override
  String get hostsEventDefaultsCollectionSuggestionHint =>
      'A preference only. Event payment and provider readiness are reviewed separately.';

  @override
  String get hostsEventDefaultsClearCollection =>
      'Choose collection method on each event';

  @override
  String get hostsEventDefaultsCurrency => 'Currency';

  @override
  String get hostsEventDefaultsInvalidCurrency =>
      'Use a three-letter currency code.';

  @override
  String get hostsEventDefaultsPaymentInstructions => 'Payment instructions';

  @override
  String get hostsEventDefaultsPaymentInstructionsHint =>
      'Suggested instructions for future events';

  @override
  String get hostsEventDefaultsReusablePaymentPage =>
      'Reusable organizer payment page';

  @override
  String get hostsEventDefaultsReusablePageHint => 'https://example.com/pay';

  @override
  String get hostsEventDefaultsReusablePagePrivacyNote =>
      'Only a reusable public organizer page belongs here. Personal links stay with one offer.';

  @override
  String get hostsEventDefaultsInvalidReusablePage =>
      'Use a secure https payment-page URL.';

  @override
  String get hostsEventDefaultsTextTooLong =>
      'Keep this to 1,000 characters or fewer.';

  @override
  String get hostsEventDefaultsReusableConfirmTitle =>
      'Confirm reusable payment page';

  @override
  String get hostsEventDefaultsReusableConfirmBody =>
      'I confirm this page can be shared with different guests for different events. It is not a personal payment request or invoice.';

  @override
  String get hostsEventDefaultsReusableConfirmCancel => 'Cancel';

  @override
  String get hostsEventDefaultsReusableConfirmAccept => 'Confirm reusable page';

  @override
  String get hostsEventDefaultsManagerUnavailable =>
      'Private organizer preferences unavailable';

  @override
  String get hostsEventDefaultsManagerUnavailableBody =>
      'A manager-authorized preferences read is required before these suggestions can be shown or edited.';

  @override
  String get hostsEventDefaultsCitySource =>
      'Future events use the organizer city. Change that city in the organizer profile.';

  @override
  String get hostsEventDefaultsTimezoneSource =>
      'Future events can use this private timezone suggestion, or choose a timezone for each event.';

  @override
  String get hostsEventDefaultsPendingUpdate =>
      'Previous defaults save unresolved';

  @override
  String get hostsEventDefaultsPendingUpdateBody =>
      'The previous save may have reached Catch. Retry the same request before changing suggestions.';

  @override
  String get hostsEventDefaultsRetryUpdate => 'Retry previous defaults save';

  @override
  String get hostsPrivateEventRetryDefaultsRead =>
      'Retry organizer defaults read';

  @override
  String get hostsPrivateEventRetrySavedRead => 'Retry event read';

  @override
  String get hostsPrivateEventPendingExitTitle => 'Save still unresolved';

  @override
  String get hostsPrivateEventPendingExitBody =>
      'Catch may already have saved this event. The request is kept on this device. Leave and retry the same save later to resolve it without creating another event.';

  @override
  String get hostsPrivateEventPendingUpdateExitBody =>
      'Catch may already have saved this edit. The request is kept on this device. Leave and retry the same save later before changing the basics.';

  @override
  String get hostsPrivateEventSetupUnavailable =>
      'Private event setup is not available yet.';

  @override
  String get hostsPrivateEventPendingStay => 'Stay and retry';

  @override
  String get hostsPrivateEventPendingLeave => 'Leave; retry later';

  @override
  String get hostsPrivateEventContinueSaved => 'Continue saved event';

  @override
  String get hostsEventPreferenceTitle => 'Event settings and payments';

  @override
  String get hostsEventPreferencePrivateHint =>
      'These settings belong to this private event. Collection preferences do not activate a provider or send a request.';

  @override
  String get hostsEventPreferenceInherit => 'Use organizer suggestion';

  @override
  String get hostsEventPreferenceOverride => 'Use event value';

  @override
  String get hostsEventPreferenceClear => 'Leave unset';

  @override
  String get hostsEventPreferenceExpectedAmountMinor =>
      'Expected amount in the smallest currency unit';

  @override
  String get hostsEventPreferenceExpectedAmountHint =>
      'For INR, 120000 means ₹1,200.00';

  @override
  String get hostsEventPreferenceAdmission => 'Admission suggestion';

  @override
  String get hostsEventPreferenceAdmissionOpen => 'Open capacity';

  @override
  String get hostsEventPreferenceAdmissionInvite => 'Invite only';

  @override
  String get hostsEventPreferenceAdmissionBalanced => 'Balanced singles';

  @override
  String get hostsEventPreferenceAdmissionFixed => 'Fixed cohort caps';

  @override
  String get hostsEventPreferencePending => 'Previous settings save unresolved';

  @override
  String get hostsEventPreferencePendingBody =>
      'Catch may already have saved these settings. Retry the same request before changing them.';

  @override
  String get hostsEventPreferenceRetry => 'Retry previous settings save';

  @override
  String get hostsEventPreferenceError => 'Settings unavailable';

  @override
  String get hostsEventPreferenceProviderHint =>
      'A saved collection preference is only a plan. Review provider readiness, guest consent and payment terms before sending an offer.';

  @override
  String get hostsEventPreferenceInvalidValue =>
      'Enter a valid value for this setting.';

  @override
  String get hostEventOfferCreate => 'Create event offers';

  @override
  String get hostEventOfferSelectEvent => 'Available events';

  @override
  String get hostEventOfferSelectEventEmpty =>
      'No eligible upcoming events are available.';

  @override
  String hostEventOfferChooseForRecipient({required String name}) {
    return 'Choose an event for $name';
  }

  @override
  String hostEventOfferChooseForRecipients({required int count}) {
    return 'Choose an event for $count people';
  }

  @override
  String get hostEventOfferLoadingEvents => 'Loading events…';

  @override
  String get hostEventOfferPreparing => 'Preparing offer…';

  @override
  String get hostEventOfferLoadingExisting => 'Loading offer…';

  @override
  String get hostEventOfferPreparingMessage => 'Preparing message…';

  @override
  String get hostEventOfferCancelPreparation => 'Cancel preparation';

  @override
  String get hostEventOfferSetupRequired =>
      'This event needs offer settings before you can create an offer. Review its payment method and offer expiry.';

  @override
  String get hostResponseAddReviewNote => 'Add note';

  @override
  String get hostEventOfferNeedsContact =>
      'Review these responses and add them to People before offering an event.';

  @override
  String get hostEventOfferConvertContact => 'Review response';

  @override
  String get hostEventOfferSelectionChanged =>
      'Selected responses changed. Review them again.';

  @override
  String get hostEventOfferLoadFailed =>
      'Could not load event offers. Try again.';

  @override
  String get hostEventOfferIssued =>
      'Offers recorded. Sending and admission are separate steps.';

  @override
  String get hostEventOfferRefresh => 'Refresh offers';

  @override
  String get hostEventOfferExisting => 'Existing offers';

  @override
  String get hostEventOfferNoOffers => 'No offers recorded for this event.';

  @override
  String get hostEventOfferUntitledEvent => 'Untitled event';

  @override
  String get hostEventOfferLoadMoreEvents => 'Load more events';

  @override
  String get hostEventOfferOpenSettings => 'Open event settings';

  @override
  String get hostEventOfferStatusDraft => 'Draft';

  @override
  String get hostEventOfferStatusOffered => 'Offered';

  @override
  String get hostEventOfferStatusWithdrawn => 'Withdrawn';

  @override
  String get hostEventOfferStatusExpired => 'Expired';

  @override
  String get hostsPrivateEventDetailActualHint =>
      'These choices update this event. Organizer defaults are suggestions until you apply them.';

  @override
  String get hostsPrivateEventDetailCurrentDuration => 'Current end time';

  @override
  String get hostsPrivateEventDetailNotSet => 'Not set';

  @override
  String hostsPrivateEventDetailMinutes({required int minutes}) {
    return '$minutes minutes';
  }

  @override
  String get hostsPrivateEventDetailDuration => 'Duration in minutes';

  @override
  String get hostsPrivateEventDetailDurationHint => '15–240 minutes';

  @override
  String get hostsPrivateEventDetailUseDuration => 'Use suggested duration';

  @override
  String get hostsPrivateEventDetailNoDurationSuggestion =>
      'No duration suggestion is saved.';

  @override
  String get hostsPrivateEventDetailClearDuration => 'Remove end time';

  @override
  String get hostsPrivateEventDetailCurrentVenue => 'Current place';

  @override
  String get hostsPrivateEventDetailVenueName => 'Place name';

  @override
  String get hostsPrivateEventDetailVenueHint => 'Enter a venue name';

  @override
  String get hostsPrivateEventDetailUseSavedPlace => 'Use saved place';

  @override
  String get hostsPrivateEventDetailNoSavedPlace =>
      'No saved place is selected.';

  @override
  String get hostsPrivateEventDetailSavedPlaceHint =>
      'Copy the saved place after availability is checked.';

  @override
  String get hostsPrivateEventDetailClearVenue => 'Remove place';

  @override
  String get hostsPrivateEventDetailFormat => 'Activity format';

  @override
  String get hostsPrivateEventDetailCurrentFormat => 'Current activity';

  @override
  String get hostsPrivateEventDetailClearFormat => 'Remove activity format';

  @override
  String get hostEventOfferReviewTitle => 'Event offer';

  @override
  String get hostEventOfferPreview => 'Preview offers';

  @override
  String get hostEventOfferPreviewing => 'Checking current eligibility…';

  @override
  String get hostEventOfferReview => 'Review offer details';

  @override
  String hostEventOfferExpires({required String date}) {
    return 'Expires $date';
  }

  @override
  String get hostEventOfferCommit => 'Create offers';

  @override
  String get hostEventOfferCommitting => 'Creating offers…';

  @override
  String get hostEventOfferCommitted => 'Offers created';

  @override
  String get hostEventOfferFailed => 'Could not complete this offer action.';

  @override
  String get hostEventOfferNoReservation =>
      'Creating an offer does not reserve a place.';

  @override
  String hostEventOfferPersonalPaymentLink({required String name}) {
    return 'Personal payment link for $name';
  }

  @override
  String get hostEventOfferPaymentReference => 'Payment reference';

  @override
  String get hostEventOfferRecordReference => 'Record reference';

  @override
  String get hostEventOfferEvidenceSubmitted => 'Evidence submitted';

  @override
  String get hostEventOfferBankReceiptChecked => 'I checked the bank receipt';

  @override
  String get hostEventOfferReviewNote => 'Review note';

  @override
  String get hostEventOfferAttestReceived => 'Attest received';

  @override
  String get hostEventOfferRejectReference => 'Reject reference';

  @override
  String get hostEventOfferHostAttested => 'Host attested';

  @override
  String get hostEventOfferRejected => 'Rejected';

  @override
  String get hostEventOfferOpenExisting => 'Review offer';

  @override
  String get hostEventOfferHandoffPrepare => 'Share invitation';

  @override
  String get hostEventOfferHandoffBlocked =>
      'Handoff unavailable. Review the current offer and contact permissions.';

  @override
  String get hostEventOfferHandoffDisclosure =>
      'Opens WhatsApp with editable text. You review and press Send; Catch cannot track delivery or replies.';

  @override
  String get hostEventOfferOpenWhatsapp => 'Open WhatsApp';

  @override
  String get hostEventOfferCopyMessage => 'Copy message';

  @override
  String get hostEventOfferMessageCopied =>
      'Message copied. Sending is still your choice.';

  @override
  String get hostEventOfferHandoffOpenFailed =>
      'Could not open WhatsApp on this device.';

  @override
  String get hostsEventPreferencePublishedTitle => 'Published event offers';

  @override
  String get hostsEventPreferencePublishedHint =>
      'These settings apply to future offers. Existing offers keep their recorded terms.';

  @override
  String get hostsPrivateEventInventoryTitle => 'Private events';

  @override
  String get hostsPrivateEventInventoryUpcoming => 'Upcoming';

  @override
  String get hostsPrivateEventInventoryPast => 'Past';

  @override
  String get hostsPrivateEventInventoryCancelled => 'Cancelled';

  @override
  String get hostsPrivateEventInventoryHistoryEmpty =>
      'No private events in this view.';

  @override
  String get hostsPrivateEventHistoryTitle => 'Event history';

  @override
  String get hostsPrivateEventHistoryBody =>
      'This event has started or was cancelled. Its saved details are available for reference.';

  @override
  String get hostsPrivateEventInventoryLoading => 'Loading private events…';

  @override
  String get hostsPrivateEventInventoryEmpty =>
      'No upcoming private event setups.';

  @override
  String get hostsPrivateEventInventoryLoadMore => 'Load more private events';

  @override
  String get hostsPrivateEventInventoryError =>
      'Could not load private events.';

  @override
  String get hostFormTargetTitle => 'Who is this form for?';

  @override
  String get hostFormTargetReusable => 'Reusable organizer form';

  @override
  String get hostFormTargetEvent => 'For an event';

  @override
  String get hostFormTargetSelectEvent => 'Choose an event';

  @override
  String get hostFormTargetNoUpcomingEvents =>
      'No eligible upcoming events are available.';

  @override
  String get hostFormTargetUnavailable =>
      'This linked event is no longer available. Choose another event or make the form reusable.';

  @override
  String get hostFormTargetPublishedNotice =>
      'Changes to a published form take effect when you publish the draft updates.';

  @override
  String get hostFormTargetLoadFailed =>
      'Could not load your events. Try again.';

  @override
  String get hostResponseQueryRefresh => 'Refresh responses';

  @override
  String get hostResponseQueryAscending => 'Ascending';

  @override
  String get hostResponseQueryDescending => 'Descending';

  @override
  String hostResponseQueryResultCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count responses',
      one: '1 response',
    );
    return '$_temp0';
  }

  @override
  String hostResponseQueryFilterCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count conditions',
      one: '1 condition',
    );
    return '$_temp0';
  }

  @override
  String get hostResponseQueryReviewInbox => 'Review inbox';

  @override
  String get hostResponseQueryOpenAnswers => 'Filter by answers';

  @override
  String hostResponseQueryVersionScope({required int version}) {
    return 'Published version $version · All review statuses';
  }

  @override
  String get hostFormAdmissionTitle => 'Event admission';

  @override
  String get hostFormAdmissionComplete =>
      'Admission confirmed. The guest is on the event roster.';

  @override
  String get hostFormAdmissionSaved =>
      'A saved admission needs to be resolved before starting another.';

  @override
  String get hostFormAdmissionRetain =>
      'This person already occupies a seat. Confirm to link this response without reserving another seat.';

  @override
  String get hostFormAdmissionReady =>
      'Payment and capacity checks passed. Confirm to add this guest to the roster. Availability is checked again when you confirm.';

  @override
  String get hostFormAdmissionReview =>
      'Review the response, payment evidence and available capacity before admitting this guest.';

  @override
  String get hostFormAdmissionReviewAgain => 'Review admission again';

  @override
  String get hostFormAdmissionRetry => 'Retry saved admission';

  @override
  String get hostFormAdmissionConfirm => 'Confirm admission';

  @override
  String get hostFormAdmissionCheck => 'Check admission';

  @override
  String get hostFormPaymentCatchCollection => 'Catch collects payments';

  @override
  String get hostFormPaymentCatchCollectionHelp =>
      'Catch collects the fee and transfers the organizer share to your linked payout account.';

  @override
  String get hostFormPaymentCatchSetupRequired =>
      'Catch collection is selected. Complete your linked payout account setup and ask Catch to verify collection is ready.';

  @override
  String get hostFormPaymentCollectionUnavailable =>
      'The selected collection method is not ready. Ask Catch to review your payment configuration.';

  @override
  String get programsListTitle => 'Programs';

  @override
  String get programsListCreateLabel => 'New program';

  @override
  String get programsListRowActions => 'Program actions';

  @override
  String get programsListArchiveAction => 'Archive program';

  @override
  String get programsListUnarchiveAction => 'Unarchive';

  @override
  String programsListArchiveConfirmTitle({required String title}) {
    return 'Archive $title?';
  }

  @override
  String programsListArchiveConfirmMessage({required String date}) {
    return 'The program keeps working read-only. Guest identity details are anonymized on $date unless you unarchive first.';
  }

  @override
  String programsListUnarchiveConfirmTitle({required String title}) {
    return 'Unarchive $title?';
  }

  @override
  String get programsListUnarchiveConfirmMessage =>
      'The program returns to its previous status and edits work again.';

  @override
  String programsListArchiveDone({required String date}) {
    return 'Archived. Guest details anonymize on $date.';
  }

  @override
  String get programsListUnarchiveDone => 'Program restored.';

  @override
  String programsListAnonymizesOn({required String date}) {
    return 'Anonymizes $date';
  }

  @override
  String get programsListRestoreWindowExpiredReason =>
      'The restore window has ended.';

  @override
  String get programsListAnonymized => 'Anonymized';

  @override
  String get programsCreateTitle => 'New program';

  @override
  String get programsCreateNameLabel => 'Program title';

  @override
  String get programsCreateNameHint => 'Rao–Shah wedding weekend';

  @override
  String get programsCreateTimezoneLabel => 'Timezone';

  @override
  String get programsCreateTimezoneHint => 'Choose a timezone';

  @override
  String get programsCreateStartLabel => 'Start date';

  @override
  String get programsCreateEndLabel => 'End date';

  @override
  String get programsCreateSubmit => 'Create program';

  @override
  String get programsWorkspaceTitle => 'Program';

  @override
  String programsWorkspaceStatsGuests({required int count}) {
    return '$count guests';
  }

  @override
  String programsWorkspaceStatsHouseholds({required int count}) {
    return '$count households';
  }

  @override
  String programsWorkspaceStatsLegs({required int count}) {
    return '$count inbound legs';
  }

  @override
  String programsWorkspaceStatsStaff({required int count}) {
    return '$count staff';
  }

  @override
  String get programsWorkspaceScheduleTitle => 'Schedule';

  @override
  String get programsWorkspaceScheduleSubtitle => 'Functions by day';

  @override
  String programsWorkspaceDayLabel({required String date, required int index}) {
    return 'Day $index · $date';
  }

  @override
  String get programsWorkspaceFunctionNew => 'New function';

  @override
  String get programsWorkspaceNoFunctions =>
      'No functions yet — add the first event of the program.';

  @override
  String get programsWorkspaceDayEmpty => 'No functions on this day.';

  @override
  String get programsWorkspaceFunctionEdit => 'Edit function';

  @override
  String get programsWorkspaceFunctionSave => 'Save';

  @override
  String get programsWorkspaceFunctionInvitations => 'Invitations';

  @override
  String get programsWorkspaceFunctionName => 'Function name';

  @override
  String get programsWorkspaceFunctionVenue => 'Venue';

  @override
  String get programsWorkspaceFunctionVenueNotes => 'Venue notes';

  @override
  String get programsWorkspaceFunctionStarts => 'Starts';

  @override
  String get programsWorkspaceFunctionEnds => 'Ends';

  @override
  String programsWorkspaceInvitations({required String mode}) {
    return 'Invitations: $mode';
  }

  @override
  String programsWorkspaceCheckedIn({
    required int expected,
    required int checked,
  }) {
    return '$checked/$expected checked in';
  }

  @override
  String get programsWorkspaceManageTitle => 'Manage';

  @override
  String get programsWorkspaceGuestsTitle => 'Guests & RSVP';

  @override
  String get programsWorkspaceTeamTitle => 'Team & duties';

  @override
  String get programsWorkspaceImportTitle => 'Manifest import';

  @override
  String get programsWorkspaceCommunicationsTitle => 'Communications';

  @override
  String get programsWorkspaceMomentsTitle => 'Moments';

  @override
  String get programsWorkspaceInboxTitle => 'Guest inbox';

  @override
  String get programsWorkspacePickupTitle => 'Pickup points';

  @override
  String get programsWorkspacePickupNew => 'Add pickup point';

  @override
  String get programsWorkspacePickupEdit => 'Edit pickup point';

  @override
  String get programsWorkspacePickupEmpty =>
      'No pickup points yet — add airports, railway stations or other meeting points.';

  @override
  String get programsWorkspacePickupKind => 'Type';

  @override
  String get programsWorkspacePickupLabel => 'Label';

  @override
  String get programsWorkspacePickupIata => 'IATA code';

  @override
  String get programsWorkspacePickupTerminal => 'Terminal';

  @override
  String get programsWorkspacePickupMeetingZone => 'Meeting zone';

  @override
  String get programsWorkspacePickupInstructions => 'Staff instructions';

  @override
  String get programsWorkspaceLogisticsActive => 'Active';

  @override
  String get programsWorkspaceLogisticsInactive => 'Inactive';

  @override
  String get programsWorkspaceHotelsTitle => 'Hotels';

  @override
  String get programsWorkspaceHotelNew => 'Add hotel';

  @override
  String get programsWorkspaceHotelEdit => 'Edit hotel';

  @override
  String get programsWorkspaceHotelEmpty =>
      'No hotels yet — add the lodging blocks your guests stay in.';

  @override
  String get programsWorkspaceHotelName => 'Hotel name';

  @override
  String get programsWorkspaceHotelAddress => 'Address';

  @override
  String get programsWorkspaceHotelReception => 'Reception contact';

  @override
  String get programsWorkspaceHotelNotes => 'Notes';

  @override
  String get programsGuestsTitle => 'Guests & RSVP';

  @override
  String get programsGuestsGridTitle => 'Households × functions';

  @override
  String programsGuestsGridSubtitle({required String function}) {
    return 'RSVP state for $function';
  }

  @override
  String get programsGuestsAddGuest => 'Add guest';

  @override
  String get programsGuestsEmptyTitle => 'No guests yet';

  @override
  String get programsGuestsEmptyMessage =>
      'Import a manifest or add guests to build the RSVP grid.';

  @override
  String get programsGuestsGroupsTitle => 'Groups';

  @override
  String get programsGuestsGroupsSubtitle =>
      'Grouping dimensions for audience and allocation cuts';

  @override
  String get programsGuestsGroupsEmpty => 'No groups yet.';

  @override
  String get programsGuestsGroupNew => 'New group';

  @override
  String get programsGuestsGroupEdit => 'Edit group';

  @override
  String get programsGuestsGroupHotel => 'Hotel for this group';

  @override
  String get programsGuestsGroupNoHotel => 'No hotel assigned';

  @override
  String programsGuestsGroupHotelSummary({required String hotel}) {
    return 'Staying at $hotel';
  }

  @override
  String get programsGuestsHotelUnavailable =>
      'Previously linked hotel is unavailable';

  @override
  String get programsGuestsNoHotelsAvailable =>
      'No hotels are available for this program yet. You can save the group without one.';

  @override
  String get programsGuestsGroupLabel => 'Group label';

  @override
  String get programsGuestsGroupDimension => 'Dimension';

  @override
  String get programsGuestsGroupDimensionHint =>
      'side, lineage, relation, company…';

  @override
  String programsGuestsGroupMembers({required int count}) {
    return '$count members';
  }

  @override
  String get programsGuestsGroupDelete => 'Delete';

  @override
  String get programsGuestsGroupDeleteTitle => 'Delete group';

  @override
  String programsGuestsGroupDeleteMessage({required String label}) {
    return 'Remove $label? Guests keep their RSVP rows.';
  }

  @override
  String get programsGuestsMutationFailed => 'Couldn\'t save';

  @override
  String get programsGuestsNoHousehold => 'No household';

  @override
  String get programsGuestsShareRsvpLink => 'Share RSVP link';

  @override
  String programsGuestsRsvpLinkSubject({required String household}) {
    return 'RSVP for $household';
  }

  @override
  String get programsGuestsInviteModeAll => 'all guests';

  @override
  String get programsGuestsInviteModeSelected => 'selected guests';

  @override
  String get programsGuestsInviteSelectionHint =>
      'Pick invited guests from the guest list after saving.';

  @override
  String get programsGuestsNameLabel => 'Guest name';

  @override
  String get programsGuestsPhoneLabel => 'Phone (E.164)';

  @override
  String get programsGuestsEmailLabel => 'Email';

  @override
  String get programsGuestsHouseholdLabel => 'Household';

  @override
  String get programsTeamTitle => 'Team & duties';

  @override
  String get programsTeamSubtitle => 'Staff access scoped to program duties';

  @override
  String get programsTeamGrant => 'Grant access';

  @override
  String get programsTeamInvite => 'Invite by phone';

  @override
  String get programsTeamRevoke => 'Revoke';

  @override
  String get programsTeamRevokeTitle => 'Revoke staff access';

  @override
  String programsTeamRevokeMessage({required String name}) {
    return 'Remove $name\'s access to this program?';
  }

  @override
  String get programsTeamEmptyTitle => 'No staff yet';

  @override
  String get programsTeamEmptyMessage =>
      'Grant duties or invite staff by phone to run this program.';

  @override
  String programsTeamExpires({required String date}) {
    return 'Expires $date';
  }

  @override
  String get programsTeamNameLabel => 'Display name';

  @override
  String get programsTeamPhoneLabel => 'Phone (E.164)';

  @override
  String get programsTeamDutiesLabel => 'Duties';

  @override
  String get programsTeamExpiryLabel => 'Access expires';

  @override
  String get programsImportTitle => 'Manifest import';

  @override
  String get programsImportFileTitle => 'Source file';

  @override
  String get programsImportFileSubtitle =>
      'CSV or XLSX guest and travel manifest';

  @override
  String get programsImportPickFile => 'Choose file';

  @override
  String programsImportFileSummary({required int count, required int columns}) {
    return '$count rows · $columns columns';
  }

  @override
  String get programsImportMappingTitle => 'Column mapping';

  @override
  String get programsImportMappingSubtitle =>
      'Map manifest fields to file columns';

  @override
  String get programsImportFieldSkip => 'Skip';

  @override
  String get programsImportFieldDisplayName => 'Display name';

  @override
  String get programsImportFieldPhone => 'Phone';

  @override
  String get programsImportFieldEmail => 'Email';

  @override
  String get programsImportFieldExternalReference => 'External reference';

  @override
  String get programsImportFieldHousehold => 'Household label';

  @override
  String get programsImportFieldGroups => 'Group labels';

  @override
  String get programsImportFieldParty => 'Travel party label';

  @override
  String get programsImportFieldFlight => 'Flight number';

  @override
  String get programsImportFieldOrigin => 'Origin IATA';

  @override
  String get programsImportFieldDestinationIata => 'Destination IATA';

  @override
  String get programsImportFieldArrival => 'Scheduled arrival';

  @override
  String get programsImportFieldPassengers => 'Passengers';

  @override
  String get programsImportFieldLuggage => 'Luggage units';

  @override
  String get programsImportFieldPickup => 'Pickup point label';

  @override
  String get programsImportFieldHotel => 'Destination hotel';

  @override
  String get programsImportFieldDestinationLabel => 'Destination label';

  @override
  String programsImportRowSummary({required int skipped, required int mapped}) {
    return '$mapped rows ready · $skipped skipped';
  }

  @override
  String get programsImportPreviewTitle => 'Preview & commit';

  @override
  String get programsImportPreview => 'Preview import';

  @override
  String get programsImportCommit => 'Import rows';

  @override
  String programsImportResultGuests({
    required int created,
    required int updated,
  }) {
    return '+$created guests · $updated updated';
  }

  @override
  String programsImportResultLegs({
    required int created,
    required int updated,
  }) {
    return '+$created legs · $updated updated';
  }

  @override
  String programsImportResultHouseholds({required int count}) {
    return '+$count households';
  }

  @override
  String programsImportResultGroups({required int count}) {
    return '+$count groups';
  }

  @override
  String get programsImportAlreadyApplied => 'already applied';

  @override
  String programsImportErrors({required int count}) {
    return '$count row errors';
  }

  @override
  String programsImportRowError({required String message, required int index}) {
    return 'Row $index: $message';
  }

  @override
  String get programsImportEmptyTitle => 'No file selected';

  @override
  String get programsImportEmptyMessage =>
      'Pick a CSV or XLSX manifest to map columns.';

  @override
  String get hostsEventPreferenceNotSet => 'Not set';

  @override
  String get hostsEventPreferenceReviewTitle => 'Review changes';

  @override
  String get hostsEventPreferenceReviewHint =>
      'Review current organizer defaults and your edits before applying.';

  @override
  String get hostsEventPreferenceOfferWarning =>
      'Issued offers and shared payment links keep their original terms. Review those offers separately if their payment instructions are outdated.';

  @override
  String get hostsEventPreferenceNoChanges => 'No settings have changed';

  @override
  String get hostsEventPreferenceReviewLoading => 'Preparing preview…';

  @override
  String get hostsEventPreferencePreview =>
      'Preview changes and current defaults';

  @override
  String get hostsEventPreferenceApply => 'Apply reviewed changes';

  @override
  String hostsEventPreferenceBeforeAfter({
    required String before,
    required String after,
  }) {
    return 'Current: $before\nAfter applying: $after';
  }

  @override
  String get hostsEventPreferenceExpectedAmount => 'Expected amount';

  @override
  String get hostResponseOfferEvent => 'Offer an event';

  @override
  String get hostResponseReviewDecision => 'Review status';

  @override
  String get hostResponseContactDetails => 'Contact details';

  @override
  String get hostEventOfferChangeEvent => 'Change event';

  @override
  String get hostEventOfferUnavailable =>
      'Event offers are not available yet. Return to the response to continue reviewing.';

  @override
  String get hostEventOfferRecipient => 'Recipient';

  @override
  String get hostEventOfferAmount => 'Admission price';

  @override
  String get hostEventOfferFree => 'Free admission';

  @override
  String get hostResponseContinueOffer => 'Continue to offer';

  @override
  String get hostEventOfferExpiry => 'Valid until';

  @override
  String get hostResponseChooseBeforeAcceptance =>
      'Acceptance is required before creating the offer.';

  @override
  String get hostsPrivateEventReturnToReviewHint =>
      'Save these basics and return to your selected responses. You can finish event details later.';

  @override
  String get hostsPrivateEventDetailPickLocation =>
      'Choose meeting place on map';

  @override
  String get hostsPrivateEventDetailLocationNeeded =>
      'A map location is required before publishing. A name alone is fine while planning.';

  @override
  String get hostsPrivateEventDetailLocationReady =>
      'Meeting place is ready for directions and the public listing.';

  @override
  String get hostsPrivateEventAdmissionTerms => 'Capacity and price';

  @override
  String get hostsPrivateEventAdmissionTermsHint =>
      'Set the total capacity and ticket price. Enter 0 for a free event. Registration stays closed until you enable it separately.';

  @override
  String get hostsPrivateEventSaveTerms => 'Save capacity and price';

  @override
  String hostsPrivateEventRefundCutoff({required int hours}) {
    return 'Full refund until $hours hours before; no refund after';
  }

  @override
  String get hostsPublicationNeedsFuture =>
      'Choose a future date for an active event';

  @override
  String get hostsPublicationNeedsOrganizer =>
      'Make the organizer visible in Catch';

  @override
  String get hostsPublicationNeedsDistance => 'Set the distance and pace';

  @override
  String get hostsPublicationNeedsReview =>
      'Review the event details before publishing';

  @override
  String get hostsPublicationPublishExplanation =>
      'Publishing makes this event visible in Catch. Registration stays closed until you enable it separately.';

  @override
  String get hostsPublicationUnpublishExplanation =>
      'Make this event private and close new registration. Existing guests, offers and payment records remain. This does not cancel the event.';

  @override
  String get hostsPublicationPending =>
      'Visibility change awaiting confirmation';

  @override
  String get hostsPublicationPendingBody =>
      'The result has not been confirmed. Retry the same change to recover its result before making another change.';

  @override
  String get hostsPublicationSaved => 'Visibility change saved';

  @override
  String get hostsPublicationRegistrationSeparate =>
      'Registration remains closed after a visibility change. Configure registration separately when you are ready.';

  @override
  String get hostsPublicationRefresh => 'Refresh readiness';

  @override
  String get hostsPublicationRetry => 'Recover visibility change';

  @override
  String get hostsPublicationUnpublish => 'Make event private';

  @override
  String get hostsPublicationPublish => 'Publish event';

  @override
  String get hostsPublicationPublishedBody =>
      'This event is published. Visibility and registration are managed separately.';

  @override
  String get hostsPrivateEventCheckingGuests => 'Checking existing guests';

  @override
  String get hostsPrivateEventCheckingGuestsBody =>
      'Your admission settings will save when the guest check is complete. If you leave this screen, return here to continue.';

  @override
  String get hostsPrivateEventContinueCheckingGuests =>
      'Continue checking guests';

  @override
  String get hostsPrivateEventDiscardPending =>
      'Discard change and review settings';

  @override
  String get hostsPrivateEventDiscardPendingBody =>
      'Discard changes that have not begun. If the settings have already saved, we will show the saved result.';

  @override
  String get hostsPrivateEventDiscarding => 'Discarding pending change';

  @override
  String get hostsPrivateEventDiscardingBody =>
      'Returning to your settings. If the change already saved, we will retrieve its result.';

  @override
  String get hostsPrivateEventContinueDiscarding =>
      'Continue discarding change';

  @override
  String get paymentsCancellationLabel => 'Booking cancelled';

  @override
  String get paymentsCancellationRefundReview => 'Refund needs review';

  @override
  String get paymentsCancellationPartialRefund => 'Partially refunded';

  @override
  String get paymentsCancellationNoRefund =>
      'Your booking is cancelled. No refund applies under its cancellation policy.';

  @override
  String get paymentsCancellationCheckoutMessage =>
      'Your booking is cancelled. View payment history for the refund status.';

  @override
  String paymentsCancellationRefundPending({required String amount}) {
    return 'Your booking is cancelled. A refund of $amount is being processed.';
  }

  @override
  String paymentsCancellationRefundReturned({required String amount}) {
    return '$amount returned. Your booking is cancelled.';
  }

  @override
  String get hostOfferPaymentTitle => 'Offer payments';

  @override
  String get hostOfferPaymentModeHeading => 'How guests pay';

  @override
  String get hostOfferPaymentModeChange => 'Change';

  @override
  String get hostOfferPaymentDetailsHeading => 'Payment details';

  @override
  String get hostOfferPaymentConfirmationHeading => 'How confirmation works';

  @override
  String get hostOfferPaymentModeFreeBody =>
      'No payment — guests just accept the offer.';

  @override
  String get hostOfferPaymentModeCheckoutBody =>
      'Guests pay through Catch — confirmed automatically.';

  @override
  String get hostOfferPaymentModePage => 'Payment page link';

  @override
  String get hostOfferPaymentModePageBody =>
      'One shared payment link for every guest — you confirm each payment.';

  @override
  String get hostOfferPaymentModeRequestBody =>
      'A separate payment link per guest, added while reviewing each offer — you confirm each payment.';

  @override
  String get hostOfferPaymentModeManualBody =>
      'UPI, bank transfer or cash instructions — you confirm each payment.';

  @override
  String get hostOfferPaymentComingSoon => 'Coming soon';

  @override
  String get hostOfferPaymentAmount => 'Ticket price';

  @override
  String get hostOfferPaymentAmountHint =>
      'The amount each guest pays for this event.';

  @override
  String get hostOfferPaymentValidity => 'Offer valid for';

  @override
  String hostOfferPaymentValidityHours({required int hours}) {
    return '$hours h';
  }

  @override
  String get hostOfferPaymentValidityCustom => 'Custom';

  @override
  String get hostOfferPaymentValidityMinutes => 'Validity in minutes';

  @override
  String get hostOfferPaymentValidityHint =>
      'New offers expire this long after they\'re recorded — or at the event start, whichever is sooner.';

  @override
  String get hostOfferPaymentPageLink => 'Payment page link';

  @override
  String get hostOfferPaymentPageLinkHint =>
      'A public https page — Razorpay, Stripe or similar.';

  @override
  String get hostOfferPaymentPageReuse =>
      'This page can be reused for every guest';

  @override
  String get hostOfferPaymentPageReuseBody =>
      'The same link appears in every offer message.';

  @override
  String get hostOfferPaymentRequestLinksBody =>
      'You\'ll add each guest\'s payment link when reviewing their offer.';

  @override
  String get hostOfferPaymentInstructionsHint =>
      'UPI to name@bank, or cash at the door.';

  @override
  String get hostOfferPaymentInstructionsHelper =>
      'Every guest sees this text in their offer.';

  @override
  String get hostOfferPaymentMessage => 'Message to guests';

  @override
  String get hostOfferPaymentMessageHint =>
      'Shown above the payment details in the offer.';

  @override
  String get hostOfferPaymentConfirmAutoTitle => 'Confirmed automatically';

  @override
  String get hostOfferPaymentConfirmAutoBody =>
      'The guest checks out through Catch. The offer shows paid the moment the payment verifies — nothing to check, no references to paste.';

  @override
  String get hostOfferPaymentConfirmManualTitle => 'You confirm each payment';

  @override
  String get hostOfferPaymentConfirmPageBody =>
      'Guests pay on your page — Catch can\'t see it. Each guest sends you a payment reference; you check your account and confirm it in the offer list.';

  @override
  String get hostOfferPaymentConfirmRequestBody =>
      'Guests pay through their own link — Catch can\'t see it. Each guest sends you a payment reference; you check your account and confirm it in the offer list.';

  @override
  String get hostOfferPaymentExpires => 'New offers expire';

  @override
  String get hostOfferPaymentConfirmManualBody =>
      'Check your UPI app or bank. When the money arrives, confirm the guest\'s payment reference in the offer list. Cash has no signal — you attest that you\'ve received it.';

  @override
  String get hostOfferPaymentConfirmFreeTitle => 'Nothing to confirm';

  @override
  String get hostOfferPaymentConfirmFreeBody =>
      'Free offers carry no payment — the guest accepts the offer and a place is held separately.';

  @override
  String get hostOfferPaymentChooseMode => 'Choose how guests pay';

  @override
  String get hostOfferPaymentSetAmount => 'Set a ticket price';

  @override
  String get hostOfferPaymentSetCurrency => 'Set a three-letter currency code';

  @override
  String get hostOfferPaymentSetPage => 'Add the payment page link';

  @override
  String get hostOfferPaymentConfirmReuse => 'Confirm the page can be reused';

  @override
  String get hostOfferPaymentSetInstructions => 'Add payment instructions';

  @override
  String get hostOfferPaymentSetValidity => 'Set offer validity';

  @override
  String get hostOfferPaymentCheckoutUnavailable =>
      'Catch checkout needs separate activation — choose another way to collect';

  @override
  String get hostOfferPaymentSave => 'Save payment settings';

  @override
  String get hostOfferPaymentReadyFree => 'Ready — free admission';

  @override
  String hostOfferPaymentReadyPaid({
    required String amount,
    required String collection,
  }) {
    return 'Ready — $amount via $collection';
  }

  @override
  String get hostOfferPaymentReviewTitle => 'Review payment terms';

  @override
  String get hostOfferPaymentReviewBody => 'New offers will use these terms';

  @override
  String get programsLodgingTitle => 'Stay planner';

  @override
  String get programsLodgingSubtitle =>
      'Plan rooms around people, dates and verified needs.';

  @override
  String get programsLodgingSetupMissing =>
      'Add lodging dates, confirmed sharing parties and contracted rooms to start planning.';

  @override
  String get programsLodgingReview => 'Review this proposal';

  @override
  String get programsLodgingBoundedSearch =>
      'The search reached its limit. Review this proposal before approval.';

  @override
  String get programsLodgingRegenerate => 'Regenerate unlocked placements';

  @override
  String get programsLodgingApprove => 'Approve proposal';

  @override
  String get programsLodgingPublish => 'Publish rooms to guests';

  @override
  String get programsLodgingParties => 'Room-sharing parties';

  @override
  String get programsLodgingList => 'List';

  @override
  String get programsLodgingMap => 'Floor map';

  @override
  String get programsLodgingMove => 'Move party';

  @override
  String get programsLodgingLocked => 'Locked';

  @override
  String get programsLodgingProvisional => 'Exact room pending';

  @override
  String get programsLodgingEmpty => 'No contracted rooms on this floor.';

  @override
  String programsLodgingUnplaced({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count parties still need rooms.',
      one: 'One party still needs a room.',
    );
    return '$_temp0';
  }

  @override
  String get programsLodgingSetup => 'Set up lodging';

  @override
  String get programsLodgingEditSetup => 'Edit dates, sharing and inventory';

  @override
  String get programsLodgingDemand => 'Guests who need rooms';

  @override
  String get programsLodgingSharingHint =>
      'Invitation households and social groups do not confirm room sharing. Select and confirm each party explicitly.';

  @override
  String get programsLodgingArrival => 'Arrival date (YYYY-MM-DD)';

  @override
  String get programsLodgingDeparture => 'Checkout date (YYYY-MM-DD)';

  @override
  String get programsLodgingBeds => 'Beds needed';

  @override
  String get programsLodgingFeatures => 'Functional features (comma separated)';

  @override
  String get programsLodgingAddDemand => 'Keep these stay dates';

  @override
  String get programsLodgingParty => 'Sharing party';

  @override
  String get programsLodgingConfirmed => 'Guests have confirmed sharing';

  @override
  String get programsLodgingAddParty => 'Keep this sharing party';

  @override
  String get programsLodgingPriority => 'Room priority';

  @override
  String get programsLodgingRoomType => 'Required room type';

  @override
  String get programsLodgingInventory => 'Contracted inventory';

  @override
  String get programsLodgingContract => 'Room block';

  @override
  String get programsLodgingZone => 'Floor area or corridor';

  @override
  String get programsLodgingBuilding => 'Building';

  @override
  String get programsLodgingFloor => 'Floor';

  @override
  String get programsLodgingWing => 'Wing';

  @override
  String get programsLodgingRoomLabel =>
      'Hotel room number (leave empty until released)';

  @override
  String get programsLodgingOccupants => 'Verified occupant capacity';

  @override
  String get programsLodgingAddInventory => 'Keep this inventory unit';

  @override
  String get programsLodgingInventoryHint =>
      'Verify beds, capacity and functional features with the hotel. A type-only unit keeps its identity while the physical room is pending.';

  @override
  String get programsLodgingNesting => 'Nested social groups';

  @override
  String get programsLodgingParents => 'Parent groups';

  @override
  String get programsLodgingAddNesting => 'Keep this nesting';

  @override
  String get programsLodgingAdoptions => 'Verify existing stays';

  @override
  String get programsLodgingAdopt => 'Keep this verified stay link';

  @override
  String get programsLodgingSaveSetup => 'Save setup and plan rooms';

  @override
  String get programsLodgingAdd => 'Add new';

  @override
  String get programsLodgingRemove => 'Remove selected item';

  @override
  String get programsLodgingPinHotel => 'Pin to hotel';

  @override
  String get programsLodgingPinRoom => 'Pin to room';

  @override
  String get programsLodgingPinZone => 'Pin to floor area';

  @override
  String get programsLodgingSaveHint =>
      'Add dated demand, confirmed sharing choices and verified contracted inventory before planning.';

  @override
  String get programsLodgingResources => 'Shared component rooms';

  @override
  String get programsLodgingResourcesHint =>
      'For a whole villa, select the same component identities used by its rooms so they cannot be allocated twice.';

  @override
  String get programsLodgingVerified => 'Verified unchanged stay';

  @override
  String programsLodgingConfirmHotel({required String hotel}) {
    return 'Record hotel confirmation: $hotel';
  }

  @override
  String programsLodgingHotelConfirmed({required String hotel}) {
    return 'Hotel confirmed: $hotel';
  }

  @override
  String get programsLodgingMembershipTitle => 'Review social memberships';

  @override
  String get programsLodgingMembershipHint =>
      'Lists suggest memberships. Choose the groups to include; saving records explicit exclusions too. These choices never create a room-sharing party.';

  @override
  String get programsLodgingMembershipIncluded => 'Included';

  @override
  String get programsLodgingMembershipExcluded => 'Excluded';

  @override
  String get programsLodgingMembershipSuggested => 'Suggestion awaiting review';

  @override
  String get programsLodgingMembershipCanonical =>
      'Existing membership; source not verified';

  @override
  String get programsLodgingMembershipSave => 'Save membership choices';

  @override
  String get programsLodgingMembershipExpired =>
      'Access expired. Return and refresh before reviewing memberships.';

  @override
  String programsLodgingMembershipEvidence({
    required String group,
    required String status,
    required String source,
  }) {
    return '$group: $status · $source';
  }

  @override
  String get programsEntryTitle => 'Create';

  @override
  String get programsEntryEventTab => 'Event';

  @override
  String get programsEntryProgramTab => 'Program';

  @override
  String get programsEntryProgramBody =>
      'Coordinate a multi-day program and manage its events, travel and guest RSVP.';

  @override
  String get programsCreateKindLabel => 'Program type';

  @override
  String get programsCreateChooseKind => 'Choose a program type';

  @override
  String get programsCreateKindWedding => 'Wedding';

  @override
  String get programsCreateKindCorporate => 'Corporate';

  @override
  String get programsCreateKindSocial => 'Social';

  @override
  String get programsCreateKindOther => 'Other';

  @override
  String get programsCreateRequired => 'Required';

  @override
  String programsCreateTooLong({required int maximum}) {
    return 'Use $maximum characters or fewer.';
  }

  @override
  String get programsCreateInvalidDate => 'Choose a valid date.';

  @override
  String get programsCreateEndAfterStart =>
      'End date must be after start date.';

  @override
  String get programsCreateRetry => 'Retry and confirm program';

  @override
  String get programsCreatePendingBody =>
      'Your save may have reached Catch. Retry the same save to recover its result before changing these details.';

  @override
  String get programsCreateConfirmingBody =>
      'Your program is saved. Confirming it appears in Events…';

  @override
  String get programsCreateNotVisibleBody =>
      'Your program is saved, but Events has not confirmed it yet. Retry to refresh the list; this will not create another program.';

  @override
  String get programsCreateActorChangedTitle => 'Organizer access changed';

  @override
  String get programsCreateActorChangedBody =>
      'Your account or selected organizer changed. Return to Events and start with the current organizer.';

  @override
  String get programsCreateLeaveTitle => 'Leave this program?';

  @override
  String get programsCreateLeaveDraftBody =>
      'Your program details have not been saved. Stay to keep editing, or discard this draft.';

  @override
  String get programsCreateLeavePendingBody =>
      'This save may have reached Catch. Stay and retry to confirm its result, or leave and check Events before starting another program.';

  @override
  String get programsCreateKeepEditing => 'Keep editing';

  @override
  String get programsCreateLeaveAction => 'Leave';

  @override
  String get programsEventRowLabel => 'Program';

  @override
  String programsEventDateRange({required String start, required String end}) {
    return '$start – $end';
  }

  @override
  String programsEventCount({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count events',
      one: '1 event',
      zero: 'No events',
    );
    return '$_temp0';
  }

  @override
  String get programsEventCountUnavailable => 'Event count unavailable';

  @override
  String get programsEventArchived => 'Archived';

  @override
  String get programsCreateSaving => 'Creating program…';

  @override
  String get programsCreateConfirming => 'Confirming program…';

  @override
  String get programsCreateViewEvents => 'View in Events';

  @override
  String get programsCreateSavedBody =>
      'Your program is saved and available in Events.';

  @override
  String get programsEventsLoadMore => 'Load more programs';

  @override
  String get hostsOperationalRosterIntakeReviewTitle => 'Review guest changes';

  @override
  String get hostsOperationalRosterIntakeResume => 'Resume saved review';

  @override
  String get hostsOperationalRosterIntakeCorrectMapping =>
      'Correct mapping and upload again';

  @override
  String hostsOperationalRosterIntakeRowIdentity({
    required String name,
    required int row,
  }) {
    return '$name · source row $row';
  }

  @override
  String hostsOperationalRosterIntakeReference({required String reference}) {
    return 'Ticket/reference: $reference';
  }

  @override
  String hostsOperationalRosterIntakeFieldChange({
    required String field,
    required String before,
    required String after,
    required String source,
  }) {
    return '$field: $before → $after · $source';
  }

  @override
  String get hostsOperationalRosterIntakeValueMissing => 'Not provided';

  @override
  String get hostsOperationalRosterIntakeRevenueSource => 'Revenue authority';

  @override
  String get hostsOperationalRosterIntakeOriginUpload => 'uploaded value';

  @override
  String get hostsOperationalRosterIntakeOriginHostCorrection =>
      'host correction or estimate';

  @override
  String get hostsOperationalRosterIntakeOriginModelProposal =>
      'unverified proposal';

  @override
  String get hostsOperationalRosterIntakeOriginDefault => 'intake default';

  @override
  String get hostsOperationalRosterIntakeOriginExisting => 'existing roster';

  @override
  String get hostsOperationalRosterIntakeIssueName =>
      'Correct the guest-name mapping, then upload this file again, or exclude this row.';

  @override
  String get hostsOperationalRosterIntakeIssueTicketIdentity =>
      'Add a distinct phone or ticket reference, then upload again. Email alone cannot prove that two tickets belong to one person.';

  @override
  String get hostsOperationalRosterIntakeIssuePhoneIdentity =>
      'Correct or remove the shared phone, then upload again. One phone cannot silently merge distinct tickets.';

  @override
  String get hostsOperationalRosterIntakeIssueEmail =>
      'Correct the email address, then upload again, or exclude this row.';

  @override
  String get hostsOperationalRosterIntakeIssueCity =>
      'Choose a supported city, then upload again, or exclude this row.';

  @override
  String get hostsOperationalRosterIntakeIssueRevenue =>
      'Correct the amount and three-letter currency, then upload again. This remains host-reported revenue, not a verified Catch payment.';

  @override
  String get hostsOperationalRosterIntakeIssueStatus =>
      'Map an explicit supported status, then upload again, or exclude this row.';

  @override
  String get hostsOperationalRosterIntakeIssueCatchBooking =>
      'Catch booking and payment facts are authoritative. Exclude this row rather than replacing them.';

  @override
  String get hostsOperationalRosterIntakeIssueClaimedIdentity =>
      'This conflicts with a verified guest identity. Correct the source identity or exclude the row.';

  @override
  String get hostsOperationalRosterIntakeIssueGeneric =>
      'Correct this row and upload again, or explicitly exclude it before apply.';

  @override
  String hostsOperationalRosterIntakeReviewSubtitle({
    required String fileName,
  }) {
    return '$fileName is saved. Review every proposed roster change before applying it.';
  }

  @override
  String get hostsOperationalRosterIntakeApply => 'Apply reviewed changes';

  @override
  String hostsOperationalRosterIntakeExceptions({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count rows need a decision before apply.',
      one: '1 row needs a decision before apply.',
    );
    return '$_temp0';
  }

  @override
  String hostsOperationalRosterIntakeExclude({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count unresolved rows',
      one: '1 unresolved row',
    );
    return 'Exclude $_temp0';
  }

  @override
  String hostsOperationalRosterIntakeRestore({required int count}) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count excluded rows',
      one: '1 excluded row',
    );
    return 'Restore $_temp0';
  }

  @override
  String get hostsOperationalRosterIntakeRetry =>
      'The saved review could not be updated. Try again; no roster changes were applied.';

  @override
  String hostsOperationalRosterIntakeRow({required int row}) {
    return 'Source row $row';
  }

  @override
  String hostsOperationalRosterIntakeCount({
    required String kind,
    required int count,
  }) {
    return '$kind: $count';
  }

  @override
  String get hostsOperationalRosterIntakeKindAdd => 'Add';

  @override
  String get hostsOperationalRosterIntakeKindUpdate => 'Update';

  @override
  String get hostsOperationalRosterIntakeKindUnchanged => 'Unchanged';

  @override
  String get hostsOperationalRosterIntakeKindExcluded => 'Excluded';

  @override
  String get hostsOperationalRosterIntakeKindNeedsReview => 'Needs review';

  @override
  String get hostsOperationalRosterIntakeKindIdentityConflict =>
      'Identity conflict';

  @override
  String get hostWorkspaceResizeColumn => 'Resize column';

  @override
  String get programsTimezoneSearchHint => 'Search city or timezone';

  @override
  String get programsTimezoneNoMatches =>
      'No matching timezones. Try a city such as Kolkata or London.';

  @override
  String get programsTimezoneIndia => 'India Standard Time';

  @override
  String get programsTimezoneFromOrganizer =>
      'From organizer settings. Program dates use this timezone; you can change it.';

  @override
  String get programsTimezoneFromCity =>
      'Suggested from the organizer city. Program dates use this timezone; you can change it.';

  @override
  String get programsTimezoneFromDevice =>
      'Suggested from your device. Choose the timezone where the program takes place.';

  @override
  String get programsTimezoneDatesHint =>
      'Choose the timezone where the program takes place. All program dates use it.';

  @override
  String get programsTimezoneDefaultsUnavailable =>
      'Organizer timezone settings could not be loaded.';

  @override
  String get programsTimezoneInvalid =>
      'Choose a valid timezone from the list.';

  @override
  String get phoneImportProgramCollaborators =>
      'Visible to authorized program collaborators';

  @override
  String get programsTeamProgramAdmin => 'Program administrator';

  @override
  String get programsTeamApprovalRequired => 'Owner approval required';

  @override
  String eventsItineraryRouteDistance({required String distance}) {
    return 'At $distance on the route';
  }

  @override
  String get hostsItineraryRouteDistance => 'Distance along route (meters)';

  @override
  String eventsRoutePaceGroup({required String label, required String pace}) {
    return '$label · $pace/km';
  }

  @override
  String get hostsCreateEventPolicyStateLabelMembersSkipReview =>
      'Members skip review';

  @override
  String get hostsCreateEventPolicyStateTitleMembersSkipReview =>
      'Members skip review';

  @override
  String get hostsCreateEventPolicyStateDescriptionMembersSkipReview =>
      'Approved community members can book directly. Other guests request approval. Capacity, eligibility and payment still apply.';

  @override
  String get hostsEventGuestDetailsTitle => 'Guest information';

  @override
  String get hostsEventGuestDetailsVisibility =>
      'These notes appear on your public event page. Leave blank to hide them.';

  @override
  String get hostsEventIncludedTitle => 'What\'s included';

  @override
  String get hostsEventIncludedHint =>
      'For example: equipment, refreshments, entry fees or a guided session.';

  @override
  String get hostsEventAccessibilityTitle => 'Accessibility notes';

  @override
  String get hostsEventAccessibilityHint =>
      'Describe step-free access, seating, accessible toilets or activity demands.';

  @override
  String get hostsEventGuestDetailsSave => 'Save guest information';

  @override
  String get hostsEventPhotoRecoveryTitle => 'Event saved · photos pending';

  @override
  String get hostsEventPhotoRecoveryUploading =>
      'Your event is saved. Photos are still uploading. You can leave and return to this event’s photo recovery.';

  @override
  String get hostsEventPhotoRecoveryFailed =>
      'Your event is saved. Some photos could not upload. Retry photos on this event.';

  @override
  String get hostsEventPhotoRecoveryUnknown =>
      'Your event is saved. We are checking whether its photos were attached. Retry to confirm the same request safely.';

  @override
  String get hostsEventPhotoRecoveryConflict =>
      'The event’s photos changed elsewhere. Your saved recovery is preserved. Open the event to review its photos.';

  @override
  String get hostsEventPhotoRecoveryCleanup =>
      'Your event is saved. Photo cleanup is still pending. Retry cleanup; the saved recovery will remain until it is resolved.';

  @override
  String get hostsEventPhotoRecoveryUnsettled =>
      'An earlier photo upload has an unresolved outcome. Its recovery is preserved for review, even after other photos are saved.';

  @override
  String get hostsEventPhotoRecoveryMissing =>
      'Select photos again to retry. Selected photo files do not survive every restart.';

  @override
  String get hostsEventPhotoRecoveryStorage =>
      'Your event is saved, but photo recovery could not be saved on this device. Keep this screen open and retry before leaving.';

  @override
  String get hostsEventPhotoRecoveryRetry => 'Retry photos';

  @override
  String get hostsEventPhotoRecoveryCheck => 'Check photo status';

  @override
  String get hostsEventPhotoRecoveryReselect => 'Select photos again';

  @override
  String get hostsEventPhotoRecoveryCleanupAction => 'Retry cleanup';

  @override
  String get hostsEventPhotoRecoveryLeaveTitle => 'Leave photo recovery?';

  @override
  String get hostsEventPhotoRecoveryLeaveMessage =>
      'Your event is already saved. This device could not save its photo recovery. Leaving may lose the selected photos. You can manage the saved event later.';

  @override
  String get hostsEventPhotoRecoveryLeave => 'Leave saved event';

  @override
  String get hostsEventPhotoRecoverySession =>
      'Your sign-in session changed. Reopen event creation to recover the saved event for your current account.';

  @override
  String get hostsEventPhotoRecoverySavedTitle => 'Your event is saved.';

  @override
  String get hostsEventPhotoRecoveryInactive =>
      'This saved event is no longer active. Open the event to review its current status.';

  @override
  String get hostsEventPhotoRecoveryRefresh =>
      'Your photos are attached. Check photo status to refresh the current event details.';

  @override
  String get hostAccountDeletionConfirmation =>
      'Permanently delete your Catch account and Host profile? You’ll lose organizer access. Shared business records and required safety/payment records remain. Transfer organizer ownership first if needed.';

  @override
  String get hostInboxProgramPurposeUnresolvedTitle =>
      'Program conversations unavailable';

  @override
  String get hostInboxProgramPurposeUnresolvedBody =>
      'We can’t verify which messages belong to this program. Conversation history and replies are unavailable here.';

  @override
  String paymentMethodSheetTitle({required String amount}) {
    return 'Pay $amount';
  }

  @override
  String get paymentMethodSheetSeller =>
      'Your payment goes to the event’s organiser. Catch doesn’t hold your money.';

  @override
  String paymentMethodSheetRefundBy({required String deadline}) {
    return 'Full refund if you cancel by $deadline.';
  }

  @override
  String get paymentMethodSheetUpiHeading => 'UPI';

  @override
  String get paymentMethodGooglePay => 'Google Pay';

  @override
  String get paymentMethodPhonePe => 'PhonePe';

  @override
  String get paymentMethodPaytm => 'Paytm';

  @override
  String get paymentMethodOtherUpi => 'Other UPI app or UPI ID';

  @override
  String get paymentMethodSheetOtherHeading => 'Other ways to pay';

  @override
  String get paymentMethodCard => 'Credit or debit card';

  @override
  String get paymentMethodNetbanking => 'Net banking';

  @override
  String get paymentMethodSheetSecureNote =>
      'Payments are processed securely by Razorpay. Card details are entered on Razorpay’s form, never in Catch.';

  @override
  String get hostPayoutsRazorpayIntroTitle => 'Guests pay you directly';

  @override
  String get hostPayoutsRazorpayIntroBody =>
      'Ticket and form payments go straight to your own Razorpay account, and refunds come out of it. Catch never holds your money. Catch’s fees are billed to you separately.';

  @override
  String get hostPayoutsRazorpayUnavailable =>
      'Connecting Razorpay isn’t available yet. Catch is finishing its Razorpay partner setup. Free events and forms work as usual.';

  @override
  String get hostPayoutsRazorpayNoAccountTitle => 'No Razorpay account yet?';

  @override
  String get hostPayoutsRazorpayNoAccountBody =>
      'Create one at razorpay.com and finish Razorpay’s verification, then connect it here.';

  @override
  String get hostPayoutsRazorpayConnectHelp =>
      'Sign in to Razorpay and approve Catch. This lets Catch create orders for your events and forms, check payment and refund status, set up payment notifications, and issue refunds under your cancellation policy. You can disconnect at any time.';

  @override
  String get hostPayoutsRazorpayDisconnectHelp =>
      'This stops new checkouts for your events and forms. Catch can still finish refunds for bookings that are already paid.';

  @override
  String get hostPayoutsRazorpayPermissionsTitle => 'What connecting allows';
}
