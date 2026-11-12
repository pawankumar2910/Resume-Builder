import { extractDocument } from './parser.js';
self.onmessage = async ({ data }) => {
  try {
    self.postMessage({ result: await extractDocument(data.file) });
  } catch (error) {
    self.postMessage({
      error:
        error.name === 'PasswordException'
          ? 'This PDF is password-protected. Upload an unlocked copy.'
          : error.message || 'The document could not be read.',
    });
  }
};
