const prioritizeHTMLFile = (entryFiles) => {
  let files = [];

  // Find the html file and put it as latest in the files array
  // in order to keep the html file opened in vscode plugin
  const index = entryFiles.findIndex((file) => {
    return /.*\.html$/.test(file);
  });

  if (index !== -1) {
    for (let i = 0; i < entryFiles.length; i++) {
      if (i !== index) {
        files.push(entryFiles[i]);
      }
    }
    files.push(entryFiles[index]);
  } else {
    files = entryFiles;
  }

  return files;
};

module.exports = {
  prioritizeHTMLFile,
};
