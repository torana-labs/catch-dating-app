import {CatchButton, CatchField, CatchGrid, CatchPhotoTile, CatchSection, CatchStack, CatchText} from "@catch/web-ui";
import {ownerViewCopy} from "../../../content/ownerView";
import {renderOwnerNotice} from "./OwnerInsightsPanel";
import type {OwnerViewController} from "./useOwnerViewController";

const copy = ownerViewCopy.page;

/**
 * About (the owner, through updateOrganizer) and the photo order (owner and
 * editors, through manageOrganizerOwnerPage). Uploads and removals stay in
 * Catch Host, where storage clean-up lives.
 */
export function OwnerPagePanel({controller}: {controller: OwnerViewController}) {
  const {about, photos, can} = controller;
  return (
    <CatchStack gap={24}>
      {can("about") ? (
        <CatchSection dividers="none" title={copy.aboutTitle}>
          <CatchStack gap={12}>
            <CatchField maxLength={2000} maxLines={null} minLines={5} onChanged={about.change} recipe="input"
              title={copy.aboutField} value={about.text} />
            <CatchStack align="start">
              <CatchButton label={copy.aboutSave} onPressed={about.dirty ? about.save : null}
                status={about.busy ? "loading" : "idle"} />
            </CatchStack>
          </CatchStack>
        </CatchSection>
      ) : null}
      {can("photos") ? (
        <CatchSection dividers="none" note={photos.items.length ? copy.photosNote : undefined} title={copy.photosTitle}>
          <CatchStack gap={12}>
            {photos.items.length ? (
              <CatchGrid columns={3} compactColumns={2} gap="related">
                {photos.items.map((photo, index) => (
                  <CatchStack gap={6} key={photo.id}>
                    <CatchPhotoTile imageAlt={copy.photoAlt(index + 1)} imageUrl={photo.thumbnailUrl ?? photo.url}
                      title={copy.photoAlt(index + 1)} />
                    {index > 0 ? (
                      <CatchButton label={copy.makeCover(index + 1)} onPressed={photos.busy ? null : () => photos.makeCover(photo.id)}
                        size="sm" variant="secondary" />
                    ) : null}
                  </CatchStack>
                ))}
              </CatchGrid>
            ) : <CatchText as="p" tone="secondary" variant="body-small">{copy.photosEmpty}</CatchText>}
            <CatchText as="p" tone="secondary" variant="body-small">{copy.photosInHost}</CatchText>
          </CatchStack>
        </CatchSection>
      ) : null}
      {renderOwnerNotice({controller, failed: controller.notice?.what === "photos" ? copy.photosFailed : copy.aboutFailed,
        panel: "page", saved: controller.notice?.what === "photos" ? copy.photosSaved : copy.aboutSaved})}
    </CatchStack>
  );
}
