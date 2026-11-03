/// Use as a default for `Object?` parameters when "not passed" must be
/// distinguishable from "explicitly null."
///
/// Compare with [identical].
const Object unsetSentinel = Object();
