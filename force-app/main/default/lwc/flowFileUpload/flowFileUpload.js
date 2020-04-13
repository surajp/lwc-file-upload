import { LightningElement, api } from "lwc";
import { createFileFromUrl, accepts } from "./helpers/helpers.js";
import { createRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { FlowAttributeChangeEvent } from "lightning/flowSupport";

const BASE64REGEXP = new RegExp(/^data(.*)base64,/);

export default class FlowFileUpload extends LightningElement {
  fileObjects = [];
  openSnackbar = false;
  snackbarMessage = "";
  snackbarVariant = "success";
  @api relatedRecordId = "0010t00001NKoQrAAL";
  @api contentDocumentId;
  @api multiple = false;
  @api acceptedFileTypes = ["image/png", "application/pdf"];
  @api dropzoneText = "";
  @api initialFiles = [];
  @api filesLimit = 1;
  @api maxFileSize = 2048;
  dropRejected = false;
  _isDragActive = false;

  @api
  get contentVersions() {
    return this.fileObjects.map(f => {
      return this._createPayload(f);
    });
  }

  get messageClassName() {
    return "message " + (this.dropRejected ? "error" : "success");
  }

  getFileLimitExceedMessage(filesLimit) {
    return `Maximum allowed number of files exceeded. Only ${filesLimit} allowed`;
  }

  getFileAddedMessage(fileName) {
    return `File ${fileName} successfully added.`;
  }

  getFileRemovedMessage(fileName) {
    return `File ${fileName} removed.`;
  }

  getDropRejectMessage(rejectedFile, acceptedFiles, maxFileSize) {
    let message = `File ${rejectedFile.name} was rejected. `;
    if (!acceptedFiles.includes(rejectedFile.type)) {
      message += "File type not supported. ";
    }
    if (rejectedFile.size > maxFileSize) {
      message += "File is too big. Size limit is " + maxFileSize + ". ";
    }
    return message;
  }

  connectedCallback() {
    this.filesArray(this.initialFiles);
  }

  async filesArray(urls) {
    try {
      for (const url of urls) {
        /*eslint-disable-next-line no-await-in-loop*/
        const file = await createFileFromUrl(url);
        const reader = new FileReader();
        reader.onload = () => {
          this.fileObjects = this.fileObjects.concat({
            file: file,
            data: reader.result
          });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.log(err);
    }
  }

  _containsFiles(event) {
    if (event.dataTransfer && event.dataTransfer.types) {
      return Array.from(event.dataTransfer.types).indexOf("Files") > -1;
    }
    return false;
  }

  handleDrag(event) {
    event.preventDefault();
    //this._isDragActive = true;

    if (event.dataTransfer) {
      try {
        event.dataTransfer.dropEffect = "copy";
      } catch (e) {} /* eslint-disable-line no-empty */
    }
  }

  handleSubmit() {
    this.fileObjects.forEach(f => {
      let payload = {
        apiName: "ContentVersion",
        fields: this._createPayload(f)
      };
      createRecord(payload)
        .then(() => {
          this.dispatchEvent(
            new ShowToastEvent({
              variant: "success",
              message: "File " + f.file.name + " uploaded successfully"
            })
          );
          return Promise.resolve(1);
        })
        .then(() => {
          if (!this.contentDocumentId && this.relatedRecordId) {
            this.dispatchEvent(
              new ShowToastEvent({
                variant: "success",
                message: `Content Document Link created`
              })
            );
          }
        })
        .catch(err => {
          this.dispatchEvent(
            new ShowToastEvent({
              variant: "error",
              message: `An error occurred with file ${f.file.name}: ${err.body.message}`
            })
          );
        });
    });
  }

  _createPayload(fileObject) {
    const fileData = {
      Title: fileObject.file.name,
      PathOnClient: fileObject.file.name,
      VersionData: fileObject.data.replace(BASE64REGEXP, "")
    };
    if (this.contentDocumentId) {
      fileData.ContentDocumentId = this.contentDocumentId;
    }
    return fileData;
  }

  _validate(files) {
    const acceptedFiles = [];
    const rejectedFiles = [];

    files.forEach(file => {
      if (accepts(file, this.acceptedFileTypes)) {
        acceptedFiles.push(file);
      } else {
        rejectedFiles.push(file);
      }
    });

    if (!this.multiple && acceptedFiles.length > 1) {
      rejectedFiles.push(...acceptedFiles.splice(0)); // Reject everything and empty accepted files
    }
    return { acceptedFiles, rejectedFiles };
  }

  get classNames() {
    return `dropzone ${this._isDragActive &&
      (this.dropRejected ? "rejectstripes" : "stripes")}`;
  }

  _getFilesFromEvent(event) {
    return Array.from(event.dataTransfer.items)
      .filter(i => i.kind === "file")
      .map(i => i.getAsFile());
  }

  handleDragEnter(event) {
    this._isDragActive = true;
    if (!this._containsFiles(event)) {
      this.dropRejected = true;
      return false;
    }
    this.dropRejected = false;
    return true;
  }

  handleDragLeave() {
    this._isDragActive = false;
  }

  handleDrop(event) {
    //{{{
    //const _this = this;
    this._isDragActive = false;
    let files = this._getFilesFromEvent(event);
    event.preventDefault();
    if (
      this.filesLimit > 1 &&
      this.fileObjects.length + files.length > this.filesLimit
    ) {
      this.openSnackBar = true;
      this.snackbarMessage = this.getFileLimitExceedMessage(this.filesLimit);
      this.snackbarVariant = "error";
      this.dropRejected = true;
    } else {
      let results = this._validate(files);
      if (results.rejectedFiles.length > 0) {
        return this.handleDropRejected(results.rejectedFiles, event);
      }
      this.dropRejected = false;
      let count = 0;
      let message = "";
      if (!Array.isArray(files)) files = [files];

      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          this.fileObjects =
            this.filesLimit <= 1
              ? [
                  {
                    file: file,
                    data: reader.result
                  }
                ]
              : this.fileObjects.concat({
                  file: file,
                  data: reader.result
                });
          /**
                        if (this.onChange) {
                            this.onChange(_this.state.fileObjects.map((fileObject) => fileObject.file));
                        }
                        if (this.onDrop) {
                            this.onDrop(file);
                        } **/
          message += this.getFileAddedMessage(file.name);
          count++; // we cannot rely on the index because this is asynchronous
          if (count === files.length) {
            // display message when the last one fires
            this.openSnackBar = true;
            this.snackbarMessage = message;
            this.snackbarVariant = "success";
            this._fireAttributeChangeEvent();
          }
        };
        reader.readAsDataURL(file);
      });
    }
    return null;
  } //}}}

  _fireAttributeChangeEvent() {
    const attributeChangeEvent = new FlowAttributeChangeEvent(
      "contentVersions",
      this.contentVersions
    );
    this.dispatchEvent(attributeChangeEvent);
  }

  handleRemove = fileIndex => event => {
    event.stopPropagation();
    const fileObjects = this.fileObjects;
    const file = fileObjects.filter((fileObject, i) => {
      return i === fileIndex;
    })[0].file;
    fileObjects.splice(fileIndex, 1);
    this.fileObjects = fileObjects;
    if (this.onDelete) {
      this.onDelete(file);
    }
    if (this.onChange) {
      this.onChange(this.state.fileObjects.map(fileObject => fileObject.file));
    }
    this.openSnackBar = true;
    this.snackbarMessage = this.getFileRemovedMessage(file.name);
    this.snackbarVariant = "info";
  };

  handleDropRejected(rejectedFiles, evt) {
    this.dropRejected = true;
    let message = "";
    rejectedFiles.forEach(rejectedFile => {
      message += this.getDropRejectMessage(
        rejectedFile,
        this.acceptedFileTypes,
        this.maxFileSize
      );
    });
    if (this.onDropRejected) {
      this.onDropRejected(rejectedFiles, evt);
    }
    this.openSnackBar = true;
    this.snackbarMessage = message;
    this.snackbarVariant = "error";
  }

  handleCloseSnackbar = () => {
    this.openSnackBar = false;
  };
}
