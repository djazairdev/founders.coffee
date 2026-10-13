import {
  renderToString,
  renderToStaticMarkup,
  renderToReadableStream,
  resume,
  version,
} from 'react-dom/server.browser';

type ReactDOMServerLike = {
  renderToString: typeof renderToString;
  renderToStaticMarkup: typeof renderToStaticMarkup;
  renderToReadableStream: typeof renderToReadableStream;
  resume: (input: unknown) => Promise<unknown>;
  version: string;
};

const ReactDOMServer: ReactDOMServerLike = {
  renderToString,
  renderToStaticMarkup,
  renderToReadableStream,
  resume: resume as ReactDOMServerLike['resume'],
  version,
};

export {
  renderToString,
  renderToStaticMarkup,
  renderToReadableStream,
  resume,
  version,
};
export default ReactDOMServer;
