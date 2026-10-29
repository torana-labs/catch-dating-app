import 'package:catch_dating_app/core/schema_contracts/generated/profile_schema_contracts.g.dart';

const minimumProfilePhotoCount = schemaMinimumProfilePhotos;
const maximumProfilePhotoCount = schemaMaximumProfilePhotos;
const profilePhotoAspectRatioWidth = schemaProfilePhotoAspectRatioWidth;
const profilePhotoAspectRatioHeight = schemaProfilePhotoAspectRatioHeight;
const profilePhotoThumbnailSize = schemaProfilePhotoThumbnailSize;
const profilePhotoMaxUploadBytes = schemaProfilePhotoMaxUploadBytes;

const profilePhotoAspectRatio =
    profilePhotoAspectRatioWidth / profilePhotoAspectRatioHeight;
