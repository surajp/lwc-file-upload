function accepts(file, acceptedFiles) {
  if (file && acceptedFiles) {
    const acceptedFilesArray = Array.isArray(acceptedFiles)
      ? acceptedFiles
      : acceptedFiles.split(",");
    const fileName = file.name || "";
    const mimeType = file.type || "";
    const baseMimeType = mimeType.replace(/\/.*$/, "");

    return acceptedFilesArray.some((type) => {
      const validType = type.trim();
      if (validType.charAt(0) === ".") {
        return fileName.toLowerCase().endsWith(validType.toLowerCase());
      } else if (validType.endsWith("/*")) {
        // This is something like a image/* mime type
        return baseMimeType === validType.replace(/\/.*$/, "");
      }
      return mimeType === validType;
    });
  }
  return true;
}

function isImage(file) {
  if (file.type.split("/")[0] === "image") {
    return true;
  }
}
function convertBytesToMbsOrKbs(filesize) {
  let size = "";
  // I know, not technically correct...
  if (filesize >= 1000000) {
    size = filesize / 1000000 + " megabytes";
  } else if (filesize >= 1000) {
    size = filesize / 1000 + " kilobytes";
  } else {
    size = filesize + " bytes";
  }
  return size;
}

async function createFileFromUrl(url) {
  const response = await fetch(url);
  const data = await response.blob();
  const metadata = { type: data.type };
  const filename = url.replace(/\?.+/, "").split("/").pop();
  const ext = data.type.split("/").pop();
  return new File([data], `${filename}.${ext}`, metadata);
}
export { createFileFromUrl, accepts };
