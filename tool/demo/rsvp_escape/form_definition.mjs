/** RSVP Escape reference forms, consolidated for an explicitly labelled demo. */
export const cities = ['Mumbai', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Dubai'];

const emptyValidation = {
  minLength: null, maxLength: null, minNumber: null, maxNumber: null,
  earliestDate: null, latestDate: null, minSelections: null,
  maxSelections: null, maxFileCount: null, maxFileSizeBytes: null,
  allowedMimeTypes: [], patternPreset: null, customError: null,
};

function question(key, label, kind, extra = {}) {
  const {choices = [], validation = {}, ...rest} = extra;
  return {
    questionId: `rsvp_${key}`, key, label, kind, required: true,
    helpText: null, canonicalFieldId: null, privacyClass: 'organizerCustom',
    prefillPolicy: 'never', hostPresentation: 'detailOnly',
    options: choices.map((value, index) => ({
      optionId: `rsvp_${key}_${index + 1}`, label: value, value,
    })),
    validation: {...emptyValidation, ...validation}, ...rest,
  };
}

function section(key, title, description, questions) {
  return {sectionId: `rsvp_${key}`, title, description, pageBreak: true, questions};
}

export function buildRsvpFormDefinition() {
  return {
    title: 'RSVP Escape — application demo',
    description: 'DEMO · One application, five cities. Explore the application and review experience with synthetic guests. This is not a live RSVP Escape registration.',
    purpose: 'application', defaultTargetKind: 'organizer', defaultTargetId: null,
    identityPolicy: 'phoneVerified',
    sections: [
      section('welcome', 'Your Catch details', 'Verify your phone early to see saved details. You can start the form before verification.', [
        question('fullName', 'Full name', 'shortText', {canonicalFieldId: 'displayName', privacyClass: 'contact', answerDestination: 'catchProfile', prefillPolicy: 'participantReviewRequired', hostPresentation: 'sortable', validation: {maxLength: 160}}),
        question('email', 'Email address', 'email', {canonicalFieldId: 'email', privacyClass: 'contact', answerDestination: 'catchProfile', prefillPolicy: 'participantReviewRequired'}),
        question('phone', 'Phone number', 'phone', {canonicalFieldId: 'phoneNumber', privacyClass: 'contact', answerDestination: 'catchProfile', prefillPolicy: 'participantReviewRequired'}),
        question('homeCity', 'Which city do you currently live in?', 'shortText', {canonicalFieldId: 'city', privacyClass: 'profile', answerDestination: 'catchProfile', prefillPolicy: 'participantReviewRequired'}),
      ]),
      section('application', 'Your RSVP Escape application', 'These details are for Neemwood Run Club to review your application.', [
        question('eventCity', 'Event city', 'singleChoice', {choices: cities, hostPresentation: 'filterable'}),
        question('dubaiYears', 'How many years have you lived in Dubai?', 'shortText'),
        question('single', 'I am single and interested in participating in an RSVP Escape experience.', 'acknowledgement', {helpText: 'The source form includes never married, divorced, filing for divorce and widowed applicants.'}),
      ]),
      section('profile', 'A little about you', 'These answers are visible to the organizer for application review.', [
        question('gender', 'Gender', 'singleChoice', {choices: ['Male', 'Female'], canonicalFieldId: 'gender', privacyClass: 'sensitive'}),
        question('height', 'Height in feet', 'number', {validation: {minNumber: 1, maxNumber: 9}}),
        question('age', 'Age', 'number', {canonicalFieldId: 'age', privacyClass: 'sensitive', validation: {minNumber: 18, maxNumber: 120}}),
        question('birthDate', 'Date of birth', 'date', {canonicalFieldId: 'dateOfBirth', privacyClass: 'sensitive'}),
        question('instagram', 'Instagram profile', 'shortText', {canonicalFieldId: 'instagramHandle', privacyClass: 'profile', helpText: 'Paste your Instagram profile URL or @handle.'}),
        question('linkedin', 'LinkedIn profile', 'url', {canonicalFieldId: 'linkedinUrl', privacyClass: 'profile', helpText: 'Paste your full LinkedIn profile URL.'}),
        question('photo', 'A full-length photo of you', 'file', {privacyClass: 'sensitive', helpText: 'Use a recent photo, not an AI-generated image. Demo records use synthetic data.', validation: {maxFileCount: 1, maxFileSizeBytes: 10485760, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']}}),
      ]),
      section('intent', 'What brings you here?', 'Help the team understand the connections you are looking for.', [
        question('intent', 'Looking for', 'singleChoice', {choices: ['Life Partner', 'Fun Experience', 'Romantic Relationship', 'Friendship', 'Networking', 'Other'], hostPresentation: 'filterable'}),
        question('relationshipStatus', 'Current relationship status', 'singleChoice', {choices: ['Divorced', 'Filed for Divorce', 'Never Been Married', 'Separated', 'Legally Separated', 'Widowed', 'Other'], privacyClass: 'sensitive'}),
        question('hasChildren', 'Do you have children?', 'boolean', {privacyClass: 'sensitive'}),
        question('futureChildren', 'Would you like children in the future?', 'singleChoice', {choices: ['Yes', 'No', 'Maybe'], privacyClass: 'sensitive'}),
        question('partnerAge', 'Preferred partner age range', 'singleChoice', {choices: ['No Preference', '30–35', '36–40', '41–45', '46–50', '50–55'], privacyClass: 'sensitive'}),
        question('sharedValues', 'How important are shared cultural or religious values?', 'singleChoice', {choices: ['Very Important', 'Somewhat important', 'Not Important'], privacyClass: 'sensitive'}),
        question('ethnicity', 'How do you describe your ethnicity?', 'shortText', {privacyClass: 'sensitive', helpText: 'For example, Sindhi or Gujarati. This answer is for organizer review.'}),
        question('partnerEthnicity', 'Do you have a preference for your partner’s ethnicity?', 'shortText', {privacyClass: 'sensitive'}),
      ]),
      section('interests', 'Your interests & everyday life', 'A few details to make the experience feel more personal.', [
        question('drink', 'Your go-to drink', 'singleChoice', {choices: ['Tequila', 'Whiskey', 'Vodka', 'Wine', 'Gin', 'Beer', 'I don’t drink']}),
        question('food', 'Food preference', 'singleChoice', {choices: ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Pescatarian']}),
        question('personality', 'How would you describe your personality?', 'multiChoice', {choices: ['Introvert', 'Extrovert', 'Ambivert', 'Adventure', 'Creative', 'Analytical', 'Humorous', 'Romantic']}),
        question('hobbies', 'Your hobbies and interests', 'multiChoice', {choices: ['Sports/Physical Activities', 'Reading/Writing', 'Music/Art', 'Traveling', 'Cooking/Food', 'Technology/Gadget', 'Movies/TV Shows', 'Gaming', 'Nature/Outdoors', 'Volunteering', 'Other']}),
        question('college', 'College or university', 'shortText'),
        question('occupation', 'Occupation', 'shortText'),
        question('company', 'Company and designation', 'shortText'),
        question('singlesTravel', 'Would you like to attend a singles travel experience?', 'singleChoice', {choices: ['Yes', 'No', 'Unsure']}),
        question('referral', 'How did you hear about RSVP Escape?', 'shortText', {helpText: 'Mention the person or social platform.'}),
      ]),
    ],
    logicRules: [
      {ruleId: 'rsvp_dubai_years', conditionMode: 'all', conditions: [{questionId: 'rsvp_eventCity', operator: 'equals', expectedValues: ['Dubai']}], action: 'showQuestion', targetQuestionId: 'rsvp_dubaiYears', targetSectionId: null},
      {ruleId: 'rsvp_dubai_travel', conditionMode: 'all', conditions: [{questionId: 'rsvp_eventCity', operator: 'equals', expectedValues: ['Dubai']}], action: 'showQuestion', targetQuestionId: 'rsvp_singlesTravel', targetSectionId: null},
    ], appearance: {preset: 'editorial', logoAssetId: null, coverAssetId: null, activityKind: null},
    availability: {opensAt: null, closesAt: null, responseLimit: 100, closedMessage: 'This demonstration is closed.'},
    consent: {
      consentCopy: 'I understand this is a demonstration hosted by Neemwood Run Club. I agree to share this application with the host for review. Catch may save the marked contact and city details privately for my future forms. This does not subscribe me to marketing messages.',
      consentVersion: 'rsvp-demo-2026-09-24',
      retentionCopy: 'Demo only. Please use synthetic details. Responses are visible to Neemwood Run Club’s authorized host team and can be withdrawn after submission.',
    },
    completion: {title: 'Application received', message: 'The host can now review your application. Admission and payment are separate next steps. This demo does not reserve a paid place.', actionKind: 'none', actionLabel: null, actionUrl: null},
  };
}
