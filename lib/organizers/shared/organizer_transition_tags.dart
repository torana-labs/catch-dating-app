import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/widgets.dart';

String organizerInteractionHeroTag(String clubId) => 'club-interaction-$clubId';

/// Shared inset for the club tile media frame and the detail-page hero module.
///
/// The tile should feel like it expands into the detail page, so this spacing
/// must stay aligned across both surfaces.
const double organizerInteractionMediaInset =
    CatchLayout.organizerInteractionMediaInset;
const EdgeInsets organizerInteractionMediaPadding =
    CatchLayout.organizerInteractionMediaPadding;
