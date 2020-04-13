/**
 * @description contains operations realted to file upload lwc
 */
public with sharing class FileOperationsController {
  @InvocableMethod(
    label='Create Content'
    description='Create Content Document/Version and link it with a record'
  )
  public static List<Id> createContentDocumentLink(
    List<FileCollection> fileCollectionList
  ) {
    List<LinkWrapper> versionsToLink = new List<LinkWrapper>();
    ContentVersion[] versionsToCreate = new List<ContentVersion>{};
    List<ContentVersion> versionRecordsToLink = new List<ContentVersion>();

    for (FileCollection fc : fileCollectionList) {
      for (ContentVersion cv : fc.files) {
        if (cv.ContentDocumentId == null && fc.relatedRecordId != null) {
          versionsToLink.add(new LinkWrapper(cv, fc.relatedRecordId));
          versionRecordsToLink.add(cv);
        }
        versionsToCreate.add(cv);
      }
    }
    if (versionsToCreate.size() > 0) {
      insert versionsToCreate;
    }
    ContentDocumentLink[] links = new List<ContentDocumentLink>{};
    Set<Id> documentIdsAdded = new Set<Id>();
    Map<Id, ContentVersion> cvMap = new Map<Id, ContentVersion>(
      [
        SELECT ContentDocumentId
        FROM ContentVersion
        WHERE Id = :versionRecordsToLink
      ]
    );
    for (LinkWrapper lw : versionsToLink) {
      ContentDocumentLink link = new ContentDocumentLink();
      link.ContentDocumentId = cvMap.get(lw.cv.Id).ContentDocumentId;
      link.LinkedEntityId = lw.relatedRecordId;
      if (!documentIdsAdded.contains(link.ContentDocumentId)) {
        links.add(link);
        documentIdsAdded.add(link.ContentDocumentId);
      }
    }
    if (links.size() > 0) {
      insert links;
    }
    return new List<Id>(new Map<Id, ContentVersion>(versionsToCreate).keySet());
  }

  private class LinkWrapper {
    public ContentVersion cv;
    public Id relatedRecordId;
    public LinkWrapper(ContentVersion cv, Id relatedRecordId) {
      this.cv = cv;
      this.relatedRecordId = relatedRecordId;
    }
  }
}
