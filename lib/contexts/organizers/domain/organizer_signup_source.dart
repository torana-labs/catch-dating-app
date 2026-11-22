/// What a host says when Catch Host setup asks how they heard about it.
///
/// Each name is the `signupSource` value `createOrganizer` takes and the
/// server stores once on the organizer. It is self-reported and optional,
/// and never stands in for the acquisition channel the server derives.
enum OrganizerSignupSource {
  metaAd,
  googleSearch,
  instagramPost,
  friendOrHost,
  teamOutreach,
  other,
}
